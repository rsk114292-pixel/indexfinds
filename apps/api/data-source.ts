/**
 * TypeORM CLI DataSource configuration
 *
 * Used by TypeORM CLI commands (migration:run, migration:revert, migration:generate)
 * Usage: npx typeorm -d ./data-source.ts migration:run
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const envCandidates = [
  resolve(__dirname, '.env.local'),
  resolve(__dirname, '.env'),
  resolve(__dirname, '..', '.env.local'),
  resolve(__dirname, '..', '.env'),
];

const envPath = envCandidates.find((filePath) => existsSync(filePath));
dotenv.config(envPath ? { path: envPath } : undefined);

// production (Docker): compiled JS in dist/src/
// development: source TS in src/
const entitiesDir = process.env.NODE_ENV === 'production' ? 'dist/src' : 'src';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
  // 仅当 DB_SSL=true 时启用 SSL（Docker 内部网络不需要 SSL）
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  extra: {
    max: 20,
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
  },
  entities: [`${entitiesDir}/**/*.entity{.ts,.js}`],
  migrations: [`${entitiesDir}/migrations/baseline/*{.ts,.js}`],
  migrationsTableName: 'typeorm_migrations',
});
