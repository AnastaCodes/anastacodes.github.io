import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import chroma from 'chroma-js';
import type { HeroAccent } from './types';
import type { Theme } from '../palette-engine';

gsap.registerPlugin(ScrollTrigger);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Лава рисуется на canvas как metaballs: поле f = Σ r²/d², порог ≈ 1 даёт
// слипание капель. SVG-фильтр (blur + альфа-порог) для этого же эффекта
// не работает в iOS Safari — там капли оставались голыми кружками.
const BLOBS = 20;
// Фаллофф Вивилла: w = (1 − d²/R²)², ноль за пределами R = 2×радиус капли.
// Конечный носитель — капли не «мажут» друг на друга через весь экран.
const THRESHOLD = 0.5;       // изоуровень: примерно визуальный край одиночной капли
const EDGE = 0.18;           // мягкость кромки (в единицах поля)
const TARGET_PIXELS = 42000; // внутреннее разрешение буфера (низкое = мягко и быстро)

// Зерно: крошечный SVG-тайл с feTurbulence, повторяется как фон
const GRAIN_TILE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.55' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E")`;

interface Ball {
  x: number;      // доля ширины
  baseY: number;  // доля высоты
  r: number;      // радиус, доля высоты
  ampY: number;   // амплитуда всплытия, доля высоты
  speedY: number; // рад/мс
  driftX: number; // амплитуда дрейфа, доля ширины
  speedX: number;
  pulse: number;  // амплитуда «дыхания» радиуса
  phase: number;
  color: number;  // индекс 0..4 → --c1..--c5
}

export function createLavaAccent(): HeroAccent {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let grain: HTMLElement;
  let raf = 0;
  let bw = 0, bh = 0;
  let img: ImageData;

  const balls: Ball[] = Array.from({ length: BLOBS }, (_, i) => ({
    x: 0.46 + Math.random() * 0.5,
    baseY: Math.random() * 1.2 - 0.1,
    r: 0.045 + Math.random() * 0.13,           // = капли 9–35vh диаметром
    ampY: 0.12 + Math.random() * 0.22,
    speedY: (2 * Math.PI) / ((14 + Math.random() * 16) * 1000),
    driftX: (Math.random() - 0.5) * 0.06,
    speedX: (2 * Math.PI) / ((9 + Math.random() * 9) * 1000),
    pulse: 0.08 + Math.random() * 0.12,
    phase: Math.random() * Math.PI * 2,
    color: i % 5,
  }));

  function resize(): void {
    const scale = Math.sqrt((innerWidth * innerHeight) / TARGET_PIXELS);
    bw = Math.max(80, Math.round(innerWidth / scale));
    bh = Math.max(80, Math.round(innerHeight / scale));
    canvas.width = bw;
    canvas.height = bh;
    img = ctx.createImageData(bw, bh);
  }

  function paletteRgb(): number[][] {
    const s = getComputedStyle(document.documentElement);
    return [1, 2, 3, 4, 5].map(i => {
      try { return chroma(s.getPropertyValue(`--c${i}`).trim()).rgb(); }
      catch { return [204, 204, 204]; }
    });
  }

  function draw(t: number): void {
    const rgb = paletteRgb();
    const data = img.data;
    data.fill(0);

    // позиции/радиусы в пикселях буфера на этот кадр
    const px = balls.map(b => (b.x + b.driftX * Math.sin(t * b.speedX + b.phase * 1.7)) * bw);
    const py = balls.map(b => (b.baseY + b.ampY * Math.sin(t * b.speedY + b.phase)) * bh);
    const pr = balls.map(b => b.r * bh * (1 + b.pulse * Math.sin(t * b.speedX * 1.3 + b.phase)));
    const R2 = pr.map(r => (r * 2) * (r * 2)); // радиус влияния = 2× визуального

    // капли живут правее ~40% ширины — левую зону не считаем вовсе
    const startX = Math.max(0, Math.floor(bw * 0.3));

    for (let y = 0; y < bh; y++) {
      const row = y * bw;
      for (let x = startX; x < bw; x++) {
        let f = 0, cr = 0, cg = 0, cb = 0;
        for (let i = 0; i < BLOBS; i++) {
          const dx = x - px[i], dy = y - py[i];
          const d2 = dx * dx + dy * dy;
          if (d2 >= R2[i]) continue;
          const q = 1 - d2 / R2[i];
          const w = q * q;
          f += w;
          const c = rgb[balls[i].color];
          cr += c[0] * w; cg += c[1] * w; cb += c[2] * w;
        }
        if (f <= THRESHOLD - EDGE) continue;
        const a = Math.min(1, (f - (THRESHOLD - EDGE)) / EDGE);
        const o = (row + x) * 4;
        data[o] = cr / f;
        data[o + 1] = cg / f;
        data[o + 2] = cb / f;
        data[o + 3] = a * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  return {
    mount(_el: HTMLElement) {
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      // canvas — replaced-элемент: inset:0 не растягивает его, нужны явные width/height.
      // CSS растягивает низкое разрешение буфера — апскейл и даёт мягкие кромки.
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;';
      ctx = canvas.getContext('2d')!;
      document.body.prepend(canvas);

      grain = document.createElement('div');
      grain.setAttribute('aria-hidden', 'true');
      grain.style.cssText = [
        'position:fixed', 'inset:0', 'width:100%', 'height:100%',
        'z-index:0', 'pointer-events:none',
        'mix-blend-mode:overlay', 'opacity:0.42',
        `background-image:${GRAIN_TILE}`, 'background-size:220px 220px',
      ].join(';');
      canvas.after(grain);

      resize();
      window.addEventListener('resize', resize);

      if (reduced) {
        draw(0);
        canvas.style.opacity = '0.55';
        grain.style.opacity = '0.4';
        return;
      }
      const tick = (t: number): void => { draw(t); raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
      gsap.fromTo(canvas, { opacity: 0.9 }, {
        opacity: 0.07, ease: 'none',
        scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true },
      });
      gsap.fromTo(grain, { opacity: 0.42 }, {
        opacity: 0.12, ease: 'none',
        scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true },
      });
    },
    onPalette(_t: Theme) { /* цвета читаются из CSS-переменных на каждом кадре */ },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      grain.remove();
      canvas.remove();
    },
  };
}
