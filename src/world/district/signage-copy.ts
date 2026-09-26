/**
 * All in-world wording in one place. Placeholder copy modelled on the mockup's typography;
 * the words themselves are expected to be rewritten (user, 2026-09-24).
 */
export const signCopy = {
  plinths: [
    { label: 'CREATORS', arrow: 'left' as const },
    { label: 'DISCOVER', arrow: 'right' as const },
  ],
  /** Stacked words on the gate pavilions' side walls, as in the mockup. */
  gateWalls: { 'west-gate': ['ART', 'PEOPLE', 'IDEAS', 'WORLDS'], 'east-gate': ['SMALL', 'WORLDS', 'BIG', 'PEOPLE'] } as Record<string, string[]>,
  banners: [
    ['A', 'BRIGHTER', 'MORE', 'CREATIVE', 'INTERNET'],
    ['EXPLORE', 'MEET', 'CREATE', 'TOGETHER'],
  ],
};

/** Gate slab wording when a real listing occupies a gate pavilion: short lines, all caps. */
export function nowShowing(title: string, creator: string): string[] {
  const lines: string[] = [];
  for (const word of title.toUpperCase().split(/\s+/)) {
    const last = lines.length - 1;
    if (last >= 0 && `${lines[last]} ${word}`.length <= 10) lines[last] += ` ${word}`;
    else lines.push(word);
  }
  return ['NOW SHOWING', '', ...lines, '', creator.toUpperCase()];
}
