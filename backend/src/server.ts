import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';

process.env.TZ = 'America/Mexico_City';

import { errorHandler } from './shared/errors';
import { requestLogger } from './shared/requestLogger';
import { logger } from './shared/logger';
import { corsMiddleware, helmetMiddleware, generalLimiter } from './shared/security';
import authRoutes from './modules/auth/infrastructure/authRoutes';
import { authMiddleware } from './modules/auth/infrastructure/authMiddleware';
import transactionRoutes from './modules/transactions/infrastructure/transactionRoutes';
import accountRoutes from './modules/accounts/infrastructure/accountRoutes';
import categoryRoutes from './modules/categories/infrastructure/categoryRoutes';
import creditCardRoutes from './modules/credit-cards/infrastructure/creditCardRoutes';
import installmentRoutes from './modules/installments/infrastructure/installmentRoutes';
import investmentRoutes from './modules/investments/infrastructure/investmentRoutes';
import recurringRoutes from './modules/recurring/infrastructure/recurringRoutes';
import financialPlanningRoutes from './modules/financial-planning/infrastructure/financialPlanningRoutes';
import notificationRoutes from './modules/notifications/infrastructure/notificationRoutes';
import profileRoutes from './modules/profile/infrastructure/profileRoutes';
import loanRoutes from './modules/loans/infrastructure/loanRoutes';
import goalRoutes from './modules/goals/infrastructure/goalRoutes';
import aiRoutes from './modules/ai/infrastructure/aiRoutes';
import { generateCreditCardStatements, createDailyAccountSnapshots } from './jobs';
import { setupSwagger } from './swagger';

const app = express();

app.set('trust proxy', 1);

app.use(requestLogger);
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

app.use('/api/profile', authMiddleware, profileRoutes);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/accounts', authMiddleware, accountRoutes);
app.use('/api/categories', authMiddleware, categoryRoutes);
app.use('/api/credit-card', authMiddleware, creditCardRoutes);
app.use('/api/installments', authMiddleware, installmentRoutes);
app.use('/api/investments', authMiddleware, investmentRoutes);
app.use('/api/recurring', authMiddleware, recurringRoutes);
app.use('/api/financial-planning', authMiddleware, financialPlanningRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);
app.use('/api/loans', authMiddleware, loanRoutes);
app.use('/api/goals', authMiddleware, goalRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Finward API started');
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_CRON_JOBS === 'true') {
    setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() >= 5 && now.getMinutes() < 6) {
        await generateCreditCardStatements().catch((err) => logger.error({ err }, 'Statement job failed'));
      }
      if (now.getHours() === 23 && now.getMinutes() >= 55 && now.getMinutes() < 56) {
        await createDailyAccountSnapshots().catch((err) => logger.error({ err }, 'Snapshot job failed'));
      }
    }, 60000);
  }
});
