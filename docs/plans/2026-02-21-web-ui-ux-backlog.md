# Web UI/UX Modernization Backlog (Execution Sequence)

Date: 2026-02-21
Owner: Engineering
Scope: Web first; parity notes for desktop/mobile included per ticket

## Milestone M1 - Foundations (No Breaking UI Rewrite)

1. `WEB-016` Design tokens v2 scaffold
   - Deliverables:
     - token model (core/semantic/component)
     - CSS variable emission path
     - feature flag `ui_v2_tokens`
   - Acceptance criteria:
     - Existing UI renders unchanged when flag is off.
     - Token v2 theme renders on at least auth + channel pages when flag is on.
     - `pnpm check:web` passes.
   - Dependencies: none

2. `WEB-018` Interaction primitives polish pack
   - Deliverables:
     - button/input/select/modal/menu primitive refresh
     - consistent focus/hover/disabled/active states
   - Acceptance criteria:
     - Primary and destructive action patterns match placement rules.
     - No critical-path regression in web E2E.
   - Dependencies: WEB-016

3. `WEB-022` Motion and micro-interaction system
   - Deliverables:
     - motion tokens, reduced-motion handling, panel transition presets
   - Acceptance criteria:
     - motion disabled path works via reduced-motion setting.
     - no jank on channel/message navigation under baseline load.
   - Dependencies: WEB-016

## Milestone M2 - Shell and Messaging Modernization

1. `WEB-030` Server gallery navigation surface
   - Deliverables:
     - streaming-style server selection gallery on home surface
     - card-based server entries with banner/icon media and hover/focus details
   - Acceptance criteria:
     - gallery supports keyboard navigation and clear focus states
     - server selection remains one-click/tap to enter target guild
     - no regression to existing guild/channel route behavior
   - Dependencies: WEB-016

2. `WEB-017` App shell redesign
   - Deliverables:
     - guild rail, channel sidebar, top bar, panel stack modernization
     - glass/elevation hierarchy
   - Acceptance criteria:
     - navigation speed unchanged or improved.
     - keyboard navigation parity with current shell.
   - Dependencies: WEB-016, WEB-018

3. `WEB-023` Message list + composer redesign
   - Deliverables:
     - message row polish, action bar refinement, composer hierarchy cleanup
   - Acceptance criteria:
     - send/edit/delete/reply/reaction flows all pass.
     - action placement is consistent on desktop and mobile breakpoints.
   - Dependencies: WEB-017, WEB-018

4. `WEB-024` Modal, drawer, and contextual menu consistency
   - Deliverables:
     - unified overlay components and spacing/radius conventions
   - Acceptance criteria:
     - no conflicting modal/menu z-index or focus traps.
     - consistent close behavior (`Esc`, click-outside, explicit cancel).
   - Dependencies: WEB-018

## Milestone M3 - Customization and Theme Sharing

1. `WEB-032` Server emoji management UX
   - Deliverables:
     - server settings emoji tab with list and slot counters (static/animated)
     - emoji studio upload flow with server selection and name validation
   - Acceptance criteria:
     - user can upload emoji from server settings and from picker "Add Emoji" path
     - supported upload formats include JPEG, PNG, GIF, WEBP (JPEG normalized client-side)
     - static and animated counts are visible in server settings
   - Dependencies: WEB-016

2. `WEB-019` Theme editor v1
   - Deliverables:
     - live token editor for accent, glass intensity, radius, motion, density
   - Acceptance criteria:
     - user can preview/apply/reset theme without reload.
     - changes persist per user account.
   - Dependencies: WEB-016

3. `WEB-025` Theme manifest import/export
   - Deliverables:
     - export current theme to manifest
     - import manifest with validation and compatibility checks
   - Acceptance criteria:
     - deterministic round-trip: export -> import -> same render.
     - invalid manifests rejected with explicit errors.
   - Dependencies: WEB-019

4. `WEB-026` Theme sharing surface
   - Deliverables:
     - publish + share links + install from shared manifest
   - Acceptance criteria:
     - shared theme install requires explicit confirm.
     - unsafe/unrecognized fields blocked at validation layer.
   - Dependencies: WEB-025

## Milestone M4 - Hardening and Release Readiness

1. `WEB-027` Visual regression suite for redesigned surfaces
   - Deliverables:
     - baseline snapshots for auth, home, channel, settings, voice preflight
   - Acceptance criteria:
     - CI blocks unexpected visual diffs in critical surfaces.
   - Dependencies: WEB-017, WEB-023

2. `WEB-028` Accessibility conformance pass
   - Deliverables:
     - contrast checks, focus checks, keyboard path checks, reduced-motion checks
   - Acceptance criteria:
     - no open P0/P1 accessibility defects for critical-path flows.
   - Dependencies: WEB-018, WEB-022, WEB-023

