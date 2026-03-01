import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api';

export function useFinancialPeriodSummary(
  periodType: 'quincenal' | 'mensual' | 'semanal' | 'bimestral' | 'semestral' | 'anual' = 'quincenal',
  mode: 'calendar' | 'projection' = 'calendar'
) {
  return useQuery({
    queryKey: ['financialPeriodSummary', periodType, mode],
    queryFn: () => api.getFinancialPeriodSummary(periodType, mode),
    staleTime: 30 * 1000,
  });
}

export function useUpcomingCommitments(days = 7) {
  return useQuery({
    queryKey: ['upcomingCommitments', days],
    queryFn: () => api.getUpcomingCommitments(days),
    staleTime: 5 * 60 * 1000,
  });
}
