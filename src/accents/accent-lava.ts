import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { HeroAccent } from './types';
import type { Theme } from '../palette-engine';

gsap.registerPlugin(ScrollTrigger);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const BLOBS = 10;
const GOO_ID = 'lava-goo-filter';

function ensureGooFilter(): void {
  if (document.getElementById(GOO_ID)) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0';
  svg.innerHTML = `<defs><filter id="${GOO_ID}">
    <feGaussianBlur in="SourceGraphic" stdDeviation="22" result="b"/>
    <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -13"/>
  </filter></defs>`;
  document.body.append(svg);
}

export function createLavaAccent(): HeroAccent {
  let layer: HTMLElement;
  const tweens: gsap.core.Tween[] = [];

  return {
    mount(_el: HTMLElement) {
      ensureGooFilter();
      layer = document.createElement('div');
      layer.setAttribute('aria-hidden', 'true');
      layer.style.cssText = [
        'position:fixed', 'inset:0', 'width:100%', 'height:100%',
        'z-index:0', 'pointer-events:none', 'overflow:hidden',
        `filter:url(#${GOO_ID})`,
        '-webkit-mask-image:linear-gradient(to bottom, black 55%, transparent 100%)',
        'mask-image:linear-gradient(to bottom, black 55%, transparent 100%)',
      ].join(';');
      document.body.prepend(layer);

      for (let i = 0; i < BLOBS; i++) {
        const blob = document.createElement('div');
        const size = 14 + Math.random() * 16;                    // vh
        const x = 46 + Math.random() * 46;                       // % ширины — правая зона
        const startY = Math.random() * 110 - 10;                 // % высоты
        blob.style.cssText = [
          'position:absolute', 'border-radius:50%',
          `width:${size}vh`, `height:${size}vh`,
          `left:${x}%`, `top:${startY}%`,
          `background:var(--c${(i % 5) + 1})`,
        ].join(';');
        layer.append(blob);

        if (!reduced) {
          // медленное всплывание/опускание, как воск в лампе
          tweens.push(gsap.to(blob, {
            top: `${Math.max(-15, startY - (35 + Math.random() * 55))}%`,
            duration: 14 + Math.random() * 16,
            yoyo: true, repeat: -1, ease: 'sine.inOut',
            delay: -Math.random() * 20,
          }));
          // лёгкий дрейф вбок и «дыхание» размера
          tweens.push(gsap.to(blob, {
            xPercent: (Math.random() - 0.5) * 60,
            scale: 0.85 + Math.random() * 0.4,
            duration: 9 + Math.random() * 9,
            yoyo: true, repeat: -1, ease: 'sine.inOut',
            delay: -Math.random() * 12,
          }));
        }
      }

      if (!reduced) {
        gsap.fromTo(layer, { opacity: 0.9 }, {
          opacity: 0.07, ease: 'none',
          scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true },
        });
      } else {
        layer.style.opacity = '0.55';
      }
    },
    onPalette(_t: Theme) { /* капли красятся через var(--cN) — переход палитры бесплатно */ },
    destroy() {
      tweens.forEach(t => t.kill());
      layer.remove();
    },
  };
}
