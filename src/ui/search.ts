import type { ShowcaseProject } from '../data/showcase.ts';

/** Case-insensitive match of every query word against title, creator, model, and category. */
export function searchProjects(projects: readonly ShowcaseProject[], query: string, limit = 6): ShowcaseProject[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored = projects.map((project) => {
    const title = project.title.toLowerCase();
    const haystack = `${title} ${project.creator} ${project.model} ${project.category}`.toLowerCase();
    if (!words.every((word) => haystack.includes(word))) return null;
    // Title prefix matches first, then title matches, then everything else.
    const score = words.reduce((sum, word) => sum + (title.startsWith(word) ? 3 : title.includes(word) ? 2 : 1), 0);
    return { project, score };
  }).filter((entry): entry is { project: ShowcaseProject; score: number } => entry !== null);
  return scored.sort((a, b) => b.score - a.score || a.project.title.localeCompare(b.project.title)).slice(0, limit).map((entry) => entry.project);
}

export interface SearchBox { clear(): void; destroy(): void }

/** ARIA combobox: type to filter, arrows to move, Enter to choose, Escape to clear. */
export function createSearch(input: HTMLInputElement, list: HTMLUListElement, projects: readonly ShowcaseProject[], onPick: (project: ShowcaseProject) => void): SearchBox {
  const doc = input.ownerDocument;
  let results: ShowcaseProject[] = [];
  let active = -1;
  const optionId = (i: number): string => `search-option-${i}`;
  const render = (): void => {
    const open = input.value.trim().length > 0;
    list.hidden = !open;
    input.setAttribute('aria-expanded', String(open));
    if (!open) { list.replaceChildren(); input.removeAttribute('aria-activedescendant'); return; }
    if (!results.length) {
      const empty = doc.createElement('li'); empty.className = 'empty'; empty.textContent = 'No storefronts match yet.';
      list.replaceChildren(empty); input.removeAttribute('aria-activedescendant'); return;
    }
    list.replaceChildren(...results.map((project, i) => {
      const item = doc.createElement('li');
      item.id = optionId(i); item.setAttribute('role', 'option'); item.setAttribute('aria-selected', String(i === active));
      const title = doc.createElement('strong'); title.textContent = project.title;
      const meta = doc.createElement('span'); meta.textContent = `${project.category} · ${project.creator}`;
      item.append(title, meta);
      // Pointer-down keeps focus in the input so the pick is not lost to a blur.
      item.addEventListener('pointerdown', (event) => { event.preventDefault(); });
      item.addEventListener('click', () => pick(i));
      return item;
    }));
    if (active >= 0) input.setAttribute('aria-activedescendant', optionId(active)); else input.removeAttribute('aria-activedescendant');
  };
  const clear = (): void => { input.value = ''; results = []; active = -1; render(); };
  const pick = (i: number): void => {
    const project = results[i];
    if (!project) return;
    clear(); input.blur(); onPick(project);
  };
  const onInput = (): void => { results = searchProjects(projects, input.value); active = results.length ? 0 : -1; render(); };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!results.length) return;
      event.preventDefault();
      active = (active + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
      render();
    } else if (event.key === 'Enter') {
      if (active >= 0) { event.preventDefault(); pick(active); }
    } else if (event.key === 'Escape') {
      if (input.value) { event.preventDefault(); clear(); } else input.blur();
    }
  };
  const onBlur = (): void => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); };
  const onFocus = (): void => { if (input.value) render(); };
  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onKey);
  input.addEventListener('blur', onBlur);
  input.addEventListener('focus', onFocus);
  return {
    clear,
    destroy: () => {
      input.removeEventListener('input', onInput); input.removeEventListener('keydown', onKey);
      input.removeEventListener('blur', onBlur); input.removeEventListener('focus', onFocus);
      clear();
    },
  };
}
