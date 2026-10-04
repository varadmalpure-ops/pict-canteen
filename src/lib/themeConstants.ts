export type FoodTheme = 'slate' | 'saffron' | 'mint' | 'chai' | 'paprika' | 'midnight';

export interface ThemeOption {
  id: FoodTheme;
  name: string;
  tagline: string;
  emoji: string;
  bgHex: string;
  accentHex: string;
  borderHex: string;
  isDark?: boolean;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'slate',
    name: 'Campus Slate',
    tagline: 'Clean porcelain & PICT blue',
    emoji: '🏛️',
    bgHex: '#f8fafc',
    accentHex: '#1d4ed8',
    borderHex: '#e2e8f0',
  },
  {
    id: 'saffron',
    name: 'Kesari Saffron',
    tagline: 'Warm turmeric & golden butter',
    emoji: '🧈',
    bgHex: '#fdfbf4',
    accentHex: '#d97706',
    borderHex: '#fef08a',
  },
  {
    id: 'mint',
    name: 'Pudina Fresh',
    tagline: 'Cool coriander & herbal mint',
    emoji: '🌿',
    bgHex: '#f3faf5',
    accentHex: '#059669',
    borderHex: '#bbf7d0',
  },
  {
    id: 'chai',
    name: 'Cutting Chai',
    tagline: 'Toasted cardamom & milk tea',
    emoji: '☕',
    bgHex: '#faf6f0',
    accentHex: '#b45309',
    borderHex: '#e7d7c9',
  },
  {
    id: 'paprika',
    name: 'Tandoor Peach',
    tagline: 'Subtle roasted terracotta warmth',
    emoji: '🌶️',
    bgHex: '#fff7f2',
    accentHex: '#e11d48',
    borderHex: '#fed7aa',
  },
  {
    id: 'midnight',
    name: 'Midnight Bistro',
    tagline: 'Soothing twilight dark canteen',
    emoji: '🌙',
    bgHex: '#0f172a',
    accentHex: '#38bdf8',
    borderHex: '#334155',
    isDark: true,
  },
];
