import './styles/main.scss';
import gsap from 'gsap';
import chroma from 'chroma-js';
import {
  generatePalette, deriveTheme, setTheme, currentTheme,
  encodeHash, decodeHash, applyTheme, type Theme, type Hex,
} from './palette-engine';
import { config } from './config';
import { renderWork } from './sections/work';
import type { HeroAccent } from './accents/types';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const accents: HeroAccent[] = [];
const locked: (Hex | null)[] = [null, null, null, null, null];

function shuffle(): void {
  const next = deriveTheme(generatePalette(Math.random, locked));
  const prev = currentTheme();
  history.replaceState(null, '', `#p=${encodeHash(next.palette)}`);
  if (!prev || reduced) { setTheme(next); return; }
  const t = { p: 0 };
  gsap.to(t, {
    p: 1, duration: 0.8, ease: 'power2.inOut',
    onUpdate: () => {
      const mix = (a: string, b: string) => chroma.mix(a, b, t.p, 'oklab').hex();
      const blend: Theme = {
        palette: { colors: prev.palette.colors.map((c, i) => mix(c, next.palette.colors[i])) as Theme['palette']['colors'] },
        ink: next.ink,
        paper: mix(prev.paper, next.paper),
        accent: mix(prev.accent, next.accent),
      };
      applyTheme(blend);
    },
    onComplete: () => setTheme(next),
  });
}

export function setLock(i: number, color: Hex | null): void { locked[i] = color; }

function mounted(a: HeroAccent, host: HTMLElement): HeroAccent {
  a.mount(host);
  const t = currentTheme();
  if (t) a.onPalette(t);
  window.addEventListener('palette:change', e => a.onPalette((e as CustomEvent<Theme>).detail));
  return a;
}

async function boot(): Promise<void> {
  const fromHash = decodeHash(location.hash.slice(1));
  setTheme(deriveTheme(fromHash ?? generatePalette()));
  renderWork(document.querySelector('#work-list')!);

  const host = document.querySelector<HTMLElement>('#accent-host')!;
  if (config.accents.includes('palette')) {
    const { createPaletteAccent } = await import('./accents/accent-palette');
    accents.push(mounted(createPaletteAccent(setLock), host));
  }
  if (config.accents.includes('blob') && !reduced) {
    import('./accents/accent-blob').then(({ createBlobAccent }) =>
      accents.push(mounted(createBlobAccent(), host)));
  }

  document.querySelector('#shuffle')!.addEventListener('click', shuffle);
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); shuffle(); }
  });

  const { initReveals } = await import('./sections/reveal');
  initReveals();
}

boot();
