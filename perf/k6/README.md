# Referral Anti-Fraud Verification

This folder contains a replay-style k6 script for validating that trusted
analytics paths stay stable under repeated hits from the same visitor/IP.

## Script

- `referral-anti-fraud.js`

It replays the same visitor through:

1. `POST /referral/track-click`
2. `POST /products/:id/view`
3. `POST /outbound/click`

The script pins:

- one `mf_vid`
- one forwarded IP
- one user-agent
- one referer

This is intentional. It simulates the exact pattern that should collapse into
deduped trusted metrics instead of inflating them linearly.

## Run

```bash
k6 run perf/k6/referral-anti-fraud.js \
  -e BASE_URL=http://127.0.0.1:3001 \
  -e REFERRAL_CODE=V9ARNU \
  -e PRODUCT_ID=00000000-0000-4000-8000-000000000001
```

Optional environment variables:

- `FIXED_IP`
- `FIXED_VISITOR_ID`
- `USER_AGENT`
- `REFERER`
- `PLATFORM_URL`

## Expected Behavior

Under this replay load:

- request success rate should stay high
- trusted metrics should increase much slower than raw events
- repeated hits from the same visitor should mostly collapse into deduped counts
- referral alerts may fire if the replay is intense enough

## How To Check Results

Use the admin analytics pages after the run:

- referral analytics: verify `可信点击` grows much slower than `原始点击`
- click analytics: verify `可信外跳` grows much slower than `原始外跳事件`
- traffic analytics: verify suspicious/duplicate counts rise

If you want direct database verification, compare:

- `referral_clicks` raw rows
- deduped referral click fingerprints
- `product_interaction_events` trusted rows
- `outbound_clicks` raw rows vs deduped analytics output

## Notes

- This is a verification script, not a benchmark for absolute production
  throughput.
- Run it against staging or a local production-like stack, not `watch` mode.
