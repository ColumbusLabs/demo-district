export type InputModality = 'touch' | 'pointer';

/**
 * Presentation only: chooses which hints and on-screen controls to show via `html[data-input]`.
 * Navigation itself accepts every input regardless. Starts from the primary pointer, then follows
 * the most recent pointer so hybrid touch laptops switch when they are actually touched.
 */
export function watchInputModality(doc: Document, onChange: (modality: InputModality) => void): () => void {
  const root = doc.documentElement;
  const apply = (modality: InputModality): void => {
    if (root.dataset.input === modality) return;
    root.dataset.input = modality;
    onChange(modality);
  };
  const primaryTouch = doc.defaultView?.matchMedia('(hover: none) and (pointer: coarse)').matches ?? false;
  root.dataset.input = primaryTouch ? 'touch' : 'pointer';
  onChange(primaryTouch ? 'touch' : 'pointer');
  const onPointer = (event: PointerEvent): void => { apply(event.pointerType === 'mouse' ? 'pointer' : 'touch'); };
  doc.addEventListener('pointerdown', onPointer, true);
  return () => doc.removeEventListener('pointerdown', onPointer, true);
}
