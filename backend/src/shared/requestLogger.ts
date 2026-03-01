import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import pinoHttp from 'pino-http';
import { logger } from './logger';

const REQUEST_ID_HEADER = 'x-request-id';

export function generateRequestId(): string {
  try {
    return randomUUID();
  } catch {
    return `req-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req: Request) => {
    const id = (req.headers[REQUEST_ID_HEADER] as string) || generateRequestId();
    (req as Request & { id: string }).id = id;
    return id;
  },
  customSuccessMessage: (req, res, responseTime) =>
    `${req.method} ${req.url} ${res.statusCode} ${responseTime.toFixed(0)}ms`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.url} ${res.statusCode} - ${err?.message ?? 'error'}`,
  customAttributeKeys: { req: 'request', res: 'response', err: 'error' },
  serializers: {
    req: (req: Request) => ({
      id: (req as Request & { id?: string }).id,
      method: req.method,
      url: req.url,
      path: req.path,
    }),
    res: (res: Response) => ({ statusCode: res.statusCode }),
  },
  autoLogging: { ignore: (req) => req.url === '/health' || req.url === '/' },
});
