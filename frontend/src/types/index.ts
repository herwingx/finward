export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  categoryId?: string;
  category?: Category;
  accountId: string;
  account?: Account;
  destinationAccountId?: string;
  destinationAccount?: Account;
  date: string;
  recurringTransactionId?: string;
  installmentPurchaseId?: string;
  loanId?: string;
  loan?: Loan;
  deletedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  budgetType?: 'need' | 'want' | 'savings';
}

export type FrequencyType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'biweekly_15_30';

export interface RecurringTransaction {
  id: string;
  amount: number;
  description: string;
  type: TransactionType;
  frequency: FrequencyType;
  startDate: string;
  nextDueDate: string;
  endDate?: string;
  active: boolean;
  categoryId: string;
  category?: Category;
  accountId: string;
  account?: Account;
}

export interface InstallmentPurchase {
  id: string;
  description: string;
  totalAmount: number;
  installments: number;
  monthlyPayment: number;
  purchaseDate: string;
  accountId: string;
  userId: string;
  account?: Account;
  generatedTransactions?: Transaction[];
  categoryId: string;
  paidInstallments: number;
  paidAmount: number;
}

export type AccountType = 'DEBIT' | 'CREDIT' | 'CASH' | 'LOAN' | 'INVESTMENT';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  creditLimit?: number;
  cutoffDay?: number;
  daysToPayAfterCutoff?: number;
  interestRate?: number;
  userId: string;
  transactions?: Transaction[];
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  currency: 'USD' | 'EUR' | 'GBP' | 'MXN';
  timezone: string;
  avatar?: string;
  monthlyNetIncome?: number;
  incomeFrequency?: 'weekly' | 'biweekly' | 'monthly';
  taxRate?: number;
  notificationsEnabled?: boolean;
}

export type LoanStatus = 'active' | 'partial' | 'paid';
export type LoanType = 'lent' | 'borrowed';

export interface Loan {
  id: string;
  borrowerName: string;
  borrowerPhone?: string;
  borrowerEmail?: string;
  reason?: string;
  loanType: LoanType;
  originalAmount: number;
  remainingAmount: number;
  loanDate: string;
  expectedPayDate?: string;
  status: LoanStatus;
  notes?: string;
  userId: string;
  accountId?: string;
  account?: Account;
  createdAt: string;
  updatedAt: string;
}

export interface LoanSummary {
  totalLoans: number;
  activeLoansCount: number;
  paidLoansCount: number;
  totalOwedToMe: number;
  lentLoansCount: number;
  totalIOwe: number;
  borrowedLoansCount: number;
  netBalance: number;
  totalRecovered: number;
}

export type InvestmentType = 'STOCK' | 'CRYPTO' | 'BOND' | 'FUND' | 'ETF' | 'REAL_ESTATE' | 'OTHER';

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  ticker?: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice?: number;
  currency: string;
  purchaseDate: string;
  lastPriceUpdate?: string;
  notes?: string;
  userId: string;
}

export interface SavingsContribution {
  id: string;
  amount: number;
  date: string;
  notes?: string;
  savingsGoalId: string;
  transactionId?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  icon?: string;
  color?: string;
  priority: number;
  status: 'active' | 'completed' | 'paused';
  contributions?: SavingsContribution[];
}

export interface TransactionFormInitialData {
  type?: TransactionType;
  amount?: string;
  description?: string;
  categoryId?: string;
  accountId?: string;
  destinationAccountId?: string;
  installmentPurchaseId?: string;
}

export interface FinancialPeriodSummary {
  periodStart: string;
  periodEnd: string;
  periodType: 'quincenal' | 'mensual' | 'semanal' | 'bimestral' | 'semestral' | 'anual';
  availableFunds: number;
  totalAssets: number;
  totalLiabilities: number;
  currentMSIDebt: number;
  expectedIncome: unknown[];
  totalExpectedIncome: number;
  totalReceivedIncome: number;
  totalPeriodIncome: number;
  expectedExpenses: unknown[];
  msiPaymentsDue: unknown[];
  totalExpectedExpenses: number;
  totalMSIPayments: number;
  totalCommitments: number;
  projectedBalance: number;
  netWorth: number;
  disposableIncome: number;
  budgetAnalysis?: {
    needs: { projected: number; ideal: number };
    wants: { projected: number; ideal: number };
    savings: { projected: number; ideal: number };
  };
  isSufficient: boolean;
  shortfall?: number;
  warnings: string[];
  minRunningBalance?: number;
  cashFlowRisk?: boolean;
}

export interface CreditCardStatement {
  accountId: string;
  accountName: string;
  creditLimit: number | null;
  currentBalance: number;
  billingCycle: {
    startDate: string;
    cutoffDate: string;
    paymentDate: string;
    isBeforeCutoff: boolean;
    daysUntilCutoff: number;
    daysUntilPayment: number;
  };
  msiCharges: Array<{
    id: string;
    description: string;
    amount: number;
    currentInstallment: number;
    totalInstallments: number;
    remainingAmount: number;
    paidAmount: number;
    categoryName: string;
    categoryColor: string;
    categoryIcon: string;
  }>;
  msiTotal: number;
  msiCount: number;
  regularCharges: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    categoryName: string;
    categoryColor: string;
    categoryIcon: string;
  }>;
  regularTotal: number;
  regularCount: number;
  totalDue: number;
  totalPaid: number;
  remainingDue: number;
  isFullyPaid: boolean;
  payments: Array<{
    id: string;
    amount: number;
    date: string;
    description: string;
  }>;
}
