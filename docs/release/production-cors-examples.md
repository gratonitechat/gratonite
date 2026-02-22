# Production CORS Examples

Date: 2026-02-22

## Recommended Domain Split

1. `app.<domain>` for web client
2. `api.<domain>` for API + websocket
3. `cdn.<domain>` for public asset delivery

## API Environment Example

```env
NODE_ENV=production
CORS_ORIGIN=https://app.<domain>,https://<domain>
CDN_BASE_URL=https://cdn.<domain>
```

## Notes

1. Do not use wildcard `*` in production.
2. Keep origins scheme-specific (`https://`).
3. Include only browser entrypoints that should call API.
4. Verify websocket CORS behavior matches HTTP CORS behavior.

## Quick Validation

1. Open web app and perform register/login.
2. Confirm no `Not allowed by CORS` errors in browser console/network.
3. Confirm websocket connects and realtime events flow.

