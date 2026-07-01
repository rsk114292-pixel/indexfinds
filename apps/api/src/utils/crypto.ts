import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_VERSION = 'v1';

/**
 * 解析 base64 编码的 32 字节密钥
 */
function parseKey(raw: string): Buffer {
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error('加密密钥必须是 32 字节的 base64 编码字符串');
  }
  return buf;
}

/**
 * 获取当前加密密钥（从环境变量，32 字节）
 */
function getEncryptionKey(): Buffer {
  const key = process.env.OAUTH_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'OAUTH_ENCRYPTION_KEY 未配置。请设置一个 32 字节的 base64 编码密钥。' +
        "\n生成方式: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }
  return parseKey(key);
}

/**
 * 获取上一版加密密钥（可选，用于 key 轮换过渡期）
 */
function getPreviousEncryptionKey(): Buffer | null {
  const key = process.env.OAUTH_ENCRYPTION_KEY_PREVIOUS;
  if (!key) return null;
  return parseKey(key);
}

/**
 * 用指定 key 执行 AES-256-GCM 解密
 */
function decryptWithKey(parts: string[], key: Buffer): string {
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * AES-256-GCM 加密
 * 返回格式: v1:iv:authTag:ciphertext (均为 hex 编码)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${KEY_VERSION}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * AES-256-GCM 解密（支持 key 轮换 fallback）
 *
 * 支持格式:
 * - v1:iv:authTag:ciphertext （新格式，带版本前缀）
 * - iv:authTag:ciphertext    （旧格式，无版本前缀）
 *
 * 解密顺序：当前 key → 上一版 key (OAUTH_ENCRYPTION_KEY_PREVIOUS)
 */
export function decrypt(ciphertext: string): string {
  const rawParts = ciphertext.split(':');

  // 解析版本前缀，提取 iv:authTag:ciphertext 部分
  let parts: string[];
  if (rawParts[0] === KEY_VERSION && rawParts.length === 4) {
    parts = rawParts.slice(1);
  } else if (rawParts.length === 3) {
    parts = rawParts;
  } else {
    throw new Error('Invalid encrypted format');
  }

  // 1. 尝试用当前 key 解密
  const currentKey = getEncryptionKey();
  try {
    return decryptWithKey(parts, currentKey);
  } catch {
    // 当前 key 失败，尝试旧 key
  }

  // 2. 尝试用上一版 key 解密
  const previousKey = getPreviousEncryptionKey();
  if (previousKey) {
    return decryptWithKey(parts, previousKey);
  }

  throw new Error('Decryption failed: no matching key');
}

/**
 * TypeORM Column Transformer — 自动加解密
 * 用于 Entity 的 @Column({ transformer: encryptedTransformer })
 */
export const encryptedTransformer = {
  to(value: string | null | undefined): string | null {
    if (!value) return null;
    return encrypt(value);
  },
  from(value: string | null | undefined): string | null {
    if (!value) return null;
    try {
      // 兼容旧数据：如果不含 ':' 分隔符，说明是未加密的旧数据
      if (!value.includes(':')) return value;
      return decrypt(value);
    } catch {
      // 解密失败时返回原值（兼容迁移期间的旧数据）
      return value;
    }
  },
};
