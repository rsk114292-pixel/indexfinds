#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 FROM_PORT TO_PORT" >&2
  exit 2
fi

from_port="$1"
to_port="$2"
config="/www/server/panel/vhost/nginx/90-indexfinds-batch1-preview-origin.conf"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup="/root/.indexfinds-migration/nginx-backups/90-indexfinds-batch1-preview-origin.conf.pre-port-${from_port}-to-${to_port}-${stamp}"
nginx_bin="/www/server/nginx/sbin/nginx"
nginx_config="/www/server/nginx/conf/nginx.conf"
committed=0

cp -a "$config" "$backup"

rollback() {
  if [[ "$committed" -eq 0 ]]; then
    cp -a "$backup" "$config"
    "$nginx_bin" -t -c "$nginx_config" >/dev/null 2>&1 || true
    /etc/init.d/nginx reload >/dev/null 2>&1 || true
  fi
}
trap rollback ERR

CONFIG="$config" FROM_PORT="$from_port" TO_PORT="$to_port" python3 - <<'PY'
import os
from pathlib import Path

path = Path(os.environ["CONFIG"])
source = path.read_text(encoding="utf-8")
old = f"127.0.0.1:{os.environ['FROM_PORT']}"
new = f"127.0.0.1:{os.environ['TO_PORT']}"
count = source.count(old)
if count < 1:
    raise SystemExit(f"expected at least one {old} reference, found {count}")
path.write_text(source.replace(old, new), encoding="utf-8")
PY

"$nginx_bin" -t -c "$nginx_config"
/etc/init.d/nginx reload
committed=1
trap - ERR

printf '{"config":"%s","from_port":%s,"to_port":%s,"backup":"%s"}\n' \
  "$config" "$from_port" "$to_port" "$backup"
