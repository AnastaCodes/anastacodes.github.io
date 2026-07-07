import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { HeroAccent } from './types';
import type { Theme } from '../palette-engine';

gsap.registerPlugin(ScrollTrigger);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Boundary {
  base: number; amp: number;
  freq: number; speed: number; phase: number;
}

const POINTS = 48;
const LEFT = 0.44;   // где начинается цветная зона (доля ширины)
const RIGHT = 1.06;  // последняя граница чуть за правым краем

export function createRibbonsAccent(): HeroAccent {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let raf = 0;
  let W = 0, H = 0;

  // 6 волнистых границ; лента i — область между границами i и i+1.
  // Так все 5 лент видны всегда: без наездов и щелей.
  const boundaries: Boundary[] = Array.from({ length: 6 }, (_, j) => ({
    base: LEFT + (j * (RIGHT - LEFT)) / 5,
    amp: 0.02 + Math.random() * 0.022, // доля ширины — не пересекаются с соседями
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

  function edgeX(b: Boundary, y: number, t: number): number {
    return b.base * W +
      (Math.sin(y * b.freq * 2 * Math.PI + b.phase + t * b.speed) +
       0.45 * Math.sin(y * b.freq * 4.7 + b.phase * 1.7 + t * b.speed * 1.6)) * b.amp * W;
  }

  function colors(): string[] {
    const s = getComputedStyle(document.documentElement);
    return [1, 2, 3, 4, 5].map(i => s.getPropertyValue(`--c${i}`).trim() || '#ccc');
  }

  function draw(t: number): void {
    ctx.clearRect(0, 0, W, H);
    const cs = colors();
    const drift = scrollY * 0.35;
    for (let i = 0; i < 5; i++) {
      const left = boundaries[i], right = boundaries[i + 1];
      ctx.beginPath();
      for (let p = 0; p <= POINTS; p++) {
        const y = (H * p) / POINTS;
        const x = edgeX(left, y + drift, t);
        p ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      for (let p = POINTS; p >= 0; p--) {
        const y = (H * p) / POINTS;
        ctx.lineTo(edgeX(right, y + drift, t), y);
      }
      ctx.closePath();
      ctx.fillStyle = cs[i];
      ctx.fill();
    }
  }

  return {
    mount(_el: HTMLElement) {
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      // canvas — replaced-элемент: inset:0 не растягивает его, нужны явные width/height
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;';
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
