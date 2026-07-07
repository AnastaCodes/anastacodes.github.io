import type { Theme } from '../palette-engine';

export interface HeroAccent {
  mount(el: HTMLElement): void;
  onPalette(t: Theme): void;
  destroy(): void;
}
