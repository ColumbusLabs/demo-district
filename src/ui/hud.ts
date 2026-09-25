/**
 * Presentation-only HUD wiring: menu disclosure, map toggle, loading overlay, and the status
 * card. No world imports; the app layer connects these to the engine.
 */
export interface Hud {
  setProgress(fraction: number, label?: string): void;
  /** Dismiss the loading overlay once the district is usable. */
  finishLoading(): void;
  /** Show the status card only when the engine needs attention. */
  setStatusVisible(visible: boolean): void;
  setMapOpen(open: boolean): void;
  isMapOpen(): boolean;
  closeMenu(): void;
  destroy(): void;
}

const typing = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null;
  return Boolean(element?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])'));
};

export function createHud(doc: Document, hooks: { onMapChange?: (open: boolean) => void } = {}): Hud {
  const $ = <T extends HTMLElement>(selector: string): T | null => doc.querySelector<T>(selector);
  const menuToggle = $<HTMLButtonElement>('#menu-toggle');
  const menu = $<HTMLElement>('#menu-panel');
  const mapToggle = $<HTMLButtonElement>('#map-toggle');
  const minimap = $<HTMLElement>('#minimap');
  const loading = $<HTMLElement>('#loading');
  const bar = $<HTMLElement>('#loading-bar');
  const loadingText = $<HTMLElement>('#loading-text');
  const status = $<HTMLElement>('#world-status');
  const searchInput = $<HTMLInputElement>('#search-input');
  // The mockup's full placeholder does not fit narrow screens; keep it short there.
  const fullPlaceholder = searchInput?.placeholder ?? '';
  const narrow = doc.defaultView?.matchMedia('(max-width: 720px)');
  const fitPlaceholder = (): void => { if (searchInput) searchInput.placeholder = narrow?.matches ? 'Search the district' : fullPlaceholder; };
  fitPlaceholder();
  const removers: Array<() => void> = [];
  const listen = (target: EventTarget | null, name: string, handler: EventListener): void => {
    if (!target) return;
    target.addEventListener(name, handler);
    removers.push(() => target.removeEventListener(name, handler));
  };

  const setMenuOpen = (open: boolean, returnFocus = false): void => {
    if (!menu || !menuToggle) return;
    menu.hidden = !open;
    menuToggle.setAttribute('aria-expanded', String(open));
    if (!open && returnFocus) menuToggle.focus({ preventScroll: true });
  };
  const setMapOpen = (open: boolean): void => {
    if (!minimap || !mapToggle) return;
    if (minimap.hidden === !open) return;
    minimap.hidden = !open;
    mapToggle.setAttribute('aria-pressed', String(open));
    hooks.onMapChange?.(open);
  };
  listen(narrow ?? null, 'change', fitPlaceholder);
  listen(menuToggle, 'click', () => setMenuOpen(Boolean(menu?.hidden)));
  listen(mapToggle, 'click', () => setMapOpen(Boolean(minimap?.hidden)));
  listen(doc, 'keydown', (raw) => {
    const event = raw as KeyboardEvent;
    const inMenu = menu?.contains(doc.activeElement) || doc.activeElement === menuToggle;
    if (event.key === 'Escape' && menu && !menu.hidden && (inMenu || !typing(event.target))) { setMenuOpen(false, inMenu); event.preventDefault(); return; }
    if ((event.key === 'm' || event.key === 'M') && !event.ctrlKey && !event.metaKey && !event.altKey && !typing(event.target) && !doc.querySelector('dialog[open]')) {
      setMapOpen(Boolean(minimap?.hidden));
    }
  });
  // Clicking the scene or elsewhere closes the menu, like any disclosure.
  listen(doc, 'pointerdown', (raw) => {
    const target = raw.target as Node | null;
    if (menu && !menu.hidden && target && !menu.contains(target) && !menuToggle?.contains(target)) setMenuOpen(false);
  });

  return {
    setProgress: (fraction, label) => {
      const value = Math.max(0, Math.min(1, fraction));
      bar?.style.setProperty('--progress', value.toFixed(3));
      bar?.setAttribute('aria-valuenow', String(Math.round(value * 100)));
      if (label && loadingText) loadingText.textContent = label;
    },
    finishLoading: () => { loading?.setAttribute('data-done', ''); },
    setStatusVisible: (visible) => { status?.setAttribute('data-visible', String(visible)); },
    setMapOpen,
    isMapOpen: () => Boolean(minimap && !minimap.hidden),
    closeMenu: () => setMenuOpen(false),
    destroy: () => {
      for (const remove of removers.splice(0)) remove();
      setMenuOpen(false);
      setMapOpen(false);
      loading?.removeAttribute('data-done');
      bar?.style.setProperty('--progress', '0');
      status?.setAttribute('data-visible', 'false');
      if (searchInput) searchInput.placeholder = fullPlaceholder;
    },
  };
}
