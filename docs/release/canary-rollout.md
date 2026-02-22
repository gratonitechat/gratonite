# Canary Rollout Procedure

Date: 2026-02-22

1. Deploy to staging and run full smoke checks.
2. Release to 5% beta cohort.
3. Monitor 30 minutes for P0/P1 signals.
4. Expand to 25%, then 50%, then 100% if stable.
5. Pause expansion immediately on P0/P1 regressions.
