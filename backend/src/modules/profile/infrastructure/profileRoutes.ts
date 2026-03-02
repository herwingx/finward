import { Prisma } from '@prisma/client';
import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { createSupabaseServiceClient } from '../../../lib/supabase';
import { AppError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

/** Sincroniza User cuando existe por email pero con id distinto (Supabase Auth cambió). */
async function syncUserFromEmail(
  userEmail: string,
  newId: string,
  newName: string
): Promise<Prisma.UserGetPayload<{ select: { id: true; email: true; name: true; currency: true; timezone: true; avatar: true; monthlyNetIncome: true; incomeFrequency: true; notificationsEnabled: true } }>> {
  const existing = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!existing) throw AppError.notFound('User not found');
  if (existing.id === newId) {
    const full = await prisma.user.findUniqueOrThrow({
      where: { id: newId },
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
    return full;
  }

  const oldId = existing.id;
  const tempEmail = `sync-${newId.slice(0, 8)}@temp.finward.local`;
  const oldTempEmail = `sync-old-${oldId.slice(0, 8)}@temp.finward.local`;

  return prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id: newId,
        email: tempEmail,
        name: newName,
        currency: existing.currency,
        timezone: existing.timezone,
        avatar: existing.avatar,
        monthlyNetIncome: existing.monthlyNetIncome,
        incomeFrequency: existing.incomeFrequency,
        notificationsEnabled: existing.notificationsEnabled,
      },
    });
    const models = [
      { table: tx.category, key: 'userId' as const },
      { table: tx.account, key: 'userId' as const },
      { table: tx.transaction, key: 'userId' as const },
      { table: tx.installmentPurchase, key: 'userId' as const },
      { table: tx.recurringTransaction, key: 'userId' as const },
      { table: tx.loan, key: 'userId' as const },
      { table: tx.savingsGoal, key: 'userId' as const },
      { table: tx.investment, key: 'userId' as const },
      { table: tx.budget, key: 'userId' as const },
      { table: tx.notification, key: 'userId' as const },
    ];
    for (const { table, key } of models) {
      await (table as { updateMany: (arg: unknown) => Promise<unknown> }).updateMany({
        where: { [key]: oldId },
        data: { [key]: newId },
      });
    }
    await tx.user.update({
      where: { id: oldId },
      data: { email: oldTempEmail },
    });
    const updated = await tx.user.update({
      where: { id: newId },
      data: { email: userEmail, name: existing.name },
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
    await tx.user.delete({ where: { id: oldId } });
    return updated;
  });
}
const PROFILE_PICTURES_BUCKET = 'profile-pictures';
const AVATAR_SIGNED_URL_EXPIRY = 3600; // 1 hour

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
  const userEmail = req.user!.email ?? `${userId}@finward.local`;
  const userName = userEmail.split('@')[0] ?? 'User';

  let user = await prisma.user.findUnique({
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

  if (!user && userEmail) {
    const byEmail = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, name: true },
    });
    if (byEmail && byEmail.id !== userId) {
      logger.info({ oldId: byEmail.id, newId: userId, email: userEmail }, 'Syncing User id Supabase→Prisma');
      const synced = await syncUserFromEmail(userEmail, userId, userName);
      return res.json(synced);
    }
  }

  if (!user) {
    try {
      const newUser = await prisma.user.create({
        data: {
          id: userId,
          email: userEmail,
          name: userName,
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
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr?.code === 'P2002') {
        logger.info({ userId, email: userEmail }, 'User create P2002, syncing by email');
        const synced = await syncUserFromEmail(userEmail, userId, userName);
        return res.json(synced);
      }
      throw err;
    }
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

/**
 * POST /api/profile/avatar/upload-url
 * Devuelve signed upload URL para subir foto de perfil a Supabase Storage (bucket profile-pictures).
 * Cliente debe usar uploadToSignedUrl(path, token, file) del SDK.
 */
router.post('/avatar/upload-url', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { contentType = 'image/jpeg', extension = 'jpg' } = req.body ?? {};
  const ext = String(extension).replace(/[^a-z0-9]/gi, '').slice(0, 6) || 'jpg';
  const path = `${userId}/avatar.${ext}`;

  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.storage.from(PROFILE_PICTURES_BUCKET).createSignedUploadUrl(path, { upsert: true });
    if (error) {
      logger.warn({ err: error, bucket: PROFILE_PICTURES_BUCKET }, 'Storage createSignedUploadUrl failed');
      throw AppError.badRequest('No se pudo generar URL de subida');
    }
    res.json({ path: data.path, token: data.token });
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error({ err, path }, 'Avatar upload URL failed');
    throw AppError.badRequest('Error generando URL de subida');
  }
});

/**
 * GET /api/profile/avatar-url
 * Devuelve signed URL para mostrar la foto de perfil (bucket privado, RLS authenticated).
 */
router.get('/avatar-url', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatar: true },
  });
  if (!user?.avatar) {
    return res.json({ url: null });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.storage
      .from(PROFILE_PICTURES_BUCKET)
      .createSignedUrl(user.avatar, AVATAR_SIGNED_URL_EXPIRY);
    if (error) {
      logger.warn({ err: error, path: user.avatar }, 'Storage createSignedUrl failed');
      return res.json({ url: null });
    }
    res.json({ url: data.signedUrl, expiresIn: AVATAR_SIGNED_URL_EXPIRY });
  } catch (err) {
    logger.error({ err, path: user.avatar }, 'Avatar URL failed');
    res.json({ url: null });
  }
});

export default router;
