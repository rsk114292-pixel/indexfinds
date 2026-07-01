/**
 * Auth API 函数
 * 所有认证相关的 API 调用，基于统一的 api.ts 请求层
 */

import { post, get, patch, del, request, API_BASE_URL, ApiError } from './api';

// ============ 类型定义 ============

export interface RegisterData {
  email: string;
  password: string;
  username?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    username: string | null;
    avatar: string | null;
    role: string;
    emailVerified: boolean;
  };
}

export interface ChangePasswordData {
  currentPassword?: string;
  newPassword: string;
}

interface Session {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
}

interface LinkedAccount {
  provider: string;
  email?: string;
  name?: string;
}

// ============ 认证函数 ============

export async function register(data: RegisterData): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/register', data);
}

export async function login(data: LoginData): Promise<AuthResponse> {
  try {
    return await post<AuthResponse>('/auth/login', data);
  } catch (error) {
    if (error instanceof ApiError) {
      const err = new Error(error.message) as Error & {
        code?: string;
        remainingAttempts?: number;
      };
      err.code = error.code;
      err.remainingAttempts = error.details?.remainingAttempts as number | undefined;
      throw err;
    }
    throw error;
  }
}

export async function refreshAccessToken(): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/refresh', {}, { includeAuth: false });
}

export async function getProfile(): Promise<AuthResponse['user']> {
  return get<AuthResponse['user']>('/auth/me');
}

export async function logout(): Promise<void> {
  await post('/auth/logout');
}

export async function logoutAll(): Promise<void> {
  await post('/auth/logout-all');
}

export async function changePassword(data: ChangePasswordData): Promise<{ message: string }> {
  return post<{ message: string }>('/auth/change-password', data);
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return post<{ message: string }>('/auth/password/forgot', { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return post<{ message: string }>('/auth/password/reset', { token, newPassword });
}

export async function sendVerificationEmail(): Promise<{ message: string }> {
  return post<{ message: string }>('/auth/email/send-verification');
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  return post<{ message: string }>('/auth/email/verify', { token });
}

export async function updateUsername(username: string): Promise<{ username: string }> {
  return patch<{ username: string }>('/auth/username', { username });
}

export async function uploadAvatar(file: File): Promise<{ avatar: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return request<{ avatar: string }>(`${API_BASE_URL}/auth/avatar`, {
    method: 'PATCH',
    body: formData,
  });
}

// ============ 会话管理 ============

export async function getSessions(): Promise<Session[]> {
  return get<Session[]>('/auth/sessions');
}

export async function revokeSession(sessionId: string): Promise<{ message: string }> {
  return del<{ message: string }>(`/auth/sessions/${sessionId}`);
}

// ============ OAuth 账号管理 ============

export async function getLinkedOAuthAccounts(): Promise<LinkedAccount[]> {
  return get<LinkedAccount[]>('/auth/oauth/accounts');
}

export async function unlinkOAuthAccount(provider: string): Promise<{ message: string }> {
  return del<{ message: string }>(`/auth/oauth/${provider}`);
}
