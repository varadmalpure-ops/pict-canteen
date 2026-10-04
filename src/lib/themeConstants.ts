export type FoodTheme = 'slate' | 'saffron' | 'mint' | 'chai' | 'paprika' | 'midnight';

export interface ThemeOption {
  id: FoodTheme;
  name: string;
  tagline: string;
  emoji: string;
  emojis: string[];
  bgHex: string;
  accentHex: string;
  borderHex: string;
  patternUrl: string;
  isDark?: boolean;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'mint',
    name: 'Pudina WhatsApp',
    tagline: 'Signature WhatsApp emerald with crisp food doodles',
    emoji: '🌿',
    emojis: ['🌿', '🍵', '🧆', '🥑'],
    bgHex: '#065f46',
    accentHex: '#10b981',
    borderHex: '#047857',
    patternUrl: "url('/patterns/food-doodle-light.svg')",
    isDark: true,
  },
  {
    id: 'saffron',
    name: 'Kesari Saffron Gold',
    tagline: 'Vibrant golden turmeric & buttery street snack doodles',
    emoji: '🧈',
    emojis: ['🧈', '🥟', '🥞', '🍛'],
    bgHex: '#eab308',
    accentHex: '#854d0e',
    borderHex: '#ca8a04',
    patternUrl: "url('/patterns/food-doodle-dark.svg')",
    isDark: false,
  },
  {
    id: 'chai',
    name: 'Kadak Chai Mocha',
    tagline: 'Solid terracotta cinnamon & cutting chai wallpaper',
    emoji: '☕',
    emojis: ['☕', '🫓', '🥣', '🥪'],
    bgHex: '#9a3412',
    accentHex: '#ea580c',
    borderHex: '#7c2d12',
    patternUrl: "url('/patterns/food-doodle-light.svg')",
    isDark: true,
  },
  {
    id: 'paprika',
    name: 'Tandoor Paprika Red',
    tagline: 'Rich solid chili crimson & tandoor spicy motif',
    emoji: '🌶️',
    emojis: ['🌶️', '🍔', '🍜', '🍕'],
    bgHex: '#be123c',
    accentHex: '#f43f5e',
    borderHex: '#9f1239',
    patternUrl: "url('/patterns/food-doodle-light.svg')",
    isDark: true,
  },
  {
    id: 'slate',
    name: 'Campus Parchment',
    tagline: 'Classic WhatsApp warm beige wallpaper with dark food art',
    emoji: '🏛️',
    emojis: ['🏛️', '☕', '🥟', '🍔'],
    bgHex: '#e8e2d8',
    accentHex: '#1d4ed8',
    borderHex: '#d8cfc4',
    patternUrl: "url('/patterns/food-doodle-dark.svg')",
    isDark: false,
  },
  {
    id: 'midnight',
    name: 'Midnight Bistro',
    tagline: 'Deep obsidian charcoal with pronounced glowing doodles',
    emoji: '🌙',
    emojis: ['🌙', '☕', '🥟', '🍜'],
    bgHex: '#0b0f19',
    accentHex: '#38bdf8',
    borderHex: '#1e293b',
    patternUrl: "url('/patterns/food-doodle-light.svg')",
    isDark: true,
  },
];
