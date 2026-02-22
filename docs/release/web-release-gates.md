# Web Release Gates

Last updated: 2026-02-22
Owner: Engineering

## Defect Severity Policy

| Severity | Definition | Release Rule |
|---|---|---|
| P0 | Production outage, data loss, auth bypass, or core path unusable | Must be fixed before any release |
| P1 | Major feature break on core user flow with no reasonable workaround | Must be fixed before release candidate promotion |
| P2 | Partial degradation with workaround available | Can ship only with explicit owner sign-off and follow-up ticket |
| P3 | Cosmetic, low-impact, or non-blocking issues | Track and prioritize normally |

## Required Gate Checks

1. `pnpm typecheck` passes.
2. `pnpm test` passes.
3. `pnpm build` passes.
4. Web critical path matrix P0 flows pass.
5. Messaging/media regression suite passes (`apps/web/tests/e2e/messaging.spec.ts`) or a targeted delta subset is green for in-flight PR verification.
6. No open P0/P1 defects in web scope.
7. Rollback plan is validated for current release candidate.
8. Release notes include known limitations and mitigations.
9. Public beta hardening checklist is current: `docs/release/public-beta-hardening.md`.

## Release Candidate Promotion Rules

An RC can move to production only when:
- All required gate checks are green.
- At least one cross-browser pass exists for the current commit range.
- On-call owner is identified for first post-release monitoring window.

## Latest Execution Evidence (2026-02-22)

1. `pnpm check:web` -> PASS
2. `pnpm --filter @gratonite/web e2e -- tests/e2e/accessibility.spec.ts tests/e2e/channel-lifecycle.spec.ts tests/e2e/community-shop.spec.ts tests/e2e/visual.spec.ts` -> PASS (8/8)
3. `cd apps/web && PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/ms-playwright" pnpm exec playwright test tests/e2e/messaging.spec.ts -g "reorders DM list in realtime|switches own message avatar" --workers=1` -> PASS (2/2)
4. `cd apps/web && PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/ms-playwright" pnpm exec playwright test tests/e2e/visual.spec.ts --update-snapshots --workers=1` -> PASS (1/1)
5. `pnpm check:web` -> PASS
6. `cd apps/web && PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/ms-playwright" pnpm exec playwright test tests/e2e/accessibility.spec.ts tests/e2e/channel-lifecycle.spec.ts tests/e2e/community-shop.spec.ts tests/e2e/visual.spec.ts --workers=1` -> PASS (11/11)
7. `cd apps/web && PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/ms-playwright" pnpm exec playwright test tests/e2e/messaging.spec.ts -g "reorders DM list|switches own message avatar|clears pending attachments" --workers=1` -> PASS (3/3)
