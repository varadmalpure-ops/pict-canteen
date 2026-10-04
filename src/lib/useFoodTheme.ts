import { useContext } from 'react';
import { ThemeContext } from './ThemeContext';

export function useFoodTheme() {
  return useContext(ThemeContext);
}
