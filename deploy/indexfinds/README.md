# IndexFinds parallel deployment runbook

This runbook deploys the new application without replacing the site currently served from `indexfinds.com`.

## Safety boundary

- Do not change the apex or `www` DNS records during preview deployment.
- Do not reuse the old `lolobuyspreadsheets` Compose project or its named volumes.
- Do not point `api.indexfinds.com` at the new API until `api-next.indexfinds.com` passes acceptance.
- Keep the old site and API available until the final cutover has been stable and rollback is no longer required.

## 1. Prepare the new VPS stack

1. Create `/opt/indexfinds/{app,env,data/uploads,data/hf-cache}`.
2. Copy `compose.env.example` to `/opt/indexfinds/env/compose.env` and replace placeholders.
3. Copy `api.env.example` to `/opt/indexfinds/env/api.env` and replace placeholders.
4. Validate the real files before starting containers:

   ```sh
   node deploy/indexfinds/check-production-env.mjs \
     /opt/indexfinds/env/compose.env \
     /opt/indexfinds/env/api.env \
     /path/to/web.env
   ```

5. Start the isolated stack:

   ```sh
   docker compose --env-file /opt/indexfinds/env/compose.env \
     -f docker-compose.prod.yml up -d --build
   ```

The API container runs TypeORM baseline migrations before starting the server.

## Administrator credential hardening

Treat every administrator password ever pasted into chat or a ticket as
compromised. Generate a unique 16-32 character password in a password manager;
do not put it on a command line or in shell history. On the VPS, read the new
password silently into an environment variable and run the compiled rotation
script in the API container. The script preserves the existing role, resets
lock state, and revokes every refresh session.

```sh
cd /opt/indexfinds/app
IFS= read -r -p 'Admin email: ' ix_admin_email
IFS= read -r -s -p 'New admin password: ' ix_admin_password
printf '\n'
export ADMIN_EMAIL="$ix_admin_email" ADMIN_PASSWORD="$ix_admin_password"
docker compose --env-file /opt/indexfinds/env/compose.env \
  -f docker-compose.prod.yml exec -T \
  -e ADMIN_EMAIL -e ADMIN_PASSWORD api \
  node dist/src/scripts/rotate-admin-password.js
docker compose --env-file /opt/indexfinds/env/compose.env \
  -f docker-compose.prod.yml restart api
unset ADMIN_EMAIL ADMIN_PASSWORD ix_admin_email ix_admin_password
```

When the administrator has a fixed public IP, set `ADMIN_ALLOWED_IPS` in
`/opt/indexfinds/env/api.env` before restarting the API. Verify the real client
IP in the login audit first; a wrong value will intentionally block all
administrator API calls. Password rotation and the allowlist are release-time
operations and must not be applied from a preview environment.

## Daily encrypted offsite database backup

Before production cutover, configure a storage account that is independent from
the VPS. The backup job requires `age` and `rclone`; the matching age private
identity must be retained outside the server.

1. Configure an rclone remote and verify that the VPS can write to it. For a
   bucket-scoped Cloudflare R2 token, run the interactive helper in a VPS
   terminal so the secret never appears in shell history:

   ```sh
   INDEXFINDS_R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com \
     deploy/indexfinds/scripts/configure-r2-credentials.sh
   ```

   The helper writes `/opt/indexfinds/env/rclone.conf` with mode `0600` and
   verifies private read/write/delete access to `indexfinds-postgres-backups`.
2. Install `backup.env.example` as `/opt/indexfinds/env/backup.env`, replace all
   placeholders, and set mode `0600`.
3. Install both scripts with mode `0750`, then install the service and timer
   from `deploy/indexfinds/systemd/` into `/etc/systemd/system/`.
4. Run one backup manually, then enable the daily timer:

   ```sh
   systemctl daemon-reload
   systemctl start indexfinds-postgres-backup.service
   journalctl -u indexfinds-postgres-backup.service --no-pager
   systemctl enable --now indexfinds-postgres-backup.timer
   systemctl list-timers indexfinds-postgres-backup.timer
   ```

The job creates a PostgreSQL custom dump, validates its catalog, encrypts it,
uploads the encrypted dump plus checksum, and verifies the remote copy. Local
copies default to 7 days and remote copies to 30 days. Run
`verify-postgres-backup.sh` with an offline/private age identity during a
scheduled restore drill; at least monthly, restore into a temporary PostgreSQL
database and record the result rather than relying only on `pg_restore --list`.

### Next.js image cache maintenance

The shared web containers can accumulate a large on-disk image optimizer cache.
Install `scripts/prune-next-image-cache.sh` as
`/usr/local/sbin/indexfinds-prune-next-image-cache`, then install and enable the
matching service and timer from `systemd/`. The timer removes only optimized
image cache files older than 12 hours from running `indexfinds-web-*`
containers. It does not touch source images, uploads, databases, or Docker
volumes.

## 2. Preview API

1. Add a DNS-only record for `api-next.indexfinds.com` pointing to the new VPS.
2. Install `Caddyfile.example` with `API_HOSTNAME=api-next.indexfinds.com`.
3. Temporarily add `https://api-next.indexfinds.com` to the preview Web environment and API CORS lists.
4. Verify `/health`, `/products`, `/platforms/active`, `/social-links`, uploads and authentication redirects.

## 3. Preview Web

Create a separate Vercel project rooted at `apps/web`. Do not relink or overwrite the project serving the old domain. Apply the values from `web.env.example`, replacing the API URL with `https://api-next.indexfinds.com` for preview.

Acceptance must cover desktop and mobile home, products, brands, categories, agent directory, comparison, product detail, login, email links and admin access.

Before promoting the preview, confirm these release gates:

- Keep `PUBLIC_REGISTRATION_ENABLED` and
  `NEXT_PUBLIC_REGISTRATION_ENABLED` identical. Leave both `false` until new
  account creation is intentionally reopened.
- Verify a disabled or pending product slug returns an HTTP 404, not only a
  rendered not-found screen.
- Confirm `/public/stats` matches the active product count and that the product
  sitemap contains only public slugs.
- Send a real password-reset email from the production sender domain before
  exposing the forgot-password link.
- Review administrator login logs, use a unique password, and enable the IP
  allowlist when the operator has a stable public IP.
- Keep at least 20% disk space free, verify the daily R2 object and checksum,
  and record a restore drill separately from ordinary deployment.

## 4. Final cutover

1. Back up the current IndexFinds site configuration and DNS records.
2. Change the API hostname from `api-next.indexfinds.com` to `api.indexfinds.com` and verify TLS plus `/health`.
3. Restore the final URLs from the committed production templates and redeploy Web and API.
4. Bind `indexfinds.com` and `www.indexfinds.com` to the new Vercel project.
5. Smoke-test the public site before removing the old bindings.

## Rollback

Restore the saved apex and `www` DNS records, keep the isolated `indexfinds` containers intact for diagnosis, and do not delete either data set during the rollback window.
