# Oracle Cloud Secrets Rotation Checklist

Date: 2026-02-22

## Rotate Before Public Beta

1. `JWT_SECRET` (>= 64 random chars)
2. `ENCRYPTION_KEY` (32-byte key material)
3. `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`
4. `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`
5. `TURN_USERNAME` / `TURN_PASSWORD`
6. `DATABASE_URL` credentials
7. `REDIS_URL` credentials (if auth enabled)

## Process

1. Generate new values in secret manager.
2. Update deployment env values atomically.
3. Restart dependent services in controlled order:
   - API
   - web
   - realtime services
4. Run post-deploy smoke checks immediately.

## Verification

1. Login/register paths still work.
2. DM and guild messaging works in realtime.
3. File upload + render works via public domains.
4. Voice join remains functional.

## Cadence

1. Initial rotation before opening public beta.
2. Repeat every 30-60 days or after any exposure incident.

