import { useEffect, useState } from 'react';

const STORAGE_KEY = 'taree2y-theme';
const LIGHT_THEME_COLOR = '#F5F7FB';
const DARK_THEME_COLOR = '#050B15';

function getSystemPreference() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readStoredTheme() {
  if (typeof window === 'undefined') return '';

  try {
    return window.localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function syncDocumentTheme(isDark) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.toggle('dark', Boolean(isDark));
  root.classList.toggle('light', !isDark);
  root.dataset.theme = isDark ? 'dark' : 'light';
  root.style.colorScheme = isDark ? 'dark' : 'light';

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      'content',
      isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR,
    );
  }
}

function getInitialThemeState() {
  const storedTheme = readStoredTheme();

  if (storedTheme === 'dark') {
    return { isDark: true, source: 'stored' };
  }

  if (storedTheme === 'light') {
    return { isDark: false, source: 'stored' };
  }

  return { isDark: getSystemPreference(), source: 'system' };
}

export function useDarkMode() {
  const [initialState] = useState(() => getInitialThemeState());
  const [isDark, setIsDark] = useState(initialState.isDark);

  useEffect(() => {
    syncDocumentTheme(isDark);

    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
  }, [isDark]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (event) => {
      const storedTheme = readStoredTheme();
      if (storedTheme === 'dark' || storedTheme === 'light') return;
      setIsDark(event.matches);
    };

    mediaQuery.addEventListener?.('change', handleChange);
    mediaQuery.addListener?.(handleChange);

    return () => {
      mediaQuery.removeEventListener?.('change', handleChange);
      mediaQuery.removeListener?.(handleChange);
    };
  }, []);

  const setTheme = (nextValue) => {
    setIsDark((currentValue) => {
      const nextIsDark = typeof nextValue === 'function'
        ? nextValue(currentValue)
        : Boolean(nextValue);
      return nextIsDark;
    });
  };

  return { isDark, setIsDark: setTheme };
}
