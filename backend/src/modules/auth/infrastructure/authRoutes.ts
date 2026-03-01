import { Router, Request, Response } from 'express';
import { createSupabaseClient } from '../../../lib/supabase';
import { AppError } from '../../../shared/errors';

const router = Router();

/**
 * Proxy opcional para refresh de sesión.
 * El frontend normalmente usa supabase.auth.refreshSession() directamente.
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
