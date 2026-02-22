# Server Onboarding and Channel Lifecycle Spec (Web-First)

Date: 2026-02-21
Owner: Product + Engineering
Priority: Web reference implementation, then desktop/mobile parity

## Objective

Make server setup feel immediate and welcoming while keeping structure clean and scalable. New users should be able to create or join a server and start chatting/voice within minutes, without channel overload.

## Primary Flows

1. Create Server
   - Entry: sidebar `+` / `Create Server` action.
   - Step 1: template picker (Gaming / Study / Chill / Creative / Custom).
   - Step 2: server name + optional icon/banner.
   - Step 3: auto-generate a minimal starter layout (2 text + 2 voice default).
   - Step 4: issue invite link and show quick-share actions.

2. Join Server
   - Entry: invite link paste or invite deep-link open.
   - On success: auto-join as base role (`@everyone`) and route into default channel.
   - Sidebar: server appears immediately in server list.

3. Navigate Server
   - Click/tap server: load channel tree and last-read/default channel.
   - Select text channel: load message history + composer.
   - Select voice channel: connect silently (no loud ring behavior).

4. Add Channel
   - Entry: server dropdown or section action `Create Channel`.
   - Inputs: channel name, type (text/voice), privacy toggle, optional category.
   - Save: append into channels list with deterministic ordering.

## Core UX Rules

1. Voice joins are ambient
   - No global ringtone blast for room joins.
   - Presence updates should be subtle and contextual.

2. Start minimal, grow with usage
   - Default creation uses only a few channels.
   - Recommend splits only after activity thresholds are met.

3. Private by explicit toggle
   - Private channel toggle at create time.
   - Permission editing from context menu (`Edit Channel` -> `Permissions`).

4. Keep wayfinding simple
   - Avoid high-friction channel sprawl for new servers.
   - Support optional `#server-map` index pattern for onboarding.

## Starter Template Defaults

1. Gaming
   - Text: `#general`, `#clips-and-highlights`
   - Voice: `Lobby`, `Gaming`

2. Study
   - Text: `#general`, `#resources`
   - Voice: `Study Hall`, `Break Room`

3. Chill
   - Text: `#general`, `#media-share`
   - Voice: `Hangout`, `Music`

4. Creative
   - Text: `#general`, `#show-and-tell`
   - Voice: `Co-work`, `Critique`

## Channel Management Guidance (Product Copy Basis)

1. Keep initial channel count low.
2. Add channels only after repeated topic collisions in `#general`.
3. Favor rename/archive/lock before permanent delete where possible.
4. Treat private channels as role/member-scoped side rooms.

## Edge Cases and Required Behavior

1. Delete channel
   - Must show explicit confirmation that history is permanently removed.

2. Leave server
   - Non-owner: remove membership and local references.
   - Owner: block leave unless ownership transfer or server delete path is completed.

3. Offline-first messaging
   - Queue outbound messages locally when disconnected.
   - Reconcile on reconnect with idempotency safeguards.
   - Show queued/sending/failed states clearly.

4. Invite errors
   - Expired/invalid invite should return clear recovery actions.

## Information Architecture Enhancements (Backlog Concepts)

1. `#server-map` pinned index message.
2. `#check-in-circle` lightweight status channel pattern.
3. `#irl-quests` personal goals channel pattern.
4. `#soundtrack-of-the-week` and similar social rhythm channels.
5. Voice room patterns: `Chill Vibes`, `Raid Night`, `Cowork Cafe`.

## Delivery Phases

1. Phase 1 (MVP)
   - Template picker + starter channel generation + invite generation.
   - Silent voice join behavior.
   - Private channel toggle + permission editor basics.

2. Phase 2
   - Channel growth recommendations based on usage signals.
   - Better onboarding copy and channel purpose hints.

3. Phase 3
   - Offline queue UX polish and conflict/retry telemetry.
   - Advanced onboarding patterns (`server-map`, guided setup checklist).

## Acceptance Criteria

1. User can create a templated server and send first message within 90 seconds.
2. User can join via invite and enter first text/voice room without dead ends.
3. Voice join path never triggers loud ring behavior for room entry.
4. Private channels enforce visibility boundaries correctly.
5. Channel delete + owner leave edge cases are enforced and tested.

