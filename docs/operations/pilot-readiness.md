# TD POS Pilot Readiness Plan

> Status: pre-pilot operational plan. This document defines what must be ready before a sari-sari store uses TD POS for real cashier sales.

## Purpose

The pilot is the start of real usage, not a demo. A pilot store may still be small and free-tier, but the operating posture must already protect inventory correctness, receipt continuity, and local data.

This plan covers the parts that support can prepare before the physical-device acceptance test:

- rollback plan
- manual receipt fallback
- support contact path
- one-day simulation checklist
- EAS Update policy

## Pre-Pilot Entry Criteria

Do not start a real pilot until all of these are true:

- Android development build installs on the pilot phone.
- The phone can open TD POS without Expo Go.
- Store owner/manager can open **Reports > Diagnostics**.
- Support can receive a copied support bundle.
- Store has a manual receipt fallback ready.
- Store understands that local SQLite is the source of truth while offline.
- The support runbook is available to the person handling pilot issues.
- The leaked publishable key has been rotated before connecting a real hosted project.

## Rollback Plan

Rollback has three layers. Use the smallest layer that protects the store.

### Layer 1: Operational Rollback

Use when:

- the app opens but cashier flow is confusing
- printer is unavailable
- internet or sync is delayed
- the issue does not threaten duplicate sales, lost stock changes, or tenant isolation

Actions:

1. Keep the installed app and local data intact.
2. Continue cashier sales in TD POS if checkout and receipt display still work.
3. If checkout is blocked, switch to the manual receipt fallback below.
4. Copy a support bundle.
5. Open an incident issue if the issue affects sales, sync, inventory, receipts, or tenant isolation.

### Layer 2: Build Rollback

Use when:

- a newly installed build cannot complete the cashier flow
- a native dependency, permission, or startup regression blocks the store
- EAS Update is not enabled for the installed build

Actions:

1. Preserve the device. Do not clear app data.
2. Install the previous known-good Android build only if it can read the same local data safely.
3. Record the old build URL, new build URL, app version, build number, and install ID.
4. Run one controlled test sale before returning the device to live selling.
5. If local data compatibility is uncertain, stop and escalate before reinstalling.

### Layer 3: EAS Update Rollback

Use only after `expo-updates` and EAS Update are intentionally configured for the release channel.

Policy:

- Do not use EAS Update for pilot builds until the project has a known-good embedded build and a written update channel plan.
- Never send OTA updates during active cashier hours unless the issue is `SEV-1`.
- Every update must record channel, branch, runtime version, update group, message, and tested device.
- Keep one known-good embedded build per pilot phase.

Rollback choices:

- Roll back to a previous update with `eas update:republish`.
- Roll back to the embedded update with `eas update:roll-back-to-embedded`.
- Use interactive `eas update:rollback` only when an operator is present and the selected branch/channel is verified.

References:

- EAS Update rollback docs: https://docs.expo.dev/eas-update/rollbacks/
- EAS CLI update command reference: https://docs.expo.dev/eas/cli/
- Branch and channel model: https://docs.expo.dev/eas-update/eas-cli/

## Hosted Supabase Backup Posture

Local SQLite is the source of truth while offline; hosted Supabase is the source of truth across devices. Backup posture is the line that decides how many hours of cross-device history we are allowed to lose without a restore plan.

### v1.0 Required Plan: Supabase Pro

v1.0 launches on **Supabase Pro** because Free does not include backups and pauses inactive projects.

