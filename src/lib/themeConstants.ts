export type FoodTheme = 'slate' | 'mint' | 'saffron' | 'chai' | 'paprika' | 'blue' | 'white' | 'midnight';

export interface ThemeOption {
  id: FoodTheme;
  name: string;
  tagline: string;
  emoji: string;
  emojis: string[];
  bgHex: string;            // Wallpaper background color
  surfaceHex: string;       // Lighter version for title bar (navbar), cards, search, modals
  surfaceSubtleHex: string; // Subtle hover / input background
  borderHex: string;        // Matching subtle border
  accentHex: string;        // Accent color
  patternUrl: string;       // Pattern URL or 'none'
  isDark?: boolean;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'slate',
    name: 'Campus Parchment',
    tagline: 'Classic WhatsApp chat beige with dark food art',
    emoji: '🏛️',
    emojis: ['🏛️', '☕', '🥟', '🍔'],
    bgHex: '#e8e2d8',
    surfaceHex: '#f7f4ee',
    surfaceSubtleHex: '#ede8df',
    borderHex: '#dcd4c7',
    accentHex: '#1d4ed8',
    patternUrl: "url('/patterns/food-doodle-dark.svg')",
    isDark: false,
  },
  {
    id: 'mint',
    name: 'WhatsApp Pudina Green',
    tagline: 'Refreshing light WhatsApp pistachio & tea doodles',
    emoji: '🌿',
    emojis: ['🌿', '🍵', '🧆', '🥑'],
    bgHex: '#d5ecd9',
    surfaceHex: '#eff8f1',
    surfaceSubtleHex: '#dfefe3',
    borderHex: '#c2dec7',
    accentHex: '#059669',
    patternUrl: "url('/patterns/food-doodle-dark.svg')",
    isDark: false,
  },
  {
    id: 'saffron',
    name: 'Kesari Turmeric Gold',
    tagline: 'Warm buttery golden street snack wallpaper',
    emoji: '🧈',
    emojis: ['🧈', '🥟', '🥞', '🍛'],
    bgHex: '#fae8be',
    surfaceHex: '#fefaf0',
    surfaceSubtleHex: '#f5ebd0',
    borderHex: '#ecdbaf',
    accentHex: '#b45309',
    patternUrl: "url('/patterns/food-doodle-dark.svg')",
    isDark: false,
  },
  {
    id: 'chai',
    name: 'Kadak Chai Milk',
    tagline: 'Warm milk tea sand & toasted spice doodles',
    emoji: '☕',
    emojis: ['☕', '🫓', '🥣', '🥪'],
    bgHex: '#ebdcd0',
    surfaceHex: '#f9f5f1',
    surfaceSubtleHex: '#e8ded5',
    borderHex: '#dccec0',
    accentHex: '#9a3412',
    patternUrl: "url('/patterns/food-doodle-dark.svg')",
    isDark: false,
  },
  {
    id: 'paprika',
    name: 'Tandoor Paprika Rose',
    tagline: 'Soft warm coral blush & tandoor spicy motif',
    emoji: '🌶️',
    emojis: ['🌶️', '🍔', '🍜', '🍕'],
    bgHex: '#fadcd9',
    surfaceHex: '#fdf4f3',
    surfaceSubtleHex: '#f5dbd7',
    borderHex: '#ebc4bf',
    accentHex: '#be123c',
    patternUrl: "url('/patterns/food-doodle-dark.svg')",
    isDark: false,
  },
  {
    id: 'blue',
    name: 'Irani Cafe Blue',
    tagline: 'Crisp canteen soda blue with navy accents',
    emoji: '🥤',
    emojis: ['🥤', '🍨', '🍧', '🌊'],
    bgHex: '#d9e7f5',
    surfaceHex: '#f1f6fc',
    surfaceSubtleHex: '#dfebf7',
    borderHex: '#c5d8ea',
    accentHex: '#1d4ed8',
    patternUrl: "url('/patterns/food-doodle-dark.svg')",
    isDark: false,
  },
  {
    id: 'white',
    name: 'Pure Minimal White',
    tagline: 'Clean, distraction-free pure white without patterns or styles',
    emoji: '⚪',
    emojis: ['⚪', '🍽️', '📋', '✨'],
    bgHex: '#ffffff',
    surfaceHex: '#ffffff',
    surfaceSubtleHex: '#f8fafc',
    borderHex: '#e2e8f0',
    accentHex: '#1d4ed8',
    patternUrl: 'none',
    isDark: false,
  },
  // Backward compatibility alias for midnight
  {
    id: 'midnight',
    name: 'Campus Dusk Blue',
    tagline: 'Crisp canteen soda blue with navy accents',
    emoji: '🌙',
    emojis: ['🌙', '☕', '🥟', '🍜'],
    bgHex: '#d9e7f5',
    surfaceHex: '#f1f6fc',
    surfaceSubtleHex: '#dfebf7',
    borderHex: '#c5d8ea',
    accentHex: '#1d4ed8',
    patternUrl: "url('/patterns/food-doodle-dark.svg')",
    isDark: false,
  },
];
