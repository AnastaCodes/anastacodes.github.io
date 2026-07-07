import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { HeroAccent } from './types';
import type { Hex, Theme } from '../palette-engine';

gsap.registerPlugin(ScrollTrigger);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createPaletteAccent(setLock: (i: number, c: Hex | null) => void): HeroAccent {
  let root: HTMLElement;
  const buttons: HTMLButtonElement[] = [];
  const lockedAt: (Hex | null)[] = [null, null, null, null, null];

  return {
    mount(el) {
      root = document.createElement('div');
      root.style.cssText = 'display:flex;flex:1;min-height:40svh;border-radius:14px;overflow:hidden';
      for (let i = 0; i < 5; i++) {
        const b = document.createElement('button');
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-label', `Lock color ${i + 1}`);
        b.style.cssText = `flex:1;border:0;cursor:pointer;background:var(--c${i + 1});display:flex;align-items:flex-end;justify-content:center;padding-bottom:.6rem;color:#fff;font-size:1rem`;
        b.addEventListener('click', () => {
          const cur = getComputedStyle(document.documentElement).getPropertyValue(`--c${i + 1}`).trim();
          lockedAt[i] = lockedAt[i] ? null : cur;
          setLock(i, lockedAt[i]);
          b.textContent = lockedAt[i] ? '🔒' : '';
          b.setAttribute('aria-pressed', String(!!lockedAt[i]));
        });
        buttons.push(b);
        root.append(b);
      }
      el.append(root);
      if (!reduced) {
        buttons.forEach((b, i) => gsap.to(b, {
          flexGrow: 1.6, yoyo: true, repeat: -1, duration: 2.4, delay: i * 0.3, ease: 'sine.inOut',
          scrollTrigger: { trigger: root, toggleActions: 'play pause resume pause' },
        }));
      }
    },
    onPalette(_t: Theme) { /* цвета приходят через CSS-переменные — здесь ничего не нужно */ },
    destroy() { ScrollTrigger.getAll().forEach(s => s.kill()); root.remove(); },
  };
}
