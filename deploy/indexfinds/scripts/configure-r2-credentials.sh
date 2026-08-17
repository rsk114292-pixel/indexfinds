#!/bin/sh
set -eu

CONFIG_PATH=${RCLONE_CONFIG:-/opt/indexfinds/env/rclone.conf}
REMOTE_NAME=${INDEXFINDS_R2_REMOTE_NAME:-r2-indexfinds}
BUCKET_NAME=${INDEXFINDS_R2_BUCKET:-indexfinds-postgres-backups}
ENDPOINT=${INDEXFINDS_R2_ENDPOINT:?INDEXFINDS_R2_ENDPOINT is required}

for command in rclone mktemp cmp; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "Required command is missing: $command" >&2
    exit 1
  }
done

test -t 0 || {
  echo 'Run this script in an interactive terminal.' >&2
  exit 1
}

printf 'R2 Access Key ID: '
IFS= read -r access_key_id
printf 'R2 Secret Access Key: '
trap 'stty echo 2>/dev/null || true' 0 1 2 15
stty -echo
IFS= read -r secret_access_key
stty echo
trap - 0 1 2 15
printf '\n'

test -n "$access_key_id" || { echo 'Access Key ID is required.' >&2; exit 1; }
test -n "$secret_access_key" || { echo 'Secret Access Key is required.' >&2; exit 1; }

config_dir=$(dirname "$CONFIG_PATH")
install -d -m 700 "$config_dir"
config_tmp=$(mktemp "$config_dir/.rclone.conf.XXXXXX")
probe_local=$(mktemp /tmp/indexfinds-r2-probe.XXXXXX)
probe_remote="$REMOTE_NAME:$BUCKET_NAME/.indexfinds-backup-write-check"

cleanup() {
  rm -f -- "$config_tmp" "$probe_local" "${probe_local}.downloaded"
  unset access_key_id secret_access_key
}
trap cleanup 0 1 2 15

umask 077
{
  printf '[%s]\n' "$REMOTE_NAME"
  printf 'type = s3\n'
  printf 'provider = Cloudflare\n'
  printf 'access_key_id = %s\n' "$access_key_id"
  printf 'secret_access_key = %s\n' "$secret_access_key"
  printf 'endpoint = %s\n' "$ENDPOINT"
  printf 'acl = private\n'
  printf 'no_check_bucket = true\n'
} > "$config_tmp"
chmod 600 "$config_tmp"
mv -f -- "$config_tmp" "$CONFIG_PATH"
chmod 600 "$CONFIG_PATH"

printf 'indexfinds-r2-write-check\n' > "$probe_local"
rclone --config "$CONFIG_PATH" copyto "$probe_local" "$probe_remote"
rclone --config "$CONFIG_PATH" copyto \
  "$probe_remote" "${probe_local}.downloaded"
cmp "$probe_local" "${probe_local}.downloaded"
rclone --config "$CONFIG_PATH" deletefile "$probe_remote"

echo "R2 credentials verified for private bucket: $BUCKET_NAME"
