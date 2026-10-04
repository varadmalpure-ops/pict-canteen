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
    // Default to the signature WhatsApp Pudina Emerald
    return 'mint';
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

    if (isDark) {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    }

    // Set solid color & pronounced WhatsApp-style food doodle wallpaper on body
    document.body.style.backgroundColor = activeThemeOption.bgHex;
    document.body.style.backgroundImage = activeThemeOption.patternUrl;
    document.body.style.backgroundRepeat = 'repeat';
    document.body.style.backgroundSize = '360px 360px';
    document.body.style.backgroundAttachment = 'fixed';
  }, [theme, isDark, activeThemeOption]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, activeThemeOption, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
