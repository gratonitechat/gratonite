# 2026-02-22 Web Acceleration Queue

Owner: Engineering  
Scope: finish all web-critical work with working-condition quality gates, then carry the design system cleanly into desktop/mobile.

## Principles

1. Ship in working slices with test evidence, not broad refactors.
2. No UI modernization work lands without critical-path chat reliability preserved.
3. Terminology and IA unify around `Portal` (user-facing), while backend identifiers remain stable until migration-ready.
4. Avatar identity layer is a product differentiator and must work in real chat surfaces, not only settings pages.

## Execution Queue (Ordered)

1. Stabilize web gates from split-repo state:
   - make `for-web` Playwright run against external API target
   - pass: `pnpm check:web:quick` + messaging E2E
2. Enforce reliability guardrails for DM/server messaging:
   - enter/send behavior desktop + mobile
   - realtime DM delivery + typing visibility
3. Patch attachment realtime parity:
   - image/file send/receive lifecycle with immediate render in DM + channels
4. Portal language pass 1:
   - replace user-facing `Server` strings in primary web surfaces
   - keep routes/API params unchanged
5. Portal navigation pass 2:
   - expand gallery-first entry and keep one-click path to channels
6. Voice/video UX stabilization pass:
   - silent auto-join voice, stable controls, camera/share state feedback
7. Avatar Studio cleanup pass:
   - simplify settings controls and defaults
   - validate persistence and fallback behavior
8. Avatar in chat/DM pass 1:
   - render sprite persona for supported users in message surfaces
   - safe fallback to static avatar
9. Avatar in chat/DM pass 2:
   - sprite decorations/nameplate cohesion and accessibility labels
10. Portal creation and onboarding polish:
   - template flow, starter channels, invite handoff, empty states
11. Emoji Studio hardening:
   - upload/edit/preview/remove across supported formats and animation constraints
12. Markdown UX hardening:
   - predictable markdown formatting and masked link behavior
13. Display Name Styles hardening:
   - performance and accessibility controls; reduced-motion behavior
14. Community cosmetics pipeline hardening:
   - equip/purchase consistency and moderation-safe publish flow
15. Security hardening pass 1:
   - CORS, auth/session defaults, upload validation, abuse controls
16. Security hardening pass 2:
   - endpoint-level permission checks and error handling normalization
17. Performance hardening pass:
   - render hotspots, message list behavior, bundle budget conformance
18. Accessibility evidence pass:
   - keyboard + screen-reader walkthrough with artifacts
19. Visual regression expansion:
   - DM, channel, portal gallery, settings, call overlays
20. Web beta gate review:
   - rerun release criteria and freeze P0/P1 before tester invite

## Immediate Active Slice

1. Portal language pass 1 (high-visibility surfaces)
2. Avatar in chat/DM pass 1 (ship visible product differentiation safely)
3. Re-run web build/typecheck and patch regressions

