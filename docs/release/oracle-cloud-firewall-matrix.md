# Oracle Cloud Firewall and Port Matrix

Date: 2026-02-22

## Inbound Rules (Public)

1. `22/tcp`
   - Purpose: SSH administration
   - Source: restricted admin IP allowlist only
2. `80/tcp`
   - Purpose: HTTP redirect + ACME challenge
   - Source: `0.0.0.0/0`
3. `443/tcp`
   - Purpose: HTTPS for app/api/cdn
   - Source: `0.0.0.0/0`
4. `3478/tcp` and `3478/udp`
   - Purpose: TURN/STUN
   - Source: `0.0.0.0/0`
5. `5349/tcp`
   - Purpose: TURN over TLS
   - Source: `0.0.0.0/0`
6. `7880/tcp`
   - Purpose: LiveKit signaling/API (if directly exposed)
   - Source: reverse proxy/internal as preferred
7. `7881/tcp`, `7882/udp`
   - Purpose: LiveKit RTC media transport
   - Source: `0.0.0.0/0` when direct media path required

## Inbound Rules (Private/Internal Preferred)

1. `5432/tcp` Postgres
2. `6379/tcp` Redis
3. `9000/tcp` MinIO API
4. `9001/tcp` MinIO console

Recommendation: keep these private to host/VCN and do not expose publicly.

## Outbound Rules

1. Allow egress for OS package updates and dependency pulls.
2. Allow DNS + NTP.
3. Restrict outbound where compliance requires.

## Notes

1. Prefer reverse proxy on `443` for app and API routes.
2. Confirm websocket upgrade support through proxy for Socket.IO.
3. Confirm TLS termination strategy for TURN/LiveKit paths as deployed.

