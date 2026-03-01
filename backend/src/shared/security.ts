import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';

const getAllowedOrigins = (): string[] | '*' => {
  const originsEnv = process.env.ALLOWED_ORIGINS;
  if (!originsEnv || originsEnv === '*') return '*';
  return originsEnv.split(',').map((o) => o.trim());
};

export const corsMiddleware = () => {
  const origins = getAllowedOrigins();
  if (origins === '*') return cors();
  return cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if ((origins as string[]).includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
};

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests', retryAfter: 15 },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.RATE_LIMIT_ENABLED === 'false',
});

export const helmetMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});
