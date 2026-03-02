/**
 * Seed para Finward - Datos de prueba para desarrollo
 *
 * Requiere: SEED_USER_ID (UUID de usuario en Supabase Auth)
 * Obtener: Supabase Dashboard > Auth > Users > crear usuario > copiar id
 *
 * Ejecutar: SEED_USER_ID=<uuid> node prisma/seed.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { subDays, addDays, startOfMonth, endOfMonth } = require('date-fns');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error('DIRECT_URL o DATABASE_URL requerido');
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_CATEGORIES = [
  { name: 'Comida', icon: 'restaurant', color: '#FF6B6B', type: 'expense', budgetType: 'need' },
  { name: 'Transporte', icon: 'directions_car', color: '#FFD166', type: 'expense', budgetType: 'need' },
  { name: 'Vivienda', icon: 'home', color: '#06D6A0', type: 'expense', budgetType: 'need' },
  { name: 'Ocio', icon: 'sports_esports', color: '#118AB2', type: 'expense', budgetType: 'want' },
  { name: 'Salud', icon: 'medical_services', color: '#073B4C', type: 'expense', budgetType: 'need' },
  { name: 'Ahorros', icon: 'savings', color: '#6B5FFF', type: 'expense', budgetType: 'savings' },
  { name: 'Salario', icon: 'payments', color: '#34D399', type: 'income' },
];

async function main() {
  const userId = process.env.SEED_USER_ID;
  if (!userId) {
    console.error(`
❌ SEED_USER_ID no definido.

Para ejecutar el seed:
1. Crea un usuario en Supabase Auth (Dashboard > Auth > Users > Add user)
2. Copia el UUID del usuario
3. Ejecuta: SEED_USER_ID=<uuid> npm run db:seed

O desde .env: SEED_USER_ID=tu-uuid
`);
    process.exit(1);
  }

  console.log('🌱 Iniciando seed para userId:', userId);

  // Si existe usuario demo con otro id (auth recreado), eliminarlo para sincronizar
  const existingByEmail = await prisma.user.findUnique({ where: { email: 'demo@finward.dev' } });
  if (existingByEmail && existingByEmail.id !== userId) {
    await prisma.user.delete({ where: { id: existingByEmail.id } });
  }

  const user = await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email: 'demo@finward.dev',
      name: 'Usuario Demo',
      currency: 'MXN',
      timezone: 'America/Mexico_City',
      monthlyNetIncome: 25000,
      incomeFrequency: 'monthly',
      notificationsEnabled: true,
      categories: { create: DEFAULT_CATEGORIES },
    },
    update: {},
    include: { categories: true },
  });

  if (user.categories.length === 0) {
    await prisma.category.createMany({ data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })) });
  }
  const categories = await prisma.category.findMany({ where: { userId } });
  const catComida = categories.find((c) => c.name === 'Comida');
  const catSalario = categories.find((c) => c.name === 'Salario');
  const catOcio = categories.find((c) => c.name === 'Ocio');
  const catTransporte = categories.find((c) => c.name === 'Transporte');
  if (!catComida || !catSalario || !catOcio || !catTransporte) {
    throw new Error('Categorías no encontradas');
  }
  console.log('✓ User y categorías');

  let accountDebit = await prisma.account.findFirst({ where: { userId, name: 'Cuenta Principal' } });
  if (!accountDebit) {
    accountDebit = await prisma.account.create({ data: { userId, name: 'Cuenta Principal', type: 'DEBIT', balance: 0, currency: 'MXN' } });
  }
  let accountCash = await prisma.account.findFirst({ where: { userId, name: 'Efectivo' } });
  if (!accountCash) {
    accountCash = await prisma.account.create({ data: { userId, name: 'Efectivo', type: 'CASH', balance: 0, currency: 'MXN' } });
  }
  let accountCredit = await prisma.account.findFirst({ where: { userId, name: 'TDC Santander' } });
  if (!accountCredit) {
    accountCredit = await prisma.account.create({
      data: { userId, name: 'TDC Santander', type: 'CREDIT', balance: 0, currency: 'MXN', creditLimit: 30000, cutoffDay: 15, paymentDay: 25, interestRate: 24 },
    });
  }
  console.log('✓ Accounts');

  const today = new Date();

  const tIncome = await prisma.transaction.create({
    data: { userId, accountId: accountDebit.id, categoryId: catSalario.id, amount: 25000, description: 'Salario mensual', date: subDays(today, 5), type: 'income' },
  });
  await prisma.ledgerEntry.create({ data: { accountId: accountDebit.id, transactionId: tIncome.id, amount: 25000, type: 'credit' } });
  await prisma.account.update({ where: { id: accountDebit.id }, data: { balance: { increment: 25000 } } });

  const tExpense = await prisma.transaction.create({
    data: { userId, accountId: accountDebit.id, categoryId: catComida.id, amount: 450, description: 'Supermercado', date: subDays(today, 2), type: 'expense' },
  });
  await prisma.ledgerEntry.create({ data: { accountId: accountDebit.id, transactionId: tExpense.id, amount: -450, type: 'debit' } });
  await prisma.account.update({ where: { id: accountDebit.id }, data: { balance: { increment: -450 } } });

  const tTdc = await prisma.transaction.create({
    data: { userId, accountId: accountCredit.id, categoryId: catOcio.id, amount: 3500, description: 'Compra en línea', date: subDays(today, 3), type: 'expense' },
  });
  await prisma.ledgerEntry.create({ data: { accountId: accountCredit.id, transactionId: tTdc.id, amount: 3500, type: 'credit' } });
  await prisma.account.update({ where: { id: accountCredit.id }, data: { balance: { increment: 3500 } } });

  const tTransfer = await prisma.transaction.create({
    data: { userId, accountId: accountDebit.id, destinationAccountId: accountCash.id, amount: 2000, description: 'Retiro efectivo', date: subDays(today, 1), type: 'transfer' },
  });
  await prisma.ledgerEntry.createMany({
    data: [
      { accountId: accountDebit.id, transactionId: tTransfer.id, amount: -2000, type: 'debit' },
      { accountId: accountCash.id, transactionId: tTransfer.id, amount: 2000, type: 'credit' },
    ],
  });
  await prisma.account.update({ where: { id: accountDebit.id }, data: { balance: { increment: -2000 } } });
  await prisma.account.update({ where: { id: accountCash.id }, data: { balance: { increment: 2000 } } });
  console.log('✓ Transactions');

  const purchase = await prisma.installmentPurchase.create({
    data: { userId, accountId: accountCredit.id, categoryId: catOcio.id, description: 'iPhone a MSI', totalAmount: 12000, installments: 6, monthlyPayment: 2000, purchaseDate: subDays(today, 10) },
  });
  const tMsi = await prisma.transaction.create({
    data: { userId, accountId: accountCredit.id, categoryId: catOcio.id, amount: 12000, description: purchase.description, date: purchase.purchaseDate, type: 'expense', installmentPurchaseId: purchase.id },
  });
  await prisma.ledgerEntry.create({ data: { accountId: accountCredit.id, transactionId: tMsi.id, amount: 12000, type: 'credit' } });
  await prisma.account.update({ where: { id: accountCredit.id }, data: { balance: { increment: 12000 } } });
  console.log('✓ MSI');

  await prisma.recurringTransaction.create({
    data: { userId, accountId: accountDebit.id, categoryId: catTransporte.id, amount: 500, description: 'Gasolina quincenal', type: 'expense', frequency: 'biweekly', startDate: subDays(today, 30), nextDueDate: addDays(today, 3), active: true },
  });
  await prisma.loan.create({
    data: { userId, borrowerName: 'Juan Pérez', borrowerEmail: 'juan@example.com', reason: 'Préstamo personal', loanType: 'lent', originalAmount: 5000, remainingAmount: 3500, loanDate: subDays(today, 45), expectedPayDate: addDays(today, 15), status: 'active' },
  });
  await prisma.creditCardStatement.create({
    data: { accountId: accountCredit.id, cycleStart: subDays(today, 20), cycleEnd: subDays(today, 2), paymentDueDate: addDays(today, 10), totalDue: 5500, minimumPayment: 500, regularAmount: 3500, msiAmount: 2000, status: 'PENDING' },
  });

  const accounts = await prisma.account.findMany({ where: { userId } });
  const snapDate = startOfMonth(today);
  for (const acc of accounts) {
    const existing = await prisma.accountSnapshot.findFirst({ where: { accountId: acc.id, date: snapDate } });
    if (existing) await prisma.accountSnapshot.update({ where: { id: existing.id }, data: { balance: acc.balance } });
    else await prisma.accountSnapshot.create({ data: { accountId: acc.id, balance: acc.balance, date: snapDate } });
  }

  const goal = await prisma.savingsGoal.create({
    data: { userId, name: 'Vacaciones', targetAmount: 15000, currentAmount: 3500, deadline: addDays(today, 90), icon: 'flight', color: '#06D6A0', status: 'active' },
  });
  await prisma.savingsContribution.create({ data: { savingsGoalId: goal.id, amount: 1000, date: subDays(today, 7), notes: 'Primera aportación' } });

  await prisma.investment.create({
    data: { userId, name: 'CETES', type: 'bond', ticker: 'CETES', quantity: 10, avgBuyPrice: 10.5, currentPrice: 10.8, currency: 'MXN', purchaseDate: subDays(today, 60), lastPriceUpdate: today },
  });
  await prisma.investment.create({
    data: { userId, name: 'Bitcoin', type: 'crypto', ticker: 'bitcoin', quantity: 0.01, avgBuyPrice: 800000, currentPrice: 800000, currency: 'MXN', purchaseDate: subDays(today, 30), lastPriceUpdate: today },
  });
  await prisma.investment.create({
    data: { userId, name: 'NVIDIA', type: 'stock', ticker: 'NVDA', quantity: 5, avgBuyPrice: 120, currentPrice: 120, currency: 'USD', purchaseDate: subDays(today, 45), lastPriceUpdate: today },
  });
  await prisma.budget.create({
    data: { userId, name: 'Comida marzo', amount: 4000, startDate: startOfMonth(today), endDate: endOfMonth(today), notifyThreshold: 80, rollover: false },
  });
  await prisma.notification.create({
    data: { userId, type: 'info', title: 'Bienvenido a Finward', body: 'Usa estos datos de prueba para explorar todas las funcionalidades.', read: false },
  });

  console.log('✓ Recurring, Loan, Statement, Snapshots, Goal, Investment, Budget, Notification');
  console.log('\n✅ Seed completado. Datos listos para probar todas las funcionalidades.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
