import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import chroma from 'chroma-js';
import type { HeroAccent } from './types';
import type { Theme } from '../palette-engine';
import { createGrainLayer } from './grain';

gsap.registerPlugin(ScrollTrigger);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Лава как WebGL-шейдер: поле Вивилла w = (1 − d²/R²)² с конечным носителем
// (R = 2×радиус капли) считается на GPU в полном разрешении — чёткие кромки,
// 60 fps и одинаковая картинка во всех браузерах, включая iOS Safari.
const BLOBS = 20;

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec3 uBalls[${BLOBS}];      // x, y (px, снизу-слева), r (px)
uniform vec3 uBallColors[${BLOBS}]; // rgb 0..1
// Радиус влияния 1.25× видимого: узкий ореол — капли раздельные,
// слипание только при почти касании (T подобран так, чтобы
// видимый край одиночной капли был на её радиусе)
const float T = 0.13;

void main() {
  vec2 p = gl_FragCoord.xy;
  float f = 0.0;
  vec3 acc = vec3(0.0);
  for (int i = 0; i < ${BLOBS}; i++) {
    vec3 b = uBalls[i];
    vec2 d = p - b.xy;
    float R2 = b.z * b.z * 1.5625;
    float q = max(0.0, 1.0 - dot(d, d) / R2);
    float w = q * q;
    f += w;
    acc += uBallColors[i] * w;
  }
  // кромка в ~1.5 пикселя на любой капле: ширина сглаживания из экранных производных
  float aa = max(fwidth(f) * 1.5, 1e-4);
  float a = smoothstep(T - aa, T + aa, f);
  vec3 col = acc / max(f, 1e-4);
  gl_FragColor = vec4(col * a, a); // premultiplied alpha
}
`;

interface Ball {
  x: number; baseY: number; r: number;
  ampY: number; speedY: number;
  driftX: number; speedX: number;
  pulse: number; phase: number; color: number;
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) ?? 'shader compile failed');
  }
  return sh;
}

export function createLavaGlAccent(): HeroAccent {
  let canvas: HTMLCanvasElement;
  let gl: WebGLRenderingContext;
  let grain: HTMLElement;
  let raf = 0;
  let uBalls: WebGLUniformLocation;
  let uBallColors: WebGLUniformLocation;
  const ballData = new Float32Array(BLOBS * 3);
  const colorData = new Float32Array(BLOBS * 3);

  const balls: Ball[] = Array.from({ length: BLOBS }, (_, i) => ({
    x: 0.46 + Math.random() * 0.5,
    baseY: Math.random() * 1.2 - 0.1,
    r: 0.045 + Math.random() * 0.13,
    ampY: 0.12 + Math.random() * 0.22,
    speedY: (2 * Math.PI) / ((24 + Math.random() * 26) * 1000),
    driftX: (Math.random() - 0.5) * 0.06,
    speedX: (2 * Math.PI) / ((16 + Math.random() * 14) * 1000),
    pulse: 0.08 + Math.random() * 0.12,
    phase: Math.random() * Math.PI * 2,
    color: i % 5,
  }));

  function resize(): void {
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function paletteGl(): number[][] {
    const s = getComputedStyle(document.documentElement);
    return [1, 2, 3, 4, 5].map(i => {
      try { return chroma(s.getPropertyValue(`--c${i}`).trim()).gl().slice(0, 3); }
      catch { return [0.8, 0.8, 0.8]; }
    });
  }

  function draw(t: number): void {
    const dpr = canvas.width / innerWidth;
    const H = canvas.height;
    const rgb = paletteGl();
    for (let i = 0; i < BLOBS; i++) {
      const b = balls[i];
      const x = (b.x + b.driftX * Math.sin(t * b.speedX + b.phase * 1.7)) * innerWidth * dpr;
      const yCss = (b.baseY + b.ampY * Math.sin(t * b.speedY + b.phase)) * innerHeight;
      const r = b.r * innerHeight * (1 + b.pulse * Math.sin(t * b.speedX * 1.3 + b.phase)) * dpr;
      ballData[i * 3] = x;
      ballData[i * 3 + 1] = H - yCss * dpr; // GL: ось Y снизу вверх
      ballData[i * 3 + 2] = r;
      const c = rgb[b.color];
      colorData[i * 3] = c[0]; colorData[i * 3 + 1] = c[1]; colorData[i * 3 + 2] = c[2];
    }
    gl.uniform3fv(uBalls, ballData);
    gl.uniform3fv(uBallColors, colorData);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  return {
    mount(_el: HTMLElement) {
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      // canvas — replaced-элемент: нужны явные width/height
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;';
      const ctx = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true });
      if (!ctx) throw new Error('WebGL unavailable');
      gl = ctx;
      gl.getExtension('OES_standard_derivatives'); // fwidth() в шейдере кромки
      document.body.prepend(canvas);

      const prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(prog) ?? 'link failed');
      }
      gl.useProgram(prog);

      // один треугольник, накрывающий весь экран
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      uBalls = gl.getUniformLocation(prog, 'uBalls')!;
      uBallColors = gl.getUniformLocation(prog, 'uBallColors')!;
      gl.clearColor(0, 0, 0, 0);

      grain = createGrainLayer();
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
