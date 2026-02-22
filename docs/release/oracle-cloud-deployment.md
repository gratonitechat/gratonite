# Oracle Cloud Deployment Runbook (Web + API)

Date: 2026-02-22  
Owner: Engineering

## Scope

Deploy Gratonite web + API + realtime dependencies on Oracle Cloud Infrastructure (OCI) for internet-facing beta.

## Recommended Topology

1. `app.<domain>` → web frontend (Vite build served by reverse proxy/static host)
2. `api.<domain>` → API + Socket.IO (HTTP + websocket upgrades)
3. `cdn.<domain>` → object delivery endpoint (`/api/v1/files/:hash` compatibility remains required)
4. Single VM for initial beta is acceptable; split services as load increases.

## OCI Base Setup

1. Create Ubuntu LTS VM (public subnet) with static public IP.
2. Attach block volume sized for logs + DB growth.
3. Open only required security list ports:
   - `22/tcp` (restricted admin IPs only)
   - `80/tcp`, `443/tcp`
   - `3478/tcp+udp`, `5349/tcp` (TURN, if public coturn on same host)
   - LiveKit RTC ports if not proxied separately (`7880`, `7881`, `7882/udp`)
4. Install Docker + Docker Compose plugin and verify daemon starts on boot.

## Domain and TLS

1. Create DNS records:
   - `app.<domain>` -> VM IP
   - `api.<domain>` -> VM IP
   - `cdn.<domain>` -> VM IP (or object storage/CDN endpoint)
2. Install reverse proxy (Nginx/Caddy) and issue TLS certs for all hostnames.
3. Enforce HTTPS redirects and HSTS.

## Application Configuration

1. Use `apps/api/.env.production.example` as baseline.
2. Use `apps/web/.env.production.example` as baseline.
3. Set production-safe secrets:
   - `JWT_SECRET` (high entropy, >= 64 chars)
   - `ENCRYPTION_KEY` (32-byte key material)
   - object storage credentials
4. Set strict `CORS_ORIGIN` to public domains only.

## Bring-up Order

1. Start stateful services (Postgres, Redis, object storage).
2. Run DB migrations.
3. Start API.
4. Start web.
5. Validate websocket connectivity through proxy.
6. Validate file upload and public file rendering.

## Required Post-Deploy Smoke

1. `GET https://api.<domain>/health` returns `status: ok`.
2. Register/login works on `https://app.<domain>`.
3. DM send and guild send work in realtime between two clients.
4. Attachment upload appears immediately on sender and receiver.
5. `/api/v1/files/:hash` URL renders from non-local network/mobile.
6. Voice channel join is silent and stable; TURN fallback connectivity verified.

## Rollback

1. Keep previous image/artifact and env snapshot.
2. On P0 failure:
   - revert API/web deployment to last known-good
   - clear stuck migration only if backward compatible
   - keep user-impacting feature flags disabled until retest passes
3. Post rollback: run smoke checklist again before reopening beta traffic.

