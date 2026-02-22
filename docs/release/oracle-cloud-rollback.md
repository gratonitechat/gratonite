# Oracle Cloud Rollback Runbook

Date: 2026-02-22

## Trigger

1. P0/P1 messaging failure (DM/guild send broken)
2. Attachment upload/render failure across cohort
3. Auth or websocket systemic outage

## Steps

1. Stop new rollout traffic (disable canary expansion).
2. Redeploy previous known-good API artifact.
3. Redeploy previous known-good web artifact.
4. Re-apply previous stable env snapshot.
5. Verify health and run post-deploy smoke checklist.
6. Reopen traffic only after smoke pass.

## Notes

1. Keep migration strategy backward compatible for fast rollback.
2. Log rollback reason and exact commit/artifact IDs.
