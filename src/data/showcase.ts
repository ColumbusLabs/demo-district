/**
 * Sample showcase content for the world preview. Not real projects or creators: every entry
 * is flagged `sample` and has no external URL. Slice 23 defines the durable project contract;
 * until then this stays deliberately small and obviously placeholder.
 */
export interface ShowcaseProject {
  id: string;
  /** District slot (pavilion id from the layout) the project occupies. */
  slot: string;
  title: string;
  creator: string;
  model: string;
  category: string;
  description: string;
  sample: true;
  /** External experience and source post; absent for samples, so nothing can launch. */
  projectUrl?: string;
  sourcePostUrl?: string;
}

const sample = (slot: string, category: string, title: string, description: string): ShowcaseProject => ({
  id: slot, slot, title, category, description, sample: true,
  creator: 'Sample creator', model: 'Model to be listed',
});

export const showcase: readonly ShowcaseProject[] = [
  sample('west-gate', 'Art', 'Gallery of Small Wonders', 'A placeholder gallery storefront. Real creator work, credits, and links arrive with project records.'),
  sample('east-gate', 'Worlds', 'Lantern Coast', 'A placeholder for an explorable browser world. Nothing loads until a real project is listed and you choose to open it.'),
  sample('west-promenade', 'Music', 'Tidepool Synth', 'A placeholder for an interactive music toy.'),
  sample('east-promenade', 'Games', 'Paper Comet', 'A placeholder for a small browser game.'),
  sample('west-grove', 'Stories', 'The Quiet Atlas', 'A placeholder for interactive fiction.'),
  sample('east-grove', 'Tools', 'Loom Studio', 'A placeholder for a creative tool.'),
  sample('west-plaza', 'Experiments', 'Signal Garden', 'A placeholder for a generative experiment.'),
  sample('east-plaza', 'Learning', 'Orbit Primer', 'A placeholder for an interactive explainer.'),
];

export const projectForSlot = (slot: string): ShowcaseProject | undefined => showcase.find((p) => p.slot === slot);
