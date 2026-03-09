import { apiFetch, apiFetchNoJson, API_BASE_URL } from './client';
import type {
  Transaction,
  Category,
  RecurringTransaction,
  Account,
  InstallmentPurchase,
  Loan,
  LoanSummary,
  Investment,
  SavingsGoal,
  Profile,
  FinancialPeriodSummary,
  CreditCardStatement,
} from '@/types';

// Auth (no token needed - public endpoints)
export async function login(email: string, password: string): Promise<{ token: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({} as Record<string, unknown>));
    throw new Error((err as { message?: string }).message ?? 'Login failed');
  }
  return res.json();
}

export async function register(data: { email: string; password: string; name?: string }): Promise<{ token: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({} as Record<string, unknown>));
    throw new Error((err as { message?: string }).message ?? 'Registration failed');
  }
  return res.json();
}

export async function requestPasswordReset(email: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/auth/request-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({} as Record<string, unknown>));
    throw new Error((err as { message?: string }).message ?? 'Request failed');
  }
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({} as Record<string, unknown>));
    throw new Error((err as { message?: string }).message ?? 'Reset failed');
  }
}

// Profile
export const getProfile = () => apiFetch<Profile>('/profile');

export async function updateProfile(profile: Partial<Profile>): Promise<Profile> {
  if (profile.avatar && profile.avatar.startsWith('data:image')) {
    const formData = new FormData();
    formData.append('name', profile.name ?? '');
    formData.append('currency', profile.currency ?? '');
    const response = await fetch(profile.avatar);
    const blob = await response.blob();
    formData.append('avatar', blob, 'avatar.png');
    return apiFetch<Profile>('/profile', {
      method: 'PUT',
      body: formData as unknown as BodyInit,
    });
  }
  return apiFetch<Profile>('/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
}

// Transactions (paginated: { data, total, take, skip })
export interface PaginatedTransactions {
  data: Transaction[];
  total: number;
  take: number;
  skip: number;
}
export const getTransactions = (params?: { take?: number; skip?: number }) => {
  const q = new URLSearchParams();
  if (params?.take != null) q.set('take', String(params.take));
  if (params?.skip != null) q.set('skip', String(params.skip));
  const query = q.toString();
  return apiFetch<PaginatedTransactions>(`/transactions${query ? `?${query}` : ''}`);
};
export const getTransaction = (id: string) => apiFetch<Transaction>(`/transactions/${id}`);
export const addTransaction = (data: Omit<Transaction, 'id'>) =>
  apiFetch<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(data) });
