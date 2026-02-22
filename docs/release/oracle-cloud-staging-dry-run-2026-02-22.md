# Oracle Staging Dry-Run Evidence

Date: 2026-02-22  
Owner: Engineering  
Status: In progress (OCI-hostname execution pending)

Superseded note (2026-02-22): hosting provider changed to Hetzner before OCI execution. Final public cutover evidence is tracked in `docs/release/hetzner-cutover-evidence-2026-02-22.md`.

## Objective

Execute queue item `80` (first Oracle Cloud dry-run deployment on staging hostname) with a production-like preflight and record remaining OCI-only blockers.

## Executed Preflight (local production-like stack)

1. Infrastructure started via Docker Compose:
   - `postgres`, `redis`, `minio`, `livekit`, `coturn` all running.
2. Database migrations:
   - `pnpm db:migrate` -> PASS.
3. API smoke:
   - `API_BASE_URL="http://127.0.0.1:4000" ./scripts/checks/api-prod-smoke.sh` -> PASS.
4. API contract smoke:
   - `API_BASE_URL="http://127.0.0.1:4000" ./scripts/checks/api-contract-smoke.sh` -> PASS.
5. Focused realtime/media/voice E2E pack:
   - `cd apps/web && pnpm exec playwright test tests/e2e/messaging.spec.ts tests/e2e/channel-lifecycle.spec.ts -g "delivers DM messages in realtime across two active clients|delivers DM attachment messages in realtime across two active clients|delivers guild attachment messages in realtime across two active clients|shows DM typing indicator using display name across active clients|uploads an attachment and sends it in a message|keeps attachment URL shape safe on mobile viewport in DM|voice channels present silent-room entry UX cues|voice control harness exposes camera and screenshare state contracts"`
   - Result: PASS (8/8).

## What This Confirms

1. Beta-critical send/realtime/media paths are passing in a deploy-like environment.
2. Attachment hash URL safety path is validated for desktop and mobile viewport behavior.
3. Voice join/camera/screenshare state contracts are stable in current web implementation.

## Remaining for Full OCI Completion (Item 80 Exit)

1. Deploy app/api behind Oracle staging hostname and TLS.
2. Execute `docs/release/oracle-cloud-postdeploy-smoke.md` against:
   - `APP_URL=https://app.<staging-domain>`
   - `API_URL=https://api.<staging-domain>`
3. Verify reverse-proxy websocket upgrades and CORS with public domains.
4. Capture deployment changelog + rollback-ready confirmation.

## Blocking Inputs

1. OCI host/domain credentials and staging DNS availability.
2. Final staging env values (production secrets, CORS domain allowlist, CDN base URL).
