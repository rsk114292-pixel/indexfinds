import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

let envLoaded = false;

function getEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim() !== '') {
      return value;
    }
  }

  return undefined;
}

function getNumberEnv(names: string[], fallback: number): number {
  const value = getEnv(...names);
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function loadScriptEnv(): void {
  if (envLoaded) {
    return;
  }

  dotenv.config({ path: resolve(process.cwd(), '.env') });
  envLoaded = true;
}

export function createScriptDataSource(
  overrides: Partial<PostgresConnectionOptions> = {},
): DataSource {
  loadScriptEnv();

  const options = {
    type: 'postgres',
    host: getEnv('DB_HOST') ?? 'localhost',
    port: getNumberEnv(['DB_PORT'], 5432),
    username: getEnv('DB_USER', 'DB_USERNAME') ?? 'postgres',
    password: getEnv('DB_PASSWORD') ?? 'postgres',
    database: getEnv('DB_NAME', 'DB_DATABASE') ?? 'lolobuyspreadsheets_dev',
    ssl:
      getEnv('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
    ...overrides,
  } satisfies PostgresConnectionOptions;

  return new DataSource(options);
}

export async function withScriptDataSource<T>(
  run: (dataSource: DataSource) => Promise<T>,
  overrides: Partial<PostgresConnectionOptions> = {},
): Promise<T> {
  const dataSource = createScriptDataSource(overrides);
  await dataSource.initialize();

  try {
    return await run(dataSource);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

export async function runScriptMain(
  name: string,
  run: () => Promise<void>,
): Promise<void> {
  try {
    loadScriptEnv();
    await run();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${name}失败:`, message);
    process.exit(1);
  }
}
