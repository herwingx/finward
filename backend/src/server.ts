import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';

process.env.TZ = 'America/Mexico_City';

import { errorHandler } from './shared/errors';
import { corsMiddleware, helmetMiddleware, generalLimiter } from './shared/security';
import authRoutes from './modules/auth/infrastructure/authRoutes';
import { authMiddleware } from './modules/auth/infrastructure/authMiddleware';
import transactionRoutes from './modules/transactions/infrastructure/transactionRoutes';
import accountRoutes from './modules/accounts/infrastructure/accountRoutes';
import categoryRoutes from './modules/categories/infrastructure/categoryRoutes';
import creditCardRoutes from './modules/credit-cards/infrastructure/creditCardRoutes';
import loanRoutes from './modules/loans/infrastructure/loanRoutes';
import goalRoutes from './modules/goals/infrastructure/goalRoutes';
import { generateCreditCardStatements, createDailyAccountSnapshots } from './jobs';
import { setupSwagger } from './swagger';

const app = express();

app.set('trust proxy', 1);

app.use(helmetMiddleware);
app.use(corsMiddleware());
app.use('/api', generalLimiter);

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Uploads: usar Supabase Storage (bucket publico o privado) - ver docs/STORAGE.md
app.get('/', (_req, res) => res.send('Finward API'));
app.get('/health', (_req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString() }));

setupSwagger(app);

// API routes
app.use('/api/auth', authRoutes);

app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/accounts', authMiddleware, accountRoutes);
app.use('/api/categories', authMiddleware, categoryRoutes);
app.use('/api/credit-card', authMiddleware, creditCardRoutes);
app.use('/api/loans', authMiddleware, loanRoutes);
app.use('/api/goals', authMiddleware, goalRoutes);

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Finward API - port ${PORT}`);
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_CRON_JOBS === 'true') {
    setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() >= 5 && now.getMinutes() < 6) {
        await generateCreditCardStatements().catch(console.error);
      }
      if (now.getHours() === 23 && now.getMinutes() >= 55 && now.getMinutes() < 56) {
        await createDailyAccountSnapshots().catch(console.error);
      }
    }, 60000);
  }
});
