import 'reflect-metadata';
import dataSource from '../../data-source';

async function main() {
  const [, , referralCode, productId] = process.argv;

  if (!referralCode || !productId) {
    console.error(
      'Usage: ts-node -r tsconfig-paths/register src/scripts/report-anti-fraud-metrics.ts <referralCode> <productId>',
    );
    process.exit(1);
  }

  await dataSource.initialize();

  try {
    const rows = await dataSource.query(
      `
        WITH code_row AS (
          SELECT id
          FROM referral_codes
          WHERE code = $1
          LIMIT 1
        ),
        referral AS (
          SELECT
            COUNT(*)::int AS "rawClicks",
            COUNT(
              DISTINCT CONCAT_WS(
                '|',
                c."referralCodeId"::text,
                COALESCE(
                  NULLIF(c."sessionId", ''),
                  NULLIF(c.ip, ''),
                  c."referralCodeId"::text
                ),
                COALESCE(
                  NULLIF(c."landingPage", ''),
                  NULLIF(c."redirectTo", ''),
                  '/'
                ),
                FLOOR(EXTRACT(EPOCH FROM c."createdAt") / 1800)::bigint
              )
            )::int AS "trustedClicks"
          FROM referral_clicks c
          INNER JOIN code_row cr ON cr.id = c."referralCodeId"
        ),
        product_events AS (
          SELECT
            COUNT(*) FILTER (WHERE e."eventType" = 'view')::int AS "trustedViews",
            COUNT(*) FILTER (WHERE e."eventType" = 'click')::int AS "trustedProductClicks"
          FROM product_interaction_events e
          WHERE e."productId" = $2
        ),
        outbound AS (
          SELECT
            COUNT(*)::int AS "rawOutbound",
            COUNT(
              DISTINCT CONCAT_WS(
                '|',
                COALESCE(
                  CAST(o."userId" AS text),
                  NULLIF(o.device_id, ''),
                  NULLIF(o."sessionId", ''),
                  NULLIF(o.visit_id, ''),
                  'anon'
                ),
                o."productId",
                o."platformType",
                COALESCE(o."pagePath", o."pageType", ''),
                FLOOR(EXTRACT(EPOCH FROM o."createdAt") / 600)::bigint
              )
            )::int AS "trustedOutbound"
          FROM outbound_clicks o
          WHERE o."productId" = $2
        )
        SELECT row_to_json(t) AS payload
        FROM (
          SELECT
            referral."rawClicks",
            referral."trustedClicks",
            product_events."trustedViews",
            product_events."trustedProductClicks",
            outbound."rawOutbound",
            outbound."trustedOutbound"
          FROM referral, product_events, outbound
        ) t
      `,
      [referralCode, productId],
    );

    console.log(JSON.stringify(rows[0]?.payload ?? null, null, 2));
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
