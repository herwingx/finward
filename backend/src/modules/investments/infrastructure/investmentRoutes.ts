import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { fetchPrices, searchCoins, getTopCoins } from '../../../lib/coingecko';
import { fetchStockPrice, searchStocks } from '../../../lib/yahooFinance';
import { AppError } from '../../../shared/errors';
import { parseSafeFloat, validateAmount } from '../../../shared/validation';
import { createExpense } from '../../transactions/useCases/CreateExpenseUseCase';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

router.post('/refresh-prices', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const all = await prisma.investment.findMany({
      where: { userId, ticker: { not: null } },
    });
    const withTicker = all.filter((i) => i.ticker?.trim());
    if (withTicker.length === 0) {
      return res.json({ updated: 0, crypto: 0, stock: 0, message: 'No investments with ticker to refresh' });
    }

    const crypto = withTicker.filter((i) => i.type?.toUpperCase() === 'CRYPTO');
    const stock = withTicker.filter((i) => i.type?.toUpperCase() === 'STOCK');

    let updated = 0;

    // Crypto: CoinGecko (batch)
    if (crypto.length > 0) {
      try {
        const ids = crypto.map((i) => i.ticker!.toLowerCase());
        const prices = await fetchPrices(ids, 'mxn');
        for (const inv of crypto) {
          const id = inv.ticker!.toLowerCase();
          const newPrice = prices[id]?.['mxn'];
          if (typeof newPrice === 'number' && newPrice > 0) {
            await prisma.investment.update({
              where: { id: inv.id },
              data: { currentPrice: newPrice, lastPriceUpdate: new Date() },
            });
            updated++;
          }
        }
      } catch (err) {
        // CoinGecko rate limit o error de red → no actualizamos, pero devolvemos 200
      }
    }

    // Stock: Yahoo Finance (paralelo)
    if (stock.length > 0) {
      const results = await Promise.allSettled(stock.map((i) => fetchStockPrice(i.ticker!)));
      for (let i = 0; i < stock.length; i++) {
        const inv = stock[i];
        const r = results[i];
        if (r.status === 'fulfilled' && r.value && r.value.price > 0) {
          await prisma.investment.update({
            where: { id: inv.id },
            data: { currentPrice: r.value.price, lastPriceUpdate: new Date() },
          });
          updated++;
        }
      }
    }

    res.json({ updated, crypto: crypto.length, stock: stock.length });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar precios' });
  }
});

router.get('/coins/search', async (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string) || '';
  const coins = await searchCoins(q);
  res.json({ coins });
});

router.get('/coins/top', async (_req: AuthRequest, res: Response) => {
  const limit = Math.min(parseInt(String(_req.query.limit || 50), 10) || 50, 100);
  const coins = await getTopCoins(limit);
  res.json({ coins });
});

router.get('/coins/price', async (req: AuthRequest, res: Response) => {
  try {
    const id = (req.query.id as string)?.trim().toLowerCase();
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const prices = await fetchPrices([id], 'mxn');
    const price = prices[id]?.['mxn'];
    res.json({ id, price: typeof price === 'number' ? price : null });
  } catch {
    // CoinGecko falló (rate limit, red, id inválido) → 200 con price null
    const id = (req.query.id as string)?.trim().toLowerCase() || '';
    res.json({ id, price: null });
  }
});

router.get('/stocks/search', async (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string) || '';
  const quotes = await searchStocks(q);
  res.json({ quotes });
});

router.get('/stocks/price', async (req: AuthRequest, res: Response) => {
  const symbol = (req.query.symbol as string)?.trim().toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'Missing symbol' });
  const result = await fetchStockPrice(symbol);
  res.json({ symbol, price: result?.price ?? null, currency: result?.currency ?? null });
});

router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const investments = await prisma.investment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(investments);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const investment = await prisma.investment.findFirst({
    where: { id, userId },
  });
  if (!investment) throw AppError.notFound('Investment not found');
  res.json(investment);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const {
    name,
    type,
    ticker,
    quantity,
    avgBuyPrice,
    currentPrice,
    currency,
    purchaseDate,
    notes,
    sourceAccountId,
  } = req.body ?? {};

  if (!name || !type || quantity === undefined || avgBuyPrice === undefined) {
    throw AppError.badRequest('Missing: name, type, quantity, avgBuyPrice');
  }

  const qty = parseSafeFloat(quantity, 'quantity');
  const avgPrice = parseSafeFloat(avgBuyPrice, 'avgBuyPrice');
  const currPrice = currentPrice != null ? parseSafeFloat(currentPrice, 'currentPrice') : avgPrice;
  validateAmount(qty * avgPrice, 'quantity * avgBuyPrice');

  const investment = await prisma.investment.create({
    data: {
      userId,
      name,
      type,
      ticker: ticker ?? null,
      quantity: qty,
      avgBuyPrice: avgPrice,
      currentPrice: currPrice,
      currency: currency ?? 'MXN',
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      lastPriceUpdate: new Date(),
      notes: notes ?? null,
    },
  });

  if (sourceAccountId) {
    const totalAmount = qty * avgPrice;
    let category = await prisma.category.findFirst({
      where: { userId, name: { contains: 'Inversiones', mode: 'insensitive' } },
    });
    if (!category) {
      category = await prisma.category.create({
        data: {
          userId,
          name: 'Inversiones',
          icon: 'trending_up',
          color: '#10B981',
          type: 'expense',
          budgetType: 'savings',
        },
      });
    }
    await createExpense({
      userId,
      accountId: sourceAccountId,
      categoryId: category.id,
      amount: totalAmount,
      description: `Inversión: ${name} (${qty} uni.)`,
      date: purchaseDate ? new Date(purchaseDate) : new Date(),
      installmentPurchaseId: undefined,
    });
  }

  const result = investment;

  res.status(201).json(result);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const { name, type, ticker, quantity, avgBuyPrice, currentPrice, currency, purchaseDate, notes } = req.body ?? {};

  const existing = await prisma.investment.findFirst({ where: { id, userId } });
  if (!existing) throw AppError.notFound('Investment not found');

  const updated = await prisma.investment.update({
    where: { id },
    data: {
      name: name ?? undefined,
      type: type ?? undefined,
      ticker: ticker !== undefined ? ticker : undefined,
      quantity: quantity !== undefined ? parseSafeFloat(quantity, 'quantity') : undefined,
      avgBuyPrice: avgBuyPrice !== undefined ? parseSafeFloat(avgBuyPrice, 'avgBuyPrice') : undefined,
      currentPrice: currentPrice !== undefined ? parseSafeFloat(currentPrice, 'currentPrice') : undefined,
      lastPriceUpdate: currentPrice !== undefined ? new Date() : undefined,
      currency: currency ?? undefined,
      purchaseDate: purchaseDate !== undefined ? (purchaseDate ? new Date(purchaseDate) : null) : undefined,
      notes: notes !== undefined ? notes : undefined,
    },
  });
  res.json(updated);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const existing = await prisma.investment.findFirst({ where: { id, userId } });
  if (!existing) throw AppError.notFound('Investment not found');
  await prisma.investment.delete({ where: { id } });
  res.json({ message: 'Investment deleted' });
});

export default router;
