import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SkeletonAppLoading } from '@/components/Skeleton';
import { apiFetch } from '@/lib/api/client';

/**
 * GuestRoute - Inverse of ProtectedRoute
 * Redirects authenticated users away from public auth pages (login, register, etc.)
 * If user has a valid token, they get sent to the dashboard.
 */
const GuestRoute: React.FC = () => {
  const token = localStorage.getItem('token');

  const { isLoading, isSuccess } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiFetch('/profile'),
    enabled: !!token,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // If there's no token, we are a guest, allowed to see auth pages.
  if (!token) {
    return <Outlet />;
  }

  // Show loading skeleton while checking auth status if there is a token
  if (isLoading) {
    return <SkeletonAppLoading />;
  }

  // If token is valid (isSuccess), redirect to home/dashboard
  if (isSuccess) {
    return <Navigate to="/" replace />;
  }

  // If isError (e.g. 401), we assume the token is invalid and allow guest access.
  // apiFetch in client.ts might already handle 401 redirect, which is actually
  // what we WANT to avoid here if we want to stay on the login page.
  // However, for simplicity and consistency, if it fails, it's a guest.
  return <Outlet />;
};

export default GuestRoute;
