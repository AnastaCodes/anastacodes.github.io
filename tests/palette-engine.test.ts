import { describe, it, expect } from 'vitest';
import chroma from 'chroma-js';
import {
  generatePalette, deriveTheme,
  encodeHash, decodeHash, applyTheme, setTheme, currentTheme,
} from '../src/palette-engine';

const HEX = /^#[0-9a-f]{6}$/;

describe('generatePalette', () => {
  it('returns 5 valid hex colors', () => {
    const p = generatePalette();
    expect(p.colors).toHaveLength(5);
    p.colors.forEach(c => expect(c).toMatch(HEX));
  });
  it('is deterministic for a fixed rand', () => {
    const rand = () => 0.42;
    expect(generatePalette(rand)).toEqual(generatePalette(rand));
  });
  it('respects locked positions', () => {
    const locked = [null, '#ff0000', null, null, '#00ff00'] as (string | null)[];
    const p = generatePalette(Math.random, locked);
    expect(p.colors[1]).toBe('#ff0000');
    expect(p.colors[4]).toBe('#00ff00');
  });
});

describe('deriveTheme (WCAG)', () => {
  it('always keeps ink/paper ≥ 7 and accent/paper ≥ 3', () => {
    for (let i = 0; i < 200; i++) {
      const t = deriveTheme(generatePalette());
      expect(chroma.contrast(t.ink, t.paper)).toBeGreaterThanOrEqual(7);
      expect(chroma.contrast(t.accent, t.paper)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('hash round-trip', () => {
  it('encodes and decodes back', () => {
    const p = generatePalette();
    expect(decodeHash(encodeHash(p))).toEqual(p);
  });
  it('rejects garbage', () => {
    expect(decodeHash('')).toBeNull();
    expect(decodeHash('zz-11-22-33-44')).toBeNull();
    expect(decodeHash('e11d48-f59e0b')).toBeNull();
  });
});

describe('applyTheme / setTheme', () => {
  it('writes CSS variables', () => {
    const t = deriveTheme(generatePalette());
    applyTheme(t, document.documentElement);
    const s = document.documentElement.style;
    expect(s.getPropertyValue('--c1')).toBe(t.palette.colors[0]);
    expect(s.getPropertyValue('--paper')).toBe(t.paper);
  });
  it('dispatches palette:change and tracks current', () => {
    const t = deriveTheme(generatePalette());
    let got: unknown = null;
    window.addEventListener('palette:change', e => { got = (e as CustomEvent).detail; }, { once: true });
    setTheme(t);
    expect(got).toEqual(t);
    expect(currentTheme()).toEqual(t);
  });
});
