import { Router, Request, Response } from 'express';
import { createSupabaseClient } from '../../../lib/supabase';
import { AppError } from '../../../shared/errors';

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
    res.status(400).json({ message: 'Email y contraseña requeridos' });
    return;
  }
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) console.error('[auth/login] Supabase error:', error.message, error.status);
    if (error) {
      res.status(401).json({ message: error.message === 'Invalid login credentials' ? 'Credenciales incorrectas' : error.message });
      return;
    }
    if (!data.session || !data.user) {
      console.error('[auth/login] Supabase sin session/user:', { hasSession: !!data.session, hasUser: !!data.user });
      res.status(500).json({ message: 'Error al iniciar sesión' });
      return;
    }
    res.json({
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email ?? '',
        name: (data.user.user_metadata?.name as string) ?? data.user.email?.split('@')[0] ?? 'Usuario',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    console.error('[auth/login] 500:', err);
    res.status(500).json({ message: msg });
  }
});

/**
 * POST /api/auth/register - Crear cuenta
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ message: 'Email y contraseña requeridos' });
    return;
  }
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name ?? email.split('@')[0] } },
    });

    if (error) {
      res.status(400).json({ message: error.message });
      return;
    }

    // CREATE USER IN PRISMA TO SATISFY FOREIGN KEYS
    if (data.user) {
      const { prisma } = await import('../../../lib/prisma');
      const existingUser = await prisma.user.findUnique({ where: { id: data.user.id } });
      if (!existingUser) {
        await prisma.user.create({
          data: {
            id: data.user.id,
            email: data.user.email ?? email,
            name: name ?? email.split('@')[0],
          }
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
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : 'Error interno' });
  }
});

/**
 * POST /api/auth/request-reset - Solicitar restablecimiento de contraseña
 */
router.post('/request-reset', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body ?? {};
  if (!email) {
    res.status(400).json({ message: 'Email requerido' });
    return;
  }
  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      res.status(400).json({ message: error.message });
      return;
    }
    res.status(200).json({ message: 'Si existe la cuenta, recibirás un email' });
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : 'Error interno' });
  }
});

/**
 * POST /api/auth/reset-password - Restablecer contraseña con token de recovery
 * El token debe ser el access_token de la URL de recovery de Supabase
 */
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body ?? {};
  if (!token || !password) {
    res.status(400).json({ message: 'Token y nueva contraseña requeridos' });
    return;
  }
  try {
    const supabase = createSupabaseClient(token);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      res.status(400).json({ message: error.message });
      return;
    }
    res.status(200).json({ message: 'Contraseña actualizada' });
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : 'Error interno' });
  }
});

/**
 * Proxy opcional para refresh de sesión.
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const supabase = createSupabaseClient(token);
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      throw AppError.unauthorized(error.message);
    }
    res.json(data);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
