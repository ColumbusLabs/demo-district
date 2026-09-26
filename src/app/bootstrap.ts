import { createWorld } from '../world/World.ts';
import { createDistrict, districtNavigation } from '../world/district/index.ts';
import type { District } from '../world/district/index.ts';
import { createInteractions } from '../world/interactions/InteractionManager.ts';
import type { Interactions } from '../world/interactions/InteractionManager.ts';
import { projectForSlot, showcase } from '../data/showcase.ts';
import { createHud } from '../ui/hud.ts';
import type { Hud } from '../ui/hud.ts';
import { createMinimap } from '../ui/minimap.ts';
import type { Minimap } from '../ui/minimap.ts';
import { createSearch } from '../ui/search.ts';
import type { SearchBox } from '../ui/search.ts';
import { createProjectPreview } from '../ui/project-preview.ts';
import type { ProjectPreview } from '../ui/project-preview.ts';
import type { World, WorldState } from '../world/World.ts';
import { createNavigationController } from '../world/controls/NavigationController.ts';
import type { NavigationController, NavigationMode } from '../world/controls/NavigationController.ts';
import { watchInputModality } from '../ui/input-modality.ts';
import type { InputModality } from '../ui/input-modality.ts';
import { createWorldDiagnostics } from '../ui/world-diagnostics.ts';
import { qualityTiers } from '../world/district/quality.ts';
import type { QualityTier } from '../world/district/quality.ts';
import { createGovernor } from '../world/performance/governor.ts';

const mounts = new WeakMap<Document, () => void>();
type QualityChoice = 'auto' | QualityTier;
export interface MountOptions {
  /** Graphics choice; defaults to the visitor's saved preference, else automatic. */
  quality?: QualityChoice;
  /** Session-only starting tier for automatic mode after the governor steps down. */
  autoTier?: QualityTier;
  /** Resume here instead of the spawn (graphics changes keep the visitor in place). */
  resumeAt?: { x: number; z: number; yaw: number; pitch: number };
  /** Brief message to show once the world is running. */
  notice?: string;
}
const preferenceKey = 'demo-district.graphics';
// Saved preference is a per-visitor convenience: storage may be unavailable, so never rely on it.
const readPreference = (win: Window): QualityChoice | undefined => {
  try { const value = win.localStorage.getItem(preferenceKey); return value === 'auto' || qualityTiers.includes(value as QualityTier) ? value as QualityChoice : undefined; }
  catch { return undefined; }
};
const writePreference = (win: Window, value: QualityChoice): void => {
  try { win.localStorage.setItem(preferenceKey, value); } catch { /* Private mode or blocked storage. */ }
};

/**
 * Mount one world; repeat calls retire the old canvas, inputs, and renderer together. The
 * returned function unmounts whichever application is currently mounted on the document, so it
 * stays valid after internal remounts (graphics changes).
 */
