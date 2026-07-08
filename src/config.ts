export type AccentName = 'lava-gl' | 'lava' | 'ribbons' | 'palette' | 'blob';

export const config = {
  // 'lava-gl' — WebGL-шейдер (все браузеры, вкл. iOS Safari; фолбэк на 'lava');
  // 'lava' — SVG-goo; 'ribbons', 'palette', 'blob' — прочие альтернативы
  accents: ['lava-gl'] as AccentName[],
};
