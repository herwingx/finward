import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SkeletonAppLoading } from '@/components/Skeleton';
import { Icon } from '@/components/Icon';
import { apiFetch } from '@/lib/api/client';

const PROFILE_LOAD_TIMEOUT_MS = 15000;
const SLOW_LOAD_THRESHOLD_MS = 5000;

const ProtectedRoute: React.FC = () => {
  const token = localStorage.getItem('token');
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  const { isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tiempo de espera agotado. Comprueba que el backend esté en marcha.')), PROFILE_LOAD_TIMEOUT_MS)
      );
      try {
        return await Promise.race([apiFetch('/profile'), timeoutPromise]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudo conectar con el servidor. Revisa que el backend esté en marcha.';
        throw new Error(msg);
      }
    },
    enabled: !!token,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setShowSlowMessage(true), SLOW_LOAD_THRESHOLD_MS);
    return () => clearTimeout(t);
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading) setShowSlowMessage(false);
  }, [isLoading]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading || isRefetching) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-app-bg p-6">
        <SkeletonAppLoading />
        {showSlowMessage && (
          <div className="mt-8 max-w-sm w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center space-y-3">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Está tardando mucho. ¿El backend está en marcha?
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-4 py-2 rounded-xl bg-app-primary text-white text-sm font-bold"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    );
  }

  if (isError) {
    const errMsg = typeof (error as Error)?.message === 'string' ? (error as Error).message : '';
    const is401 = errMsg === 'Unauthorized';
    if (is401) return <Navigate to="/login" replace />;

    const displayMessage = errMsg || 'No se pudo cargar tu perfil. Comprueba que el backend esté en marcha y que la URL de la API sea correcta.';

    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6 bg-app-bg text-app-text">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="size-14 rounded-2xl bg-rose-500/10 flex items-center justify-center">
            <Icon name="error" size={32} className="text-rose-500" />
          </div>
          <h2 className="text-lg font-bold">Error al cargar</h2>
          <p className="text-sm text-app-muted">
            {displayMessage}
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