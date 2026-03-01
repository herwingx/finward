import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';
import { createExpense } from '../../transactions/useCases/CreateExpenseUseCase';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

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

  const qty = parseFloat(quantity);
  const avgPrice = parseFloat(avgBuyPrice);
  const currPrice = currentPrice ? parseFloat(currentPrice) : avgPrice;

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
      quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
      avgBuyPrice: avgBuyPrice !== undefined ? parseFloat(avgBuyPrice) : undefined,
      currentPrice: currentPrice !== undefined ? parseFloat(currentPrice) : undefined,
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
