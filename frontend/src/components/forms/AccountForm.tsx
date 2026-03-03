import React, { useState, useEffect } from 'react';
import { useAddAccount, useUpdateAccount, useAddTransaction, useCategories, useAddCategory, useDeleteAccount } from '@/hooks/useApi';
import { Account, AccountType } from '@/types';
import { toastSuccess, toastError } from '@/utils/toast';
import { DeleteConfirmationSheet } from '@/components/DeleteConfirmationSheet';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';

interface AccountFormProps {
  existingAccount?: Account | null;
  onClose: () => void;
}

export const AccountForm: React.FC<AccountFormProps> = ({ existingAccount, onClose }) => {
  const isEditMode = !!existingAccount;

  /* --- DATA & MUTATIONS --- */
  const { data: categories } = useCategories();
  const addAccount = useAddAccount();
  const updateAccount = useUpdateAccount();
  const addTransaction = useAddTransaction();
  const addCategory = useAddCategory();
  const deleteAccount = useDeleteAccount();

  /* --- STATE --- */
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('DEBIT');
  const [balance, setBalance] = useState('');

  // Credit details
  const [limit, setLimit] = useState('');
  const [cutoff, setCutoff] = useState('');
  const [payDay, setPayDay] = useState('');
  const [rate, setRate] = useState('');

  // Adjustment Logic
  const [showAdj, setShowAdj] = useState(false);
  const [adjAmount, setAdjAmount] = useState('');
  const [adjDesc, setAdjDesc] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /* --- INIT --- */
  useEffect(() => {
    if (existingAccount) {
      setName(existingAccount.name);
      setType(existingAccount.type);
      setBalance(String(existingAccount.balance));
      setLimit(existingAccount.creditLimit?.toString() || '');
      setCutoff(existingAccount.cutoffDay?.toString() || '');
      setPayDay(existingAccount.paymentDay?.toString() || '');
      setRate(existingAccount.interestRate?.toString() || '');
    } else {
      setType('DEBIT');
    }
  }, [existingAccount]);

  /* --- HANDLERS --- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return toastError('Falta nombre');

    const payload: any = {
      name,
      type,
      balance: parseFloat(balance) || 0,
      creditLimit: limit ? parseFloat(limit) : undefined,
      cutoffDay: cutoff ? parseInt(cutoff) : undefined,
      paymentDay: payDay ? parseInt(payDay) : undefined,
      interestRate: rate ? parseFloat(rate) : undefined
    };

    try {
      if (isEditMode && existingAccount) {
        await updateAccount.mutateAsync({ id: existingAccount.id, account: payload });
        toastSuccess('Cuenta actualizada');
      } else {
        await addAccount.mutateAsync(payload);
        toastSuccess('Cuenta creada');
      }
      onClose();
    } catch (e: any) { toastError(e.message || 'Error'); }
  };

  const isAdjusting = addTransaction.isPending || addCategory.isPending;

  const executeAdjustment = async () => {
    if (!existingAccount) return;
    const target = parseFloat(adjAmount);
    const current = parseFloat(balance);
    const diff = target - current;
    if (Math.abs(diff) < 0.01) { setShowAdj(false); return; }

    let txType: 'income' | 'expense';
    if (type === 'CREDIT') txType = target > current ? 'expense' : 'income'; // More debt = expense
    else txType = target > current ? 'income' : 'expense'; // More cash = income

    try {
      // Find or create 'Adjustment' category
      let catId = categories?.find(c => c.name.includes('Ajuste') && c.type === txType)?.id;
      if (!catId) {
        const res = await addCategory.mutateAsync({ name: 'Ajuste Manual', type: txType, icon: 'tune', color: '#64748b' } as any);
        catId = res.id;
      }

      await addTransaction.mutateAsync({
        amount: Math.abs(diff),
        description: `🔧 Ajuste: ${adjDesc || 'Manual'}`,
        date: new Date().toISOString(),
        type: txType,
        accountId: existingAccount.id,
        categoryId: catId!
      });

      toastSuccess(`Saldo corregido a ${target}`);
      setShowAdj(false);
      onClose();
    } catch (e: any) {
      const errorMsg = e?.response?.data?.message || e?.message || 'Falló ajuste';
      toastError(errorMsg);
    }
  };

  const handleDeleteClick = () => setShowDeleteConfirm(true);

  const handleConfirmDelete = async () => {
    if (!existingAccount) return;
    try {
      await deleteAccount.mutateAsync(existingAccount.id);
      setShowDeleteConfirm(false);
      toastSuccess('Cuenta eliminada');
      onClose();
    } catch (e: any) {
      const errorMsg = e?.response?.data?.message || e?.message || 'Error al eliminar';
      toastError(errorMsg);
    }
  };

  const isSaving = addAccount.isPending || updateAccount.isPending;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 1. HEADER (Sheet Style) */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-app-border shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-medium text-app-muted hover:text-app-text px-2 md:hidden"
        >
          Cancelar
        </button>
        <h2 className="text-lg font-bold text-app-text">
          {isEditMode ? 'Editar Cuenta' : 'Nueva Cuenta'}
        </h2>
        {isEditMode ? (
          <button
            type="button"
            onClick={handleDeleteClick}
            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition-colors"
            aria-label="Eliminar cuenta"
          >
            <Icon name="delete" size={20} />
          </button>
        ) : (
          <div className="w-12" />
        )}
      </div>

      {/* 2. FORM BODY (Scrollable) */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <form id="account-form" onSubmit={handleSubmit} className="px-6 pt-6 pb-24 space-y-6">

          {/* A. HERO BALANCE INPUT */}
          <div className="flex flex-col items-center mb-4">
            <label className="text-[10px] font-bold text-app-text uppercase tracking-widest opacity-60 mb-2">
              {type === 'CREDIT' ? 'Deuda Actual' : 'Saldo Inicial'}
            </label>
            <div className="relative group">
              <span className="absolute -left-5 top-2 text-2xl text-app-muted font-light opacity-30">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={balance}
                onChange={e => setBalance(e.target.value)}
                placeholder="0.00"
                disabled={isEditMode}
                className="w-48 bg-transparent text-center text-5xl font-black text-app-text outline-none placeholder:text-app-muted/20 caret-app-primary no-spin-button py-2 disabled:opacity-80"
              />
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => { setAdjAmount(balance); setShowAdj(true); }}
                  className="block mx-auto mt-2 text-[10px] font-black text-app-primary uppercase tracking-tighter bg-app-primary/10 px-2.5 py-1 rounded-full hover:bg-app-primary/20 transition-all"
                >
                  Ajustar Saldo
                </button>
              )}
            </div>
          </div>

          {/* B. NAME INPUT */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-app-text uppercase tracking-wider ml-1 opacity-70">
              Nombre de la Cuenta
            </label>
            <div className="bg-app-subtle border border-app-border rounded-xl px-3 py-3 focus-within:ring-2 focus-within:ring-app-primary/50 focus-within:border-app-primary transition-all shadow-sm">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej. Nómina, Efectivo, Tarjeta..."
                autoFocus={!isEditMode}
                className="w-full bg-transparent text-sm font-bold outline-none text-app-text placeholder:text-app-muted/40"
              />
            </div>
          </div>

          {/* C. TYPE TOGGLE */}
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-app-text uppercase tracking-wider ml-1 opacity-70">
              Tipo de Cuenta
            </label>
            <div className="flex flex-wrap justify-center gap-2">
              {([
                { v: 'DEBIT', l: 'Débito', icon: 'account_balance_wallet' },
                { v: 'CASH', l: 'Efectivo', icon: 'payments' },
                { v: 'CREDIT', l: 'Crédito', icon: 'credit_card' },
                { v: 'LOAN', l: 'Pasivo', icon: 'handshake' },
                { v: 'INVESTMENT', l: 'Inversión', icon: 'trending_up' }
              ] as const).map(t => (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => setType(t.v)}
                  className={`flex flex-col items-center justify-center min-w-[68px] min-h-[68px] rounded-2xl border transition-all duration-200 shadow-sm
                    ${type === t.v
                      ? 'bg-app-primary border-app-primary text-white scale-[1.02] shadow-app-primary/30 z-10'
                      : 'bg-app-surface border-app-border text-app-muted hover:border-app-border-strong hover:bg-app-subtle'
                    }`}
                >
                  <Icon name={t.icon} size={20} className="mb-1" />
                  <span className="text-[9px] font-black uppercase tracking-tighter">{t.l}</span>
                </button>
              ))}
            </div>
          </div>

          {/* D. CREDIT CARD SPECIFIC FIELDS */}
          {type === 'CREDIT' && (
            <div className="bg-app-subtle/50 p-4 rounded-2xl border border-app-border space-y-4 animate-scale-in">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="settings" size={20} className="text-app-primary text-lg" />
                <p className="text-[10px] font-black text-app-text uppercase tracking-widest opacity-80">Configuración de Tarjeta</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-app-muted uppercase ml-1">Corte (Día)</label>
                  <div className="bg-app-surface border border-app-border rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-app-primary/50 focus-within:border-app-primary transition-all">
                    <input
                      type="number"
                      placeholder="Ej. 14"
                      value={cutoff}
                      onChange={e => setCutoff(e.target.value)}
                      className="w-full bg-transparent text-sm font-bold outline-none text-app-text text-center"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-app-muted uppercase ml-1">Límite Pago</label>
                  <div className="bg-app-surface border border-app-border rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-app-primary/50 focus-within:border-app-primary transition-all">
                    <input
                      type="number"
                      placeholder="Ej. 4"
                      value={payDay}
                      onChange={e => setPayDay(e.target.value)}
                      className="w-full bg-transparent text-sm font-bold outline-none text-app-text text-center"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-app-muted uppercase ml-1">Límite Crédito</label>
                  <div className="bg-app-surface border border-app-border rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-app-primary/50 focus-within:border-app-primary transition-all">
                    <input
                      type="number"
                      placeholder="$"
                      value={limit}
                      onChange={e => setLimit(e.target.value)}
                      className="w-full bg-transparent text-sm font-bold outline-none text-app-text text-center"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-app-muted uppercase ml-1">Interés ANUAL %</label>
                  <div className="bg-app-surface border border-app-border rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-app-primary/50 focus-within:border-app-primary transition-all">
                    <input
                      type="number"
                      placeholder="%"
                      value={rate}
                      onChange={e => setRate(e.target.value)}
                      className="w-full bg-transparent text-sm font-bold outline-none text-app-text text-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* 3. STICKY FOOTER */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
        <Button
          form="account-form"
          type="submit"
          fullWidth
          size="lg"
          variant="primary"
          isLoading={isSaving}
          disabled={isSaving}
          className="pointer-events-auto"
        >
          {isEditMode ? 'Guardar Cambios' : 'Confirmar Cuenta'}
        </Button>
      </div>

      {/* ADJUSTMENT MODAL OVERLAY (Sleek Alert Style) */}
      {showAdj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-zinc-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-app-surface border border-app-border rounded-[32px] p-8 w-full max-w-sm shadow-2xl animate-scale-in">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="size-16 rounded-3xl bg-app-primary/10 flex items-center justify-center mb-4 text-app-primary">
                <Icon name="account_balance_wallet" size={32} />
              </div>
              <h3 className="text-xl font-black text-app-text">Corregir Saldo</h3>
              <p className="text-sm text-app-muted mt-2 px-2 leading-relaxed opacity-80">
                Se generará un movimiento de **ajuste manual** para igualar el balance actual.
              </p>
            </div>

            <div className="space-y-5">
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-app-muted opacity-30">$</span>
                <input
                  type="number"
                  autoFocus
                  value={adjAmount}
                  onChange={e => setAdjAmount(e.target.value)}
                  className="w-full h-16 bg-app-subtle border-2 border-app-border focus:border-app-primary rounded-2xl text-center text-3xl font-black text-app-text outline-none transition-all"
                />
              </div>

              <div className="bg-app-subtle border border-app-border rounded-xl px-4 py-3">
                <input
                  type="text"
                  placeholder="Motivo (opcional)"
                  value={adjDesc}
                  onChange={e => setAdjDesc(e.target.value)}
                  className="w-full bg-transparent text-sm font-bold text-center outline-none text-app-text placeholder:text-app-muted/30"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 pt-4">
                <Button
                  type="button"
                  fullWidth
                  size="md"
                  variant="primary"
                  isLoading={isAdjusting}
                  disabled={isAdjusting}
                  onClick={executeAdjustment}
                >
                  Actualizar Saldo
                </Button>
                <Button
                  type="button"
                  fullWidth
                  size="md"
                  variant="secondary"
                  onClick={() => setShowAdj(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditMode && existingAccount && (
        <DeleteConfirmationSheet
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleConfirmDelete}
          itemName={existingAccount.name}
          warningLevel="critical"
          warningMessage="Se perderá todo el historial de transacciones de esta cuenta."
          warningDetails={['No podrás recuperar las transacciones asociadas.']}
          isDeleting={deleteAccount.isPending}
        />
      )}
    </div>
  );
};

export default AccountForm;