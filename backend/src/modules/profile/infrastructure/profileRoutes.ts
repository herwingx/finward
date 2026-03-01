import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { createSupabaseServiceClient } from '../../../lib/supabase';
import { AppError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import type { AuthRequest } from '../../../shared/types';

const router = Router();
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
