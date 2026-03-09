/**
 * Cálculo unificado de balances financieros.
 * Define: dinero disponible, patrimonio (net worth), activos y pasivos.
 */

export interface AccountForBalance {
  type: string;
  balance: number;
  includeInNetWorth?: boolean;
}

export interface FinancialBalancesInput {
  accounts: AccountForBalance[];
  investmentsValue?: number;
  goalsValue?: number;
  loansLent?: number;
  loansBorrowed?: number;
}

export interface FinancialBalances {
  /** Dinero disponible: efectivo + cuentas líquidas (DEBIT, CASH, SAVINGS) */
  availableFunds: number;
  /** Total activos: cuentas no-deuda + inversiones + metas + préstamos prestados */
  totalAssets: number;
  /** Total pasivos: cuentas deuda (CREDIT, LOAN) + préstamos recibidos */
  totalLiabilities: number;
  /** Patrimonio = activos - pasivos */
  netWorth: number;
}

const LIQUID_TYPES = ['DEBIT', 'CASH', 'SAVINGS'];
const DEBT_ACCOUNT_TYPES = ['CREDIT', 'LOAN'];

export function computeFinancialBalances(input: FinancialBalancesInput): FinancialBalances {
  const {
    accounts,
    investmentsValue = 0,
    goalsValue = 0,
    loansLent = 0,
    loansBorrowed = 0,
  } = input;

  let availableFunds = 0;
  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const a of accounts) {
    const include = a.includeInNetWorth !== false;

    if (LIQUID_TYPES.includes(a.type)) {
      availableFunds += a.balance;
    }

    if (DEBT_ACCOUNT_TYPES.includes(a.type)) {
      if (include) totalLiabilities += Math.abs(a.balance);
    } else {
      if (include) totalAssets += a.balance;
    }
  }

  totalAssets += investmentsValue + goalsValue + loansLent;
  totalLiabilities += loansBorrowed;

  const netWorth = totalAssets - totalLiabilities;

  return {
    availableFunds: Math.round(availableFunds * 100) / 100,
    totalAssets: Math.round(totalAssets * 100) / 100,
    totalLiabilities: Math.round(totalLiabilities * 100) / 100,
    netWorth: Math.round(netWorth * 100) / 100,
  };
}