Pro includes daily automated backups with 7 days of retention and Point-in-Time Recovery (PITR) granular to ~2 minutes when enabled on the project (https://supabase.com/docs/guides/platform/backups).

| Capability                          | Free        | Pro (v1.0 baseline)  |
| ----------------------------------- | ----------- | -------------------- |
| Daily automated backups             | No          | Yes, 7-day retention |
| Point-in-Time Recovery              | No          | Yes, ~2-minute RPO   |
| Project pauses after 1 week of idle | Yes         | No                   |
| Compute scaling                     | Capped      | Configurable         |
| Support response posture            | Best-effort | Paid tier            |

### Required Posture Before A Pilot Store Goes Live

- The Supabase project that the pilot phone connects to is on the Pro plan, not Free.
- PITR is enabled on the project (Project Settings → Backups → Point-in-Time Recovery).
- Engineering has performed one test restore from a daily backup into a staging project and recorded the restore time.
- The owner of the Supabase organization is documented and reachable.
- The DB password used by application code is rotated from the install default.

### Acceptable Data Loss Window

The hosted system targets a Recovery Point Objective (RPO) of **at most 2 minutes** through PITR, and a Recovery Time Objective (RTO) of **at most 24 hours** for engineering to bring the tenant back online from a daily backup.

Offline cashier sales are not lost during a hosted outage as long as the device has not been wiped. After hosted recovery, the local sync queue replays through the same idempotent `client_operation_id` path. Pilot phones must be left alone until the operator confirms the tenant is back up.

### Pilot Cutover Checklist

- [ ] Project plan upgraded to Pro before pairing the pilot device.
- [ ] PITR enabled on the project.
- [ ] One test restore from automated backup completed and timed.
- [ ] DB password rotated.
- [ ] Tenant owner/contact recorded in the incident channel.
- [ ] Date, plan, trigger, and expected monthly cost recorded against the Supabase upgrade decision record in `docs/road-to-1.0-enterprise-checklist.md`.

## Capacity And Concurrency Expectations

These numbers describe the _operational_ posture at pilot scale. They are not Supabase guarantees; they are the project's working envelope. Re-derive when pilot scale changes.

### Pilot Sizing (1-3 stores, up to 5 devices)

| Resource                                  | Pilot Envelope                         | Source / Guard                                          |
| ----------------------------------------- | -------------------------------------- | ------------------------------------------------------- |
| Concurrent devices per tenant             | ≤ 5 paired cashier installs            | Tier B Pro `maxDevices` cap; web `/devices` enforces.   |
| Foreground sync cycle interval (per dev.) | ≥ 30 s                                 | Mobile foreground trigger debounce in `sync-trigger`.   |
| Background sync interval (per device)     | 15 minutes                             | `expo-background-task` registration in `register-sync`. |
| Max rows drained per sync cycle           | 50                                     | `MAX_SYNC_BATCH_SIZE` in `sync-processor`.              |
| Expected `apply_inventory_delta` rate     | ≤ 1 RPS per device, ≤ 5 RPS per tenant | Derived from the two intervals above.                   |
| Expected `create_sale_atomic` rate        | ≤ 1 RPS per device                     | One sale at a time at the till.                         |
| Edge Function p95 budget                  | ≤ 750 ms                               | Pilot target — alarm if support reports >2 s.           |

### Why These Numbers Matter

- A device that retries faster than the 30-second debounce can still drain its queue, but it starts contending for the connection pool with the other paired devices in the same tenant. The race-safe `INSERT ... ON CONFLICT DO NOTHING RETURNING` path means duplicates are harmless, but extra traffic still costs Edge Function invocations.
- The 50-row batch ceiling is the only cap currently enforced _server-side_ through the size of the JSON payload mobile sends. It is the backstop that keeps a runaway loop from issuing a single 10,000-row `apply_inventory_delta`.
- A per-business concurrency cap on `apply_inventory_delta` is still unbuilt (see P11.5.10). Until that cap exists, support must watch the Sync Health dashboard for stuck-count spikes during pilot. A sustained `stuck > 0` is the early signal that a device is racing the server.

### Supabase Pro Plan Headroom

Supabase Pro starts with a small compute add-on plus the included connection pooler. At pilot scale (≤ 5 devices), one tenant generates well below the included Edge Function and database call budgets. The risk profile only changes once multi-tenant production rolls past ~50 active stores; that is explicitly a v1.0 + N-stores conversation, not a v1.0 launch concern.

Reference reading:

- Supabase pricing and quotas: https://supabase.com/pricing
- Supabase compute add-ons: https://supabase.com/docs/guides/platform/compute-add-ons
- PostgREST connection model: https://supabase.com/docs/guides/database/connecting-to-postgres

### Pre-Pilot Capacity Smoke Test

Before turning the pilot tenant on:

- [ ] Run the foundation gate so the sync queue contract is green.
- [ ] On a single development build, queue ≥ 100 deltas offline, then bring the device online. Confirm the queue drains in ≤ 4 cycles (4 × 50-row batches) and `applied_operations` shows the expected count.
- [ ] Confirm no row in `applied_operations` lands in the `stuck` bucket during the drain.
- [ ] Confirm web `/sync` shows the cashier as `fresh` after the drain.
- [ ] Record the wall-clock time of the drain in `docs/road-to-1.0-enterprise-checklist.md` under P11.5.10.

## Manual Receipt Fallback

Manual fallback is for continuity only. It is not a replacement for syncing TD POS later.

Use when:

- phone is unavailable
- checkout is blocked
- receipt screen cannot be shown
- printer is unavailable and the store insists on paper copy

Manual receipt fields:

- Store name
- Branch
- Date and local time
- Cashier name or code
- Temporary manual sale number
- Item name
- Quantity in pieces
- Unit price
- Line total
- Grand total
- Cash tendered
- Change
- Payment method
- Customer note if needed, without unnecessary personal data

Manual sale number format:

```text
MANUAL-BRANCH-CASHIER-YYYYMMDD-###
```

Example:

```text
MANUAL-QC01-C01-20260510-001
```

After the app is usable again:

1. Re-enter the sale only once.
2. Attach the manual sale number in the support/manager note when that field exists.
3. Reconcile physical stock against TD POS stock.
4. Keep the paper copy until the pilot owner confirms the sale is represented in TD POS.

Do not create an extra TD POS sale if the original app checkout already succeeded and only printing/display failed.

## Support Contact Path

Pilot support path:

1. Manager copies the support bundle from TD POS.
2. Manager sends the bundle through the pilot support channel named in the pilot agreement.
3. Internal support opens a GitHub incident when the issue affects sales, sync, tenant isolation, receipts, or pilot operations.

Response goals are defined in [support-runbook.md](support-runbook.md).

Before public launch, Phase M must replace the pilot support channel with:

- support email
- support hours
- privacy link
- escalation wording for urgent cashier blockers
- App Store / Play Store support URL

## One-Day Simulation

Run this before a real pilot day.

Setup:

- Install latest green Android development build.
- Confirm app version and build number.
- Confirm branch and cashier identity.
- Confirm at least 10 products exist.
- Confirm diagnostics opens for owner/manager.

Simulation:

1. Start online.
2. Complete three cash sales.
3. Put the device in airplane mode.
4. Complete five offline cash sales with at least two products each.
5. Restart the app while still offline.
6. Confirm sales and local stock persist.
7. Return online.
8. Bring app to foreground.
9. Confirm sync queue drains or records reviewable rows.
10. Copy support bundle.
11. Compare physical count against TD POS stock.

Pass criteria:

- No duplicate sale.
- No missing receipt screen after checkout.
- Receipt numbers remain unique.
- Local stock decrements correctly.
- App restart does not lose sales.
- Sync queue state is understandable from diagnostics.
- Manual receipt fallback is available but not needed.

## Real Pilot Day Start Checklist

- Owner knows the support path.
- Cashier knows how to keep selling offline.
- Manager knows how to copy diagnostics.
- Manual receipt pad/template is ready.
- Phone has enough battery and free disk.
- Device time and timezone are correct.
- Store has agreed who decides to stop pilot selling if `SEV-1` happens.

## Stop Conditions

Stop live pilot selling and switch to manual fallback when:

- checkout cannot complete
- receipt screen cannot display after a sale
- stock appears to decrement twice for one checkout
- tenant/store data appears mixed
- device clock is badly wrong and receipts would use the wrong date
- app data may be at risk from reinstall/wipe/reset

## Evidence To File

After simulation or pilot day, update the v0.4/v0.1alpha evidence rows with:

- build URL
- app version/build number
- device model
- Android version
- pilot store
- number of sales
- number of offline sales
- final sync queue state
- receipt sample numbers
- reconciliation result
- known issues
