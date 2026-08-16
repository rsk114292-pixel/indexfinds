# IndexFinds subsite category hub

This Worker replaces stale product catalogs on the 41 in-scope guide domains
with one shared eight-category directory. `xiangshoe.net` is deliberately not
included.

Every category link opens the matching live category on `indexfinds.com` and
adds the subsite domain, campaign and agent key as query parameters. Product
data is therefore maintained only by the main IndexFinds catalog.

## Local validation

```sh
pnpm install --frozen-lockfile
pnpm types
pnpm check
pnpm dev
```

Open `http://localhost:8787/?site=acbuyindex.com` to preview a specific site.
All old paths render the same directory, so historical `/spreadsheet/` and
product URLs no longer expose stale listings.

## Production safety

`wrangler.jsonc` contains apex and `www` routes for the 41 Cloudflare zones.
Running `pnpm deploy:production` will attach the Worker to those routes and
replace the existing subsite pages. Do not run it without an approved release,
a dry run and a rollback snapshot of the current route configuration.
