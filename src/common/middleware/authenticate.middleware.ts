import { NextFunction, Request, Response } from 'express';
import { jwtVerify } from 'jose';
import { StatusCodes } from 'http-status-codes';
import { createSecretKey } from 'node:crypto';
import { MiddlewareInterface } from './middleware.interface.js';
import { HttpError } from '../http/http.errors.js';

export const BLACK_LIST_TOKENS: Set<string> = new Set();

export class AuthenticateMiddleware implements MiddlewareInterface {
  constructor(private readonly jwtSecret: string) {}

  private getTokenFromRequest(req: Request): string | null {
    const authorizationParts = req.headers?.authorization?.split(' ');
    if (!authorizationParts) {
      return null;
    }
    const [, token] = authorizationParts;
    return token ?? null;
  }

  private async verifyToken(token: string) {
    const { payload } = await jwtVerify(
      token,
      createSecretKey(this.jwtSecret, 'utf-8')
    );
    return payload;
  }

  private isTokenBlacklisted(token: string): boolean {
    return BLACK_LIST_TOKENS.has(token);
  }

  private attachUserToRequest(req: Request, payload: Record<string, unknown>): void {
    req.user = {
      email: payload.email as string,
      id: payload.id as string
    };
  }

  public async execute(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const token = this.getTokenFromRequest(req);
    if (!token) {
      return next();
    }

    try {
      const payload = await this.verifyToken(token);

      if (this.isTokenBlacklisted(token)) {
        return next(new HttpError(
          StatusCodes.UNAUTHORIZED,
          'Token in black list',
          'AuthenticateMiddleware'
        ));
      }

      this.attachUserToRequest(req, payload as Record<string, unknown>);
      return next();
    } catch {
      return next(new HttpError(
        StatusCodes.UNAUTHORIZED,
        'Invalid token',
        'AuthenticateMiddleware'
      ));
    }
  }
}
