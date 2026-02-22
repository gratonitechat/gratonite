# Web Finalization Queue (Feature + Hardening + QA + Perf)

Date: 2026-02-22  
Priority order: Web only

## Completed This Pass

1. WEB-031 Guild card media controls
   - media fit toggle (fill/fit)
   - animated banner toggle with persistence
   - deterministic fallback policy and badges
   - e2e coverage added
2. WEB-036 pass 2 hardening
   - moderator guardrails + transition enforcement
   - rejection reason-code taxonomy and validation
   - schema/service tests added
3. WEB-040 foundation + WEB-041 pass 1
   - deterministic 2D sprite renderer and local model
   - profile/settings integration toggle with fallback avatar preserved
   - starter wearable catalog and slot-based equip persistence
4. WEB-041 pass 2 + WEB-042 scaffold
   - wardrobe card previews and hover interactions
   - soft-currency wallet and ledger tables + API routes
   - reward claim throttling and settings wallet surface
5. WEB-042 hardening pass
   - daily earn caps + source-specific dedupe windows
   - spend endpoint and insufficient-funds checks
   - auditor-only ledger drilldown route and tests
6. WEB-036 + WEB-027 integration gates
   - community-shop e2e lifecycle test unskipped and passing
   - visual baseline suite implemented with snapshot command
7. Release-hardening sweep + beta gate review
   - command evidence rerun on 2026-02-22 (`pnpm check:web`, critical-path e2e bundle)
   - beta readiness review documented in `docs/release/web-beta-gate-2026-02-22.md`

## In Progress

1. WEB-028 Accessibility conformance pass
   - keyboard smoke e2e implemented
   - checklist authored
   - contrast + reduced-motion evidence added
   - Remaining: manual screen reader walkthrough capture

2. WEB-029 Performance guardrails
   - budgets documented
   - build-size evidence captured via `pnpm check:web`
   - runtime marker expansion for animation/paint telemetry implemented

## Queued Execution Steps

1. Manual accessibility verification evidence (screen reader walkthrough)

## Exit Criteria Before Beta Invite

1. All web critical-path tests green on fresh environment.
2. No open P0/P1 defects for auth, messaging, channels, settings, or profile customization.
3. Visual regression, accessibility, and performance gates passing.
4. Feature flags and rollback notes documented in `docs/release/`.
