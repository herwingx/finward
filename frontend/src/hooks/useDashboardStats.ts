import { useMemo, useCallback } from 'react';
import type { Transaction, Account, Investment, Loan, SavingsGoal } from '@/types';

export function useDashboardStats(
  accounts?: Account[],
  investments?: Investment[],
  loans?: Loan[],
  goals?: SavingsGoal[],
  transactions?: Transaction[],
  _categories?: unknown[],
  profileCurrency = 'MXN'
) {
  const { netWorth, availableFunds } = useMemo(() => {
    let net = 0;
    let available = 0;
    if (accounts) {
      accounts.forEach((a) => {
        if (a.type === 'CREDIT') net -= a.balance;
        else {
          net += a.balance;
          if (['DEBIT', 'CASH'].includes(a.type)) available += a.balance;
        }
      });
    }
    if (investments) {
      net += investments.reduce((sum, inv) => sum + (inv.currentPrice ?? inv.avgBuyPrice) * inv.quantity, 0);
    }
    if (goals) {
      net += goals.reduce((sum, g) => sum + g.currentAmount, 0);
    }
    return { netWorth: net, availableFunds: available };
  }, [accounts, investments, loans, goals]);

  const monthStats = useMemo(() => {
    if (!transactions) return { income: 0, expense: 0, trend: 0 };
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const prevMonthKey = `${now.getFullYear()}-${now.getMonth() - 1}`;
    let thisMonthIncome = 0;
    let thisMonthExpense = 0;
    let lastMonthNet = 0;
    transactions.forEach((tx) => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key === currentMonthKey) {
        if (tx.type === 'income') thisMonthIncome += tx.amount;
        if (tx.type === 'expense') thisMonthExpense += tx.amount;
      } else if (key === prevMonthKey) {
        lastMonthNet += tx.type === 'income' ? tx.amount : -tx.amount;
      }
    });
    const thisMonthNet = thisMonthIncome - thisMonthExpense;
    let change = 0;
    if (lastMonthNet !== 0) {
      change = ((thisMonthNet - lastMonthNet) / Math.abs(lastMonthNet)) * 100;
    }
    return { income: thisMonthIncome, expense: thisMonthExpense, trend: change };
  }, [transactions]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return { text: 'Buenos días', emoji: '☀️' };
    if (h < 19) return { text: 'Buenas tardes', emoji: '🌤️' };
    return { text: 'Buenas noches', emoji: '🌙' };
  }, []);

  const formatCurrency = useCallback(
    (amount: number) =>
      new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: profileCurrency,
        maximumFractionDigits: 0,
      }).format(amount),
    [profileCurrency]
  );

  return { netWorth, availableFunds, monthStats, greeting, formatCurrency };
}
