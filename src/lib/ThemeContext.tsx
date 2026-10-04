import React, { useEffect, useState } from 'react';
import { THEME_OPTIONS, type FoodTheme } from './themeConstants';
import { ThemeContext } from './themeContextDef';

const STORAGE_KEY = 'pict_canteen_theme_preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<FoodTheme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as FoodTheme;
      if (saved && THEME_OPTIONS.some((o) => o.id === saved)) {
        return saved;
      }
    } catch {}
    // Default to the signature Classic WhatsApp Parchment
    return 'slate';
  });

  const activeThemeOption = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];
  const isDark = Boolean(activeThemeOption.isDark);

  const setTheme = (nextTheme: FoodTheme) => {
    setThemeState(nextTheme);
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {}
  };

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-food-theme', theme);
    document.body.setAttribute('data-food-theme', theme);

    // Dynamic tinted surfaces for title bar, cards, search, and modals
    root.style.setProperty('--theme-bg', activeThemeOption.bgHex);
    root.style.setProperty('--theme-surface', activeThemeOption.surfaceHex);
    root.style.setProperty('--theme-surface-subtle', activeThemeOption.surfaceSubtleHex);
    root.style.setProperty('--theme-border', activeThemeOption.borderHex);
    root.style.setProperty('--theme-accent', activeThemeOption.accentHex);

    if (isDark) {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    }

    // Set solid color & WhatsApp-style food doodle wallpaper on body
    document.body.style.backgroundColor = activeThemeOption.bgHex;
    if (activeThemeOption.patternUrl === 'none') {
      document.body.style.backgroundImage = 'none';
    } else {
      document.body.style.backgroundImage = activeThemeOption.patternUrl;
      document.body.style.backgroundRepeat = 'repeat';
      document.body.style.backgroundSize = '360px 360px';
      document.body.style.backgroundAttachment = 'fixed';
    }
  }, [theme, isDark, activeThemeOption]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, activeThemeOption, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
