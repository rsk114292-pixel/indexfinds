#!/bin/sh
set -eu

APP_DIR=${INDEXFINDS_APP_DIR:-/opt/indexfinds/app}
COMPOSE_ENV=${INDEXFINDS_COMPOSE_ENV:-/opt/indexfinds/env/compose.env}
BACKUP_DIR=${INDEXFINDS_BACKUP_DIR:-/opt/indexfinds/backups/daily}
BACKUP_REMOTE=${INDEXFINDS_BACKUP_REMOTE:?INDEXFINDS_BACKUP_REMOTE is required}
AGE_RECIPIENT=${INDEXFINDS_BACKUP_AGE_RECIPIENT:?INDEXFINDS_BACKUP_AGE_RECIPIENT is required}
LOCAL_RETENTION_DAYS=${INDEXFINDS_LOCAL_RETENTION_DAYS:-7}
REMOTE_RETENTION_DAYS=${INDEXFINDS_REMOTE_RETENTION_DAYS:-30}
COMPOSE_FILE="$APP_DIR/docker-compose.prod.yml"

for command in docker age rclone sha256sum; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "Required command is missing: $command" >&2
    exit 1
  }
done

test -f "$COMPOSE_FILE" || { echo "Missing $COMPOSE_FILE" >&2; exit 1; }
test -f "$COMPOSE_ENV" || { echo "Missing $COMPOSE_ENV" >&2; exit 1; }
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
base_name="indexfinds-postgres-$timestamp.dump"
plain_file="$BACKUP_DIR/$base_name"
encrypted_file="$plain_file.age"
checksum_file="$encrypted_file.sha256"

cleanup() {
  rm -f -- "$plain_file"
}
trap cleanup EXIT HUP INT TERM

cd "$APP_DIR"
docker compose --env-file "$COMPOSE_ENV" -f "$COMPOSE_FILE" \
  exec -T postgres sh -eu -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --compress=6 --no-owner --no-acl' \
  > "$plain_file"

test -s "$plain_file" || { echo 'pg_dump produced an empty file' >&2; exit 1; }
docker compose --env-file "$COMPOSE_ENV" -f "$COMPOSE_FILE" \
  exec -T postgres pg_restore --list - < "$plain_file" >/dev/null

age --recipient "$AGE_RECIPIENT" --output "$encrypted_file" "$plain_file"
test -s "$encrypted_file" || { echo 'age produced an empty file' >&2; exit 1; }
(
  cd "$BACKUP_DIR"
  sha256sum "$(basename "$encrypted_file")" > "$(basename "$checksum_file")"
)

rclone copyto "$encrypted_file" "$BACKUP_REMOTE/$(basename "$encrypted_file")"
rclone copyto "$checksum_file" "$BACKUP_REMOTE/$(basename "$checksum_file")"
rclone check "$BACKUP_DIR" "$BACKUP_REMOTE" \
  --include "$(basename "$encrypted_file")" --checksum --one-way

find "$BACKUP_DIR" -maxdepth 1 -type f \
  -name 'indexfinds-postgres-*.dump.age*' \
  -mtime "+$LOCAL_RETENTION_DAYS" -delete
rclone delete "$BACKUP_REMOTE" \
  --include 'indexfinds-postgres-*.dump.age*' \
  --min-age "${REMOTE_RETENTION_DAYS}d"

echo "Encrypted PostgreSQL backup uploaded and verified: $(basename "$encrypted_file")"
