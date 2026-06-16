import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import type { AuthPayload } from '../types/index.js';

export function signAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: Pick<AuthPayload, 'sub'>): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AuthPayload {
  return jwt.verify(token, config.jwt.accessSecret) as AuthPayload;
}

export function verifyRefreshToken(token: string): Pick<AuthPayload, 'sub'> {
  return jwt.verify(token, config.jwt.refreshSecret) as Pick<AuthPayload, 'sub'>;
}
