import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { PaginatedTransactions } from '@/lib/api';
import type {
  Transaction,
  Profile,
  Category,
  RecurringTransaction,
  Account,
  InstallmentPurchase,
  Loan,
  Investment,
} from '@/types';

export const useInstallmentPurchases = () =>
  useQuery({ queryKey: ['installments'], queryFn: api.getInstallmentPurchases });

export const useAddInstallmentPurchase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addInstallmentPurchase,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['installments'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useInstallmentPurchase = (id: string | null) =>
  useQuery({
    queryKey: ['installment', id],
    queryFn: () => (id ? api.getInstallmentPurchase(id) : Promise.reject(new Error('No id'))),
    enabled: !!id,
  });

export const useUpdateInstallmentPurchase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, purchase }: { id: string; purchase: Parameters<typeof api.updateInstallmentPurchase>[1] }) =>
      api.updateInstallmentPurchase(id, purchase),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['installments'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['installment', v.id] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useDeleteInstallmentPurchase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, revert }: { id: string; revert?: boolean }) =>
      api.deleteInstallmentPurchase(id, revert),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['installments'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const usePayInstallment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payment }: { id: string; payment: { amount: number; description?: string; date: string; accountId: string } }) =>
      api.payInstallment(id, payment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['installments'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useAccounts = () =>
  useQuery({
    queryKey: ['accounts'],
    queryFn: api.getAccounts,
    staleTime: 10 * 1000,
    refetchOnMount: 'always',
  });

export const useAddAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addAccount,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useUpdateAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, account }: { id: string; account: Parameters<typeof api.updateAccount>[1] }) =>
      api.updateAccount(id, account),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['account', v.id] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useDeleteAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteAccount,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useTransactions = (params?: { take?: number; skip?: number }) =>
  useQuery({
    queryKey: ['transactions', params?.take ?? 100, params?.skip ?? 0],
    queryFn: ({ queryKey }) =>
      api.getTransactions({ take: queryKey[1] as number, skip: queryKey[2] as number }),
    staleTime: 15 * 1000,
  });

export const useTransaction = (id: string | null) =>
  useQuery({
    queryKey: ['transaction', id],
    queryFn: () => (id ? api.getTransaction(id) : Promise.reject(new Error('No id'))),
    enabled: !!id,
  });

export const useAddTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useUpdateTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, transaction }: { id: string; transaction: Partial<Transaction> }) =>
      api.updateTransaction(id, transaction),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['transaction', v.id] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useDeleteTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTransaction(id, false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
      qc.invalidateQueries({ queryKey: ['installments'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useCategories = () =>
  useQuery({ queryKey: ['categories'], queryFn: api.getCategories });

export const useAddCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};

export const useUpdateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, category }: { id: string; category: Parameters<typeof api.updateCategory>[1] }) =>
      api.updateCategory(id, category),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};

export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newCategoryId }: { id: string; newCategoryId?: string }) =>
      api.deleteCategory(id, newCategoryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};

export const useNotifications = () =>
  useQuery({ queryKey: ['notifications'], queryFn: api.getNotifications });

export const useDismissNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

export const useTriggerDebugNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.triggerDebugNotification,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

export const useProfile = () =>
  useQuery({ queryKey: ['profile'], queryFn: api.getProfile });

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.updateProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
};

export const useRecurringTransactions = () =>
  useQuery({ queryKey: ['recurring'], queryFn: api.getRecurringTransactions });

export const useRecurringTransaction = (id: string | null, opts?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['recurring', id],
    queryFn: () => (id ? api.getRecurringTransaction(id) : Promise.reject(new Error('No id'))),
    enabled: !!id && (opts?.enabled ?? true),
  });

