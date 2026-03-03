import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { fetchPrices } from '../../../lib/coingecko';
import { fetchStockPrice } from '../../../lib/yahooFinance';
import { AppError } from '../../../shared/errors';
import { parseSafeFloat, validateAmount } from '../../../shared/validation';
import { createExpense } from '../../transactions/useCases/CreateExpenseUseCase';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

router.post('/refresh-prices', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const all = await prisma.investment.findMany({
    where: { userId, ticker: { not: null } },
  });
  const withTicker = all.filter((i) => i.ticker?.trim());
  if (withTicker.length === 0) {
    return res.json({ updated: 0, crypto: 0, stock: 0, message: 'No investments with ticker to refresh' });
  }

  const crypto = withTicker.filter((i) => i.type === 'crypto');
  const stock = withTicker.filter((i) => i.type === 'stock');

  let updated = 0;

  // Crypto: CoinGecko (batch)
  if (crypto.length > 0) {
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
  }

  // Stock: Yahoo Finance (paralelo)
  if (stock.length > 0) {
    const results = await Promise.all(stock.map((i) => fetchStockPrice(i.ticker!)));
    for (let i = 0; i < stock.length; i++) {
      const inv = stock[i];
      const result = results[i];
      if (result && result.price > 0) {
        await prisma.investment.update({
          where: { id: inv.id },
          data: { currentPrice: result.price, lastPriceUpdate: new Date() },
        });
        updated++;
      }
    }
  }

  res.json({ updated, crypto: crypto.length, stock: stock.length });
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
