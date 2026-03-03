import { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig, LazyMotion, domAnimation } from 'framer-motion';
import { Toaster } from 'sileo';
import { queryClient } from '@/lib/queryClient';
import { ThemeProvider, useThemeContext } from '@/context/ThemeContext';

const InvertedToaster = () => {
  const { isDark } = useThemeContext();

  return (
    <Toaster
      key={isDark ? 'dark' : 'light'} // Forza el remount al cambiar el tema
      position="top-right"
      theme={isDark ? 'light' : 'dark'}
      options={{
        fill: isDark ? '#FFFFFF' : '#09090B', // Forzamos el color de fondo para que no haya dudas (App Dark -> Blanco, App Light -> Oscuro)
        duration: 4000,
        roundness: 16,
        styles: {
          title: isDark ? 'text-zinc-900!' : 'text-zinc-50!',
          description: isDark
            ? 'text-zinc-500! font-medium opacity-100! block mt-0.5'
            : 'text-zinc-400! font-medium opacity-100! block mt-0.5',
        },
      }}
    />
  );
};

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LazyMotion features={domAnimation}>
          <MotionConfig reducedMotion="user">
            <BrowserRouter>
              {children}
              <InvertedToaster />
            </BrowserRouter>
          </MotionConfig>
        </LazyMotion>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
