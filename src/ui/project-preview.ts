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
 * Each demo names its external host before the visitor deliberately opens it in the top browser context.
 */
export function createProjectPreview(doc: Document, hooks: { onOpen?: () => void; onClose?: () => void }): ProjectPreview {
  const win = doc.defaultView;
  const dialog = doc.querySelector<HTMLDialogElement>('#project-preview');
  const field = (id: string): HTMLElement | null => doc.querySelector<HTMLElement>(`#${id}`);
  const text = (id: string, value: string): void => { const el = field(id); if (el) el.textContent = value; };
  const show = (id: string, visible: boolean): void => { field(id)?.toggleAttribute('hidden', !visible); };
  const launch = field('preview-launch');
  const copy = field('preview-copy');
  const address = doc.querySelector<HTMLInputElement>('#preview-url');
  let destroyed = false;
  const prev = field('preview-prev');
  const next = field('preview-next');
  let slot = '';
  let list: ShowcaseProject[] = [];
  let index = 0;
  let returnTo: HTMLElement | null = null;

  const render = (): void => {
    text('preview-link-status', 'If the demo doesn’t open here, copy its address into your browser.');
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
      if (address) address.value = '';
      return;
    }
    text('preview-title', project.title);
    text('preview-creator', project.creator);
    text('preview-model', project.model);
    text('preview-description', project.description);
    text('preview-build', project.build ? buildSummary(project.build) : '');
    show('preview-build-row', Boolean(project.build));
    text('preview-host', destinationHost(project.projectUrl));
    if (address) address.value = project.projectUrl;
    if (launch instanceof HTMLAnchorElement) launch.href = project.projectUrl;
  };
  const step = (delta: number): void => {
    if (list.length < 2) return;
    index = (index + delta + list.length) % list.length;
    render();
  };
  const onPrev = (): void => step(-1);
  const onNext = (): void => step(1);
  // Keep the primary action a native link: no preventDefault, popup, or scripted frame fallback.
  // A user-activated target="_top" works in hosts that allow top navigation but block popups.
  // When a host forbids external navigation altogether, the visible address remains usable.
  const onCopy = async (): Promise<void> => {
    const url = list[index]?.projectUrl;
    if (!url) return;
    try {
      if (!win?.navigator.clipboard) throw new Error('Clipboard unavailable');
      await win.navigator.clipboard.writeText(url);
      if (!destroyed && list[index]?.projectUrl === url) text('preview-link-status', 'Link copied. Paste it into your browser.');
    } catch {
      if (destroyed || list[index]?.projectUrl !== url) return;
      address?.focus(); address?.select();
      text('preview-link-status', 'Select and copy the address above, then paste it into your browser.');
    }
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
  copy?.addEventListener('click', onCopy);
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
      destroyed = true;
      copy?.removeEventListener('click', onCopy);
      prev?.removeEventListener('click', onPrev);
      next?.removeEventListener('click', onNext);
      returnTo = null;
      if (dialog?.open) dialog.close();
    },
  };
}
