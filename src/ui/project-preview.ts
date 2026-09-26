import type { ShowcaseProject } from '../data/showcase.ts';

export interface ProjectPreview {
  open(project: ShowcaseProject, returnFocus?: HTMLElement | null): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}

/**
 * The 2D project layer over the world: a modal dialog (native focus containment and Escape)
 * with attribution, model, description, a rating placeholder, and deliberate external actions.
 * Sample listings have no links, so nothing external can open from the preview yet.
 */
export function createProjectPreview(doc: Document, hooks: { onOpen?: () => void; onClose?: () => void }): ProjectPreview {
  const dialog = doc.querySelector<HTMLDialogElement>('#project-preview');
  const field = (id: string): HTMLElement | null => doc.querySelector<HTMLElement>(`#${id}`);
  let returnTo: HTMLElement | null = null;
  const setLink = (element: HTMLElement | null, url: string | undefined): void => {
    if (!(element instanceof HTMLAnchorElement)) return;
    if (url) { element.href = url; element.removeAttribute('aria-disabled'); }
    else { element.removeAttribute('href'); element.setAttribute('aria-disabled', 'true'); }
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
  dialog?.addEventListener('close', onClose);
  dialog?.addEventListener('pointerdown', onPress);
  dialog?.addEventListener('click', onClick);
  return {
    open: (project, focusAfter = null) => {
      if (!dialog) return;
      const text = (id: string, value: string): void => { const el = field(id); if (el) el.textContent = value; };
      text('preview-category', project.category);
      text('preview-title', project.title);
      text('preview-creator', project.creator);
      text('preview-model', project.model);
      text('preview-description', project.description);
      field('preview-sample')?.toggleAttribute('hidden', !project.sample);
      field('preview-note')?.toggleAttribute('hidden', Boolean(project.projectUrl));
      setLink(field('preview-launch'), project.projectUrl);
      setLink(field('preview-source'), project.sourcePostUrl);
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
      returnTo = null;
      if (dialog?.open) dialog.close();
    },
  };
}
