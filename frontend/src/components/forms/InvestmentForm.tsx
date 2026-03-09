import React, { useState, useEffect, useCallback } from 'react';
import { Investment, InvestmentType } from '@/types';
import { useAddInvestment, useUpdateInvestment, useAccounts } from '@/hooks/useApi';
import { searchCoins, getTopCoins, getCoinPrice, searchStocks, getStockPrice } from '@/lib/api';
import { toastSuccess, toastError } from '@/utils/toast';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';

const InvestmentTypeLabel: Record<InvestmentType, string> = {
  STOCK: 'Acciones',
  CRYPTO: 'Cripto',
  BOND: 'Bonos',
  FUND: 'Fondos',
  ETF: 'ETFs',
  REAL_ESTATE: 'Inmuebles',
  OTHER: 'Otros'
};

/** Acciones populares México (BMV) y USA para select rápido */
const POPULAR_STOCKS_MX: { symbol: string; name: string }[] = [
  { symbol: 'AMXL.MX', name: 'América Móvil' },
  { symbol: 'GFNORTE.MX', name: 'GFNorte' },
  { symbol: 'WALMEX.MX', name: 'Walmart México' },
  { symbol: 'CEMEXCPO.MX', name: 'Cemex' },
  { symbol: 'FEMSAUBD.MX', name: 'Femsa' },
  { symbol: 'GMEXICO.MX', name: 'Grupo México' },
  { symbol: 'AC.MX', name: 'Arca Continental' },
  { symbol: 'ALFAA.MX', name: 'Alfa' },
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'GOOGL', name: 'Alphabet (Google)' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'META', name: 'Meta' },
];

