# Hetzner Public Cutover Evidence

Date: 2026-02-22  
Owner: Engineering  
Status: PASS (manual browser voice/video smoke still recommended before invite wave expansion)

## Scope

Final execution of queue item `80` after hosting provider change from Oracle Cloud to Hetzner.

## Infrastructure Outcome

1. Hetzner host reachable at `178.156.253.237`.
2. DNS A records resolving to host:
   - `gratonite.chat`
   - `api.gratonite.chat`
   - `gratonite.com`
   - `gratonitechat.com`
3. Docker-based production stack running:
   - `postgres`, `redis`, `minio`, `livekit`, `coturn`, `api`, `web`, `caddy`
4. Caddy automatic TLS successfully issued certificates for:
   - `gratonite.chat`
   - `api.gratonite.chat`
   - `gratonite.com`
   - `gratonitechat.com`

## Production Fixes Applied During Cutover

1. Added Dockerfiles + Hetzner compose/Caddy config for one-box beta deployment.
2. Fixed container DNS resolver issue affecting Caddy ACME issuance by setting explicit public DNS resolvers in `docker-compose.hetzner.yml`.
3. Restored Hetzner env files after sync and synchronized Postgres user password with existing volume-backed database.

## Public Verification

1. `https://gratonite.chat` -> HTTP 200 (landing page served via Caddy -> nginx web container).
2. `https://api.gratonite.chat/health` -> `status: ok`.
3. `https://gratonite.com` -> HTTP 301 redirect to `https://gratonite.chat/`.
4. `https://gratonitechat.com` -> HTTP 301 redirect to `https://gratonite.chat/`.

## Smoke Evidence (Public Host)

1. `API_BASE_URL="https://api.gratonite.chat" ./scripts/checks/api-prod-smoke.sh` -> PASS.
2. `API_BASE_URL="https://api.gratonite.chat" ./scripts/checks/api-contract-smoke.sh` -> PASS.

## Remaining Manual Beta Checks (Recommended Before Expanding Cohort)

1. Browser-driven realtime DM/guild smoke on public domain (two clients).
2. Public-network attachment render confirmation on mobile browser.
3. Voice/video smoke in browser:
   - silent join
   - camera toggle state
   - screen-share tile visibility
