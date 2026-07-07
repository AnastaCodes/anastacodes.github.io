// Минимальная версия для Task 5 — заменяется полной в Task 6.
import type { HeroAccent } from './types';
import type { Hex } from '../palette-engine';

export function createPaletteAccent(_setLock: (i: number, c: Hex | null) => void): HeroAccent {
  let root: HTMLElement;
  return {
    mount(el) {
      root = document.createElement('div');
      root.style.cssText = 'display:flex;flex:1';
      el.append(root);
      for (let i = 1; i <= 5; i++) {
        const d = document.createElement('div');
        d.style.cssText = `flex:1;background:var(--c${i})`;
        root.append(d);
      }
    },
    onPalette() {},
    destroy() { root.remove(); },
  };
}
