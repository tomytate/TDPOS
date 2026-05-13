# TD POS Support Runbook

> Status: pre-pilot operational runbook. This document is safe to share with pilot support staff, store owners, and agents working on TD POS. It does not contain API keys, private phone numbers, or customer data.

## Purpose

TD POS is offline-first. The first rule of support is: **do not interrupt cashier sales unless there is a real risk of wrong stock, duplicate sales, lost receipts, or tenant data exposure.** Most issues should be handled by collecting diagnostics, preserving local data, and escalating with enough context to avoid manual SQLite inspection.

## Support Path

Current pilot path:

- Store owner or manager opens **Reports > Diagnostics**.
- They tap **Copy support bundle**.
- They send that text through the support channel named in the pilot agreement.
- Internal triage opens a GitHub issue with the **Incident Report** template when the issue affects sales, sync, tenant isolation, receipts, or production data.

Response goals:

- `SEV-1`: sales blocked, suspected data loss, tenant isolation risk, or repeated duplicate/decrement risk. Acknowledge within 4 business hours during pilot; same-day workaround target.
- `SEV-2`: sync delayed, printer unavailable, report/export wrong, or one device unhealthy while cashier sales continue. Acknowledge by next business day.
- `SEV-3`: cosmetic issue, wording issue, training question, or non-blocking request. Batch into the next planned support review.

Before public launch, Phase M must replace the pilot-channel sentence with a published support email, privacy link, and support-hour copy.

## First Five Minutes

1. Confirm whether the cashier can keep selling offline.
2. Ask a manager to copy the diagnostics bundle.
3. Record the app version, install ID, branch, cashier, unsynced count, review count, latest error, free disk, and time of incident.
4. Do not ask the store to reinstall the app unless a backup/restore path has already been verified for that device.
5. Do not manually edit SQLite or hosted Postgres as a first response.

## Severity Guide

| Severity | Use When                                                                                                     | First Action                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `SEV-1`  | Sales cannot continue, data loss is suspected, tenant data could be exposed, or inventory could double-apply | Preserve device state, collect diagnostics, open incident issue |
| `SEV-2`  | Sales continue but sync, printer, exports, or one device is degraded                                         | Collect diagnostics, apply runbook scenario                     |
| `SEV-3`  | Cosmetic, wording, training, or non-urgent setup help                                                        | Record issue, batch for planned work                            |

## Top Support Scenarios

### 1. Sale Did Not Sync

Symptoms:

- Diagnostics shows `Unsynced` greater than `0`.
- `Review` is `0` and latest error is empty or transient.

Steps:

1. Keep selling; local SQLite is the source of truth while offline.
2. Confirm the device has internet and the app has been brought to foreground.
3. Wait one foreground sync cycle.
4. Copy the support bundle if the unsynced count does not change.
5. Escalate as `SEV-2` if the queue does not drain after reconnecting.

Escalate as `SEV-1` if a sale appears twice on the receipt screen or if stock appears to decrement twice for one checkout.

### 2. Sync Row Needs Human Review

Symptoms:

- Diagnostics shows `Review` greater than `0`.
- Latest error starts with a reviewable prefix such as `pending_sync_review:`.

Steps:

1. Keep the device online and do not clear app data.
2. Copy the support bundle.
3. Compare physical stock with the product shown by the manager.
4. Escalate as `SEV-2`; use `SEV-1` if multiple products are affected during active selling.

Do not force-retry by editing local queue rows. Reviewable rows intentionally stop retrying until support decides whether a compensating inventory delta is needed.

### 3. Receipt Printer Not Connecting

Symptoms:

- Cashier can complete sales but cannot print.
- Bluetooth or USB printer is not visible or fails to pair.

Steps:

1. Continue sales using the receipt screen.
2. Confirm printer power, paper, and device Bluetooth permission.
3. Re-pair from device settings if the printer is visible but disconnected.
4. Copy diagnostics only if the app reports a printer error.
5. Escalate as `SEV-2` if sales require printed receipts for the store's workflow.

Never block checkout because the printer is unavailable. Receipt display is the fallback until printer integration is verified with hardware.

### 4. Lost Or Stolen Device

Symptoms:

- A cashier phone is missing, broken, stolen, or no longer controlled by the store.

Steps:

1. Treat as `SEV-1` if the device may still be signed in.
2. Open the web dashboard **Devices** page and find the last known install ID, branch, cashier code, last seen time, queue counts, and receipt-sequence snapshot.
3. If the device shows unsynced, failed, or reviewable local rows, get the manager-triggered local data export before marking it lost.
4. Use **Lost-device replacement** to mark the old device lost. This records the reporter, recovery note, latest receipt-sequence snapshot, and releases one paid-tier device slot for the replacement heartbeat.
5. Do not transfer receipt sequence ownership manually. The old sequence snapshot stays attached to the lost device for support review.

