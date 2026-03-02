import { Prisma } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

/**
 * AppError - Errores de aplicación con código HTTP
 * Usado para convertir excepciones de negocio en respuestas HTTP
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, code?: string): AppError {
    return new AppError(400, message, code ?? 'BAD_REQUEST');
  }

  static unauthorized(message = 'Unauthorized', code?: string): AppError {
    return new AppError(401, message, code ?? 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden', code?: string): AppError {
    return new AppError(403, message, code ?? 'FORBIDDEN');
  }

  static notFound(message: string, code?: string): AppError {
    return new AppError(404, message, code ?? 'NOT_FOUND');
  }

  static conflict(message: string, code?: string): AppError {
    return new AppError(409, message, code ?? 'CONFLICT');
  }
}

/**
 * Error handler global para Express
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.warn({ statusCode: err.statusCode, code: err.code, msg: err.message }, 'AppError');
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }
  // Prisma known errors → HTTP
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      logger.warn({ code: err.code, meta: err.meta }, 'Prisma unique constraint');
      res.status(409).json({ error: 'Registro duplicado', code: 'CONFLICT' });
      return;
    }
    if (err.code === 'P2003') {
      logger.warn({ code: err.code, meta: err.meta }, 'Prisma foreign key');
      res.status(400).json({ error: 'Referencia inválida', code: 'BAD_REQUEST' });
      return;
    }
    if (err.code === 'P2025') {
      logger.warn({ code: err.code, meta: err.meta }, 'Prisma record not found');
      res.status(404).json({ error: 'Registro no encontrado', code: 'NOT_FOUND' });
      return;
    }
  }
  logger.error({ err, stack: err.stack }, 'Unhandled error');
  const isConnectionError =
    err instanceof Error &&
    (err.message?.includes('connect') ||
      err.message?.includes('ECONNREFUSED') ||
      err.message?.includes('ENOTFOUND') ||
      err.message?.includes('ETIMEDOUT'));
  const message =
    process.env.NODE_ENV === 'development' && isConnectionError
      ? 'Error de conexión a la base de datos. Revisa DATABASE_URL/DIRECT_URL y USE_DIRECT_URL.'
      : 'Internal server error';
  res.status(500).json({ error: message, code: 'INTERNAL_ERROR' });
}
