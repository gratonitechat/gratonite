# 2026-02-22 Web Next 30 Queue

Owner: Engineering  
Priority: working-condition reliability first, then hardening, then UI/UX modernization.

Scope note (2026-02-22): active execution is now constrained by `docs/plans/2026-02-22-beta-scope-freeze.md`.
Do not add net-new queue items until blocker `80` is complete.

## Queue

1. Add and maintain this 30-step execution queue with check state.
2. Fix split-repo web E2E API target portability (`for-web`) and document usage.
3. Add DM realtime delivery regression E2E (two active clients).
4. Add DM attachment realtime delivery regression E2E (two active clients).
5. Add guild/channel attachment realtime delivery regression E2E.
6. Add mobile send workflow regression E2E (Enter + Send button parity).
7. Add cross-client typing indicator regression E2E for DMs.
8. Normalize CORS origin parsing into a tested helper module.
9. Remove permissive development-mode `allow all origins` behavior.
10. Support safe development LAN origins without opening CORS globally.
11. Add CORS helper unit tests for allow/deny edge cases.
12. Harden upload MIME handling (explicitly reject unsafe SVG by default).
13. Add upload security tests for blocked MIME types.
14. Tighten file metadata validation and error response consistency.
15. Verify attachment URL safety (`/api/v1/files/:hash`) across web/mobile.
16. Add API contract tests for DM send/list/typing flows.
17. Add API contract tests for attachment linking and retrieval.
18. Add web telemetry markers for message-send and attachment-send critical path.
19. Add API request metric alerts for high-latency message paths.
20. Finish Portal terminology pass for remaining high-visibility web surfaces.
21. Implement Portal Gallery pass 2 (streaming-style richer interactions).
22. Improve navigation IA: gallery-first entry with one-click fallback routing.
23. Clean up Avatar Studio controls and defaults.
24. Extend Avatar Studio rendering into more chat/profile surfaces.
25. Add avatar rendering fallback tests (sprite enabled/disabled transitions).
26. Polish message composer UX (attachment chip remove/cancel clarity).
27. Harden voice/video control state UX in web call overlays.
28. Complete accessibility evidence pass for redesigned surfaces.
29. Expand visual regression coverage for portal, composer, DM, settings.
30. Run full web beta gate and capture release-readiness evidence.

## Next Batch (31-55)

31. Add DM typing indicator cross-client E2E verification.
32. Add iOS-style newline submit regression E2E for DM composer.
33. Add iOS-style newline submit regression E2E for guild composer.
34. Add send-button disabled/enabled state regression E2E for attachments-only payloads.
35. Add optimistic message failure-state UX test (network fail simulation).
36. Add retry behavior for failed attachment upload test.
37. Add message ordering stability regression test under concurrent sends.
38. Add unread badge consistency test for cross-channel message delivery.
39. Add DM list realtime ordering update test on new incoming DM.
40. Add strict CORS config doc with environment examples (local/LAN/prod).
41. Add security checklist doc for upload + auth + CORS + rate limits.
42. Add tests for CORS wildcard behavior constraints by environment.
43. Add explicit max upload size by purpose tests in files service.
44. Add metadata sanitization tests for upload description/waveform fields.
45. Add files router contract tests for `/api/v1/files/:hash` stream headers.
46. Harden attachment content-disposition for download safety.
47. Add API smoke script for auth + dm + message + attachment path.
48. Add voice join state regression E2E (silent join cues).
49. Add camera control state regression harness for web call overlay.
50. Add screenshare tile-presence event handling test (UI state contract).
51. Complete Portal language pass for settings/profile/search residual strings.
52. Add Portal gallery keyboard navigation + accessibility state tests.
53. Add avatar sprite rendering tests for message list fallback behavior.
54. Add visual snapshot coverage for portal gallery + message composer states.
55. Update release/beta gate docs with new regression suite commands.

## Oracle Cloud Batch (56-80)

56. Add Oracle Cloud deployment runbook for web + API + realtime stack.
57. Add API production env template for OCI (`apps/api/.env.production.example`).
58. Add web production env template for OCI (`apps/web/.env.production.example`).
59. Add production cutover checklist for DNS/TLS/CORS/WS validation.
60. Add OCI-specific firewall and port matrix documentation.
61. Add production secret rotation checklist (JWT/encryption/object storage).
62. Add post-deploy smoke commands for app/api/cdn endpoints.
63. Add websocket upgrade validation steps for reverse proxy.
64. Add attachment upload/render validation steps over public internet.
65. Add TURN/STUN verification checklist for voice/video connectivity.
66. Add production CORS allowlist examples tied to domain split.
67. Add cookie/session security defaults checklist for internet deployment.
68. Add rollback checklist for failed OCI deploy.
69. Add incident runbook for message-send/upload failures in production.
70. Add baseline SLO targets for beta (message send, media render, auth).
71. Add monitoring panel spec for API + Socket.IO + file delivery.
72. Add alert thresholds and pager conditions for beta P0/P1 paths.
73. Add structured deployment changelog template for each release.
74. Add canary cohort rollout steps for first OCI beta testers.
75. Add database backup/restore drill checklist before beta wave expansion.
76. Add object storage lifecycle policy checklist (retention + cost control).
77. Add host hardening checklist (SSH keys, fail2ban, OS updates).
78. Add domain and certificate renewal monitoring checklist.
79. Add final beta readiness review template tied to release blockers.
80. Execute first OCI dry-run deployment on staging hostname.

