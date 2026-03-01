import { useMemo } from 'react';
import { isWithinInterval, endOfMonth } from 'date-fns';

interface Account {
  id: string;
  type: string;
  balance: number;
}

interface Commitment {
  id: string;
  amount: number;
  dueDate: Date | string;
  description?: string;
  type: 'credit_card' | 'recurring' | 'loan';
}

export interface SafeToSpendResult {
  safeToSpend: number;
  liquidCash: number;
  totalCommitments: number;
  safetyBuffer: number;
  commitmentPercent: number;
  status: 'healthy' | 'warning' | 'danger';
  message: string;
}

export function useSafeToSpend(
  accounts: Account[],
  upcomingCommitments: Commitment[]
): SafeToSpendResult {
  return useMemo(() => {
    const liquidCash = accounts
      .filter((a) => a.type === 'DEBIT' || a.type === 'CASH')
      .reduce((sum, a) => sum + a.balance, 0);

    const today = new Date();
    const monthEnd = endOfMonth(today);

    const thisMonthCommitments = upcomingCommitments.filter((c) =>
      isWithinInterval(new Date(c.dueDate), { start: today, end: monthEnd })
    );

    const totalCommitments = thisMonthCommitments.reduce((sum, c) => sum + c.amount, 0);
    const safetyBuffer = liquidCash * 0.1;
    const safeToSpend = Math.max(0, liquidCash - totalCommitments - safetyBuffer);

    const commitmentPercent =
      liquidCash > 0 ? (totalCommitments / liquidCash) * 100 : 0;

    let status: 'healthy' | 'warning' | 'danger';
    let message: string;

    if (safeToSpend <= 0) {
      status = 'danger';
      message = 'Sin margen de gasto seguro. Prioriza tus compromisos.';
    } else if (commitmentPercent > 70) {
      status = 'warning';
      message = `Disponible: $${safeToSpend.toLocaleString()}. Más del 70% comprometido.`;
    } else if (commitmentPercent > 50) {
      status = 'warning';
      message = `Disponible: $${safeToSpend.toLocaleString()}. Gasto moderado recomendado.`;
    } else {
      status = 'healthy';
      message = `Puedes gastar hasta $${safeToSpend.toLocaleString()} de forma segura.`;
    }

    return {
      safeToSpend: Math.round(safeToSpend * 100) / 100,
      liquidCash,
      totalCommitments,
      safetyBuffer: Math.round(safetyBuffer * 100) / 100,
      commitmentPercent: Math.round(commitmentPercent * 100) / 100,
      status,
      message,
    };
  }, [accounts, upcomingCommitments]);
}
