import { useEffect, useState } from 'react';

const THEME_KEY = 'taree2y_v7_theme';
const LIGHT_THEME_COLOR = '#f4f7fb';
const DARK_THEME_COLOR = '#020617';

function readStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

function getInitialDarkState() {
  const storedTheme = readStoredTheme();

  if (storedTheme === 'dark') return true;
  if (storedTheme === 'light') return false;

  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
  ) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  return false;
}

function syncDocumentTheme(isDark) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.toggle('dark', Boolean(isDark));
  root.classList.toggle('light', !isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      'content',
      isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR,
    );
  }
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState(getInitialDarkState);

  useEffect(() => {
    syncDocumentTheme(isDark);

    try {
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    } catch {
      // ignore storage failures
    }
  }, [isDark]);

  return { isDark, setIsDark };
}
