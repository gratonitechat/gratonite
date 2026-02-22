# Oracle Cloud Post-Deploy Smoke

Date: 2026-02-22

## Required Inputs

1. `APP_URL` (example: `https://app.<domain>`)
2. `API_URL` (example: `https://api.<domain>`)

## API Checks

1. `GET ${API_URL}/health` returns `status=ok`.
2. Auth register/login endpoints respond successfully.
3. File upload endpoint responds and returns file metadata.
4. `/api/v1/files/:hash` serves file without loopback URL assumptions.

## Realtime Checks

1. Open two browser clients and login as separate users.
2. DM send/receive appears in realtime (no refresh).
3. Guild channel send/receive appears in realtime.
4. Typing indicator appears with display name, not user ID.

## Media Checks

1. Upload image in DM and guild channel.
2. Attachment appears immediately for both sender and receiver.
3. Mobile browser renders uploaded image correctly.

## Voice/Video Checks

1. Join voice channel silently.
2. Toggle camera and validate UI state updates.
3. Start screen share and verify visible tile state.

## Pass Criteria

1. No P0/P1 failures on send/upload/realtime paths.
2. No CORS failures for app/api production domains.
3. No blocking websocket upgrade failures.

