import React, { createContext, useEffect, useState } from 'react';
import { THEME_OPTIONS, type FoodTheme, type ThemeOption } from './themeConstants';

interface ThemeContextType {
  theme: FoodTheme;
  setTheme: (theme: FoodTheme) => void;
  activeThemeOption: ThemeOption;
  isDark: boolean;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'slate',
  setTheme: () => {},
  activeThemeOption: THEME_OPTIONS[0],
  isDark: false,
});

const STORAGE_KEY = 'pict_canteen_theme_preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<FoodTheme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as FoodTheme;
      if (saved && THEME_OPTIONS.some((o) => o.id === saved)) {
        return saved;
      }
    } catch {}
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

    if (isDark) {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    }

    // Set CSS theme background on body
    document.body.style.backgroundColor = activeThemeOption.bgHex;
  }, [theme, isDark, activeThemeOption.bgHex]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, activeThemeOption, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