## Execution Log

- 2026-02-22: Item 2 complete (PR opened in `for-web`: #2).
- 2026-02-22: Item 3 complete (DM realtime delivery E2E added).
- 2026-02-22: Item 1 complete (this queue created).
- 2026-02-22: Item 4 complete (DM attachment realtime delivery E2E added).
- 2026-02-22: Item 5 complete (guild attachment realtime delivery E2E added).
- 2026-02-22: Items 6-7 complete (mobile send parity + DM typing cross-client regressions added in messaging suite).
- 2026-02-22: Items 8-11 complete (CORS helper + strict mode + tests landed).
- 2026-02-22: Items 12-13 complete (SVG upload block policy + MIME unit tests added).
- 2026-02-22: Items 31-33 complete (DM typing + iOS newline send regressions added).
- 2026-02-22: Item 34 complete (attachments-only send-button regression added).
- 2026-02-22: Item 40 complete (strict CORS configuration doc added).
- 2026-02-22: Items 56-60 complete (OCI runbook, prod env templates, cutover checklist, firewall matrix).
- 2026-02-22: Item 41 complete (web security checklist added).
- 2026-02-22: Item 47 complete (API production smoke script added).
- 2026-02-22: Item 35 complete (optimistic send failure regression added).
- 2026-02-22: Item 36 complete (attachment upload retry regression added).
- 2026-02-22: Item 38 complete (off-channel unread badge regression added).
- 2026-02-22: Item 37 complete (rapid concurrent send retention regression added).
- 2026-02-22: Item 46 complete (public file response header hardening: content disposition + nosniff).
- 2026-02-22: Items 61-63 complete (secrets rotation checklist + post-deploy smoke + websocket proxy validation docs).
- 2026-02-22: Item 43 complete (purpose-based max upload size policy helper + tests).
- 2026-02-22: Item 65 complete (TURN/STUN verification checklist added).
- 2026-02-22: Item 66 complete (production CORS examples added).
- 2026-02-22: Item 67 complete (session/cookie security checklist added).
- 2026-02-22: Items 68-79 complete (rollback, incident runbook, SLO/alerts, canary rollout, backup/object lifecycle, host hardening, cert monitoring, beta readiness template, deployment changelog template).
- 2026-02-22: Item 42 complete (CORS wildcard/malformed origin edge tests expanded).
- 2026-02-22: Item 44 complete (upload metadata validation tests added).
- 2026-02-22: Item 45 complete (files router contract tests for hash stream and auth behavior).
- 2026-02-22: Item 64 complete (public internet attachment validation documented in post-deploy smoke).
- 2026-02-22: Item 20 complete (remaining high-visibility Portal terminology updates landed).
- 2026-02-22: Item 39 complete (DM list realtime ordering regression added and validated via targeted Playwright run).
- 2026-02-22: Item 51 complete (residual high-visibility Portal terminology pass in leave/delete/profile/settings/emoji studio surfaces).
- 2026-02-22: Item 52 complete (Portal gallery keyboard-only navigation and control pressed-state a11y regression coverage added).
- 2026-02-22: Item 53 complete (avatar sprite enabled/disabled fallback behavior regression added for message surfaces).
- 2026-02-22: Item 54 complete (visual snapshot coverage expanded with message composer attachment state baseline).
- 2026-02-22: Item 55 complete (release and QA docs updated with direct Playwright command set and expanded suite references).
- 2026-02-22: Items 21-22 complete (Portal Gallery pass 2 shipped: search, sort, favorites, and direct-message jump action for gallery-first navigation).
- 2026-02-22: Items 23-24 complete (Avatar Studio controls improved with randomize/reset + added bottom/shoes palettes; sprite rendering extended into user bar/member list self surfaces).
- 2026-02-22: Item 26 complete (composer attachment UX polish: compact queue toolbar, clear-all action, explicit remove labels).
- 2026-02-22: Item 27 complete (voice/video dock state hardening: disabled/pressed semantics, outside-click popover close, pending screenshare tile state).
- 2026-02-22: Item 48 complete (silent voice-join cue regression retained and re-validated).
- 2026-02-22: Items 49-50 complete (voice camera/screenshare control harness + tile-presence UI contract regression coverage added).
- 2026-02-22: Item 28 complete (redesigned-surface accessibility evidence expanded and re-run green).
- 2026-02-22: Items 29-30 complete (visual baselines refreshed after gallery/composer changes; beta-gate evidence re-run with `check:web` + e2e hardening pack).
- 2026-02-22: Item 18 complete (added explicit `attachment_upload` telemetry marker alongside message send marker in composer critical path).
- 2026-02-22: Item 15 complete (mobile viewport DM attachment URL shape safety regression added and passed).
- 2026-02-22: Item 80 complete (hosting path adapted to Hetzner: public TLS cutover for `gratonite.chat` + `api.gratonite.chat`, API prod smoke PASS, API contract smoke PASS, domain redirects PASS; manual browser voice/video smoke remains in beta checklist follow-up).