export function mountApplication(doc: Document, options: MountOptions = {}): () => void {
  mounts.get(doc)?.();
  const current = (): void => { mounts.get(doc)?.(); };
  const placeholder = doc.querySelector<HTMLCanvasElement>('#world-canvas');
  const status = doc.querySelector<HTMLElement>('#runtime-status');
  const detail = doc.querySelector<HTMLElement>('#runtime-detail');
  const navigationStatus = doc.querySelector<HTMLElement>('#navigation-status');
  const enter = doc.querySelector<HTMLButtonElement>('#enter-navigation');
  const reset = doc.querySelector<HTMLButtonElement>('#reset-view');
  const speed = doc.querySelector<HTMLSelectElement>('#walk-speed');
  const movePad = doc.querySelector<HTMLElement>('#move-pad');
  const prompt = doc.querySelector<HTMLElement>('#world-prompt');
  const searchInput = doc.querySelector<HTMLInputElement>('#search-input');
  const searchList = doc.querySelector<HTMLUListElement>('#search-results');
  const mapSvg = doc.querySelector<SVGSVGElement>('#minimap-svg');
  const qualitySelect = doc.querySelector<HTMLSelectElement>('#quality-select');
  const worldNotice = doc.querySelector<HTMLElement>('#world-notice');
  const win = doc.defaultView;
  if (!placeholder || !status || !detail || !win) {
    const notice = doc.createElement('p');
    notice.setAttribute('role', 'alert');
    notice.textContent = 'Demo District could not start. Reload the page to try again.';
    doc.body.append(notice);
    const unmount = (): void => { notice.remove(); if (mounts.get(doc) === unmount) mounts.delete(doc); };
    mounts.set(doc, unmount);
    return current;
  }
  const canvas = placeholder.cloneNode(false) as HTMLCanvasElement;
  canvas.removeAttribute('width');
  canvas.removeAttribute('height');
  canvas.dataset.navigation = 'idle';
  canvas.dataset.content = 'loading';
  placeholder.replaceWith(canvas);
  let disposed = false;
  let world: World | undefined;
  let controls: NavigationController | undefined;
  let district: District | undefined;
  let interactions: Interactions | undefined;
  let preview: ProjectPreview | undefined;
  let focusedSlot: string | null = null;
  let hud: Hud | undefined;
  let minimap: Minimap | undefined;
  let search: SearchBox | undefined;
  // Pending steps of a search/map jump (fade out → move → fade in → preview).
  let jumpTimer: ReturnType<typeof setTimeout> | undefined;
  const fade = doc.querySelector<HTMLElement>('#transition');
  let running = false;
  let diagnostics: ReturnType<typeof createWorldDiagnostics> | undefined;
  let stopWatchingInput: (() => void) | undefined;
  let modality: InputModality = 'pointer';
  let mode: NavigationMode = 'idle';
  const describeNavigation = (): void => {
    if (!navigationStatus || disposed) return;
    navigationStatus.textContent = modality === 'touch'
      ? mode === 'dragging' ? 'Looking around · Lift your finger to stop.'
      : mode === 'active' ? 'Walking · Release the stick to slow down.'
      : 'Drag the scene to look · Use the stick to walk.'
      : mode === 'idle' ? 'Click the scene or choose Explore to use a keyboard and mouse.'
      : mode === 'dragging' ? 'Looking around · Release the mouse to stop looking.'
      : 'WASD to walk · Drag or use arrow keys to look · Escape to release focus.';
  };
  /** The bottom-center pill: how to explore, or how to open the storefront in focus. */
  const renderPrompt = (): void => {
    if (!prompt || disposed) return;
    const project = focusedSlot ? projectForSlot(focusedSlot) : undefined;
    const show = running && !preview?.isOpen();
    prompt.hidden = !show;
    if (!show) return;
    const parts: Array<string | HTMLElement> = [];
    const key = (label: string): HTMLElement => { const k = doc.createElement('kbd'); k.textContent = label; return k; };
    const strong = (label: string): HTMLElement => { const s = doc.createElement('strong'); s.textContent = label; return s; };
    if (modality === 'touch') parts.push(...(project ? ['Tap to view ', strong(project.title)] : ['Tap a storefront to view it']));
    // Enter only works once the scene has keyboard focus; until then, offer the click.
    else if (project && mode !== 'idle') parts.push(key('Enter'), ' or click to view ', strong(project.title));
    else if (project) parts.push('Click to view ', strong(project.title));
    else parts.push('Use ', key('W'), key('A'), key('S'), key('D'), ' to explore');
    prompt.replaceChildren(...parts);
  };
  const setControlsEnabled = (enabled: boolean): void => {
    if (enter) enter.disabled = !enabled;
    if (reset) reset.disabled = !enabled;
    if (speed) speed.disabled = !enabled;
    if (searchInput) searchInput.disabled = !enabled;
    if (qualitySelect) qualitySelect.disabled = !enabled;
    if (movePad) movePad.hidden = !enabled;
  };
  const showState = (state: WorldState): void => {
    if (disposed) return;
    setControlsEnabled(state === 'running');
    running = state === 'running';
    renderPrompt();
    hud?.setStatusVisible(state === 'context-lost' || state === 'failed');
    if (state === 'running') {
      status.dataset.state = 'ready';
      status.textContent = 'World engine ready';
      detail.textContent = `Three.js r${world?.revision ?? ''} · District preview. No creator experiences are loaded.`;
    } else if (state === 'stopped' || state === 'suspended') {
      status.dataset.state = 'paused';
      status.textContent = 'World rendering paused';
      detail.textContent = 'The engine resumes when this preview is visible again.';
    } else if (state === 'context-lost') {
      status.dataset.state = 'unavailable';
      status.textContent = 'The graphics connection was interrupted.';
      detail.textContent = 'Waiting for the browser to restore graphics. Reload this preview if it does not recover.';
    } else if (state === 'failed') {
      status.dataset.state = 'unavailable';
      status.textContent = 'The world renderer stopped safely.';
      detail.textContent = 'Reload this preview to try again. No project data has been lost.';
    }
  };
  // Both close the menu: the visitor wants to see the scene they are returning to.
  const onEnter = (): void => { hud?.closeMenu(); controls?.focus(); };
  // Touch visitors keep the page's own focus; keyboard visitors land back in the scene.
  const onReset = (): void => { hud?.closeMenu(); controls?.resetView(); if (modality !== 'touch') controls?.focus(); };
  const onSpeed = (): void => { if (speed) controls?.setSpeed(Number(speed.value)); };
  const pose = (): MountOptions['resumeAt'] => {
    const s = controls?.snapshot();
    return s ? { x: s.x, z: s.z, yaw: s.yaw, pitch: s.pitch } : undefined;
  };
  /** Rebuild the world with other graphics settings, in place, without reloading the page. */
  const remount = (next: MountOptions): void => {
    const at = pose();
    const speedValue = speed?.value;
    mountApplication(doc, { ...next, ...(at ? { resumeAt: at } : {}) });
    if (speed && speedValue) { speed.value = speedValue; speed.dispatchEvent(new Event('change')); }
  };
  const onQuality = (): void => {
    const value = qualitySelect?.value as QualityChoice | undefined;
    if (!value || (value !== 'auto' && !qualityTiers.includes(value))) return;
    writePreference(win, value);
    remount({ quality: value, notice: value === 'auto' ? 'Graphics set to automatic.' : 'Graphics updated.' });
  };
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  const showNotice = (text: string): void => {
    if (!worldNotice) return;
    worldNotice.textContent = text; worldNotice.hidden = false;
    clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { worldNotice.hidden = true; }, 4000);
  };
  const onPageHide = (event: PageTransitionEvent): void => {
    if (event.persisted) world?.stop(); else unmount();
  };
  const onPageShow = (event: PageTransitionEvent): void => { if (event.persisted && !disposed) world?.start(); };
  const unmount = (): void => {
    if (disposed) return;
    disposed = true;
    setControlsEnabled(false);
    win.removeEventListener('pagehide', onPageHide);
    win.removeEventListener('pageshow', onPageShow);
    enter?.removeEventListener('click', onEnter);
    reset?.removeEventListener('click', onReset);
    speed?.removeEventListener('change', onSpeed);
    qualitySelect?.removeEventListener('change', onQuality);
    clearTimeout(noticeTimer);
    if (worldNotice) worldNotice.hidden = true;
    stopWatchingInput?.();
    preview?.destroy();
    search?.destroy();
    minimap?.destroy();
    hud?.destroy();
    clearTimeout(jumpTimer);
    if (fade) delete fade.dataset.active;
    if (prompt) prompt.hidden = true;
    try { interactions?.dispose(); controls?.dispose(); world?.destroy(); }
    finally {
      diagnostics?.destroy();
      movePad?.style.removeProperty('--stick-x');
      movePad?.style.removeProperty('--stick-y');
      delete movePad?.dataset.active;
      if (mounts.get(doc) === unmount) mounts.delete(doc);
    }
  };
  mounts.set(doc, unmount);
  setControlsEnabled(false);
  status.dataset.state = 'loading';
  status.textContent = 'Starting the world engine…';
  stopWatchingInput = watchInputModality(doc, (next) => { modality = next; describeNavigation(); renderPrompt(); });
  if (speed) speed.value = '3.2';
  const choice: QualityChoice = options.quality ?? readPreference(win) ?? 'auto';
  if (qualitySelect) qualitySelect.value = choice;
  try {
    if (import.meta.env.DEV) diagnostics = createWorldDiagnostics(doc);
    // Development-only: `?engine-test` mounts the lightweight engine scene so lifecycle tests of
    // the engine and controls do not pay for the district. Stripped from production builds.
    const params = new URLSearchParams(win.location.search);
    const governor = createGovernor({ slowFrameMs: 26, sustainMs: 4000, warmupMs: 3000 });
    let governorArmed = false;
    const engineTest = import.meta.env.DEV && params.has('engine-test');
    // Development-only: `?spawn=x,z,yaw` starts elsewhere in the district (tests and visual audits).
    const spawn = import.meta.env.DEV ? params.get('spawn')?.split(',').map(Number) : undefined;
    const devSpawn = spawn?.length === 3 && spawn.every(Number.isFinite) ? { x: spawn[0] ?? 0, z: spawn[1] ?? 0, yaw: spawn[2] ?? 0, pitch: 0 } : undefined;
    preview = createProjectPreview(doc, {
      onOpen: () => { controls?.suspend(); renderPrompt(); world?.invalidate(); },
      onClose: () => { renderPrompt(); world?.invalidate(); },
    });
    const activePreview = preview;
    hud = createHud(doc, { onMapChange: () => world?.invalidate() });
    const activeHud = hud;
    // Development-only `?auto-start=high|medium|low` starts automatic mode at a tier (tests the governor).
    const autoStart = import.meta.env.DEV ? params.get('auto-start') as QualityTier | null : null;
    const autoTier = options.autoTier ?? (autoStart && qualityTiers.includes(autoStart) ? autoStart : undefined);
    const forcedTier = choice === 'auto' ? autoTier : choice;
    if (options.resumeAt) activeHud.setProgress(0, 'Applying graphics settings…');
    const loadingLabels = options.resumeAt ? ['Applying graphics settings…'] : ['Preparing the plaza…', 'Laying the stone…', 'Filling the channels…', 'Lighting the storefronts…', 'Almost there…'];
    world = createWorld(canvas, {
      ...(engineTest ? {} : {
        content: (context) => (district = createDistrict(context, {
          ...(forcedTier ? { quality: forcedTier } : {}),
          onProgress: (fraction) => activeHud.setProgress(fraction, loadingLabels[Math.min(loadingLabels.length - 1, Math.floor(fraction * loadingLabels.length))]),
        })),
      }),
      onStateChange: showState,
      onContentReady: () => {
        if (disposed) return;
        canvas.dataset.content = 'ready'; activeHud.setProgress(1); activeHud.finishLoading();
        // Judge performance only from steady state, not from loading-time compiles and uploads.
        governor.reset(win.performance.now()); governorArmed = true;
        if (options.notice) showNotice(options.notice);
      },
      onFrameInterval: (interval, now) => {
        // Automatic mode only: a visitor's explicit choice is never overridden.
        if (choice !== 'auto' || disposed || !governorArmed || !governor.sample(interval, now)) return;
        const tier = world?.snapshot().quality;
        const next = tier === 'high' ? 'medium' : tier === 'medium' ? 'low' : undefined;
        if (next) setTimeout(() => { if (!disposed) remount({ quality: 'auto', autoTier: next, notice: 'Graphics adjusted for smoother movement.' }); }, 0);
      },
      ...(diagnostics ? { onFrame: diagnostics.update } : {}),
    });
    const activeWorld = world;
    controls = createNavigationController(canvas, world.camera, {
      invalidate: () => activeWorld.invalidate(),
      canNavigate: () => activeWorld.snapshot().state === 'running' && !activePreview.isOpen(),
      ...(engineTest ? {} : { config: { ...districtNavigation(), ...(devSpawn ? { spawn: devSpawn } : {}) } }),
      ...(options.resumeAt ? { start: options.resumeAt } : {}),
      movePad,
      onModeChange: (next) => {
        mode = next;
        canvas.dataset.navigation = next;
        describeNavigation();
        renderPrompt();
      },
      onStick: (x, y, held) => {
        if (!movePad) return;
        movePad.style.setProperty('--stick-x', x.toFixed(3));
        movePad.style.setProperty('--stick-y', y.toFixed(3));
        if (held) movePad.dataset.active = ''; else delete movePad.dataset.active;
      },
    });
    world.addSystem(controls);
    const activeDistrict = district;
    if (activeDistrict) {
      interactions = createInteractions(canvas, world.camera, {
        targets: activeDistrict.targets,
        invalidate: () => activeWorld.invalidate(),
        canInteract: () => activeWorld.snapshot().state === 'running' && !activePreview.isOpen(),
        onFocusChange: (id) => { focusedSlot = id; activeDistrict.highlight(id); minimap?.setFocus(id); renderPrompt(); },
        onActivate: (id, source) => {
          const project = projectForSlot(id);
          // Keyboard visitors return to the scene; pointer visitors keep their own focus.
          if (project) activePreview.open(project, source === 'keyboard' ? canvas : null);
        },
      });
      world.addSystem(interactions);
      const activeControls = controls;
      const reducedMotion = win.matchMedia('(prefers-reduced-motion: reduce)');
      /**
       * Jump to a storefront's framed viewpoint, then open its preview. A brief fade hides the
       * move (no camera flight through trees or walls); reduced motion moves instantly.
       */
      const jumpTo = (slot: string): void => {
        const target = activeDistrict.targets.find((t) => t.id === slot);
        if (!target || !running) return;
        activePreview.close(); activeHud.closeMenu(); clearTimeout(jumpTimer);
        const land = (): void => { activeControls.teleport({ ...target.view, pitch: 0.06 }); activeWorld.invalidate(); };
        const show = (): void => { const project = projectForSlot(slot); if (project && !disposed) activePreview.open(project, canvas); };
        if (reducedMotion.matches || !fade) { land(); show(); return; }
        fade.dataset.active = '';
        jumpTimer = setTimeout(() => {
          land(); delete fade.dataset.active;
          jumpTimer = setTimeout(show, 300);
        }, 200);
      };
      if (searchInput && searchList) search = createSearch(searchInput, searchList, showcase, (project) => jumpTo(project.slot));
      if (mapSvg) minimap = createMinimap(mapSvg, jumpTo);
      const activeMinimap = minimap;
      // Keeps the map marker in step with the camera; never requests frames itself.
      world.addSystem({
        update: () => {
          const camera = activeWorld.camera;
          if (activeHud.isMapOpen()) activeMinimap?.update(camera.position.x, camera.position.z, camera.rotation.y);
        },
        needsFrame: () => false,
        suspend: () => undefined,
        dispose: () => undefined,
      });
    }
    enter?.addEventListener('click', onEnter);
    reset?.addEventListener('click', onReset);
    speed?.addEventListener('change', onSpeed);
    qualitySelect?.addEventListener('change', onQuality);
    canvas.dataset.quality = world.snapshot().quality;
    world.start();
    win.addEventListener('pagehide', onPageHide);
    win.addEventListener('pageshow', onPageShow);
  } catch {
    unmount();
    // Keep the loading brand visible and surface the explanation on top of it.
    doc.querySelector('#world-status')?.setAttribute('data-visible', 'true');
    status.dataset.state = 'unavailable';
    status.textContent = 'The 3D world is unavailable on this browser.';
    detail.textContent = 'Try a WebGL 2-capable browser with graphics acceleration enabled. No projects have been loaded.';
    if (navigationStatus) navigationStatus.textContent = 'Navigation is unavailable until graphics recover.';
  }
  return current;
}
