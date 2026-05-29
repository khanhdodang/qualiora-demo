# Qualiora Checkout E2E (demo)

Playwright tests for the **Qualiora Checkout Platform** demo project (`DEMO`). Each spec maps to a Qualiora test case via `@DEMO-TC-xxxx` in the test title.

Qualiora ingests CI results through the [automation import API](https://github.com/khanhdodang/qa-management-app/blob/main/documents/delivery/content/integrations/automation-api-guide.md) — this repo does not run tests inside Qualiora.

## Quick start

```bash
npm ci
npx playwright install chromium
npm test
```

Tests serve static checkout fixtures from `fixtures/checkout/` on `http://127.0.0.1:4173`.

## Test case mapping

| Spec | Qualiora code | Requirement theme |
| ---- | ------------- | ------------------- |
| `tests/checkout/tc-0001.spec.ts` | `DEMO-TC-0001` | Sign in with email/password |
| `tests/checkout/tc-0002.spec.ts` | `DEMO-TC-0002` | Guest checkout |
| `tests/checkout/tc-0003.spec.ts` | `DEMO-TC-0003` | Valid promo code |
| `tests/checkout/tc-0004.spec.ts` | `DEMO-TC-0004` | Reject expired promo |
| `tests/checkout/tc-0005.spec.ts` | `DEMO-TC-0005` | Card payment |
| `tests/checkout/tc-0006.spec.ts` | `DEMO-TC-0006` | Order summary |

UUID fallbacks live in `qualiora-map.json` (aligned with Qualiora demo seed).

## Link in Qualiora

1. Open **Administration → Project settings → Automation repository**
2. Set repository URL to this repo, framework `playwright`, branch `main`
3. Seeded demo project (`DEMO`) already links the first six test cases to `tests/checkout/tc-0001.spec.ts` … `tc-0006.spec.ts`

## Import results from CI

Run tests first — every `npm test` writes `test-results/results.json`. Then push results to Qualiora:

```bash
npm test

export QUALIORA_API_URL=http://localhost:3000
export QUALIORA_CI_EMAIL=demo@qualiora.ai
export QUALIORA_CI_PASSWORD='demo!123'
export QUALIORA_PROJECT_KEY=DEMO
export QUALIORA_ENVIRONMENT_ID=44444444-0000-4000-8000-000000000005
npm run import:qualiora
```

Or combine both steps:

```bash
# same env vars as above
npm run test:import
```

### GitHub Actions secrets

| Secret | Example |
| ------ | ------- |
| `QUALIORA_API_URL` | `https://app.qualiora.ai` or staging URL |
| `QUALIORA_CI_EMAIL` | `demo@qualiora.ai` |
| `QUALIORA_CI_PASSWORD` | Demo user password |
| `QUALIORA_ENVIRONMENT_ID` | Staging env UUID (`STG` in demo seed) |

Import runs only when `QUALIORA_CI_PASSWORD` is configured.

## Related

- [Qualiora test case ID mapping](https://github.com/khanhdodang/qa-management-app/blob/main/documents/delivery/content/integrations/test-case-id-mapping.md)
- [Playwright quick-start](https://github.com/khanhdodang/qa-management-app/blob/main/documents/delivery/content/integrations/playwright-quickstart.md)
