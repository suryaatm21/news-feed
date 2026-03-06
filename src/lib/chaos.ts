import type { ChaosVariant, LayoutName, ThemeName } from '../types';

export const THEMES: Record<
  ThemeName,
  {
    background: string;
    surface: string;
    accent: string;
    text: string;
    muted: string;
    glow: string;
  }
> = {
  sunprint: {
    background: 'radial-gradient(circle at top, #f7e7b4 0%, #f4bb45 35%, #7a4f1b 100%)',
    surface: 'rgba(73, 35, 13, 0.68)',
    accent: '#f4f1de',
    text: '#fff9ee',
    muted: '#f7d8a8',
    glow: '#f5c45d'
  },
  ember: {
    background: 'linear-gradient(135deg, #1f0a05 0%, #892b1d 52%, #f28f3b 100%)',
    surface: 'rgba(44, 8, 2, 0.72)',
    accent: '#ffd6a5',
    text: '#fff3e6',
    muted: '#f0c7ad',
    glow: '#ff9f45'
  },
  lagoon: {
    background: 'radial-gradient(circle at 20% 20%, #7bdff2 0%, #1f6f8b 40%, #102542 100%)',
    surface: 'rgba(9, 29, 51, 0.7)',
    accent: '#f7f7ff',
    text: '#eef9ff',
    muted: '#c7e9f2',
    glow: '#89f0ff'
  },
  citrus: {
    background: 'linear-gradient(145deg, #113b2f 0%, #287271 45%, #f4d35e 100%)',
    surface: 'rgba(10, 39, 37, 0.7)',
    accent: '#fefae0',
    text: '#fffef0',
    muted: '#dce7be',
    glow: '#f7e47c'
  },
  nocturne: {
    background: 'radial-gradient(circle at center, #354f52 0%, #1b263b 40%, #0d1321 100%)',
    surface: 'rgba(8, 13, 28, 0.74)',
    accent: '#d8f3dc',
    text: '#f1faee',
    muted: '#b7d3d4',
    glow: '#7fd1b9'
  },
  newsprint: {
    background: 'linear-gradient(135deg, #f5efe0 0%, #d8c7a1 44%, #8d6e63 100%)',
    surface: 'rgba(59, 44, 33, 0.72)',
    accent: '#fffaf0',
    text: '#fff8ef',
    muted: '#ead9c5',
    glow: '#f2e2b8'
  }
};

const LAYOUTS: LayoutName[] = ['orbit', 'poster', 'ticker'];
const PALETTES = Object.keys(THEMES) as ThemeName[];

function hash(input: string): number {
  let value = 0;
  for (const character of input) {
    value = (value * 31 + character.charCodeAt(0)) % 2147483647;
  }
  return value;
}

export function createChaos(date: string): ChaosVariant {
  const value = hash(date);
  return {
    seed: `${date}-${value.toString(16)}`,
    layout: LAYOUTS[value % LAYOUTS.length],
    theme: PALETTES[(value >> 3) % PALETTES.length]
  };
}
