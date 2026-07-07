export type AccentName = 'ribbons' | 'palette' | 'blob';

export const config = {
  // 'palette' (панели с локами) и 'blob' (three.js) — готовые альтернативы, включаются добавлением в массив
  accents: ['ribbons'] as AccentName[],
};
