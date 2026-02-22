# Public Beta Hardening Plan

Last updated: 2026-02-22  
Owner: Engineering

## Goal

Protect the core chat/media workflows while moving from LAN testing to internet-scale beta traffic.

## Phase 1: Workflow Lock (before expanding testers)

1. Keep the messaging/media regression suite green on every merge.
2. Block regressions to DM send, guild send, image upload/render, and typing indicators.
3. Treat loopback asset URLs (`localhost`, `127.0.0.1`, `::1`) in message attachments as release blockers.
4. Keep API `/files/:hash` serving/streaming behavior stable for cross-device and cross-network access.

## Phase 2: Hosting Hardening (before external invite wave)

1. Split domains by responsibility:
   - `app.<domain>` for web client
   - `api.<domain>` for HTTP/WebSocket
   - `cdn.<domain>` for object delivery
2. Move from development CORS behavior to strict production allowlists.
3. Enforce HTTPS everywhere and secure cookie settings.
4. Ensure load balancer supports sticky sessions for websocket traffic.
5. Verify Redis adapter fanout for Socket.IO across multiple API instances.

## Phase 3: Beta Operations (first 2 weeks)

1. Launch with a controlled invite cohort and explicit rollback owner.
2. Monitor:
   - message send failures (HTTP + websocket)
   - file upload failures
   - file render failures (4xx/5xx on `/api/v1/files/*`)
   - auth refresh/token failures
3. Pause cohort expansion if any P0/P1 messaging/media regression appears.

## Must-Have Monitoring Signals

1. API error rate on:
   - `POST /api/v1/channels/:id/messages`
   - `POST /api/v1/files/upload`
   - `GET /api/v1/files/:fileId`
2. Socket events volume and disconnect reasons.
3. Client-side “send failed” events with endpoint + status metadata.

## Release Blockers (Public Beta)

1. Any inability to send messages in DMs or guild channels.
2. Any image upload that does not render without refresh.
3. Any mobile-only media rendering failure on supported browsers/devices.
4. Any hook-order/runtime crash in active chat surfaces.
