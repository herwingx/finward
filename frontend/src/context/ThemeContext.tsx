import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'system';
  });

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = () => {
      const calculatedIsDark = theme === 'dark' || (theme === 'system' && mq.matches);
      setIsDark(calculatedIsDark);

      root.classList.remove('light', 'dark');
      root.classList.add(calculatedIsDark ? 'dark' : 'light');

      const bgColor = calculatedIsDark ? '#09090B' : '#F9FAFB';
      root.style.backgroundColor = bgColor;

      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', bgColor);
    };

    updateTheme();

    const handler = () => {
      if (theme === 'system') updateTheme();
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}
