import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SkeletonAppLoading } from '@/components/Skeleton';
import { Icon } from '@/components/Icon';
import { apiFetch } from '@/lib/api/client';

const PROFILE_LOAD_TIMEOUT_MS = 15000;

const ProtectedRoute: React.FC = () => {
  const token = localStorage.getItem('token');

  const { isLoading, isError, error, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tiempo de espera agotado. Comprueba que el backend esté en marcha.')), PROFILE_LOAD_TIMEOUT_MS)
      );
      return Promise.race([apiFetch('/profile'), timeoutPromise]);
    },
    enabled: !!token,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return <SkeletonAppLoading />;
  }

  if (isError) {
    const is401 = (error as Error)?.message === 'Unauthorized';
    if (is401) return <Navigate to="/login" replace />;

    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6 bg-app-bg text-app-text">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="size-14 rounded-2xl bg-rose-500/10 flex items-center justify-center">
            <Icon name="error" size={32} className="text-rose-500" />
          </div>
          <h2 className="text-lg font-bold">Error al cargar</h2>
          <p className="text-sm text-app-muted">
            {(error as Error)?.message ?? 'No se pudo cargar tu perfil. La base de datos puede estar iniciando.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => refetch()}
            className="px-6 py-3 rounded-xl bg-app-primary text-white font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Icon name="refresh" size={20} />
            Reintentar
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}
            className="px-6 py-3 rounded-xl border border-app-border text-app-muted font-bold text-sm hover:bg-app-subtle hover:text-app-text transition-all"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;