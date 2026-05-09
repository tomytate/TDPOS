---
name: Incident Report
about: Track a TD POS incident affecting sales, sync, tenant isolation, receipts, or pilot operations.
title: '[incident] '
labels: incident
assignees: ''
---

## Severity

- [ ] `SEV-1` - sales blocked, suspected data loss, tenant isolation risk, or duplicate/decrement risk
- [ ] `SEV-2` - sales continue but sync, printer, exports, or one device is degraded
- [ ] `SEV-3` - non-blocking support issue, wording issue, training question, or setup help

## Summary

What happened?

## Impact

- Store/business:
- Branch:
- Cashier/device:
- Can the cashier keep selling offline?
- Customer or tenant data exposure suspected?

## Diagnostics

- App version:
- Install ID:
- Schema version:
- Unsynced queue count:
- Reviewable queue count:
- Latest sync error:
- Available disk:
- Device time/timezone checked:

Paste the sanitized support bundle below. Do not paste secrets, OTP codes, raw sync payloads, customer names, customer phones, or API keys.

```text

```

## Timeline

- Detected:
- Acknowledged:
- Workaround applied:
- Resolved:

## Response

- Immediate workaround:
- Root cause:
- Follow-up tasks:
- Runbook update needed?

## Closure Checklist

- [ ] Cashier can continue selling.
- [ ] No unresolved duplicate/decrement risk.
- [ ] Sync queue state is understood.
- [ ] Customer-facing explanation is clear.
- [ ] Follow-up issue exists for any code or process fix.
