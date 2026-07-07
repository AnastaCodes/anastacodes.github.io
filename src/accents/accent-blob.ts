// Минимальная версия для сборки Task 5 — заменяется настоящей Three.js-каплей в Task 8.
import type { HeroAccent } from './types';

export function createBlobAccent(): HeroAccent {
  return { mount() {}, onPalette() {}, destroy() {} };
}
