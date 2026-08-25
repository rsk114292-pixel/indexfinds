# Cloudflare edge records for the Hostinger migration

## USFans

- Public wrapper Worker: `favicon-fix-usfansindex-20260820`
- Origin service Worker: `usfansindex-net-production`
- Hostinger production Worker version: `70407ad9`
- Pre-migration Vercel Worker version: `09b088e1`
- Hostinger secret binding name: `HOSTINGER_TENANT_PROXY_SECRET`
- Rollback secret binding name: `INDEXFINDS_TENANT_PROXY_SECRET`

The secret values are intentionally not stored in Git. The public wrapper remains
unchanged so the existing favicon behavior and public Worker routes are preserved.
The origin Worker now forwards tenant-signed requests to `https://indexfinds.com`,
which reaches the Hostinger VPS through Cloudflare.

To roll back, activate Worker version `09b088e1`. If the Vercel custom domains are
still detached, the rollback continues to use the project's `.vercel.app` hostname.
