import { buildingForSlot, buildSummary, destinationHost, projectsInBuilding } from '../data/showcase.ts';
import type { ShowcaseProject } from '../data/showcase.ts';

export interface ProjectPreview {
  /** Show a building's demos, starting at `projectId` when given. */
  open(slot: string, returnFocus?: HTMLElement | null, projectId?: string): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}

/**
 * The 2D building layer over the world: a modal dialog (native focus containment and Escape)
 * listing the demos in one building, one at a time, with previous/next when there are several.
 * Each demo names its external host before the visitor deliberately opens it in a new tab.
 */
export function createProjectPreview(doc: Document, hooks: { onOpen?: () => void; onClose?: () => void }): ProjectPreview {
  const win = doc.defaultView;
  const dialog = doc.querySelector<HTMLDialogElement>('#project-preview');
  const field = (id: string): HTMLElement | null => doc.querySelector<HTMLElement>(`#${id}`);
  const text = (id: string, value: string): void => { const el = field(id); if (el) el.textContent = value; };
  const show = (id: string, visible: boolean): void => { field(id)?.toggleAttribute('hidden', !visible); };
  const launch = field('preview-launch');
  const prev = field('preview-prev');
  const next = field('preview-next');
  let slot = '';
  let list: ShowcaseProject[] = [];
  let index = 0;
  let returnTo: HTMLElement | null = null;

  const render = (): void => {
    const building = buildingForSlot(slot);
    const project = list[index];
    text('preview-category', project ? building?.category ?? '' : 'Coming soon');
    text('preview-count', list.length > 1 ? `${index + 1} of ${list.length}` : '');
    show('preview-pager', list.length > 1);
    show('preview-project', Boolean(project));
    show('preview-empty', !project);
    if (!project) {
      text('preview-title', building?.category ?? '');
      text('preview-empty-text', `No demos in ${building?.category ?? 'this building'} yet. New demos appear here as they are listed.`);
      launch?.removeAttribute('href');
      return;
    }
    text('preview-title', project.title);
    text('preview-creator', project.creator);
    text('preview-model', project.model);
    text('preview-description', project.description);
    text('preview-build', project.build ? buildSummary(project.build) : '');
    show('preview-build-row', Boolean(project.build));
    text('preview-host', destinationHost(project.projectUrl));
    if (launch instanceof HTMLAnchorElement) launch.href = project.projectUrl;
  };
  const step = (delta: number): void => {
    if (list.length < 2) return;
    index = (index + delta + list.length) % list.length;
    render();
  };
  const onPrev = (): void => step(-1);
  const onNext = (): void => step(1);
  /**
   * The link opens a new tab. Some hosts frame the page in a sandbox that silently blocks new
   * tabs; when the browser refuses one, leave Demo District in this tab instead of doing nothing.
   */
  const onLaunch = (event: MouseEvent): void => {
    const url = list[index]?.projectUrl;
    if (!url || !win) { event.preventDefault(); return; }
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    let opened: Window | null = null;
    try { opened = win.open(url, '_blank'); } catch { opened = null; }
    if (opened) { try { opened.opener = null; } catch { /* cross-origin already */ } return; }
    try { (win.top ?? win).location.assign(url); } catch { win.location.assign(url); }
  };
  const onClose = (): void => {
    const target = returnTo; returnTo = null;
    hooks.onClose?.();
    if (target?.isConnected) target.focus({ preventScroll: true });
  };
  // A backdrop click closes the preview, but only if the press also began on the backdrop: the
  // tap that opened the preview produces a trailing click that would otherwise close it at once.
  let pressedBackdrop = false;
  const onPress = (event: PointerEvent): void => { pressedBackdrop = event.target === dialog; };
  const onClick = (event: MouseEvent): void => {
    if (event.target === dialog && pressedBackdrop) dialog?.close();
    pressedBackdrop = false;
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLInputElement) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
  };
  dialog?.addEventListener('close', onClose);
  dialog?.addEventListener('pointerdown', onPress);
  dialog?.addEventListener('click', onClick);
  dialog?.addEventListener('keydown', onKey);
  launch?.addEventListener('click', onLaunch);
  prev?.addEventListener('click', onPrev);
  next?.addEventListener('click', onNext);
  return {
    open: (id, focusAfter = null, projectId) => {
      if (!dialog) return;
      slot = id;
      list = projectsInBuilding(id);
      index = Math.max(0, list.findIndex((p) => p.id === projectId));
      render();
      returnTo = focusAfter;
      pressedBackdrop = false;
      if (!dialog.open) { dialog.showModal(); hooks.onOpen?.(); }
      field('preview-close')?.focus({ preventScroll: true });
    },
    close: () => { if (dialog?.open) dialog.close(); },
    isOpen: () => Boolean(dialog?.open),
    destroy: () => {
      dialog?.removeEventListener('close', onClose);
      dialog?.removeEventListener('pointerdown', onPress);
      dialog?.removeEventListener('click', onClick);
      dialog?.removeEventListener('keydown', onKey);
      launch?.removeEventListener('click', onLaunch);
      prev?.removeEventListener('click', onPrev);
      next?.removeEventListener('click', onNext);
      returnTo = null;
      if (dialog?.open) dialog.close();
    },
  };
}
