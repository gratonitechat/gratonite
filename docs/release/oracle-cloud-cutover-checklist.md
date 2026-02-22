# Oracle Cloud Cutover Checklist

Date: 2026-02-22

## Pre-Cutover

1. DNS records created: `app`, `api`, `cdn`.
2. TLS certs valid for all domains.
3. `CORS_ORIGIN` set to production domains only.
4. JWT/encryption/object-storage secrets replaced from defaults.
5. Database migration backup taken.

## Cutover

1. Deploy API and verify `/health`.
2. Deploy web and verify login/register.
3. Validate websocket upgrades through reverse proxy.
4. Validate DM send/guild send realtime across two users.
5. Validate attachment upload/render on desktop and mobile browser.
6. Validate voice join + basic media path.

## Cutover Command Pack

1. API baseline smoke:
   - `API_BASE_URL="https://api.<staging-domain>" ./scripts/checks/api-prod-smoke.sh`
2. API contract smoke:
   - `API_BASE_URL="https://api.<staging-domain>" ./scripts/checks/api-contract-smoke.sh`
3. Focused web realtime/media/voice smoke:
   - `cd apps/web && VITE_API_URL="https://api.<staging-domain>/api/v1" pnpm exec playwright test tests/e2e/messaging.spec.ts tests/e2e/channel-lifecycle.spec.ts -g "delivers DM messages in realtime across two active clients|delivers DM attachment messages in realtime across two active clients|delivers guild attachment messages in realtime across two active clients|shows DM typing indicator using display name across active clients|uploads an attachment and sends it in a message|keeps attachment URL shape safe on mobile viewport in DM|voice channels present silent-room entry UX cues|voice control harness exposes camera and screenshare state contracts"`

## Post-Cutover Monitoring (first 24h)

1. API 5xx rate for message + file endpoints.
2. Socket disconnect reason spikes.
3. Attachment render 4xx/5xx on `/api/v1/files/:hash`.
4. Authentication failures (login/refresh/session).

## Rollback Trigger

1. Any P0/P1 on send path or media render path.
2. Any sustained auth failure affecting sign-in.
3. Any websocket instability causing widespread realtime failure.
