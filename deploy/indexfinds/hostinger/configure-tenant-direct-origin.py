#!/usr/bin/env python3
"""Point selected Hostinger tenant vhosts at the shared IndexFinds containers.

The script creates an exact backup before replacing any vhost, validates the
complete Nginx configuration, and restores every changed file automatically if
validation fails. Use ``--restore-dir`` with the emitted backup directory for
an explicit rollback.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


VHOST_ROOT = Path("/www/server/panel/vhost/nginx")
BACKUP_ROOT = Path("/root/.indexfinds-migration/nginx-backups")
NGINX = Path("/www/server/nginx/sbin/nginx")
NGINX_CONFIG = Path("/www/server/nginx/conf/nginx.conf")


def nginx_test() -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(NGINX), "-t", "-c", str(NGINX_CONFIG)],
        text=True,
        capture_output=True,
        check=False,
    )


def nginx_reload() -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["/etc/init.d/nginx", "reload"],
        text=True,
        capture_output=True,
        check=False,
    )


def extract_required(pattern: str, source: str, label: str) -> str:
    match = re.search(pattern, source, re.MULTILINE)
    if not match:
        raise ValueError(f"Could not find {label} in existing vhost")
    return match.group(1)


def render_vhost(
    domain: str,
    existing: str,
    web_port: int,
    api_port: int,
    certificate: str | None = None,
    certificate_key: str | None = None,
) -> str:
    if (certificate is None) != (certificate_key is None):
        raise ValueError("Certificate and certificate key must be supplied together")
    if certificate is None:
        certificate = extract_required(
            r"\bssl_certificate\s+([^;]+);", existing, "ssl_certificate"
        )
        certificate_key = extract_required(
            r"\bssl_certificate_key\s+([^;]+);", existing, "ssl_certificate_key"
        )
    for certificate_path in (certificate, certificate_key):
        if not Path(certificate_path).is_file():
            raise ValueError(f"Missing certificate file: {certificate_path}")

    include_match = re.search(
        r"^\s*(include\s+[^;]*well-known[^;]*;)", existing, re.MULTILINE
    )
    include_line = f"    {include_match.group(1)}\n" if include_match else ""
    document_root = f"/www/indexfinds-production/wwwroot/{domain}"
    cache_name = re.sub(r"[^A-Za-z0-9]", "", domain).upper()[:20] + "SSL"
    tls = f"""    ssl_certificate {certificate};
    ssl_certificate_key {certificate_key};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
"""
    proxy_headers = """        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 443;
        proxy_set_header Connection "";
        proxy_read_timeout 90s;
"""
    return f"""# Managed by configure-tenant-direct-origin.py.
# The previous complete vhost is stored in the deployment backup directory.
server {{
    listen 80;
    server_name {domain} www.{domain};

{include_line}    location ^~ /.well-known/acme-challenge/ {{
        root {document_root};
        allow all;
    }}

    location / {{
        return 308 https://{domain}$request_uri;
    }}
}}

server {{
    listen 443 ssl;
    http2 on;
    server_name www.{domain};

{tls}
    return 308 https://{domain}$request_uri;
}}

server {{
    listen 443 ssl;
    http2 on;
    server_name {domain};

{tls}    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:{cache_name}:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;

    client_max_body_size 20m;
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location = /api/revalidate {{
        proxy_pass http://127.0.0.1:{web_port};
{proxy_headers}    }}

    location ^~ /api/ {{
        proxy_pass http://127.0.0.1:{api_port}/;
{proxy_headers}    }}

    location / {{
        proxy_pass http://127.0.0.1:{web_port};
{proxy_headers}    }}
}}
"""


def atomic_write(path: Path, content: str, mode: int) -> None:
    temporary = path.with_suffix(path.suffix + ".indexfinds-new")
    temporary.write_text(content, encoding="utf-8")
    os.chmod(temporary, mode)
    os.replace(temporary, path)


def restore(backup_dir: Path) -> None:
    manifest_path = backup_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    restored = []
    for entry in manifest["files"]:
        target = Path(entry["target"])
        source = backup_dir / entry["backup_name"]
        shutil.copy2(source, target)
        restored.append(str(target))
    test = nginx_test()
    if test.returncode:
        raise RuntimeError(f"Restored config failed validation: {test.stderr}")
    reload_result = nginx_reload()
    if reload_result.returncode:
        raise RuntimeError(f"Nginx reload failed after restore: {reload_result.stderr}")
    print(json.dumps({"mode": "restore", "backup_dir": str(backup_dir), "restored": restored}))


def deploy(
    domains: list[str],
    web_port: int,
    api_port: int,
    certificate: str | None,
    certificate_key: str | None,
) -> None:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_dir = BACKUP_ROOT / f"tenant-direct-{timestamp}"
    backup_dir.mkdir(parents=True, exist_ok=False)
    entries = []
    replacements = []
    try:
        for domain in domains:
            if not re.fullmatch(r"[a-z0-9.-]+", domain):
                raise ValueError(f"Invalid domain: {domain}")
            target = VHOST_ROOT / f"{domain}.conf"
            if not target.is_file():
                raise FileNotFoundError(f"Missing vhost: {target}")
            existing = target.read_text(encoding="utf-8")
            backup_name = target.name
            shutil.copy2(target, backup_dir / backup_name)
            entries.append(
                {
                    "domain": domain,
                    "target": str(target),
                    "backup_name": backup_name,
                }
            )
            replacements.append(
                (
                    target,
                    render_vhost(
                        domain,
                        existing,
                        web_port,
                        api_port,
                        certificate,
                        certificate_key,
                    ),
                    target.stat().st_mode,
                )
            )
        manifest = {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "web_port": web_port,
            "api_port": api_port,
            "certificate": certificate,
            "certificate_key": certificate_key,
            "files": entries,
        }
        (backup_dir / "manifest.json").write_text(
            json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
        )
        for target, content, mode in replacements:
            atomic_write(target, content, mode)
        test = nginx_test()
        if test.returncode:
            raise RuntimeError(test.stderr.strip() or test.stdout.strip())
        reload_result = nginx_reload()
        if reload_result.returncode:
            raise RuntimeError(
                reload_result.stderr.strip() or reload_result.stdout.strip()
            )
    except Exception:
        for entry in entries:
            source = backup_dir / entry["backup_name"]
            target = Path(entry["target"])
            if source.is_file():
                shutil.copy2(source, target)
        nginx_test()
        nginx_reload()
        raise
    print(
        json.dumps(
            {
                "mode": "deploy",
                "backup_dir": str(backup_dir),
                "domains": domains,
                "web_port": web_port,
                "api_port": api_port,
            }
        )
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--domains", nargs="+")
    parser.add_argument("--web-port", type=int, default=3132)
    parser.add_argument("--api-port", type=int, default=4101)
    parser.add_argument("--certificate")
    parser.add_argument("--certificate-key")
    parser.add_argument("--restore-dir", type=Path)
    args = parser.parse_args()
    if args.restore_dir:
        restore(args.restore_dir)
        return
    if not args.domains:
        parser.error("--domains is required unless --restore-dir is used")
    deploy(
        args.domains,
        args.web_port,
        args.api_port,
        args.certificate,
        args.certificate_key,
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise
