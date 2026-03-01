import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

const DEFAULT_CATEGORIES = [
  { name: 'Comida', icon: 'restaurant', color: '#FF6B6B', type: 'expense', budgetType: 'need' },
  { name: 'Transporte', icon: 'directions_car', color: '#FFD166', type: 'expense', budgetType: 'need' },
  { name: 'Vivienda', icon: 'home', color: '#06D6A0', type: 'expense', budgetType: 'need' },
  { name: 'Ocio', icon: 'sports_esports', color: '#118AB2', type: 'expense', budgetType: 'want' },
  { name: 'Salud', icon: 'medical_services', color: '#073B4C', type: 'expense', budgetType: 'need' },
  { name: 'Ahorros', icon: 'savings', color: '#6B5FFF', type: 'expense', budgetType: 'savings' },
  { name: 'Salario', icon: 'payments', color: '#34D399', type: 'income' },
];

router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const userEmail = req.user!.email;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      currency: true,
      timezone: true,
      avatar: true,
      monthlyNetIncome: true,
      incomeFrequency: true,
      notificationsEnabled: true,
      _count: { select: { categories: true } },
    },
  });

  if (!user) {
    const newUser = await prisma.user.create({
      data: {
        id: userId,
        email: userEmail ?? `${userId}@finward.local`,
        name: userEmail?.split('@')[0] ?? 'User',
        categories: { create: DEFAULT_CATEGORIES },
      },
      select: {
        id: true,
        email: true,
        name: true,
        currency: true,
        timezone: true,
        avatar: true,
        monthlyNetIncome: true,
        incomeFrequency: true,
        notificationsEnabled: true,
      },
    });
    return res.json(newUser);
  }

  if (user._count.categories === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })),
    });
  }

  const { _count, ...profile } = user;
  res.json(profile);
});

router.put('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { name, currency, timezone, avatar, monthlyNetIncome, incomeFrequency, notificationsEnabled } = req.body ?? {};

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name: name !== undefined ? name : undefined,
      currency: currency !== undefined ? currency : undefined,
      timezone: timezone !== undefined ? timezone : undefined,
      avatar: avatar !== undefined ? avatar : undefined,
      monthlyNetIncome: monthlyNetIncome !== undefined ? (monthlyNetIncome === null ? null : parseFloat(monthlyNetIncome)) : undefined,
      incomeFrequency: incomeFrequency !== undefined ? incomeFrequency : undefined,
      notificationsEnabled: notificationsEnabled !== undefined ? (notificationsEnabled === true || notificationsEnabled === 'true') : undefined,
    },
    select: {
      id: true,
      email: true,
      name: true,
      currency: true,
      timezone: true,
      avatar: true,
      monthlyNetIncome: true,
      incomeFrequency: true,
      notificationsEnabled: true,
    },
  });
  res.json(updated);
});

export default router;
