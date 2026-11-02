# Permission-controlled enquiry exports

Open **CMS → Enquiries → Export enquiries**, choose a status or all statuses, then select **Download enquiry JSON**. The portable `cms-leads-1` file contains the website, exporting actor, export time, filter, count and records in stable ID order.

Each record includes original answers, consent and source attribution; pinned form/revision identifiers and field/option labels; current status, priority, owner, follow-up date, outcome and CRM reference; timestamps/version and merge state. Merged original submissions are retained. A merge destination is included only when the exporter can both view and export that destination. Internal notes, activity history, notification jobs and attachment binaries are not included in this operational record export; broader audit/asset portability remains separate work.

SQL **295** requires a distinct lead export grant and the existing privileged MFA policy. Every row must also pass current lead view and export checks. General content access or lead view alone is insufficient. Record-scoped export grants are supported. The export event records actor, status filter, format and count without copying contact answers into the audit log. Revoked members, anonymous callers and cross-website requests cannot export.

A single download supports up to 1,000 records and 9,000,000 bytes of serialized record data. Oversized selections fail entirely, with no partial file or successful export audit. The UI can narrow by status. Larger exports, finer filtering and full history/asset exports remain unfinished scope; do not describe this as unlimited backup or complete system portability.

The browser validates website, actor, filter, count and ordering before downloading, with a further 10 MB compact-response limit. JSON preserves literal punctuation, newlines and strings beginning with `=` without interpreting them as spreadsheet formulas. Responses are private/no-store. These downloads contain client data and should remain with authorized client records.

Local verification: database permission intersections, inaccessible rows and merge targets, pinned labels/consent, status filtering, revocation, tenant isolation, export limits and success-audit counts. Desktop/mobile browser tests read the actual downloaded synthetic JSON and verify literal answers and consent, plus refusal of actor-mismatched and denied responses. **1,705 CMS tests pass with no skips**, production build and TypeScript pass.

Pending: hosted roles/MFA and export load checks, larger-dataset workflows and client acceptance. No real client records were exported during development.
