# 2026-02-22 Beta Scope Freeze (Hosting Cutover + First Testers)

Owner: Engineering  
Status: Active (scope frozen)  
Effective date: 2026-02-22

## Goal

Get the web app hosted on production infrastructure and ready to invite first beta testers with a fixed, non-expanding checklist.

## Freeze Rules

1. No new feature work enters this checklist without explicit owner approval.
2. Net-new ideas go to post-beta backlog only.
3. Current focus is web production readiness; desktop/mobile remain out of scope for this freeze.

## Must-Ship (Beta Critical)

1. `HOST-B1` Execute queue item 80:
   - First production-host cutover dry-run deployment on public hostname.
2. `HOST-B2` Run post-deploy smoke:
   - health, auth, DM realtime, guild realtime, attachment realtime/render, websocket upgrades.
3. `HOST-B3` Run voice smoke:
   - silent join, camera toggle state, screen-share tile presence.
4. `BETA-B1` Produce release evidence bundle:
   - `pnpm check:web` pass
   - core e2e pack pass
   - messaging delta pack pass
   - hosting smoke checklist pass
5. `BETA-B2` Controlled first tester invite wave:
   - small cohort, monitored window, rollback ready.

## Deferred to Post-Beta

1. Any additional UI/UX expansion beyond current shipped pass.
2. Desktop and mobile parity work.
3. Non-critical feature ideation and backlog growth.
4. Advanced optimization tasks not tied to beta stability.

## Done vs Remaining Mapping (from queue)

1. Completed from `docs/plans/2026-02-22-web-next-30-queue.md`:
   - All items (including `80`, completed on Hetzner after hosting-path change).
2. Remaining blockers:
   - none in queue blocker set.

## Freeze Progress (2026-02-22 update)

1. `WEB-B1` complete: queue item `14` done (file metadata validation + consistent error responses).
2. `WEB-B2` complete: queue item `15` done (desktop+mobile attachment URL safety regression in Playwright).
3. `WEB-B3` complete: queue item `16` done (DM send/list/typing contract coverage).
4. `WEB-B4` complete: queue item `17` done (attachment linking/retrieval contract coverage).
5. `WEB-B5` complete: queue item `19` done (latency alerting middleware + tests).
6. `HOST-B1` complete: local production-like preflight + public Hetzner cutover completed (`gratonite.chat`, `api.gratonite.chat`) with TLS and smoke evidence.

## Beta Exit Criteria

1. Queue blocker set is complete (including item `80`, executed on Hetzner instead of Oracle after hosting decision change).
2. Public-host dry-run/cutover is green with smoke evidence captured.
3. No open P0/P1 issues in web release scope.
4. Rollback plan validated and documented.
