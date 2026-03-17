import { Response, NextFunction } from 'express';
import { createSupabaseClient } from '../../../lib/supabase';
import { AppError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import type { AuthRequest } from '../../../shared/types';

/**
 * Middleware: extrae JWT de Authorization header y valida con Supabase.
 * Establece req.user con { id, email } para uso en controladores.
 */
export async function authMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(AppError.unauthorized('Missing or invalid Authorization header'));
    return;
  }

  const token = authHeader.slice(7);
  try {
    const supabase = createSupabaseClient(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      next(AppError.unauthorized('Invalid or expired token'));
      return;
    }
    req.user = { id: user.id, email: user.email ?? undefined };
    next();
  } catch (err) {
    logger.warn({ err }, '[auth] Token validation failed');
    next(AppError.unauthorized('Token validation failed'));
  }
}
