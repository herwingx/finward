import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/utils/toast';
import { useQueryClient } from '@tanstack/react-query';

export const useRealtime = (userId?: string) => {
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    // Suscribirse a nuevas notificaciones
    const notificationsChannel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Notification',
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new;
          toast(notification.title, { description: notification.body });

          // Invalidar query de notificaciones para que se actualicen en el UI
          qc.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    // Opcional: Suscribirse a cambios en transacciones para actualizar el balance
    const transactionsChannel = supabase
      .channel(`user-transactions-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'Transaction',
          filter: `userId=eq.${userId}`,
        },
        () => {
          // Si algo cambia en transacciones, invalidamos todo lo financiero
          qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
          qc.invalidateQueries({ queryKey: ['accounts'] });
          qc.invalidateQueries({ queryKey: ['transactions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(transactionsChannel);
    };
  }, [userId, qc]);
};
