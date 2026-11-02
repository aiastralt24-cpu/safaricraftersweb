# Recovering failed enquiry notifications

Open an enquiry and review **Notification delivery**. Temporary failures stay with the existing automatic retry worker. An exhausted failed job offers **Review notification retry**, followed by an explicit confirmation. Resolve the underlying provider/routing problem before queuing another cycle. A recorded retry does not confirm email delivery; the refreshed job status is authoritative.

SQL **294** allows recovery only when the job belongs to the selected website/enquiry, has failed after at least eight attempts, has finished and has no live lease. Current enquiry view and edit permission are required, including the existing privileged MFA policy. New retries are unavailable on merged source enquiries. Running, pending, successful and automatically retrying jobs cannot be reset. Read-only viewers see delivery status without retry controls.

Recovery retains the original job ID, operation and enquiry, resets attempts/error/final state, increments a retry generation and records an activity event atomically. The worker continues to use its existing provider idempotency key based on the original job ID. Provider-side idempotency retention and actual delivery must be verified with the selected provider; this local workflow cannot promise exactly-once email delivery.

The browser saves a minimal request under actor/website/enquiry scope before sending and uses Web Locks across tabs. Storage failure blocks the request. Lost responses, refresh and failed enquiry reloads preserve the same request for recovery. A durable database receipt makes exact retries harmless, including after the job finishes or fails again in a later cycle. A fresh request from an old generation cannot restart that later cycle. Clearing browser recovery state does not cancel a queued notification.

Only notification state is mutated. Enquiry versions, answers, follow-up dates, assignments and consent are not changed. During the operation the normal workspace busy state prevents edits/navigation; the confirmed reload updates both the record and its edit fields together.

Local evidence: SQL eligibility, record/tenant permissions, generation conflicts, exact replay across later cycles, atomic event failure and role denial. Strict API tests reject recipient/actor overrides and substituted receipts. Desktop/mobile browser checks cover confirmation/cancel, blocked storage, lost responses, refresh, failed reload, stable request identity, retained enquiry fields and read-only users. Full CMS suite: **1,702 tests pass with zero skips**, plus production build and TypeScript.

Pending: configured notification routes/provider, hosted worker execution, provider acknowledgement/idempotency behaviour, manual-recovery permissions with real MFA and client acceptance. No live job has been retried and no external email has been sent during these checks.
