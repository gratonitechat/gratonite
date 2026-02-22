# 2026-02-22 Repo Split Execution Plan

Owner: Engineering  
Scope: split monorepo responsibilities into `gratonitechat/*` repos without breaking web velocity.

## Target Repo Ownership

1. `gratonitechat/for-web`
   - Owns: web client app and web test suite.
   - Source paths:
     - `apps/web`
     - `packages/types`
     - `packages/profile-resolver`
     - `packages/markdown`
     - `packages/themes`
     - `packages/ui`
     - `packages/hooks`
     - `packages/i18n`
     - `packages/api-client`
2. `gratonitechat/for-desktop`
   - Owns: Electron shell + renderer integration + desktop update pipeline.
   - Source paths:
     - `apps/desktop`
     - selected shared packages used by desktop renderer (`packages/types`, `packages/profile-resolver`, `packages/api-client`)
3. `gratonitechat/for-ios`
   - Owns: iOS-targeted mobile app distribution and iOS-specific config.
   - Source path basis: `apps/mobile` (split into platform repo with iOS-first docs/config)
4. `gratonitechat/for-android`
   - Owns: Android-targeted mobile app distribution and Android-specific config.
   - Source path basis: `apps/mobile` (split into platform repo with Android-first docs/config)
5. `gratonitechat/self-hosted`
   - Owns: deployable backend and infrastructure bundle.
   - Source paths:
     - `apps/api`
     - `packages/db`
     - `docker-compose.yml`
     - `livekit.yaml`
     - infra/deploy scripts from `scripts/`
6. `gratonitechat/gratonite.chat`
   - Owns: public marketing/download site.
   - Source paths:
     - `apps/website`

## Keep In Monorepo (`gratonitechat/gratonite`) During Transition

1. Shared planning/status docs (`docs/*`).
2. Cross-cutting architecture references (`ARCHITECTURE.md`, `PROGRESS.md`).
3. Transitional CI/testing glue while split repos are being bootstrapped.

## Migration Waves

## Execution Status (2026-02-22)

1. Wave 1 (`for-web`) merged: https://github.com/gratonitechat/for-web/pull/1
2. Wave 2 (`self-hosted`) merged: https://github.com/gratonitechat/self-hosted/pull/1
3. Wave 3 (`for-desktop`) merged: https://github.com/gratonitechat/for-desktop/pull/1
4. Wave 4 (`for-ios`, `for-android`) merged:
   - https://github.com/gratonitechat/for-ios/pull/1
   - https://github.com/gratonitechat/for-android/pull/1
5. Wave 5 (`gratonite.chat`) merged: https://github.com/gratonitechat/gratonite.chat/pull/1

Current state: split-repo bootstrap is complete; next step is post-merge smoke validation and ownership handoff workflows.

## Wave 1 (web-first, immediate)

1. Extract and initialize `for-web`.
2. Ensure required scripts exist:
   - `typecheck`
   - `build`
   - `e2e` (Playwright)
3. Port these gate docs:
   - `docs/release/web-release-gates.md`
   - `docs/release/web-beta-gate-2026-02-22.md`
   - `docs/release/public-beta-hardening.md`
4. Confirm green checks in `for-web`:
   - `pnpm typecheck`
   - `pnpm build`
   - `pnpm --filter @gratonite/web e2e -- tests/e2e/messaging.spec.ts`

## Wave 2 (deployment + API)

1. Extract `self-hosted` from API/DB/infrastructure paths.
2. Add environment templates and secure production defaults.
3. Validate compose-based up/down and health probes.

## Wave 3 (desktop)

1. Extract `for-desktop`.
2. Verify build targets still work (macOS, Windows, Linux).
3. Confirm update feed settings point to the correct repo.

## Wave 4 (mobile split)

1. Fork mobile baseline into `for-ios` and `for-android`.
2. Keep shared core code synced via subtree/submodule or package publish workflow.
3. Establish separate CI lanes and beta distribution channels.

## Guardrails (Do Not Skip)

1. No repo move without a path ownership list and CI minimum gates.
2. No production-affecting messaging/media changes without passing:
   - `apps/web/tests/e2e/messaging.spec.ts`
3. No localhost dependency in asset paths for client-rendered attachments.
4. Keep API `/api/v1/files/:hash` behavior stable across all client repos.

## Immediate Next Tasks

1. Run post-merge smoke in each split repo (`for-web`, `self-hosted`, `for-desktop`, `for-ios`, `for-android`, `gratonite.chat`).
2. Document release ownership for each split repo in runbooks.
3. Keep monorepo docs (`ARCHITECTURE.md`, `PROGRESS.md`, `docs/status/PROJECT-BOARD.md`) in sync with split execution state.
