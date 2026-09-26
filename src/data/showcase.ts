/**
 * District contents. Each storefront is a category building that holds any number of projects;
 * what a building shows in its window belongs to the category, never to one project. Projects
 * link out to the creator's own public experience (never embedded or hosted) and credit the
 * creator by public handle only. Slice 23 later moves this shape into D1.
 */

/** Building categories, in artwork-atlas order (tile index = installation kind). */
export const categories = ['Art', 'Worlds', 'Music', 'Games', 'Stories', 'Tools', 'Experiments', 'Learning'] as const;
export type Category = typeof categories[number];

export interface Building {
  /** District slot (pavilion id from the layout). */
  slot: string;
  category: Category;
}

export interface ShowcaseProject {
  id: string;
  /** The building (slot) the project is listed in. */
  slot: string;
  title: string;
  /** Public handle, e.g. "@name". */
  creator: string;
  model: string;
  description: string;
  projectUrl: string;
  /** How the project was made, as the creator reported it. */
  build?: { minutes: number; costUsd: number; attempts: 'one shot' | 'iterated' };
}

export const buildings: readonly Building[] = [
  { slot: 'west-gate', category: 'Art' },
  { slot: 'east-gate', category: 'Learning' },
  { slot: 'west-promenade', category: 'Music' },
  { slot: 'east-promenade', category: 'Games' },
  { slot: 'west-grove', category: 'Stories' },
  { slot: 'east-grove', category: 'Tools' },
  { slot: 'west-plaza', category: 'Experiments' },
  { slot: 'east-plaza', category: 'Worlds' },
];

export const projects: readonly ShowcaseProject[] = [
  {
    id: 'plane-of-focus', slot: 'east-gate',
    title: 'The Plane of Focus', creator: '@RyanSael', model: 'Claude Opus 5.5',
    description: 'An interactive lens lab that explains camera focus. Turn the focus ring and watch the glass elements move the sharp plane through a miniature scene; open the aperture to see how much of it stays sharp.',
    projectUrl: 'https://lens.lab.sael.net/',
    build: { minutes: 86, costUsd: 25.66, attempts: 'one shot' },
  },
];

export const buildingForSlot = (slot: string): Building | undefined => buildings.find((b) => b.slot === slot);
export const projectsInBuilding = (slot: string): ShowcaseProject[] => projects.filter((p) => p.slot === slot);
export const categoryOf = (project: ShowcaseProject): Category | undefined => buildingForSlot(project.slot)?.category;

/** "1 demo", "3 demos", or "Coming soon". */
export function demoCount(slot: string): string {
  const n = projectsInBuilding(slot).length;
  return n ? `${n} demo${n === 1 ? '' : 's'}` : 'Coming soon';
}

/** "1 h 26 min · one shot · $25.66 API" */
export function buildSummary(build: NonNullable<ShowcaseProject['build']>): string {
  const h = Math.floor(build.minutes / 60); const m = build.minutes % 60;
  const time = h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
  return `${time} · ${build.attempts} · $${build.costUsd.toFixed(2)} API`;
}

/** Host shown next to the launch button so the destination is never a surprise. */
export const destinationHost = (url: string): string => new URL(url).host;
