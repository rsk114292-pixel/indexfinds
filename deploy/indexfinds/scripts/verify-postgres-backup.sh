#!/bin/sh
set -eu

APP_DIR=${INDEXFINDS_APP_DIR:-/opt/indexfinds/app}
COMPOSE_ENV=${INDEXFINDS_COMPOSE_ENV:-/opt/indexfinds/env/compose.env}
BACKUP_DIR=${INDEXFINDS_BACKUP_DIR:-/opt/indexfinds/backups/daily}
BACKUP_REMOTE=${INDEXFINDS_BACKUP_REMOTE:?INDEXFINDS_BACKUP_REMOTE is required}
AGE_IDENTITY=${INDEXFINDS_BACKUP_AGE_IDENTITY:?INDEXFINDS_BACKUP_AGE_IDENTITY is required for restore verification}
COMPOSE_FILE="$APP_DIR/docker-compose.prod.yml"

for command in docker age rclone sha256sum; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "Required command is missing: $command" >&2
    exit 1
  }
done

mkdir -p "$BACKUP_DIR/verify"
chmod 700 "$BACKUP_DIR/verify"
latest=$(rclone lsf "$BACKUP_REMOTE" --files-only \
  --include 'indexfinds-postgres-*.dump.age' | sort | tail -n 1)
test -n "$latest" || { echo 'No remote PostgreSQL backup found' >&2; exit 1; }

encrypted_file="$BACKUP_DIR/verify/$latest"
checksum_file="$encrypted_file.sha256"
plain_file=${encrypted_file%.age}
cleanup() {
  rm -f -- "$encrypted_file" "$checksum_file" "$plain_file"
}
trap cleanup EXIT HUP INT TERM

rclone copyto "$BACKUP_REMOTE/$latest" "$encrypted_file"
rclone copyto "$BACKUP_REMOTE/$latest.sha256" "$checksum_file"
(
  cd "$BACKUP_DIR/verify"
  sha256sum --check "$(basename "$checksum_file")"
)
age --decrypt --identity "$AGE_IDENTITY" --output "$plain_file" "$encrypted_file"

cd "$APP_DIR"
docker compose --env-file "$COMPOSE_ENV" -f "$COMPOSE_FILE" \
  exec -T postgres pg_restore --list - < "$plain_file" >/dev/null

echo "Remote backup decrypted and catalog verified: $latest"
