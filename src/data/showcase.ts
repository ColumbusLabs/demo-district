/**
 * District listings. Real records point at a creator's own public experience and the post it
 * came from; they are linked out to, never embedded or hosted. Creators are credited by public
 * handle only. Sample entries stay flagged `sample`, carry no URLs, and fill the empty slots
 * until more real projects are listed. Slice 23 later moves this shape into D1.
 */
export interface ShowcaseProject {
  id: string;
  /** District slot (pavilion id from the layout) the project occupies. */
  slot: string;
  title: string;
  /** Public handle (for real records) or the sample placeholder. */
  creator: string;
  model: string;
  category: string;
  description: string;
  sample: boolean;
  /** External experience and source post; absent for samples, so nothing can launch. */
  projectUrl?: string;
  sourcePostUrl?: string;
  /** How the project was made, as the creator reported it in the source post. */
  build?: { minutes: number; costUsd: number; attempts: 'one shot' | 'iterated' };
  /** Which storefront installation the window shows; defaults to the category's. */
  exhibit?: ExhibitKind;
}

/** Storefront installations; the first eight match the artwork atlas tiles, in order. */
export const exhibitKinds = ['Art', 'Worlds', 'Music', 'Games', 'Stories', 'Tools', 'Experiments', 'Learning', 'Lens'] as const;
export type ExhibitKind = typeof exhibitKinds[number];

const sample = (slot: string, category: string, title: string, description: string): ShowcaseProject => ({
  id: slot, slot, title, category, description, sample: true,
  creator: 'Sample creator', model: 'Model to be listed',
});

export const showcase: readonly ShowcaseProject[] = [
  {
    id: 'plane-of-focus', slot: 'east-gate', sample: false,
    title: 'The Plane of Focus', creator: '@RyanSael', model: 'Claude Opus 5.5', category: 'Learning',
    description: 'An interactive lens lab that explains camera focus. Turn the focus ring and watch the glass elements move the sharp plane through a miniature scene; open the aperture to see how much of it stays sharp.',
    projectUrl: 'https://lens.lab.sael.net/',
    sourcePostUrl: 'https://x.com/RyanSael/status/2102591147927654847',
    build: { minutes: 86, costUsd: 25.66, attempts: 'one shot' },
    exhibit: 'Lens',
  },
  sample('west-gate', 'Art', 'Gallery of Small Wonders', 'A placeholder gallery storefront. Real creator work, credits, and links arrive as projects are listed.'),
  sample('west-promenade', 'Music', 'Tidepool Synth', 'A placeholder for an interactive music toy.'),
  sample('east-promenade', 'Games', 'Paper Comet', 'A placeholder for a small browser game.'),
  sample('west-grove', 'Stories', 'The Quiet Atlas', 'A placeholder for interactive fiction.'),
  sample('east-grove', 'Tools', 'Loom Studio', 'A placeholder for a creative tool.'),
  sample('west-plaza', 'Experiments', 'Signal Garden', 'A placeholder for a generative experiment.'),
  sample('east-plaza', 'Worlds', 'Lantern Coast', 'A placeholder for an explorable browser world. Nothing loads until a real project is listed and you choose to open it.'),
];

export const projectForSlot = (slot: string): ShowcaseProject | undefined => showcase.find((p) => p.slot === slot);

/** The installation a slot's window shows: the listing's own, else its category's. */
export function exhibitForSlot(slot: string): ExhibitKind {
  const project = projectForSlot(slot);
  const kind = project?.exhibit ?? project?.category;
  if (!kind || !(exhibitKinds as readonly string[]).includes(kind)) throw new Error(`No storefront exhibit for ${slot}`);
  return kind as ExhibitKind;
}

/** "1 h 26 min · one shot · $25.66 API" */
export function buildSummary(build: NonNullable<ShowcaseProject['build']>): string {
  const h = Math.floor(build.minutes / 60); const m = build.minutes % 60;
  const time = h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
  return `${time} · ${build.attempts} · $${build.costUsd.toFixed(2)} API`;
}

/** Host shown next to the launch button so the destination is never a surprise. */
export const destinationHost = (url: string): string => new URL(url).host;
