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

## 2. Preview API

1. Add a DNS-only record for `api-next.indexfinds.com` pointing to the new VPS.
2. Install `Caddyfile.example` with `API_HOSTNAME=api-next.indexfinds.com`.
3. Temporarily add `https://api-next.indexfinds.com` to the preview Web environment and API CORS lists.
4. Verify `/health`, `/products`, `/platforms/active`, `/social-links`, uploads and authentication redirects.

## 3. Preview Web

Create a separate Vercel project rooted at `apps/web`. Do not relink or overwrite the project serving the old domain. Apply the values from `web.env.example`, replacing the API URL with `https://api-next.indexfinds.com` for preview.

Acceptance must cover desktop and mobile home, products, brands, categories, agent directory, comparison, product detail, login, email links and admin access.

## 4. Final cutover

1. Back up the current IndexFinds site configuration and DNS records.
2. Change the API hostname from `api-next.indexfinds.com` to `api.indexfinds.com` and verify TLS plus `/health`.
3. Restore the final URLs from the committed production templates and redeploy Web and API.
4. Bind `indexfinds.com` and `www.indexfinds.com` to the new Vercel project.
5. Smoke-test the public site before removing the old bindings.

## Rollback

Restore the saved apex and `www` DNS records, keep the isolated `indexfinds` containers intact for diagnosis, and do not delete either data set during the rollback window.
