/** Lightweight arrival UI: no renderer, extra asset requests, or simulated progress. */
export function createLoading(doc: Document) {
  const root = doc.querySelector<HTMLElement>('#loading');
  const bar = doc.querySelector<HTMLElement>('#loading-bar');
  const label = doc.querySelector<HTMLElement>('#loading-text');
  const percent = doc.querySelector<HTMLElement>('#loading-percent');
  const tip = doc.querySelector<HTMLElement>('#loading-tip');
  const canvas = doc.querySelector<HTMLElement>('#world-canvas');
  const hud = doc.querySelector<HTMLElement>('.hud');
  let finished = false;
  let ready = false;
  let minimumElapsed = false;
  let destroyed = false;
  let hasError = false;
  let progress = 0;
  let tipIndex = 0;
  let dismiss: ReturnType<typeof setTimeout> | undefined;
  const tips = [
    'Walk a little. Find something unexpected.',
    'Every storefront is a category. Every demo has a creator.',
    'See something interesting? Open its storefront to explore.',
    'Use search or the map to go straight to a discovery.',
  ];
  const visibility = (): void => { root?.toggleAttribute('data-paused', doc.hidden); };
  visibility();
  doc.addEventListener('visibilitychange', visibility);
  if (root) { root.hidden = false; root.removeAttribute('data-done'); root.removeAttribute('data-error'); root.setAttribute('aria-busy', 'true'); }
  if (hud) hud.inert = true;
  if (canvas) canvas.inert = true;
  const tipTimer = setInterval(() => {
    if (finished || doc.hidden || root?.hasAttribute('data-error') || !tip) return;
    tipIndex = (tipIndex + 1) % tips.length;
    tip.textContent = tips[tipIndex] ?? tips[0]!;
  }, 5500);
  const setProgress = (fraction: number, text?: string): void => {
    if (ready || destroyed || !Number.isFinite(fraction)) return;
    // Asset progress reserves the last 4% for the engine's ready signal.
    progress = Math.max(progress, Math.min(.96, Math.max(0, fraction) * .96));
    bar?.style.setProperty('--progress', progress.toFixed(3));
    bar?.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    root?.style.setProperty('--arrival', progress.toFixed(3));
    root?.setAttribute('data-stage', String(Math.min(3, Math.floor(progress * 4))));
    root?.querySelectorAll<HTMLElement>('[data-stop]').forEach((stop, i) => stop.toggleAttribute('data-reached', progress >= i * .45));
    if (percent) percent.innerHTML = `${Math.round(progress * 100)}<span>%</span>`;
    if (text && label) label.textContent = text;
  };
  setProgress(0, 'Getting the neighborhood ready…');
  const reveal = (): void => {
    if (!ready || !minimumElapsed || finished || destroyed || hasError) return;
    finished = true;
    clearInterval(tipTimer);
    root?.setAttribute('data-done', '');
    if (hud) hud.inert = false;
    if (canvas) canvas.inert = false;
    dismiss = setTimeout(() => { if (root) root.hidden = true; }, doc.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches ? 150 : 650);
  };
  // Keep the welcome visible for four seconds, while world loading runs concurrently.
  const minimumTimer = setTimeout(() => { minimumElapsed = true; reveal(); }, 4000);
  return {
    isActive: (): boolean => !finished,
    setProgress,
    finish: (): void => {
      if (ready || destroyed) return;
      ready = true;
      clearInterval(tipTimer);
      bar?.style.setProperty('--progress', '1');
      bar?.setAttribute('aria-valuenow', '100');
      root?.style.setProperty('--arrival', '1');
      root?.setAttribute('data-stage', '3');
      root?.setAttribute('aria-busy', 'false');
      if (percent) percent.innerHTML = '100<span>%</span>';
      if (label) label.textContent = 'Welcome to Demo District.';
      if (tip) tip.textContent = doc.documentElement.dataset.input === 'touch'
        ? 'Drag to look around. Use the thumbstick to walk.'
        : 'WASD to walk. Drag to look around.';
      reveal();
    },
    error: (value: boolean): void => { hasError = value; root?.toggleAttribute('data-error', value); if (!value) reveal(); },
    destroy: (): void => {
      destroyed = true;
      clearInterval(tipTimer); clearTimeout(dismiss); clearTimeout(minimumTimer);
      doc.removeEventListener('visibilitychange', visibility);
      if (hud) hud.inert = false;
      if (canvas) canvas.inert = false;
    },
  };
}
