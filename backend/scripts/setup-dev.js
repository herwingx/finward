#!/usr/bin/env node
/**
 * Setup completo para desarrollo: Auth user + Seed + RLS
 *
 * Crea usuario demo en Supabase Auth, ejecuta seed, aplica RLS.
 *
 * Uso: node scripts/setup-dev.js
 *
 * Credenciales demo: demo@finward.dev / DemoFinward123!
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEMO_EMAIL = 'demo@finward.dev';
const DEMO_PASSWORD = 'DemoFinward123!';

async function createAuthUser() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY requeridos');
  }
  const supabase = createClient(url, serviceKey);
  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === DEMO_EMAIL);
  if (found) {
    console.log('✓ Usuario auth ya existe:', found.id);
    return found.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { name: 'Usuario Demo' },
  });
  if (error) throw error;
  console.log('✓ Usuario auth creado:', data.user.id);
  return data.user.id;
}

async function applyRls() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DIRECT_URL o DATABASE_URL requerido');
  const sqlPath = path.join(__dirname, '../prisma/rls-policies.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const { Client } = require('pg');
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(sql);
    console.log('✓ RLS aplicado');
  } catch (e) {
    if (e.message && e.message.includes('already exists')) {
      console.log('✓ RLS ya aplicado (políticas existentes)');
    } else throw e;
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('\n🔧 Setup desarrollo Finward\n');

  console.log('1. Creando usuario en Supabase Auth...');
  const userId = await createAuthUser();
  process.env.SEED_USER_ID = userId;

  console.log('\n2. Ejecutando seed...');
  execSync('node -r dotenv/config prisma/seed.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, SEED_USER_ID: userId },
  });

  console.log('\n3. Aplicando políticas RLS...');
  await applyRls();

  console.log('\n✅ Setup completado.\n');
  console.log('Credenciales para iniciar sesión en el frontend:');
  console.log('  Email:    ', DEMO_EMAIL);
  console.log('  Password: ', DEMO_PASSWORD);
  console.log('\nInicia el backend: npm run dev\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
