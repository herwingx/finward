import { Router, Request, Response } from 'express';
import { createSupabaseClient } from '../../../lib/supabase';
import { AppError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';

const router = Router();

router.get('/status', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'auth' });
});

/**
 * POST /api/auth/login - Iniciar sesión con email y contraseña
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    throw AppError.badRequest('Email y contraseña requeridos');
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    logger.warn({ err: error, status: error.status }, '[auth/login] Supabase error');
    const msg = error.message === 'Invalid login credentials' ? 'Credenciales incorrectas' : error.message;
    throw AppError.unauthorized(msg);
  }

  if (!data.session || !data.user) {
    logger.error({ hasSession: !!data?.session, hasUser: !!data?.user }, '[auth/login] Supabase sin session/user');
    throw AppError.badRequest('Error al iniciar sesión');
  }

  const allowedEnv = process.env.ALLOWED_LOGIN_EMAILS;
  if (allowedEnv?.trim()) {
    const allowed = allowedEnv.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    const userEmail = (data.user.email ?? '').toLowerCase();
    if (!allowed.includes(userEmail)) {
      throw AppError.forbidden('Este correo no tiene acceso a esta instancia de Finward.');
    }
  }

  res.json({
    token: data.session.access_token,
    user: {
      id: data.user.id,
      email: data.user.email ?? '',
      name: (data.user.user_metadata?.name as string) ?? data.user.email?.split('@')[0] ?? 'Usuario',
    },
  });
});

/**
 * POST /api/auth/register - Crear cuenta
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body ?? {};
  if (!email || !password) {
    throw AppError.badRequest('Email y contraseña requeridos');
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: name ?? email.split('@')[0] } },
  });

  if (error) {
    throw AppError.badRequest(error.message);
  }

  if (data.user) {
    const { prisma } = await import('../../../lib/prisma');
    const existingUser = await prisma.user.findUnique({ where: { id: data.user.id } });
    if (!existingUser) {
      await prisma.user.create({
        data: {
          id: data.user.id,
          email: data.user.email ?? email,
          name: name ?? email.split('@')[0],
        },
      });
    }
  }

  if (!data.session && !data.user) {
    res.status(201).json({ message: 'Revisa tu email para confirmar la cuenta' });
    return;
  }

  res.status(201).json({
    token: data.session?.access_token ?? '',
    user: data.user
      ? { id: data.user.id, email: data.user.email ?? email, name: name ?? email.split('@')[0] }
      : undefined,
  });
});

/**
 * POST /api/auth/request-reset - Solicitar restablecimiento de contraseña
 */
router.post('/request-reset', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body ?? {};
  if (!email) throw AppError.badRequest('Email requerido');

  const supabase = createSupabaseClient();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const redirectTo = `${frontendUrl.replace(/\/$/, '')}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw AppError.badRequest(error.message);

  res.status(200).json({ message: 'Si existe la cuenta, recibirás un email' });
});

router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body ?? {};
  if (!token || !password) throw AppError.badRequest('Token y nueva contraseña requeridos');

  const supabase = createSupabaseClient(token);
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw AppError.badRequest(error.message);

  res.status(200).json({ message: 'Contraseña actualizada' });
});

/**
 * Proxy para refresh de sesión JWT.
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing Authorization header');
  }
  const token = authHeader.slice(7);
  const supabase = createSupabaseClient(token);
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    throw AppError.unauthorized(error.message);
  }
  res.json(data);
});

export default router;