export const updateTransaction = (id: string, data: Partial<Transaction>) =>
  apiFetch<Transaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTransaction = (id: string, force = false) =>
  apiFetchNoJson(`/transactions/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' });
export const getDeletedTransactions = (params?: { take?: number; skip?: number }) => {
  const q = new URLSearchParams();
  if (params?.take != null) q.set('take', String(params.take));
  if (params?.skip != null) q.set('skip', String(params.skip));
  const query = q.toString();
  return apiFetch<PaginatedTransactions>(`/transactions/deleted${query ? `?${query}` : ''}`);
};
export const restoreTransaction = (id: string) =>
  apiFetchNoJson(`/transactions/${id}/restore`, { method: 'POST' });

// Categories
export const getCategories = () => apiFetch<Category[]>('/categories');
export const addCategory = (data: Omit<Category, 'id'>) =>
  apiFetch<Category>('/categories', { method: 'POST', body: JSON.stringify(data) });
export const updateCategory = (id: string, data: Partial<Category>) =>
  apiFetch<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export async function deleteCategory(id: string, newCategoryId?: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
    body: newCategoryId ? JSON.stringify({ newCategoryId }) : undefined,
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (res.status === 409) throw new Error('in-use');
  if (!res.ok) {
    const err = await res.json().catch(() => ({} as Record<string, unknown>));
    throw new Error((err as { message?: string }).message ?? 'Delete failed');
  }
}

// Accounts
export const getAccounts = () => apiFetch<Account[]>('/accounts');
export const addAccount = (data: Omit<Account, 'id' | 'userId' | 'transactions'>) =>
  apiFetch<Account>('/accounts', { method: 'POST', body: JSON.stringify(data) });
export const updateAccount = (id: string, data: Partial<Omit<Account, 'id' | 'userId' | 'transactions'>>) =>
  apiFetch<Account>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteAccount = (id: string) => apiFetchNoJson(`/accounts/${id}`, { method: 'DELETE' });

// Recurring
export const getRecurringTransactions = () => apiFetch<RecurringTransaction[]>('/recurring');
export const getRecurringTransaction = (id: string) => apiFetch<RecurringTransaction>(`/recurring/${id}`);
export const addRecurringTransaction = (data: Omit<RecurringTransaction, 'id'>) =>
  apiFetch<RecurringTransaction>('/recurring', { method: 'POST', body: JSON.stringify(data) });
export const updateRecurringTransaction = (id: string, data: Partial<Omit<RecurringTransaction, 'id'>>) =>
  apiFetch<RecurringTransaction>(`/recurring/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteRecurringTransaction = (id: string) =>
  apiFetchNoJson(`/recurring/${id}`, { method: 'DELETE' });
export const payRecurringTransaction = (id: string, data?: { amount?: number; date?: string }) =>
  apiFetch(`/recurring/${id}/pay`, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
export const skipRecurringTransaction = (id: string) =>
  apiFetch(`/recurring/${id}/skip`, { method: 'POST' });

// Installments
export const getInstallmentPurchases = () => apiFetch<InstallmentPurchase[]>('/installments');
export const getInstallmentPurchase = (id: string) => apiFetch<InstallmentPurchase>(`/installments/${id}`);
export const addInstallmentPurchase = (data: Omit<InstallmentPurchase, 'id' | 'userId' | 'account' | 'generatedTransactions' | 'paidInstallments' | 'paidAmount'> & { initialPaidInstallments?: number }) =>
  apiFetch<InstallmentPurchase>('/installments', { method: 'POST', body: JSON.stringify(data) });
export const updateInstallmentPurchase = (id: string, data: Partial<Omit<InstallmentPurchase, 'id' | 'userId' | 'account' | 'generatedTransactions' | 'paidInstallments' | 'paidAmount'>>) =>
  apiFetch<InstallmentPurchase>(`/installments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteInstallmentPurchase = (id: string, revert = false) =>
  apiFetchNoJson(`/installments/${id}${revert ? '?revert=true' : ''}`, { method: 'DELETE' });
export const payInstallment = (id: string, payment: { amount: number; description?: string; date: string; accountId: string }) =>
  apiFetch(`/installments/${id}/pay`, { method: 'POST', body: JSON.stringify(payment) });

// Financial Planning
export const getFinancialPeriodSummary = (
  periodType: 'quincenal' | 'mensual' | 'semanal' | 'bimestral' | 'semestral' | 'anual' = 'quincenal',
  mode: 'calendar' | 'projection' = 'calendar'
) =>
  apiFetch<FinancialPeriodSummary>(`/financial-planning/summary?period=${periodType}&mode=${mode}`);
export const getUpcomingCommitments = (days = 7) =>
  apiFetch(`/financial-planning/upcoming?days=${days}`);

// Credit Card
export const getCreditCardStatement = (accountId: string) =>
  apiFetch<CreditCardStatement>(`/credit-card/statement/${accountId}`);
export const payFullStatement = (accountId: string, sourceAccountId: string, amount: number, date?: string) =>
  apiFetch(`/credit-card/statement/${accountId}/pay`, {
    method: 'POST',
    body: JSON.stringify({ sourceAccountId, amount, date }),
  });
export const payMsiInstallment = (installmentId: string, sourceAccountId: string, date?: string) =>
  apiFetch(`/credit-card/pay-msi/${installmentId}`, {
    method: 'POST',
    body: JSON.stringify({ sourceAccountId, date }),
  });
export const revertStatementPayment = (transactionId: string) =>
  apiFetch(`/credit-card/revert/${transactionId}`, { method: 'POST' });

// Loans
export const getLoans = () => apiFetch<Loan[]>('/loans');
export const getLoanSummary = () => apiFetch<LoanSummary>('/loans/summary');
export const getLoan = (id: string) => apiFetch<Loan>(`/loans/${id}`);
export const addLoan = (data: {
  borrowerName: string;
  borrowerPhone?: string;
  borrowerEmail?: string;
  reason?: string;
  loanType?: 'lent' | 'borrowed';
  originalAmount: number;
  loanDate: string;
  expectedPayDate?: string;
  notes?: string;
  accountId?: string;
  affectBalance?: boolean;
}) => apiFetch<Loan>('/loans', { method: 'POST', body: JSON.stringify(data) });
export const updateLoan = (id: string, data: Record<string, unknown>) =>
  apiFetch<Loan>(`/loans/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const registerLoanPayment = (id: string, payment: { amount: number; paymentDate?: string; notes?: string; accountId?: string }) =>
  apiFetch<Loan>(`/loans/${id}/payment`, { method: 'POST', body: JSON.stringify(payment) });
export const markLoanAsPaid = (id: string, accountId?: string) =>
  apiFetch<Loan>(`/loans/${id}/mark-paid`, { method: 'POST', body: JSON.stringify({ accountId }) });
export const deleteLoan = (id: string, revert = false) =>
  apiFetchNoJson(`/loans/${id}${revert ? '?revert=true' : ''}`, { method: 'DELETE' });

// Investments
export const getInvestments = () => apiFetch<Investment[]>('/investments');
export const addInvestment = (data: Omit<Investment, 'id' | 'userId' | 'lastPriceUpdate'>) =>
  apiFetch<Investment>('/investments', { method: 'POST', body: JSON.stringify(data) });
export const updateInvestment = (id: string, data: Partial<Omit<Investment, 'id' | 'userId'>>) =>
  apiFetch<Investment>(`/investments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteInvestment = (id: string) =>
  apiFetchNoJson(`/investments/${id}`, { method: 'DELETE' });

type RefreshPricesResult = { updated: number; crypto: number; stock: number; message?: string };
export const refreshInvestmentPrices = () =>
  apiFetch<RefreshPricesResult>('/investments/refresh-prices', { method: 'POST' });

export type CoinGeckoCoin = { id: string; name: string; symbol: string; market_cap_rank?: number; thumb?: string };
export const searchCoins = (query: string) =>
  apiFetch<{ coins: CoinGeckoCoin[] }>(`/investments/coins/search?q=${encodeURIComponent(query)}`);
export const getTopCoins = (limit = 50) =>
  apiFetch<{ coins: CoinGeckoCoin[] }>(`/investments/coins/top?limit=${limit}`);
export const getCoinPrice = (id: string) =>
  apiFetch<{ id: string; price: number | null }>(`/investments/coins/price?id=${encodeURIComponent(id)}`);

export type YahooQuote = { symbol: string; shortname?: string; longname?: string; quoteType?: string };
export const searchStocks = (query: string) =>
  apiFetch<{ quotes: YahooQuote[] }>(`/investments/stocks/search?q=${encodeURIComponent(query)}`);
export const getStockPrice = (symbol: string) =>
  apiFetch<{ symbol: string; price: number | null; currency: string | null }>(`/investments/stocks/price?symbol=${encodeURIComponent(symbol)}`);

// Goals
export const getGoals = () => apiFetch<SavingsGoal[]>('/goals');
export const addGoal = (data: Omit<SavingsGoal, 'id' | 'currentAmount' | 'contributions'>) =>
  apiFetch<SavingsGoal>('/goals', { method: 'POST', body: JSON.stringify(data) });
export const updateGoal = (id: string, data: Partial<SavingsGoal>) =>
  apiFetch<SavingsGoal>(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteGoal = (id: string) =>
  apiFetchNoJson(`/goals/${id}`, { method: 'DELETE' });
export const addGoalContribution = (id: string, data: { amount: number; date?: string; notes?: string; sourceAccountId: string }) =>
  apiFetch(`/goals/${id}/contribute`, { method: 'POST', body: JSON.stringify(data) });
export const withdrawFromGoal = (id: string, data: { amount: number; targetAccountId: string }) =>
  apiFetch(`/goals/${id}/withdraw`, { method: 'POST', body: JSON.stringify(data) });

// Notifications
export const getNotifications = () => apiFetch<unknown[]>('/notifications');
export const markNotificationRead = (id: string) =>
  apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
export const markAllNotificationsRead = () =>
  apiFetch('/notifications/read-all', { method: 'PUT' });

export const triggerDebugNotification = () =>
  apiFetch('/notifications/debug-trigger', { method: 'POST' });

// Safe to spend (AI)
export const getSafeToSpend = () => apiFetch<{ safeToSpend: number }>('/ai/query/safe-to-spend');
