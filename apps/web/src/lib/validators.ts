const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 32;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export type PasswordError = 'minLength' | 'maxLength' | 'complexity';

const PASSWORD_ERROR_I18N: Record<PasswordError, string> = {
  minLength: 'validation.passwordMinLength8',
  maxLength: 'validation.passwordMaxLength32',
  complexity: 'validation.passwordComplexity',
};

/**
 * 验证密码复杂度，返回 i18n key 或 null（通过）
 */
export function validatePassword(password: string): string | null {
  let error: PasswordError | null = null;
  if (password.length < PASSWORD_MIN_LENGTH) error = 'minLength';
  else if (password.length > PASSWORD_MAX_LENGTH) error = 'maxLength';
  else if (!PASSWORD_COMPLEXITY_REGEX.test(password)) error = 'complexity';
  return error ? PASSWORD_ERROR_I18N[error] : null;
}
