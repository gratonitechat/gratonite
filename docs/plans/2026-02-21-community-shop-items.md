# Community Shop Items Plan (Web-First)

Date: 2026-02-21
Owner: Product + Engineering

## Goal

Allow users to publish community-created profile items to a moderated shop and let others install/use them safely.

## Item Types (Phase Order)

1. Display Name Style Packs
2. Profile Widgets Packs
3. Server Tag Frames/Badges
4. Avatar Decorations + Profile Effects (after moderation and rendering hardening)

## Existing Foundations

1. Theme marketplace API already exists in `apps/api/src/modules/themes`.
2. Theme preset/install tables already exist in DB schema (`theme_presets`, `theme_installs`).
3. Web now has profile customization surfaces (Display Name Styles, status, widgets, server tag MVP).

## Required New Backend Capabilities

1. Item registry abstraction:
   - Add `item_type` and render payload schema versioning.
2. Moderation pipeline:
   - auto checks (format, size, forbidden content signatures)
   - human review queue for publish-to-public.
3. Permission model:
   - uploader ownership
   - report/takedown roles
   - server-level allow/deny for tag-related items.
4. Install scopes:
   - global user scope
   - per-server profile scope.

## Safety and Abuse Controls

1. Strict schema validation on render payloads.
2. No arbitrary CSS/JS in community items.
3. Rate limiting + spam/fraud scoring on uploads.
4. Report flow with emergency unpublish.
5. Signed asset URLs and size caps.

## UX Surfaces

1. Shop browse/search/filter by item type and tags.
2. Item detail view with preview and compatibility info.
3. Install/uninstall actions with scope selector.
4. Creator dashboard (drafts, publish, moderation status).
5. Profile settings integration for equipped community items.

## Rollout

1. Phase 1:
   - community Display Name Style packs only (least risk).
2. Phase 2:
   - widgets + server tag visuals.
3. Phase 3:
   - avatar decorations/effects after moderation telemetry is stable.

## Acceptance Criteria

1. User can publish, browse, install, and remove a community item end-to-end.
2. Unsafe payloads are blocked before publish.
3. Moderators can unpublish and revoke problematic items.
4. Installed items render consistently across web/desktop/mobile contracts.