Permanent restore still requires the replacement phone to sign in, heartbeat, restore products/categories from the server, and pass the first sync smoke test before the store uses it for customer receipts.

### 5. Restore On A New Phone

Symptoms:

- Store has a replacement phone and needs TD POS running again.

Steps:

1. Confirm the old phone has synced, if available.
2. Install the latest development or pilot build on the new phone.
3. Sign in with the provisioned phone number.
4. Confirm branch and cashier identity.
5. Run a small non-customer test sale only in a controlled pilot setup.

Do not tell a store to delete the old app or wipe data until restore-from-server bootstrap has been verified for that store.

### 6. Change Branch Or Cashier Code

Symptoms:

- Device is assigned to the wrong branch or cashier.
- Receipt namespace or reporting identity looks wrong.

Steps:

1. Stop using the device for new sales until identity is corrected.
2. Copy diagnostics.
3. Record current branch code, branch name, cashier code, and install ID.
4. Update assignment through the owner/admin path when available.
5. Escalate to engineering before changing receipt namespace after sales already exist.

Receipt numbers are intentionally namespaced. Changing identity after sales exist must preserve auditability.

### 7. Device Clock Looks Wrong

Symptoms:

- Receipts show an unexpected date or time.
- Reports group sales into the wrong day.

Steps:

1. Ask the manager to check the device time, timezone, and automatic time setting.
2. Copy diagnostics and note local wall-clock time plus the `Last server handshake` line.
3. If checkout shows the set-device-time prompt, stop new receipts on that device until time is corrected and the app reconnects.
4. Escalate as `SEV-2`; use `SEV-1` if receipts for active customers are affected.

The receipt guard blocks brand-new receipts when the device wall clock is more than 24 hours ahead of or behind the cached server handshake. Idempotent replay of an already-written sale remains allowed so recovery does not create a duplicate.

### 8. Low Disk Or Storage Pressure

Symptoms:

- Diagnostics shows low free disk.
- App feels unstable, exports fail, or the device is near storage capacity.

Steps:

1. Keep TD POS data intact. Do not clear app data.
2. Free storage by removing unrelated videos, downloads, and unused apps.
3. Reopen TD POS and copy diagnostics again.
4. Escalate if free disk remains low or SQLite writes fail.

The diagnostics bundle includes available and total disk bytes so support can compare before/after cleanup.

### 9. Phone OTP Or Account Setup Fails

Symptoms:

- User receives OTP but cannot enter the app.
- App shows account setup, branch, or provisioning error.

Steps:

1. Confirm the phone number is the provisioned E.164 Philippine number.
2. Confirm a `users` row exists and has a `business_id`.
3. Confirm the business has at least one active branch.
4. Ask the user to sign out and retry after provisioning is corrected.
5. Escalate as `SEV-2` if a pilot store cannot open cashier mode.

Do not add demo access for a real store. Demo mode stays development-only.

### 10. Stock Does Not Match Physical Count

Symptoms:

- Manager reports system stock differs from shelf count.
- Sync health may show reviewable inventory rows.

Steps:

1. Do not edit product stock directly.
2. Check recent sales and reviewable sync rows.
3. Count the physical stock in canonical pieces.
4. Use a compensating inventory delta path when it exists.
5. Escalate as `SEV-2`; use `SEV-1` if active selling would oversell scarce stock.

Canonical pieces are the source of truth. Never introduce fractional stock or absolute-stock sync patches.

## Escalation Packet

Every escalated issue should include:

- Severity.
- Store/business name.
- Branch and cashier code.
- Install ID.
- App version.
- Exact user-facing message.
- Support bundle text.
- Whether the cashier can continue selling.
- Whether internet was available.
- Whether the device time looks correct.
- Screenshots only when they do not expose customer personal data.

## What Support Must Not Do

- Do not ask for API keys, service role keys, passwords, or OTP codes.
- Do not paste secrets into GitHub issues or chat.
- Do not edit local SQLite rows as a normal fix.
- Do not write absolute stock values to the server.
- Do not bypass RLS with a secret key for routine support.
- Do not promise accreditation status before the business and device are accredited.

## Ownership

Pre-pilot and pilot support has a single-owner model: the project owner is accountable for triage, escalation, and final customer communication. If another person handles a ticket, the owner still confirms closure and updates this runbook when a new repeatable procedure is learned.
