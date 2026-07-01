import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string | null;
  avatar: string | null;
  role: string;
  emailVerified: boolean;
  preferredCurrency?: string | null;
  preferredPlatform?: string | null;
  jti?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
