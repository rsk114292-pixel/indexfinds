/**
 * Rotate an existing administrator password and revoke every refresh session.
 * Required environment variables: ADMIN_EMAIL and ADMIN_PASSWORD.
 */
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
const strongPassword =
  password.length >= 16 &&
  password.length <= 32 &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
  console.error('ADMIN_EMAIL must be a valid administrator email address.');
  process.exit(1);
}
if (!strongPassword) {
  console.error(
    'ADMIN_PASSWORD must be 16-32 characters and include upper/lowercase letters, a number, and a symbol.',
  );
  process.exit(1);
}

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'indexfinds',
});

async function rotateAdminPassword() {
  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      const users = (await manager.query(
        `SELECT id, role FROM users WHERE lower(email) = $1 FOR UPDATE`,
        [email],
      )) as Array<{ id: string; role: string }>;
      const user = users[0];
      if (!user || !['admin', 'super_admin'].includes(user.role)) {
        throw new Error('The requested administrator account does not exist.');
      }

      const passwordHash = await bcrypt.hash(password, 12);
      await manager.query(
        `UPDATE users
           SET password = $1,
               password_changed_at = NOW(),
               failed_login_attempts = 0,
               locked_until = NULL,
               "isActive" = TRUE
         WHERE id = $2`,
        [passwordHash, user.id],
      );
      await manager.query(
        `UPDATE refresh_tokens
            SET revoked_at = NOW()
          WHERE user_id = $1 AND revoked_at IS NULL`,
        [user.id],
      );
    });
    console.log('Administrator password rotated; refresh sessions revoked.');
  } finally {
    await dataSource.destroy();
  }
}

rotateAdminPassword().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Password rotation failed: ${message}`);
  process.exit(1);
});
