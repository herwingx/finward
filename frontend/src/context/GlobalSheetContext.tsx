import React, { createContext, useContext, useState, useCallback } from 'react';
import { Investment } from '@/types';
import { SavingsGoal } from '@/types';
import { InstallmentPurchase } from '@/types';
import { Loan } from '@/types';
import { RecurringTransaction } from '@/types';
import { Transaction, TransactionFormInitialData } from '@/types';
import { Account, Category } from '@/types';

interface GlobalSheetContextType {
  openInvestmentSheet: (investment?: Investment | null) => void;
  closeInvestmentSheet: () => void;
  openGoalSheet: (goal?: SavingsGoal | null) => void;
  closeGoalSheet: () => void;
  openInstallmentSheet: (installment?: InstallmentPurchase | null) => void;
  closeInstallmentSheet: () => void;
  openLoanSheet: (loan?: Loan | null) => void;
  closeLoanSheet: () => void;
  openRecurringSheet: (transaction?: RecurringTransaction | null) => void;
  closeRecurringSheet: () => void;
  openTransactionSheet: (transaction?: Transaction | null, initialData?: TransactionFormInitialData | null) => void;
  closeTransactionSheet: () => void;
  openAccountSheet: (account?: Account | null) => void;
  closeAccountSheet: () => void;
  openCategorySheet: (category?: Category | null) => void;
  closeCategorySheet: () => void;

  isInvestmentSheetOpen: boolean;
  investmentToEdit: Investment | null;
  isGoalSheetOpen: boolean;
  goalToEdit: SavingsGoal | null;
  isInstallmentSheetOpen: boolean;
  installmentToEdit: InstallmentPurchase | null;
  isLoanSheetOpen: boolean;
  loanToEdit: Loan | null;
  isRecurringSheetOpen: boolean;
  recurringToEdit: RecurringTransaction | null;
  isTransactionSheetOpen: boolean;
  transactionToEdit: Transaction | null;
  transactionInitialData: TransactionFormInitialData | null;
  isAccountSheetOpen: boolean;
  accountToEdit: Account | null;
  isCategorySheetOpen: boolean;
  categoryToEdit: Category | null;
}

const GlobalSheetContext = createContext<GlobalSheetContextType | undefined>(undefined);

export const GlobalSheetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState({
    isInvestmentSheetOpen: false,
    investmentToEdit: null as Investment | null,
    isGoalSheetOpen: false,
    goalToEdit: null as SavingsGoal | null,
    isInstallmentSheetOpen: false,
    installmentToEdit: null as InstallmentPurchase | null,
    isLoanSheetOpen: false,
    loanToEdit: null as Loan | null,
    isRecurringSheetOpen: false,
    recurringToEdit: null as RecurringTransaction | null,
    isTransactionSheetOpen: false,
    transactionToEdit: null as Transaction | null,
    transactionInitialData: null as TransactionFormInitialData | null,
    isAccountSheetOpen: false,
    accountToEdit: null as Account | null,
    isCategorySheetOpen: false,
    categoryToEdit: null as Category | null,
  });

  const openInvestmentSheet = useCallback((investment: Investment | null = null) => {
    setState(s => ({ ...s, isInvestmentSheetOpen: true, investmentToEdit: investment }));
  }, []);
  const closeInvestmentSheet = useCallback(() => {
    setState(s => ({ ...s, isInvestmentSheetOpen: false, investmentToEdit: null }));
  }, []);

  const openGoalSheet = useCallback((goal: SavingsGoal | null = null) => {
    setState(s => ({ ...s, isGoalSheetOpen: true, goalToEdit: goal }));
  }, []);
  const closeGoalSheet = useCallback(() => {
    setState(s => ({ ...s, isGoalSheetOpen: false, goalToEdit: null }));
  }, []);

  const openInstallmentSheet = useCallback((installment: InstallmentPurchase | null = null) => {
    setState(s => ({ ...s, isInstallmentSheetOpen: true, installmentToEdit: installment }));
  }, []);
  const closeInstallmentSheet = useCallback(() => {
    setState(s => ({ ...s, isInstallmentSheetOpen: false, installmentToEdit: null }));
  }, []);

  const openLoanSheet = useCallback((loan: Loan | null = null) => {
    setState(s => ({ ...s, isLoanSheetOpen: true, loanToEdit: loan }));
  }, []);
  const closeLoanSheet = useCallback(() => {
    setState(s => ({ ...s, isLoanSheetOpen: false, loanToEdit: null }));
  }, []);

  const openRecurringSheet = useCallback((transaction: RecurringTransaction | null = null) => {
    setState(s => ({ ...s, isRecurringSheetOpen: true, recurringToEdit: transaction }));
  }, []);
  const closeRecurringSheet = useCallback(() => {
    setState(s => ({ ...s, isRecurringSheetOpen: false, recurringToEdit: null }));
  }, []);

  const openTransactionSheet = useCallback((transaction: Transaction | null = null, initialData: TransactionFormInitialData | null = null) => {
    setState(s => ({ ...s, isTransactionSheetOpen: true, transactionToEdit: transaction, transactionInitialData: initialData }));
  }, []);
  const closeTransactionSheet = useCallback(() => {
    setState(s => ({ ...s, isTransactionSheetOpen: false, transactionToEdit: null, transactionInitialData: null }));
  }, []);

  const openAccountSheet = useCallback((account: Account | null = null) => {
    setState(s => ({ ...s, isAccountSheetOpen: true, accountToEdit: account }));
  }, []);
  const closeAccountSheet = useCallback(() => {
    setState(s => ({ ...s, isAccountSheetOpen: false, accountToEdit: null }));
  }, []);

  const openCategorySheet = useCallback((category: Category | null = null) => {
    setState(s => ({ ...s, isCategorySheetOpen: true, categoryToEdit: category }));
  }, []);
  const closeCategorySheet = useCallback(() => {
    setState(s => ({ ...s, isCategorySheetOpen: false, categoryToEdit: null }));
  }, []);

  return (
    <GlobalSheetContext.Provider
      value={{
        openInvestmentSheet, closeInvestmentSheet,
        openGoalSheet, closeGoalSheet,
        openInstallmentSheet, closeInstallmentSheet,
        openLoanSheet, closeLoanSheet,
        openRecurringSheet, closeRecurringSheet,
        openTransactionSheet, closeTransactionSheet,
        openAccountSheet, closeAccountSheet,
        openCategorySheet, closeCategorySheet,
        ...state
      }}
    >
      {children}
    </GlobalSheetContext.Provider>
  );
};

export const useGlobalSheets = () => {
  const context = useContext(GlobalSheetContext);
  if (!context) {
    throw new Error('useGlobalSheets must be used within a GlobalSheetProvider');
  }
  return context;
};
