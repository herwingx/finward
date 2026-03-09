/**
 * Calcula el monto MSI que corresponde a un ciclo de facturación de TDC.
 * Solo incluye cuotas cuya fecha de vencimiento cae dentro del ciclo
 * (desde cycleStartDate hasta paymentDate).
 * Respeta meses ya pagados y el monto correcto de la última cuota (redondeo).
 */
import { expandMsiInPeriod } from '../../financial-planning/domain/projectionEngine';
import type { BillingCycle } from './billingCycle';

export interface InstallmentForMsi {
  id: string;
  description: string;
  totalAmount: number;
  installments: number;
  paidInstallments: number;
  paidAmount: number;
  monthlyPayment: number;
  purchaseDate: Date;
  account?: { cutoffDay: number | null; paymentDay: number | null } | null;
  category?: { id: string; name: string; icon: string; color: string };
}

/**
 * Retorna el total de MSI que vence en el ciclo de facturación dado.
 * Usa expandMsiInPeriod para considerar solo cuotas con dueDate en [cycleStartDate, paymentDate].
 */
export function getMsiAmountForBillingCycle(
  installments: InstallmentForMsi[],
  cycle: BillingCycle
): number {
  const active = installments.filter((m) => m.paidAmount < m.totalAmount);
  let total = 0;
  for (const m of active) {
    const events = expandMsiInPeriod(m, cycle.cycleStartDate, cycle.paymentDate);
    for (const ev of events) {
      total += ev.amount;
    }
  }
  return Math.round(total * 100) / 100;
}
