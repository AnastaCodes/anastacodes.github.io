import chroma from 'chroma-js';

export type Hex = string;
export interface Palette { colors: [Hex, Hex, Hex, Hex, Hex]; }
export interface Theme { palette: Palette; ink: Hex; paper: Hex; accent: Hex; }

const MODES = ['analogous', 'triad', 'complement'] as const;
const wrap = (h: number) => ((h % 360) + 360) % 360;

function hueSet(base: number, mode: (typeof MODES)[number]): number[] {
  switch (mode) {
    case 'analogous': return [0, 25, 50, -25, -50].map(d => wrap(base + d));
    case 'triad':     return [0, 120, 240, 15, 135].map(d => wrap(base + d));
    case 'complement':return [0, 180, 20, 200, -20].map(d => wrap(base + d));
  }
}

export function generatePalette(
  rand: () => number = Math.random,
  locked: (Hex | null)[] = [],
): Palette {
  const base = rand() * 360;
  const mode = MODES[Math.floor(rand() * MODES.length) % MODES.length];
  const colors = hueSet(base, mode).map((h, i) =>
    locked[i] ?? chroma.hsl(h, 0.5 + 0.35 * rand(), 0.42 + 0.16 * rand()).hex(),
  ) as Palette['colors'];
  return { colors };
}

export function deriveTheme(p: Palette): Theme {
  const paper = chroma.mix('#fafaf7', p.colors[0], 0.05).hex();
  const ink = '#1c1917'; // contrast vs near-white paper stays ≥ 13
  let accent = [...p.colors].sort(
    (a, b) => chroma(b).get('hsl.s') - chroma(a).get('hsl.s'),
  )[0];
  let guard = 0;
  while (chroma.contrast(accent, paper) < 3 && guard++ < 20) {
    accent = chroma(accent).darken(0.4).hex();
  }
  return { palette: p, ink, paper, accent };
}
