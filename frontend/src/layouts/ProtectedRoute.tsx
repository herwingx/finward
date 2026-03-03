import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SkeletonAppLoading } from '@/components/Skeleton';
import { apiFetch } from '@/lib/api/client';

const ProtectedRoute: React.FC = () => {
  const token = localStorage.getItem('token');

  const { isLoading, isError, error } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiFetch('/profile'),
    enabled: !!token,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return <SkeletonAppLoading />;
  }

  if (isError) {
    // apiFetch already handles 401 by redirecting, but for other errors or if redirect failed
    console.error("Token validation check failed", error);
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;