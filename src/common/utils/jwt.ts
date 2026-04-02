import jwt, { JwtPayload } from 'jsonwebtoken';
import { HttpError } from '../errors/http-error';
import type { AuthTokenPayload } from '../types/auth.types';

const JWT_SECRET: string = process.env.JWT_SECRET ?? '';
const ACCESS_TOKEN_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '1d') as jwt.SignOptions['expiresIn'];

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

export function signAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded === 'string') {
      throw new HttpError(401, 'Invalid or expired token');
    }

    return toAuthTokenPayload(decoded);
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
}

function toAuthTokenPayload(decoded: JwtPayload): AuthTokenPayload {
  if (typeof decoded.userId !== 'string' || typeof decoded.role !== 'string') {
    throw new HttpError(401, 'Invalid or expired token');
  }

  return {
    userId: decoded.userId,
    role: decoded.role as AuthTokenPayload['role'],
  };
}
