// Плёночное зерно: SVG-тайл с feTurbulence, повторяется как фон.
// Общий слой для всех вариантов лавы.
const GRAIN_TILE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.55' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E")`;

export function createGrainLayer(): HTMLElement {
  const grain = document.createElement('div');
  grain.setAttribute('aria-hidden', 'true');
  grain.style.cssText = [
    'position:fixed', 'inset:0', 'width:100%', 'height:100%',
    'z-index:0', 'pointer-events:none',
    'mix-blend-mode:overlay', 'opacity:0.42',
    `background-image:${GRAIN_TILE}`, 'background-size:220px 220px',
  ].join(';');
  return grain;
}