3. `WEB-029` Performance guardrails for glass/motion
   - Deliverables:
     - perf budget docs + telemetry markers for animation and paint cost
   - Acceptance criteria:
     - agreed baseline scenarios stay within budget.
   - Dependencies: WEB-017, WEB-022

## Milestone M5 - 2D Avatar Studio + Wearables Economy (Backlog)

1. `WEB-040` Avatar Studio foundations (Maple-inspired 2D identity system)
   - Deliverables:
     - layered 2D avatar model (base/body/hair/face + hat/top/bottom/shoes/accessory slots)
     - deterministic avatar composition renderer for web
     - profile integration option (show sprite on profile and popovers)
   - Acceptance criteria:
     - users can create/edit a sprite without breaking existing avatar pipeline
     - sprite render is deterministic across refresh/devices
     - accessibility fallback exists (standard avatar still available)
   - Dependencies: WEB-016

2. `WEB-041` Starter wearables catalog and equip UX
   - Deliverables:
     - initial first-party catalog (hats/tops/bottoms/shoes/accessories)
     - wardrobe/equip UI in profile settings
     - preview states for idle + hover
   - Acceptance criteria:
     - equip/unequip persists and reflects immediately in supported surfaces
     - starter catalog includes at least one full outfit path per slot category
   - Dependencies: WEB-040

3. `WEB-042` Soft currency and rewards loop
   - Deliverables:
     - earn currency through meaningful participation (chat activity, server engagement)
     - wallet balance, earn events, and spend ledger
     - anti-spam reward throttles and abuse controls
   - Acceptance criteria:
     - reward loop cannot be trivially farmed by spam or bot-like activity
     - all spend/earn actions are auditable
   - Dependencies: WEB-040

4. `WEB-043` Creator wearable pipeline + moderation
   - Deliverables:
     - creator upload workflow (template/spec validation)
     - moderation queue (automated + human review path)
     - publish/reject/version lifecycle for community items
   - Acceptance criteria:
     - no unreviewed creator asset can reach production catalog
     - rejected assets return actionable reason codes
   - Dependencies: WEB-041, WEB-042, WEB-036

5. `WEB-044` Wearables shop and marketplace UX
   - Deliverables:
     - shop browsing, filters, rarity tags, item previews
     - purchase flow using in-app currency
     - creator attribution and item provenance
   - Acceptance criteria:
     - purchase and equip flow completes in <= 3 taps/clicks from item card
     - user inventory and transaction history remain consistent after refresh
   - Dependencies: WEB-041, WEB-042, WEB-043

## Milestone M6 - Server Onboarding and Channel Lifecycle

1. `WEB-045` Server creation template flow
   - Deliverables:
     - create-server modal with templates (Gaming/Study/Chill/Creative/Custom)
     - starter channel auto-generation (minimal default layout)
     - first invite generation at setup completion
   - Acceptance criteria:
     - user can complete setup and land in a working text channel in under 90 seconds
     - generated channel layout follows template mapping rules
   - Dependencies: WEB-030

2. `WEB-046` Invite join + default routing hardening
   - Deliverables:
     - paste/deeplink invite join flow with clear invalid/expired handling
     - auto-join role baseline and post-join routing behavior
   - Acceptance criteria:
     - joined server appears immediately in rail/gallery
     - user is routed into usable default channel with no dead-end screen
   - Dependencies: WEB-045

3. `WEB-047` Channel lifecycle UX (create/private/delete/leave-owner rules)
   - Deliverables:
     - channel create flow: type/privacy/category
     - permission editor entry from channel context menu
     - delete confirmation with irreversible warning
     - owner-leave guard path (transfer ownership or delete)
   - Acceptance criteria:
     - private channel visibility respects role/member permissions
     - owner cannot leave without valid ownership transition
   - Dependencies: WEB-045

4. `WEB-048` Silent voice room entry and status UX
   - Deliverables:
     - no-ringtone voice room join behavior
     - subtle join/leave presence indicators
   - Acceptance criteria:
     - joining a voice channel never triggers loud ring behavior
     - users still receive clear context on who is currently in room
   - Dependencies: WEB-017

5. `WEB-049` Channel growth recommendations + onboarding hints
   - Deliverables:
     - "start minimal" recommendation engine from channel activity signals
     - setup helper content (`#server-map`, starter channel purpose hints)
   - Acceptance criteria:
     - recommendations are dismissible, non-blocking, and telemetry-backed
     - no default channel bloat for new servers
   - Dependencies: WEB-045, WEB-047

## Parity Mapping (Post-Web)

1. `DESK-020` Desktop parity rollout
   - Use web token + component system directly; add platform-specific affordances only.
2. `MOB-021` Mobile parity mapping
   - Map semantic/component tokens to mobile style system and align interaction contracts.

## Execution Policy

1. No milestone is complete without command/test evidence.
2. Every ticket must reference one critical-path flow or release gate.
3. Feature flags must provide rollback path until M4 is complete.
