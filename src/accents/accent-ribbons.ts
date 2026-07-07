import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { HeroAccent } from './types';
import type { Theme } from '../palette-engine';

gsap.registerPlugin(ScrollTrigger);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Band {
  base: number; width: number; amp: number;
  freq: number; speed: number; phase: number;
}

const POINTS = 48;

export function createRibbonsAccent(): HeroAccent {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let raf = 0;
  let W = 0, H = 0;

  const bands: Band[] = Array.from({ length: 5 }, (_, i) => ({
    base: 0.5 + i * 0.11,
    width: 0.09 + Math.random() * 0.05,
    amp: 40 + Math.random() * 55,
    freq: 0.0011 + Math.random() * 0.0009,
    speed: 0.00022 + Math.random() * 0.00018,
    phase: Math.random() * Math.PI * 2,
  }));

  function resize(): void {
    const dpr = Math.min(devicePixelRatio, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function edge(b: Band, y: number, t: number, side: -1 | 1): number {
    const wiggle =
      Math.sin(y * b.freq * 2 * Math.PI + b.phase + t * b.speed) * b.amp +
      Math.sin(y * b.freq * 4.7 + b.phase * 1.7 + t * b.speed * 1.6) * b.amp * 0.4;
    const half = ((b.width * W) / 2) * (1 + 0.35 * Math.sin(t * b.speed * 1.3 + b.phase));
    return b.base * W + wiggle + side * half;
  }

  function colors(): string[] {
    const s = getComputedStyle(document.documentElement);
    return [1, 2, 3, 4, 5].map(i => s.getPropertyValue(`--c${i}`).trim() || '#ccc');
  }

  function draw(t: number): void {
    ctx.clearRect(0, 0, W, H);
    const cs = colors();
    const drift = scrollY * 0.35;
    bands.forEach((b, i) => {
      ctx.beginPath();
      for (let p = 0; p <= POINTS; p++) {
        const y = (H * p) / POINTS;
        const x = edge(b, y + drift, t, -1);
        p ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      for (let p = POINTS; p >= 0; p--) {
        const y = (H * p) / POINTS;
        ctx.lineTo(edge(b, y + drift, t, 1), y);
      }
      ctx.closePath();
      ctx.fillStyle = cs[i];
      ctx.fill();
    });
  }

  return {
    mount(_el: HTMLElement) {
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;';
      canvas.style.maskImage = 'linear-gradient(to bottom, black 55%, transparent 100%)';
      canvas.style.webkitMaskImage = 'linear-gradient(to bottom, black 55%, transparent 100%)';
      ctx = canvas.getContext('2d')!;
      document.body.prepend(canvas);
      resize();
      window.addEventListener('resize', resize);

      if (reduced) {
        draw(0);
        canvas.style.opacity = '0.55';
        return;
      }
      const tick = (t: number): void => { draw(t); raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
      gsap.fromTo(canvas, { opacity: 0.92 }, {
        opacity: 0.07, ease: 'none',
        scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true },
      });
    },
    onPalette(_t: Theme) { /* цвета читаются из CSS-переменных на каждом кадре — плавный переход бесплатно */ },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.remove();
    },
  };
}
