import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';
import { validateName, validateUuid } from '../../../shared/validation';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const categories = await prisma.category.findMany({ where: { userId } });
  res.json(categories);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { name, icon, color, type, budgetType } = req.body ?? {};
  if (!name || !icon || !color || !type) throw AppError.badRequest('Missing: name, icon, color, type');
  validateName(name);

  const category = await prisma.category.create({
    data: { userId, name, icon, color, type, budgetType },
  });
  res.status(201).json(category);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  validateUuid(id, 'id');
  const { name, icon, color, type, budgetType } = req.body ?? {};

  const existing = await prisma.category.findFirst({ where: { id, userId } });
  if (!existing) throw AppError.notFound('Category not found');

  const data: Record<string, unknown> = {};
  if (name != null) {
    validateName(name);
    data.name = name;
  }
  if (icon != null) data.icon = icon;
  if (color != null) data.color = color;
  if (type != null) data.type = type;
  if (budgetType !== undefined) data.budgetType = budgetType;
  const category = await prisma.category.update({
    where: { id },
    data,
  });
  res.json(category);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  validateUuid(id, 'id');
  const existing = await prisma.category.findFirst({ where: { id, userId } });
  if (!existing) throw AppError.notFound('Category not found');
  await prisma.category.delete({ where: { id } });
  res.status(204).send();
});

export default router;
