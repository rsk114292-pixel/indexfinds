#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const allowPlaceholders = process.argv.includes('--allow-placeholders');
const files = process.argv.slice(2).filter((value) => value !== '--allow-placeholders');

if (files.length !== 3) {
  console.error(
    'Usage: node deploy/indexfinds/check-production-env.mjs [--allow-placeholders] <compose.env> <api.env> <web.env>',
  );
  process.exit(2);
}

function parseEnv(file) {
  const parsed = new Map();
  for (const rawLine of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    parsed.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  return parsed;
}

const [composeFile, apiFile, webFile] = files;
const compose = parseEnv(composeFile);
const api = parseEnv(apiFile);
const web = parseEnv(webFile);
const errors = [];

const required = new Map([
  [composeFile, [
    'COMPOSE_PROJECT_NAME', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB',
    'REDIS_PASSWORD', 'MEILISEARCH_API_KEY', 'API_ENV_FILE', 'UPLOADS_HOST_PATH',
    'HF_CACHE_HOST_PATH', 'CORS_ALLOWED_ORIGINS',
  ]],
  [apiFile, [
    'NODE_ENV', 'PORT', 'SITE_NAME', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD',
    'DB_NAME', 'REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD', 'JWT_SECRET',
    'OAUTH_ENCRYPTION_KEY', 'FRONTEND_URL', 'SITE_URL', 'API_URL', 'CORS_ORIGIN',
    'TRUST_PROXY', 'PUBLIC_REGISTRATION_ENABLED', 'REVALIDATE_SECRET',
    'REFERRAL_TRACKING_SECRET', 'MEILISEARCH_HOST',
    'MEILISEARCH_API_KEY', 'SEARCH_ENGINE', 'EMBEDDING_SERVICE_URL', 'UPLOADS_PATH',
    'RESEND_API_KEY', 'EMAIL_FROM', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',
  ]],
  [webFile, [
    'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SITE_NAME',
    'NEXT_PUBLIC_APP_NAME', 'NEXT_PUBLIC_AUTH_ENTRY_ENABLED',
    'NEXT_PUBLIC_REGISTRATION_ENABLED', 'NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_API_HOSTNAME',
    'NEXT_PUBLIC_CONTACT_EMAIL', 'NEXT_PUBLIC_PRIVACY_EMAIL', 'NEXT_PUBLIC_LEGAL_EMAIL',
    'REVALIDATE_SECRET', 'REFERRAL_TRACKING_SECRET',
  ]],
]);

for (const [file, keys] of required) {
  const values = file === composeFile ? compose : file === apiFile ? api : web;
  for (const key of keys) {
    if (!values.get(key)) errors.push(`${basename(file)}: missing ${key}`);
  }
}

const allEntries = [...compose, ...api, ...web];
if (!allowPlaceholders) {
  for (const [key, value] of allEntries) {
    if (/REPLACE_WITH|change_me|your_|xxxx/i.test(value)) {
      errors.push(`${key}: placeholder value has not been replaced`);
    }
  }
}

for (const [key, value] of allEntries) {
  if (/lolobuyspreadsheets\.com/i.test(value) && key !== 'TRAFFIC_OWNED_DOMAINS') {
    errors.push(`${key}: old public domain is not allowed here`);
  }
}

const urlChecks = [
  [api, 'FRONTEND_URL', 'https://indexfinds.com'],
  [api, 'SITE_URL', 'https://indexfinds.com'],
  [api, 'API_URL', 'https://api.indexfinds.com'],
  [web, 'NEXT_PUBLIC_SITE_URL', 'https://indexfinds.com'],
  [web, 'NEXT_PUBLIC_APP_URL', 'https://indexfinds.com'],
  [web, 'NEXT_PUBLIC_API_URL', 'https://api.indexfinds.com'],
];
for (const [values, key, expected] of urlChecks) {
  if (values.get(key) !== expected) errors.push(`${key}: expected ${expected}`);
}

if (api.get('NODE_ENV') !== 'production') errors.push('NODE_ENV: expected production');
if (api.get('DB_HOST') !== 'postgres') errors.push('DB_HOST: expected postgres');
if (api.get('REDIS_HOST') !== 'redis') errors.push('REDIS_HOST: expected redis');
if (api.get('MEILISEARCH_HOST') !== 'http://meilisearch:7700') {
  errors.push('MEILISEARCH_HOST: expected Docker service URL');
}
if (api.get('EMBEDDING_SERVICE_URL') !== 'http://embedding-service:8001') {
  errors.push('EMBEDDING_SERVICE_URL: expected Docker service URL');
}
if (api.get('REVALIDATE_SECRET') !== web.get('REVALIDATE_SECRET')) {
  errors.push('REVALIDATE_SECRET: API and Web values must match');
}
if (api.get('REFERRAL_TRACKING_SECRET') !== web.get('REFERRAL_TRACKING_SECRET')) {
  errors.push('REFERRAL_TRACKING_SECRET: API and Web values must match');
}

for (const [values, key] of [
  [api, 'PUBLIC_REGISTRATION_ENABLED'],
  [web, 'NEXT_PUBLIC_AUTH_ENTRY_ENABLED'],
  [web, 'NEXT_PUBLIC_REGISTRATION_ENABLED'],
]) {
  if (!['true', 'false'].includes(values.get(key))) {
    errors.push(`${key}: expected true or false`);
  }
}
if (
  api.get('PUBLIC_REGISTRATION_ENABLED') !==
  web.get('NEXT_PUBLIC_REGISTRATION_ENABLED')
) {
  errors.push('Public registration flags must match between API and Web');
}
if (
  web.get('NEXT_PUBLIC_REGISTRATION_ENABLED') === 'true' &&
  web.get('NEXT_PUBLIC_AUTH_ENTRY_ENABLED') !== 'true'
) {
  errors.push('NEXT_PUBLIC_AUTH_ENTRY_ENABLED must be true when registration is enabled');
}

if (errors.length) {
  console.error(`Production environment check failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Production environment structure is valid.');
