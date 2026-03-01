import { Request, Response, NextFunction } from 'express';

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
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }
  console.error('[Error]', err);
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
}
