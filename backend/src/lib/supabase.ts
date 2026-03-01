import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
}

/**
 * Cliente Supabase con anon key (para RLS con JWT del usuario)
 * Usar para requests de la app cuando el usuario está autenticado
 */
export function createSupabaseClient(accessToken?: string): SupabaseClient {
  return createClient(url!, anonKey!, {
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {},
  });
}

/**
 * Cliente Supabase con service role (bypass RLS)
 * Usar SOLO para jobs/cron y operaciones administrativas
 * NUNCA exponer al frontend
 */
export function createSupabaseServiceClient(): SupabaseClient {
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for service client');
  }
  return createClient(url!, serviceRoleKey);
}
