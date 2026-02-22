# Web Recovery Plan (Execution Order Reset)

Date: 2026-02-21
Owner: Engineering
Priority order: Web -> Desktop -> Mobile

## Goal

Get the web app to a release-ready state first, with clear gates and predictable execution, without blocking on lower-priority desktop/mobile work.

## Current Baseline

- Root check commands are now web-first:
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm check:web`
- Deterministic local reset command:
  - `pnpm test:reset` (resets PostgreSQL schema + reapplies migrations)
- PR CI workflow added: `.github/workflows/pr-ci.yml`
- Web critical path matrix defined: `docs/qa/web-critical-path-matrix.md`
- Web release gates defined: `docs/release/web-release-gates.md`

## Execution Phases

## Phase A - Control Plane (Now)

1. Lock quality gates to web-first checks.
2. Keep desktop/mobile changes non-blocking for web release.
3. Maintain one active plan and one active board for priorities.

Definition of done:
- `pnpm check:web` is green on target branch.
- PR CI is running and stable.

Status: COMPLETE

## Phase B - Test Coverage (Next)

1. Add web E2E harness and first critical-path tests:
   - auth
   - guild/channel navigation
   - send/edit/delete message
2. Add deterministic test data setup/reset.
3. Add failure artifacts in CI (screenshots/traces/video).

Definition of done:
- All P0 critical-path flows automated and green.

Status: COMPLETE
Notes:
- Web E2E suite is passing (`pnpm e2e:web`) for auth + core messaging flows.
- Deterministic reset (`pnpm test:reset`) is in place and validated.
- CI artifact upload for failures is wired.

## Phase C - Reliability + Performance

1. Profile and fix slow render paths in message/channel/member surfaces.
2. Tune top API hotspots used by web critical paths.
3. Complete voice permission/retry hardening for browser reliability.

Definition of done:
- No open P0/P1 reliability bugs.
- Agreed perf budget met on baseline scenarios.

Status: IN PROGRESS
Completed in this phase:
- Message list virtualization + web profiling instrumentation.
- API slow-request logging.
- API hotspot index pass 1 (`messages` and `guild_members` hot read indexes).
- API hotspot pass 2 completed:
  - repeatable hotspot benchmark (`pnpm check:api-hotspots`)
  - staged-scale benchmark run
  - Redis cache + invalidation for guild/channel/member reads
  - request-scoped cache summary in slow-request logs
  - cache smoke regression check (`pnpm check:api-cache-smoke`)
  - CI job added for API Phase C checks
- Voice preflight hardening implemented:
  - media fallback/retry helper for device acquisition
  - microphone-first preflight for voice channels (camera optional)
  - improved media error mapping for user-facing reliability

Next in this phase:
1. Manual cross-browser validation for Safari and Zen is deferred to final beta cycle.
2. Any findings from final beta validation will be tracked as release-blocking only if P0/P1.

Status update:
- Engineering implementation + automated checks for Phase C are complete in this cycle.
- Remaining work is explicit manual browser QA, deferred by priority decision.

## Phase D - UI/UX Modernization

1. Introduce tokenized design system v2 behind a feature flag.
2. Redesign shell and messaging surfaces incrementally.
3. Validate accessibility and responsive behavior at each step.

Execution docs:
- Modernization blueprint: `docs/plans/2026-02-21-ui-ux-modernization-blueprint.md`
- Token architecture + theme manifest spec: `docs/design/2026-02-21-design-token-architecture.md`
- Sequenced backlog: `docs/plans/2026-02-21-web-ui-ux-backlog.md`

Definition of done:
- New UI has no core-flow regressions.
- Rollback path is tested and documented.

## Operating Rules

1. No release without `docs/release/web-release-gates.md` gates passing.
2. No scope expansion into desktop/mobile until web phase exit criteria pass.
3. Every new task must map to one critical-path flow or one release gate.