export const useAddRecurringTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addRecurringTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useUpdateRecurringTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, transaction }: { id: string; transaction: Parameters<typeof api.updateRecurringTransaction>[1] }) =>
      api.updateRecurringTransaction(id, transaction),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['recurring', v.id] });
      qc.invalidateQueries({ queryKey: ['recurring'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useDeleteRecurringTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteRecurringTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const usePayRecurringTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: { amount?: number; date?: string } }) =>
      api.payRecurringTransaction(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useSkipRecurringTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.skipRecurringTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useDeletedTransactions = () =>
  useQuery<PaginatedTransactions>({ queryKey: ['deletedTransactions'], queryFn: () => api.getDeletedTransactions() });

export const useRestoreTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.restoreTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['deletedTransactions'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['installments'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const usePermanentDeleteTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTransaction(id, true),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deletedTransactions'] }),
  });
};

export const useCreditCardStatement = (accountId: string | null) =>
  useQuery({
    queryKey: ['creditCardStatement', accountId],
    queryFn: () => (accountId ? api.getCreditCardStatement(accountId) : Promise.reject(new Error('No account'))),
    enabled: !!accountId,
  });

export const usePayFullStatement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, sourceAccountId, date }: { accountId: string; sourceAccountId: string; date?: string }) =>
      api.payFullStatement(accountId, sourceAccountId, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['creditCardStatement'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['installments'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const usePayMsiInstallment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ installmentId, sourceAccountId, date }: { installmentId: string; sourceAccountId: string; date?: string }) =>
      api.payMsiInstallment(installmentId, sourceAccountId, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['creditCardStatement'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['installments'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useRevertStatementPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.revertStatementPayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['creditCardStatement'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['installments'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useLoans = () =>
  useQuery({ queryKey: ['loans'], queryFn: api.getLoans });

export const useLoanSummary = () =>
  useQuery({ queryKey: ['loanSummary'], queryFn: api.getLoanSummary });

export const useLoan = (id: string | null) =>
  useQuery({
    queryKey: ['loan', id],
    queryFn: () => (id ? api.getLoan(id) : Promise.reject(new Error('No id'))),
    enabled: !!id,
  });

export const useAddLoan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addLoan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['loanSummary'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useUpdateLoan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, loan }: { id: string; loan: Parameters<typeof api.updateLoan>[1] }) =>
      api.updateLoan(id, loan),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['loan', v.id] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useRegisterLoanPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payment }: { id: string; payment: Parameters<typeof api.registerLoanPayment>[1] }) =>
      api.registerLoanPayment(id, payment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['loanSummary'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useMarkLoanAsPaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accountId }: { id: string; accountId?: string }) =>
      api.markLoanAsPaid(id, accountId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['loanSummary'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useDeleteLoan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, revert }: { id: string; revert?: boolean }) =>
      api.deleteLoan(id, revert),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['loanSummary'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useInvestments = () =>
  useQuery({ queryKey: ['investments'], queryFn: api.getInvestments });

export const useAddInvestment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addInvestment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useUpdateInvestment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, investment }: { id: string; investment: Parameters<typeof api.updateInvestment>[1] }) =>
      api.updateInvestment(id, investment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useDeleteInvestment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteInvestment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useRefreshInvestmentPrices = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.refreshInvestmentPrices,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useGoals = () =>
  useQuery({ queryKey: ['goals'], queryFn: api.getGoals });

export const useAddGoal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addGoal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useUpdateGoal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<import('@/types').SavingsGoal>) =>
      api.updateGoal(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
};

export const useDeleteGoal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteGoal,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
};

export const useAddGoalContribution = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; amount: number; date?: string; notes?: string; sourceAccountId: string }) =>
      api.addGoalContribution(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};

export const useFinancialPeriodSummary = (
  periodType: 'quincenal' | 'mensual' | 'semanal' | 'bimestral' | 'semestral' | 'anual' = 'quincenal',
  mode: 'calendar' | 'projection' = 'calendar'
) =>
  useQuery({
    queryKey: ['financialPeriodSummary', periodType, mode],
    queryFn: () => api.getFinancialPeriodSummary(periodType, mode),
    staleTime: 30 * 1000,
  });

export const useUpcomingCommitments = (days = 7) =>
  useQuery({
    queryKey: ['upcomingCommitments', days],
    queryFn: () => api.getUpcomingCommitments(days),
    staleTime: 5 * 60 * 1000,
  });

export const useSafeToSpendQuery = () =>
  useQuery({
    queryKey: ['safeToSpend'],
    queryFn: api.getSafeToSpend,
    staleTime: 60 * 1000,
  });

export const useWithdrawFromGoal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; amount: number; targetAccountId: string }) =>
      api.withdrawFromGoal(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['financialPeriodSummary'] });
    },
  });
};
