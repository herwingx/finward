import { Request } from 'express';

/**
 * Usuario autenticado extraído del JWT de Supabase
 */
export interface AuthUser {
  id: string;
  email?: string;
}

/**
 * Request con usuario autenticado
 * req.user se establece después del middleware de auth
 */
export interface AuthRequest extends Request {
  user?: AuthUser;
}
