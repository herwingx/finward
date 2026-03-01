import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    root.classList.remove('light', 'dark');
    root.classList.add(isDark ? 'dark' : 'light');

    const bgColor = isDark ? '#09090B' : '#F9FAFB';
    root.style.backgroundColor = bgColor;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', bgColor);

    localStorage.setItem('theme', theme);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') {
        const sysDark = mq.matches;
        root.classList.remove('light', 'dark');
        root.classList.add(sysDark ? 'dark' : 'light');
        const c = sysDark ? '#09090B' : '#F9FAFB';
        root.style.backgroundColor = c;
        const m = document.querySelector('meta[name="theme-color"]');
        if (m) m.setAttribute('content', c);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return [theme, setTheme] as const;
}
