# Web Beta Gate Review

Date: 2026-02-22  
Owner: Engineering

## Gate Summary

1. Typecheck/build/test release checks: PASS
2. Critical web hardening suites (a11y/channel lifecycle/community shop/visual): PASS
3. Messaging/media regression suite (guild send, DM send, attachment URL safety): PASS
4. P0/P1 regressions discovered in this pass: none
5. Recommendation: READY for controlled beta invite, with listed caveats

## Command Evidence

1. `pnpm check:web`
   - PASS (typecheck, API tests, web build)
2. `pnpm --filter @gratonite/web e2e -- tests/e2e/accessibility.spec.ts tests/e2e/channel-lifecycle.spec.ts tests/e2e/community-shop.spec.ts tests/e2e/visual.spec.ts`
   - PASS (8/8)
3. `pnpm --filter @gratonite/web e2e -- tests/e2e/messaging.spec.ts`
   - PASS (5/5)
4. `cd apps/web && PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/ms-playwright" pnpm exec playwright test tests/e2e/messaging.spec.ts -g "reorders DM list in realtime|switches own message avatar" --workers=1`
   - PASS (2/2) for new WEB-039/WEB-053 delta coverage
5. `cd apps/web && PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/ms-playwright" pnpm exec playwright test tests/e2e/accessibility.spec.ts --workers=1`
   - PASS (3/3), including portal gallery keyboard-only navigation checks
6. `cd apps/web && PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/ms-playwright" pnpm exec playwright test tests/e2e/visual.spec.ts --update-snapshots --workers=1`
   - PASS (1/1), composer-attachment baseline added
7. `pnpm check:web`
   - PASS
8. `cd apps/web && PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/ms-playwright" pnpm exec playwright test tests/e2e/accessibility.spec.ts tests/e2e/channel-lifecycle.spec.ts tests/e2e/community-shop.spec.ts tests/e2e/visual.spec.ts --workers=1`
   - PASS (11/11), includes portal-gallery pass-2 and voice-control harness coverage
9. `cd apps/web && PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/ms-playwright" pnpm exec playwright test tests/e2e/messaging.spec.ts -g "reorders DM list|switches own message avatar|clears pending attachments" --workers=1`
   - PASS (3/3), includes composer clear-all regression

## Known Issues / Caveats

1. Screen-reader walkthrough still needs manual capture for full WEB-028 completion.
2. Cross-browser voice validation (Safari/Zen) remains deferred by roadmap priority decision.
3. Motion preferences are enforced at runtime (`data-theme-motion`) but user-facing settings controls for motion toggles are not yet exposed in Appearance.

## Risk Register

1. Risk: missed screen-reader label/navigation regressions on untested surfaces.
   - Severity: P1 if discovered on critical path.
   - Mitigation: complete manual SR walkthrough before expanding beta cohort.
2. Risk: browser-specific media edge cases in deferred Safari/Zen validation.
   - Severity: P1 for voice-heavy beta users.
   - Mitigation: keep browser support expectations explicit in beta notes and prioritize targeted follow-up.
3. Risk: runtime telemetry currently logs to console only.
   - Severity: P2.
   - Mitigation: route marker outputs into persisted analytics pipeline before GA.

## Beta Invitation Guardrail

1. Start with controlled invite batch.
2. Monitor auth, channel navigation, messaging, and settings/profile flows for first 48 hours.
3. Do not scale beta cohort until manual SR walkthrough is recorded and reviewed.
