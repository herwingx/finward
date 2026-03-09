import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Hooks & Context
import { useGlobalSheets } from '@/context/GlobalSheetContext';
import { useInvestments, useDeleteInvestment, useRefreshInvestmentPrices } from '@/hooks/useApi';
import { useIsMobile } from '@/hooks/useIsMobile';

// Components
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { SwipeableItem } from '@/components/SwipeableItem';
import { SwipeableBottomSheet } from '@/components/SwipeableBottomSheet';
import { DeleteConfirmationSheet } from '@/components/DeleteConfirmationSheet';
import { SkeletonInvestmentsPage } from '@/components/Skeleton';

// Utils & Types
import { toastSuccess, toastError } from '@/utils/toast';
import { Investment } from '@/types';

/* ==================================================================================
   CONSTANTS & HELPERS
   ================================================================================== */
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6', '#6366F1'];

const STALE_PRICE_MS = 15 * 60 * 1000; // 15 min

function formatTimeAgo(dateStr: string | undefined): string {
  if (!dateStr) return 'Nunca';
  const d = new Date(dateStr).getTime();
  const now = Date.now();
  const diff = now - d;
  if (diff < 60_000) return 'Hace un momento';
  if (diff < 3_600_000) return `Hace ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `Hace ${Math.floor(diff / 3_600_000)} h`;
  return `Hace ${Math.floor(diff / 86_400_000)} d`;
}

const InvestmentTypeLabel: Record<string, string> = {
  STOCK: 'Acciones',
  CRYPTO: 'Cripto',
  ETF: 'ETF',
  FUND: 'Fondos',
  REAL_ESTATE: 'Inmuebles',
  BOND: 'Bonos',
  OTHER: 'Otro'
};

/* ==================================================================================
   SUB-COMPONENT: DETAIL SHEET
   ================================================================================== */
const COINGECKO_URL = 'https://www.coingecko.com/es/monedas/';

const InvestmentDetailSheet = ({
  investment,
  onClose,
  onEdit,
  onDelete
}: {
  investment: Investment;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const currentPrice = investment.currentPrice || investment.avgBuyPrice;
  const totalValue = currentPrice * investment.quantity;
  const totalCost = investment.avgBuyPrice * investment.quantity;
  const gain = totalValue - totalCost;
  const gainPercent = totalCost > 0 ? (gain / totalCost) * 100 : 0;
  const isProfitable = gain >= 0;

  const formatCurrency = (val: number) => val.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

  return (
    <SwipeableBottomSheet isOpen={true} onClose={onClose}>
      <div className="pt-2 pb-6 px-4 animate-fade-in">

        {/* 1. HERO HEADER */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className={`size-20 rounded-3xl flex items-center justify-center text-4xl mb-4 shadow-md ${isProfitable ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
            <Icon name={investment.type === 'CRYPTO' ? 'currency_bitcoin' : investment.type === 'REAL_ESTATE' ? 'home_work' : investment.type === 'STOCK' ? 'show_chart' : 'trending_up'} size={36} />
          </div>

          <h2 className="text-xl font-bold text-app-text px-4 leading-tight mb-1">{investment.name}</h2>
          {investment.ticker && (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-app-muted font-bold tracking-widest bg-app-subtle px-2 py-0.5 rounded-md uppercase">
                {investment.ticker}
              </p>
              {investment.type === 'CRYPTO' && (
                <a
                  href={`${COINGECKO_URL}${investment.ticker.toLowerCase()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  <Icon name="arrow_outward" size={12} />
                  CoinGecko
                </a>
              )}
            </div>
          )}
        </div>

        {/* 2. MAIN STATS */}
        <div className="bento-card bg-app-subtle p-5 mb-6 border border-app-border/60">
          <div className="flex justify-between items-end mb-4 border-b border-app-border/40 pb-4">
            <span className="text-[10px] uppercase font-bold text-app-muted tracking-widest">Valor Actual</span>
            <span className="text-3xl font-black font-numbers tracking-tight text-app-text">
              {formatCurrency(totalValue)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-app-muted block mb-0.5">Retorno Total</span>
              <p className={`text-base font-bold font-numbers ${isProfitable ? 'text-emerald-500' : 'text-rose-500'}`}>
                {isProfitable ? '+' : ''}{formatCurrency(gain)}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-xl text-xs font-bold ${isProfitable ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {isProfitable ? '▲' : '▼'} {gainPercent.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* 3. DETAILS GRID */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-app-surface border border-app-border p-3 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-app-muted mb-0.5">Cantidad</p>
            <p className="font-bold text-app-text">{investment.quantity} Unidades</p>
          </div>
          <div className="bg-app-surface border border-app-border p-3 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-app-muted mb-0.5">Precio Promedio</p>
            <p className="font-bold text-app-text">{formatCurrency(investment.avgBuyPrice)}</p>
          </div>
          <div className="bg-app-surface border border-app-border p-3 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-app-muted mb-0.5">Costo Total</p>
            <p className="font-bold text-app-text">{formatCurrency(totalCost)}</p>
          </div>
          <div className="bg-app-surface border border-app-border p-3 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-app-muted mb-0.5">Precio Actual</p>
            <p className="font-bold text-app-text">{formatCurrency(currentPrice)}</p>
          </div>
        </div>

        {/* 4. ACTIONS FOOTER */}
        <div className="hidden md:grid grid-cols-2 gap-3 pt-2 border-t border-app-border/50">
          <button
            onClick={() => { onClose(); onEdit(); }}
            className="h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-2 text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/20 active:scale-95 transition-all"
          >
            <Icon name="edit" size={18} />
            Editar
          </button>
          <button
            onClick={() => { onClose(); onDelete(); }}
            className="h-12 rounded-xl bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 flex items-center justify-center gap-2 text-sm font-bold hover:bg-rose-100 dark:hover:bg-rose-900/20 active:scale-95 transition-all"
          >
            <Icon name="delete" size={18} />
            Eliminar
          </button>
        </div>

      </div>
    </SwipeableBottomSheet>
  );
};

/* ==================================================================================
   MAIN COMPONENT
   ================================================================================== */
const InvestmentsPage: React.FC = () => {
  // Navigation & URL State
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { openInvestmentSheet } = useGlobalSheets();
  const isMobile = useIsMobile();

  // Data Queries
  const { data: investments, isLoading } = useInvestments();
  const deleteInvestmentMutation = useDeleteInvestment();
  const refreshPricesMutation = useRefreshInvestmentPrices();

  // Local UI State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterPerformance, setFilterPerformance] = useState<'all' | 'gain' | 'loss'>('all');
  const [sortBy, setSortBy] = useState<'value' | 'percent' | 'name'>('value');

  // Trigger New Item Sheet
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      openInvestmentSheet();
    }
  }, [searchParams, openInvestmentSheet]);

  // Auto-refresh prices if stale (has ticker investments and last update > 15 min)
  const withTicker = investments?.filter((i) => i.ticker?.trim()) ?? [];
  const lastUpdate = withTicker
    .map((i) => (i.lastPriceUpdate ? new Date(i.lastPriceUpdate).getTime() : 0))
    .reduce((a, b) => Math.max(a, b), 0);
  useEffect(() => {
    if (withTicker.length === 0 || refreshPricesMutation.isPending || refreshPricesMutation.isSuccess) return;
    if (Date.now() - lastUpdate > STALE_PRICE_MS) {
      refreshPricesMutation.mutate();
    }
  }, [withTicker.length, lastUpdate]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Actions Handlers */
  const openNew = () => openInvestmentSheet();
  const openEdit = (inv: Investment) => openInvestmentSheet(inv);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteInvestmentMutation.mutateAsync(deleteId);
      toastSuccess('Activo eliminado del portafolio');
      setDeleteId(null);
    }
  };

  /* Calculations (Portfolio Maths) */
  const totalValue = investments?.reduce((sum, inv) => sum + ((inv.currentPrice || inv.avgBuyPrice) * inv.quantity), 0) || 0;
  const totalCost = investments?.reduce((sum, inv) => sum + (inv.avgBuyPrice * inv.quantity), 0) || 0;
  const totalGain = totalValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  // Filtered & Sorted List
  const filteredInvestments = useMemo(() => {
    let list = investments ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.ticker && i.ticker.toLowerCase().includes(q))
      );
    }
    if (filterType) {
      list = list.filter((i) => i.type === filterType);
    }
    if (filterPerformance === 'gain') {
      list = list.filter((i) => {
        const val = (i.currentPrice || i.avgBuyPrice) * i.quantity;
        const cost = i.avgBuyPrice * i.quantity;
        return val >= cost;
      });
    } else if (filterPerformance === 'loss') {
      list = list.filter((i) => {
        const val = (i.currentPrice || i.avgBuyPrice) * i.quantity;
        const cost = i.avgBuyPrice * i.quantity;
        return val < cost;
      });
    }
    return [...list].sort((a, b) => {
      const valA = (a.currentPrice || a.avgBuyPrice) * a.quantity;
      const valB = (b.currentPrice || b.avgBuyPrice) * b.quantity;
      const costA = a.avgBuyPrice * a.quantity;
      const costB = b.avgBuyPrice * b.quantity;
      const pctA = costA > 0 ? (valA - costA) / costA : 0;
      const pctB = costB > 0 ? (valB - costB) / costB : 0;
      if (sortBy === 'value') return valB - valA;
      if (sortBy === 'percent') return pctB - pctA;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [investments, searchQuery, filterType, filterPerformance, sortBy]);

  // Chart Logic (diversification by type)
  const chartData = investments?.reduce((acc, inv) => {
    const label = InvestmentTypeLabel[inv.type] || 'Otro';
    const existing = acc.find(item => item.name === label);
    const value = (inv.currentPrice || inv.avgBuyPrice) * inv.quantity;

    if (existing) { existing.value += value; }
    else { acc.push({ name: label, value }); }
    return acc;
  }, [] as { name: string; value: number }[]) || [];

  // Bar chart: value per asset (top 8)
  const barChartData = useMemo(() => {
    const list = filteredInvestments.slice(0, 8);
    return list.map((inv) => ({
      name: inv.name.length > 10 ? inv.name.slice(0, 9) + '…' : inv.name,
      value: (inv.currentPrice || inv.avgBuyPrice) * inv.quantity,
      fullName: inv.name,
    }));
  }, [filteredInvestments]);


  /* Render */
  if (isLoading) return (
    <div className="min-h-dvh bg-app-bg">
      <PageHeader title="Inversiones" showBackButton />
      <div className="p-4"><SkeletonInvestmentsPage /></div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-app-bg pb-safe md:pb-12 text-app-text font-sans">
      <PageHeader
        title="Portafolio"
        showBackButton={true}
        rightAction={
          <button onClick={openNew} className="bg-app-text text-app-bg rounded-full size-10 flex items-center justify-center shadow-lg transition-transform active:scale-95">
            <Icon name="add" size={22} />
          </button>
        }
      />

      <main className="px-4 py-4 max-w-3xl mx-auto space-y-6 pb-20 animate-fade-in">

        {/* 1. PORTFOLIO HERO CARD */}
        <div className="relative overflow-hidden rounded-[28px] p-6 bg-linear-to-br from-slate-900 to-slate-800 border border-slate-700/50 text-white shadow-xl shadow-slate-900/20">
          {/* Subtle Backglow */}
          <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
            <Icon name="show_chart" size={120} />
          </div>

          <div className="relative z-10">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5">Valor de Mercado</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6 font-numbers">
              ${totalValue.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              <span className="text-xl md:text-2xl opacity-60">.{totalValue.toFixed(2).split('.')[1]}</span>
            </h2>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/10">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Costo Base</p>
                <p className="text-base font-semibold text-slate-200 font-numbers">${totalCost.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Retorno (P/L)</p>
                <div className={`font-bold flex items-baseline gap-1.5 ${totalGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  <span className="text-base font-numbers">
                    {totalGain >= 0 ? '+' : ''}{totalGain.toLocaleString()}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 font-medium">
                    {totalGainPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-white/10">
              <span className="text-[11px] text-slate-500">
                {withTicker.length > 0 ? formatTimeAgo(lastUpdate ? new Date(lastUpdate).toISOString() : undefined) : null}
              </span>
              <button
                type="button"
                onClick={() =>
                  refreshPricesMutation.mutate(undefined, {
                    onSuccess: (r) => toastSuccess(r.updated > 0 ? `Precios actualizados (${r.updated} activos)` : 'Sin cambios'),
                    onError: () => toastError('Error al actualizar precios'),
                  })
                }
                disabled={withTicker.length === 0 || refreshPricesMutation.isPending}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon name="refresh" size={14} className={refreshPricesMutation.isPending ? 'animate-spin' : ''} />
                {refreshPricesMutation.isPending ? 'Actualizando…' : 'Actualizar precios'}
              </button>
            </div>
          </div>
        </div>

        {/* 2. CHARTS ROW */}
        {investments && investments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chartData.length > 0 && (
              <div className="bento-card bg-app-surface border border-app-border overflow-hidden shadow-sm flex flex-col items-center justify-center p-4">
                <div className="w-full border-b border-app-subtle pb-2 mb-2 self-start">
                  <h3 className="text-xs font-bold text-app-muted uppercase tracking-wide">Diversificación</h3>
                </div>
                <div className="relative">
                  <PieChart width={200} height={200}>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value" stroke="none">
                      {chartData.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)' }} />
                  </PieChart>
                </div>
              </div>
            )}
            {barChartData.length > 0 && (
              <div className="bento-card bg-app-surface border border-app-border overflow-hidden shadow-sm p-4">
                <div className="w-full border-b border-app-subtle pb-2 mb-2">
                  <h3 className="text-xs font-bold text-app-muted uppercase tracking-wide">Valor por Activo</h3>
                </div>
                <div className="h-[200px] min-h-[200px] w-full min-w-[200px]">
                  <ResponsiveContainer width="100%" height="100%" minHeight={200} debounce={50}>
                    <BarChart data={barChartData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <XAxis type="number" tickFormatter={(v) => `$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`} fontSize={10} />
                      <YAxis type="category" dataKey="name" width={70} fontSize={10} tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Valor']} contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)' }} />
                      <Bar dataKey="value" fill="var(--brand-primary, #3B82F6)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. FILTERS & SEARCH */}
        {investments && investments.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[140px]">
                <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o ticker..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-app-subtle border border-app-border focus:ring-2 focus:ring-app-primary/50 focus:border-app-primary outline-none"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm bg-app-subtle border border-app-border focus:ring-2 focus:ring-app-primary/50"
              >
                <option value="">Todos los tipos</option>
                {(Object.keys(InvestmentTypeLabel) as string[]).map((t) => (
                  <option key={t} value={t}>{InvestmentTypeLabel[t]}</option>
                ))}
              </select>
              <select
                value={filterPerformance}
                onChange={(e) => setFilterPerformance(e.target.value as 'all' | 'gain' | 'loss')}
                className="px-3 py-2 rounded-xl text-sm bg-app-subtle border border-app-border"
              >
                <option value="all">Todos</option>
                <option value="gain">Ganadores</option>
                <option value="loss">Perdedores</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'value' | 'percent' | 'name')}
                className="px-3 py-2 rounded-xl text-sm bg-app-subtle border border-app-border"
              >
                <option value="value">Ordenar: Valor</option>
                <option value="percent">Ordenar: %</option>
                <option value="name">Ordenar: Nombre</option>
              </select>
            </div>
          </div>
        )}

        {/* 4. ASSETS LIST */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-app-muted uppercase tracking-wider px-1">Activos Individuales</h3>

          {!investments || investments.length === 0 ? (
            <div className="text-center py-20 bg-app-subtle/30 border-2 border-dashed border-app-border rounded-2xl">
              <Icon name="add_chart" size={48} className="text-app-muted opacity-40 mb-4 mx-auto" />
              <p className="text-app-text font-bold text-base">Portafolio Vacío</p>
              <p className="text-app-muted text-sm mt-1">Registra tu primera inversión para ver gráficos y seguimiento.</p>
              <button onClick={openNew} className="mt-4 px-6 py-2.5 rounded-xl bg-app-primary text-white text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all">
                + Registrar Primera Inversión
              </button>
            </div>
          ) : filteredInvestments.length === 0 ? (
            <div className="text-center py-12 bg-app-subtle/30 border border-app-border rounded-2xl">
              <Icon name="search_off" size={32} className="text-app-muted opacity-50 mb-2 mx-auto" />
              <p className="text-app-text font-medium text-sm">Sin resultados</p>
              <p className="text-app-muted text-xs mt-1">Prueba otro filtro o búsqueda.</p>
              <button onClick={() => { setSearchQuery(''); setFilterType(''); setFilterPerformance('all'); }} className="mt-3 text-app-primary text-xs font-bold hover:underline">
                Limpiar filtros
              </button>
            </div>
          ) : (
            filteredInvestments.map((inv) => {
              const cost = inv.avgBuyPrice * inv.quantity;
              const val = (inv.currentPrice || inv.avgBuyPrice) * inv.quantity;
              const gain = val - cost;
              const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
              const isProfitable = gain >= 0;

              return (
                <SwipeableItem
                  key={inv.id}
                  leftAction={{ icon: 'edit', color: 'text-white', bgColor: 'bg-indigo-500', label: 'Editar' }}
                  onSwipeRight={() => openEdit(inv)}
                  rightAction={{ icon: 'delete', color: 'text-white', bgColor: 'bg-rose-500', label: 'Borrar' }}
                  onSwipeLeft={() => setDeleteId(inv.id)}
                  className="rounded-3xl"
                  disabled={!isMobile}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedInvestment(inv); }}
                    onClick={() => setSelectedInvestment(inv)}
                    className="bento-card p-4 md:p-5 flex justify-between items-center hover:border-app-border-strong cursor-pointer active:scale-[0.99] transition-all bg-app-surface group"
                  >
                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                      <div className={`size-10 md:size-11 shrink-0 rounded-xl flex items-center justify-center border shadow-sm ${isProfitable ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'} dark:bg-app-subtle dark:border-white/5`}>
                        <Icon name={inv.type === 'CRYPTO' ? 'currency_bitcoin' : inv.type === 'REAL_ESTATE' ? 'home_work' : inv.type === 'STOCK' ? 'show_chart' : 'trending_up'} size={20} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <h4 className="font-bold text-app-text text-sm truncate">{inv.name}</h4>
                          {inv.ticker && <span className="hidden md:inline-block text-[10px] font-bold bg-app-subtle px-1.5 rounded text-app-muted uppercase">{inv.ticker}</span>}
                        </div>
                        <p className="text-[11px] text-app-muted mt-0.5 font-medium flex items-center gap-1 truncate">
                          {inv.quantity} <span className="hidden sm:inline">unid</span>
                          <span className="size-0.5 bg-current rounded-full mx-0.5 opacity-50" />
                          <span className={isProfitable ? 'text-emerald-500' : 'text-rose-500'}>
                            {isProfitable ? '+' : ''}{gainPct.toFixed(1)}%
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      <p className="font-bold text-app-text text-sm font-numbers tracking-tight">
                        ${val.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                      </p>
                      <p className={`text-[10px] font-bold font-numbers mt-0.5 ${isProfitable ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isProfitable ? '+' : ''}{gain.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                </SwipeableItem>
              );
            })
          )}
        </div>
      </main>

      <DeleteConfirmationSheet
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        itemName="esta inversión"
        isDeleting={deleteInvestmentMutation.isPending}
        warningMessage="Eliminar activo"
        warningDetails={["Esta acción no se puede deshacer.", "El valor se restará de tu patrimonio."]}
      />

      {/* DETAIL SHEET */}
      {selectedInvestment && (
        <InvestmentDetailSheet
          investment={selectedInvestment}
          onClose={() => setSelectedInvestment(null)}
          onEdit={() => { setSelectedInvestment(null); openEdit(selectedInvestment); }}
          onDelete={() => { setSelectedInvestment(null); setDeleteId(selectedInvestment.id); }}
        />
      )}
    </div>
  );
};

export default InvestmentsPage;