import { useContext } from 'react';
import { ThemeContext } from './themeContextDef';

export function useFoodTheme() {
  return useContext(ThemeContext);
}
