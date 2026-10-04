import { createContext } from 'react';
import { THEME_OPTIONS, type FoodTheme, type ThemeOption } from './themeConstants';

export interface ThemeContextType {
  theme: FoodTheme;
  setTheme: (theme: FoodTheme) => void;
  activeThemeOption: ThemeOption;
  isDark: boolean;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'mint',
  setTheme: () => {},
  activeThemeOption: THEME_OPTIONS[0],
  isDark: false,
});