export const InvestmentForm: React.FC<{
  existingInvestment: Investment | null;
  onClose: () => void;
  onDeleteRequest?: () => void;
  isSheetMode?: boolean;
}> = ({ existingInvestment, onClose, onDeleteRequest, isSheetMode = false }) => {
  const addInvestmentMutation = useAddInvestment();
  const updateInvestmentMutation = useUpdateInvestment();
  const { data: accounts } = useAccounts();

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<InvestmentType>('STOCK');
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [avgBuyPrice, setAvgBuyPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [topCoins, setTopCoins] = useState<{ id: string; name: string; symbol: string }[]>([]);
  const [coinSuggestions, setCoinSuggestions] = useState<{ id: string; name: string; symbol: string }[]>([]);
  const [showCoinSuggestions, setShowCoinSuggestions] = useState(false);
  const [cryptoSelectMode, setCryptoSelectMode] = useState<'select' | 'search'>('select');
  const [stockSuggestions, setStockSuggestions] = useState<{ symbol: string; shortname?: string; longname?: string }[]>([]);
  const [showStockSuggestions, setShowStockSuggestions] = useState(false);
  const [stockSelectMode, setStockSelectMode] = useState<'select' | 'search'>('select');
  const [cryptoDropdownOpen, setCryptoDropdownOpen] = useState(false);
  const [stockDropdownOpen, setStockDropdownOpen] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Load top cryptos when type = CRYPTO
  useEffect(() => {
    if (type === 'CRYPTO' && topCoins.length === 0) {
      getTopCoins(50).then((r) => setTopCoins(r.coins || [])).catch(() => setTopCoins([]));
    }
  }, [type]);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const close = () => { setCryptoDropdownOpen(false); setStockDropdownOpen(false); };
    if (cryptoDropdownOpen || stockDropdownOpen) {
      const t = setTimeout(() => document.addEventListener('click', close), 0);
      return () => { clearTimeout(t); document.removeEventListener('click', close); };
    }
  }, [cryptoDropdownOpen, stockDropdownOpen]);

  // Init
  useEffect(() => {
    if (existingInvestment) {
      setName(existingInvestment.name);
      setType(existingInvestment.type);
      setTicker(existingInvestment.ticker || '');
      if (existingInvestment.type === 'CRYPTO' && existingInvestment.ticker) setCryptoSelectMode('search');
      if (existingInvestment.type === 'STOCK' && existingInvestment.ticker && !POPULAR_STOCKS_MX.some(s => s.symbol === existingInvestment.ticker)) setStockSelectMode('search');
      setQuantity(String(existingInvestment.quantity));
      setAvgBuyPrice(String(existingInvestment.avgBuyPrice));
      setCurrentPrice(String(existingInvestment.currentPrice || existingInvestment.avgBuyPrice));
    } else {
      setName('');
      setType('STOCK');
      setTicker('');
      setQuantity('');
      setAvgBuyPrice('');
      setCurrentPrice('');
      setSourceAccountId('');
      setCryptoSelectMode('select');
      setStockSelectMode('select');
    }
  }, [existingInvestment]);

  // Autocomplete crypto (debounced)
  useEffect(() => {
    if (type !== 'CRYPTO' || ticker.length < 2) {
      setCoinSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await searchCoins(ticker);
        setCoinSuggestions(res.coins || []);
      } catch {
        setCoinSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [type, ticker]);

  // Precio actual automático cuando se selecciona una cripto (debounce para no saturar API)
  useEffect(() => {
    if (type !== 'CRYPTO' || !ticker.trim()) {
      setPriceError(null);
      return;
    }
    setPriceError(null);
    const t = setTimeout(() => {
      setPriceLoading(true);
      getCoinPrice(ticker.trim().toLowerCase())
        .then((r) => {
          if (r.price != null && r.price > 0) {
            setCurrentPrice(String(r.price));
            setPriceError(null);
          } else setPriceError('Precio no disponible. Verifica el ticker.');
        })
        .catch(() => setPriceError('No se pudo obtener el precio. Revisa el ticker.'))
        .finally(() => setPriceLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [type, ticker]);

  // Autocomplete acciones (Yahoo Finance)
  useEffect(() => {
    if (type !== 'STOCK' || ticker.length < 2) {
      setStockSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await searchStocks(ticker);
        setStockSuggestions(res.quotes || []);
      } catch {
        setStockSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [type, ticker]);

  // Precio actual automático para acciones (Yahoo Finance)
  useEffect(() => {
    if (type !== 'STOCK' || !ticker.trim()) {
      setPriceError(null);
      return;
    }
    setPriceError(null);
    const t = setTimeout(() => {
      setPriceLoading(true);
      getStockPrice(ticker.trim().toUpperCase())
        .then((r) => {
          if (r.price != null && r.price > 0) {
            setCurrentPrice(String(r.price));
            setPriceError(null);
          } else setPriceError('Precio no disponible. Verifica el símbolo.');
        })
        .catch(() => setPriceError('No se pudo obtener el precio. Revisa el símbolo.'))
        .finally(() => setPriceLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [type, ticker]);

  const liveTotal = useCallback(() => {
    const q = parseFloat(quantity) || 0;
    const p = parseFloat(avgBuyPrice) || 0;
    return q * p;
  }, [quantity, avgBuyPrice]);

  const namePlaceholder = type === 'CRYPTO' ? 'Ej. Bitcoin' : type === 'STOCK' ? 'Ej. Apple, Tesla' : 'Nombre del activo';
  const tickerPlaceholder = type === 'CRYPTO'
    ? 'ID CoinGecko (ej. bitcoin, ethereum) — busca para autocompletar'
    : type === 'STOCK'
    ? 'Busca por nombre o símbolo (NVDA, Apple...)'
    : 'Ticker / Símbolo (opcional)';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!name) return toastError('Nombre requerido');
      const tickerVal = type === 'CRYPTO' ? ticker.trim().toLowerCase() : ticker.trim().toUpperCase();
      const payload = {
        name,
        type,
        ticker: tickerVal || undefined,
        quantity: parseFloat(quantity) || 0,
        avgBuyPrice: parseFloat(avgBuyPrice) || 0,
        currentPrice: currentPrice ? parseFloat(currentPrice) : parseFloat(avgBuyPrice) || 0,
        currency: 'MXN',
        purchaseDate: existingInvestment ? existingInvestment.purchaseDate : new Date().toISOString(),
      };


      if (existingInvestment) {
        await updateInvestmentMutation.mutateAsync({ id: existingInvestment.id, investment: payload });
        toastSuccess('Inversión actualizada');
      } else {
        await addInvestmentMutation.mutateAsync({
          ...payload,
          sourceAccountId: sourceAccountId || undefined
        } as any);
        toastSuccess('Inversión agregada');
      }
      onClose();
    } catch (error) {
      toastError('Error al guardar inversión');
    }
  };

  const pageTitle = existingInvestment ? 'Editar Activo' : 'Nuevo Activo';
  const isSaving = addInvestmentMutation.isPending || updateInvestmentMutation.isPending;

  return (
    <>
      {/* Universal Sheet-Style Header (Requested by User) */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <button type="button" onClick={onClose} className="text-sm font-medium text-app-muted hover:text-app-text px-2 md:hidden">Cancelar</button>
        <h2 className="text-lg font-bold text-app-text">{pageTitle}</h2>
        <div className="w-12" />
      </div>

      <div className={`${isSheetMode ? '' : 'px-4 pt-4 max-w-lg mx-auto'} pb-safe flex flex-col h-full`}>
        <form onSubmit={handleSave} className="space-y-3 flex-1 flex flex-col">

          {/* 1. Type Selector (Horizontal Scroll) */}
          <div className="shrink-0 -mx-4 px-4 overflow-x-auto no-scrollbar pb-2">
            <div className="flex gap-2">
              {(Object.keys(InvestmentTypeLabel) as InvestmentType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${type === t
                    ? 'bg-app-primary text-white border-app-primary shadow-lg shadow-app-primary/20'
                    : 'bg-app-surface text-app-muted border-app-border hover:border-app-muted'}`}
                >
                  {InvestmentTypeLabel[t]}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Scrollable Body */}
          <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-y-auto">

            {/* Name & Ticker */}
            <div className="space-y-3 shrink-0">
              <div className="bg-app-subtle border border-app-border rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-app-primary/50 focus-within:border-app-primary transition-all">
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={namePlaceholder} className="w-full bg-transparent text-sm font-medium outline-none text-app-text placeholder:text-app-muted/60" />
              </div>
              {type === 'CRYPTO' ? (
                <div className="space-y-2">
                  {cryptoSelectMode === 'select' ? (
                    <>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setCryptoDropdownOpen(!cryptoDropdownOpen); }}
                          className="w-full bg-app-subtle border border-app-border h-11 rounded-xl pl-3 pr-10 text-sm font-medium text-app-text text-left flex items-center gap-2 outline-none focus:ring-2 focus:ring-app-primary/50 focus:border-app-primary"
                        >
                          {ticker ? (
                            (() => {
                              const c = topCoins.find(x => x.id === ticker);
                              return c ? (
                                <>
                                  {c.thumb && <img src={c.thumb} alt="" className="w-6 h-6 rounded-full" />}
                                  <span>{c.name} ({c.symbol.toUpperCase()})</span>
                                </>
                              ) : <span>{ticker}</span>;
                            })()
                          ) : (
                            <span className="text-app-muted">Selecciona una cripto...</span>
                          )}
                          <Icon name="expand_more" size={20} className="absolute right-3 text-app-muted" />
                        </button>
                        {cryptoDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-app-border bg-app-surface shadow-xl z-50 max-h-60 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            {topCoins.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setTicker(c.id);
                                  setName(c.name);
                                  setCryptoDropdownOpen(false);
                                }}
                                className="w-full px-3 py-2.5 text-left text-sm hover:bg-app-subtle flex items-center gap-3"
                              >
                                {c.thumb && <img src={c.thumb} alt="" className="w-6 h-6 rounded-full shrink-0" />}
                                <span className="font-medium text-app-text">{c.name}</span>
                                <span className="text-app-muted text-xs ml-auto">{c.symbol.toUpperCase()}</span>
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => { setCryptoSelectMode('search'); setCryptoDropdownOpen(false); setTicker(''); }}
                              className="w-full px-3 py-2.5 text-left text-sm hover:bg-app-subtle flex items-center gap-2 border-t border-app-border text-app-primary font-medium"
                            >
                              <Icon name="search" size={18} />
                              Buscar otra...
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setCryptoSelectMode('search')}
                        className="text-xs text-app-muted hover:text-app-primary"
                      >
                        No está en la lista? Buscar por nombre
                      </button>
                    </>
                  ) : (
                    <div className="relative">
                      <div className="bg-app-subtle border border-app-border rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-app-primary/50 focus-within:border-app-primary transition-all">
                        <input
                          type="text"
                          value={ticker}
                          onChange={e => setTicker(e.target.value.toLowerCase())}
                          onFocus={() => ticker.length >= 2 && setShowCoinSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowCoinSuggestions(false), 200)}
                          placeholder="Buscar cripto (ej. bitcoin, solana)"
                          className="w-full bg-transparent text-sm font-medium outline-none text-app-text placeholder:text-app-muted/60"
                        />
                      </div>
                      {showCoinSuggestions && coinSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-app-border bg-app-surface shadow-lg z-50 max-h-48 overflow-y-auto">
                          {coinSuggestions.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onMouseDown={() => { setTicker(c.id); setName(c.name); setShowCoinSuggestions(false); }}
                              className="w-full px-3 py-2.5 text-left text-sm hover:bg-app-subtle flex items-center gap-3"
                            >
                              {c.thumb && <img src={c.thumb} alt="" className="w-6 h-6 rounded-full shrink-0" />}
                              <span className="font-medium text-app-text">{c.name}</span>
                              <span className="text-app-muted text-xs ml-auto">{c.symbol.toUpperCase()}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => { setCryptoSelectMode('select'); setTicker(''); }}
                        className="mt-2 text-xs text-app-muted hover:text-app-primary"
                      >
                        ← Ver lista de top criptos
                      </button>
                    </div>
                  )}
                </div>
              ) : type === 'STOCK' ? (
                <div className="space-y-2">
                  {stockSelectMode === 'select' ? (
                    <>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setStockDropdownOpen(!stockDropdownOpen); }}
                          className="w-full bg-app-subtle border border-app-border h-11 rounded-xl pl-3 pr-10 text-sm font-medium text-app-text text-left flex items-center gap-2 outline-none focus:ring-2 focus:ring-app-primary/50 focus:border-app-primary"
                        >
                          {ticker ? (
                            <span>{POPULAR_STOCKS_MX.find(s => s.symbol === ticker)?.name || ticker}</span>
                          ) : (
                            <span className="text-app-muted">Populares México / USA...</span>
                          )}
                          <Icon name="expand_more" size={20} className="absolute right-3 text-app-muted" />
                        </button>
                        {stockDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-app-border bg-app-surface shadow-xl z-50 max-h-60 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="px-3 py-2 text-[10px] font-bold text-app-muted uppercase">Acciones populares</div>
                            {POPULAR_STOCKS_MX.map((s) => (
                              <button
                                key={s.symbol}
                                type="button"
                                onClick={() => {
                                  setTicker(s.symbol);
                                  setName(s.name);
                                  setStockDropdownOpen(false);
                                }}
                                className="w-full px-3 py-2.5 text-left text-sm hover:bg-app-subtle flex items-center justify-between"
                              >
                                <span className="font-medium text-app-text">{s.name}</span>
                                <span className="text-app-muted text-xs">{s.symbol}</span>
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => { setStockSelectMode('search'); setStockDropdownOpen(false); setTicker(''); }}
                              className="w-full px-3 py-2.5 text-left text-sm hover:bg-app-subtle flex items-center gap-2 border-t border-app-border text-app-primary font-medium"
                            >
                              <Icon name="search" size={18} />
                              Buscar otra...
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setStockSelectMode('search')}
                        className="text-xs text-app-muted hover:text-app-primary"
                      >
                        No está en la lista? Buscar por nombre o símbolo
                      </button>
                    </>
                  ) : (
                    <div className="relative">
                      <div className="bg-app-subtle border border-app-border rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-app-primary/50 focus-within:border-app-primary transition-all">
                        <input
                          type="text"
                          value={ticker}
                          onChange={e => setTicker(e.target.value.toUpperCase())}
                          onFocus={() => ticker.length >= 2 && setShowStockSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowStockSuggestions(false), 200)}
                          placeholder={tickerPlaceholder}
                          className="w-full bg-transparent text-sm font-medium outline-none text-app-text placeholder:text-app-muted/60 uppercase"
                        />
                      </div>
                      {showStockSuggestions && stockSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-app-border bg-app-surface shadow-lg z-50 max-h-48 overflow-y-auto">
                          {stockSuggestions.map((q) => (
                            <button
                              key={q.symbol}
                              type="button"
                              onMouseDown={() => {
                                setTicker(q.symbol);
                                setName(q.shortname || q.longname || q.symbol);
                                setShowStockSuggestions(false);
                              }}
                              className="w-full px-3 py-2.5 text-left text-sm hover:bg-app-subtle flex items-center justify-between gap-2"
                            >
                              <span className="font-medium text-app-text">{q.shortname || q.longname || q.symbol}</span>
                              <span className="text-app-muted text-xs">{q.symbol}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => { setStockSelectMode('select'); setTicker(''); }}
                        className="mt-2 text-xs text-app-muted hover:text-app-primary"
                      >
                        ← Ver acciones populares
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-app-subtle border border-app-border rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-app-primary/50 focus-within:border-app-primary transition-all">
                  <input
                    type="text"
                    value={ticker}
                    onChange={e => setTicker(e.target.value.toUpperCase())}
                    placeholder={tickerPlaceholder}
                    className="w-full bg-transparent text-sm font-medium outline-none text-app-text placeholder:text-app-muted/60 uppercase"
                  />
                </div>
              )}
            </div>

            {/* Qty & Price Grid */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div>
                <label htmlFor="inv-qty" className="text-[10px] font-bold text-app-text ml-1 mb-1 block uppercase tracking-wide opacity-70">Cantidad</label>
                <div className="bg-app-subtle border border-app-border rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-app-primary/50 focus-within:border-app-primary transition-all h-11 flex items-center">
                  <input id="inv-qty" type="number" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0.00" className="w-full bg-transparent text-sm font-bold text-app-text outline-none placeholder:text-app-muted/60" />
                </div>
              </div>
              <div>
                <label htmlFor="inv-buy" className="text-[10px] font-bold text-app-text ml-1 mb-1 block uppercase tracking-wide opacity-70">Precio Compra</label>
                <div className="bg-app-subtle border border-app-border rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-app-primary/50 focus-within:border-app-primary transition-all h-11 flex items-center">
                  <span className="text-app-muted text-xs mr-1">$</span>
                  <input id="inv-buy" type="number" step="any" value={avgBuyPrice} onChange={e => setAvgBuyPrice(e.target.value)} placeholder="0.00" className="w-full bg-transparent text-sm font-bold text-app-text outline-none placeholder:text-app-muted/60" />
                </div>
              </div>
            </div>

            {/* Live Total */}
            {(parseFloat(quantity) || 0) > 0 && (parseFloat(avgBuyPrice) || 0) > 0 && (
              <div className="shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Valor estimado</span>
                <p className="text-lg font-bold text-app-text font-numbers">${liveTotal().toLocaleString('es-MX')}</p>
              </div>
            )}

            {/* Current Price - auto para CRYPTO/STOCK con ticker */}
            <div className="shrink-0">
              <span className="text-[10px] font-bold text-app-text ml-1 mb-1 block uppercase tracking-wide opacity-70">
                Precio Actual {(type === 'CRYPTO' && ticker) ? '(auto CoinGecko)' : (type === 'STOCK' && ticker) ? '(auto Yahoo Finance)' : '(Opcional)'}
                {priceLoading && <span className="ml-2 text-amber-600 dark:text-amber-400 font-normal">Cargando...</span>}
              </span>
              <div className="bg-app-subtle border border-app-border rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-app-primary/50 focus-within:border-app-primary transition-all h-11 flex items-center">
                <span className="text-app-muted text-xs mr-1">$</span>
                <input type="number" step="any" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} placeholder="Igual a precio compra" disabled={priceLoading} className="w-full bg-transparent text-sm font-bold text-app-text outline-none placeholder:text-app-muted/60 disabled:opacity-70" />
              </div>
              {priceError && (
                <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Icon name="info" size={14} />
                  {priceError}
                </p>
              )}
            </div>

            {/* Funding Source (Only Create) */}
            {!existingInvestment && (
              <div className="pt-2 shrink-0">
                <div className="flex justify-between items-center mb-1 ml-1">
                  <label htmlFor="inv-source" className="text-[10px] font-bold text-app-text uppercase tracking-wide opacity-70">Origen de Fondos</label>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">Registrar Gasto</span>
                </div>
                <div className="relative">
                  <select
                    id="inv-source"
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    className="w-full bg-app-subtle border border-app-border h-11 rounded-xl pl-3 pr-8 text-sm font-bold text-app-text appearance-none outline-none focus:ring-2 focus:ring-app-primary/50 focus:border-app-primary shadow-sm transition-all"
                  >
                    <option value="">-- No descontar saldo --</option>
                    {accounts?.filter(a => ['DEBIT', 'CASH'].includes(a.type)).map(account => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                  <Icon name="account_balance_wallet" size={20} className="absolute right-2 top-2.5 text-app-muted pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* 3. Footer Action */}
          <div className="pt-4 pb-10 mt-auto shrink-0 touch-none">
            <Button
              type="submit"
              fullWidth
              size="lg"
              variant="primary"
              isLoading={isSaving}
              disabled={isSaving}
            >
              {existingInvestment ? 'Guardar Cambios' : 'Registrar Activo'}
            </Button>
          </div>

        </form>
      </div>
    </>
  );
};