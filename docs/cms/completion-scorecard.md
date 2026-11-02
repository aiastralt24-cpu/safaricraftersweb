# CMS completion scorecard

Baseline: 23 October 2026, originally 45/100. Current: **52.5 / 100 points earned; 47.5 / 100 points remaining.**

This is a requirements/readiness assessment of the full retained PRD plus the requested structured Word/Excel imports. It replaces the earlier unsupported 60/40 estimate. The change does not mean work was lost: the denominator and evidence rules are now explicit. Scores are audit judgments, not measured engineering effort or a forecast of time remaining.

## Fixed scoring rules

Twenty delivery areas, each worth five points, give a fixed denominator of 100. Equal area weights are a transparent planning convention, not a claim that every area takes equal time. Discovery and architecture are reflected in the foundation, scope mapping and handover areas; planning alone cannot complete a feature.

Each area has four separate gates:
- Implementation: 0 = no usable capability established; 1 = foundations or a limited subset; 2 = substantial implementation with material scope/integration gaps; 3 = scoped implementation complete locally, with only external verification/acceptance remaining.
- Local verification: 0 = no meaningful execution evidence; 0.5 = partial automated/local evidence; 1 = broad local workflow evidence for the implemented core, including material failure cases. This does not assert every PRD scenario is tested.
- Deployed verification: 0 or 0.5, earned only by demonstrating the area's workflow on actual target infrastructure.
- Client acceptance: 0 or 0.5, earned only by documented independent client completion/acceptance.

No deployed or client-acceptance points are currently awarded. The observed CMS is setup-only. This means **no end-to-end client readiness has been demonstrated**, not that the existing code has no value. Local verification credit is separate from implementation completeness.

Implementation levels are deliberately coarse; they are not estimates of feature counts. Preserve these weights and scope between updates. Change a row only with evidence; record any owner-approved scope change separately and retain the old baseline. Do not raise a score simply because more files/tests exist.

## Complete score breakdown

All rows have deployed = 0 and client accepted = 0.

| # | Delivery area | Implementation /3 | Local verification /1 | Earned /5 | Remaining /5 | Existing work and next acceptance gap | PRD / remaining ledger |
|---|---|---:|---:|---:|---:|---|---|
| 1 | Independent backend and admin foundation | 3 | 1 | 4 | 1 | Schemas, APIs and admin shell exist; local database checks pass. Connect managed database and workers. | 24–25; R01–03 |
| 2 | Accounts, roles and access lifecycle | 2 | 0.5 | 2.5 | 2.5 | Permissions and sessions exist; invitations, recovery, MFA and real-provider access trials remain. | 4,26; R02,R24 |
| 3 | Website page coverage and page management | 2 | 0.5 | 2.5 | 2.5 | Many page families, MICE lifecycle, hierarchy and slug redirects now have local implementation evidence. Kenya now has ten-group editing, source-bound migration, public delivery and locally verified review/publish/withdraw/restore; width/spacing/alignment are connected. Other country coverage, remaining controls, full parity and hosted/client verification remain. | 2,7–8; R06–11,R16 |
| 4 | Visual builder and responsive preview | 2 | 0.5 | 2.5 | 2.5 | Sections, controls and private previews exist; full preview-to-field, shared impact and responsive workflows remain. | 9; R11,R15 |
| 5 | Rich text and editing convenience | 2 | 0.5 | 2.5 | 2.5 | Rich text plus page/homepage, journal, destination, expedition and journey undo/redo, conflict recovery and opt-in autosave exist locally. Full formatting, remaining editors and real-provider verification remain. | 10,19; R13–14 |
| 6 | Structured Word/Excel imports | 3 | 1 | 4 | 1 | Sixteen template families, parsing, validation and reviewed draft imports exist. Product imports, native Office and independent client trials remain. | 29 + requested import extension; R17 |
| 7 | Images and video management | 2 | 0.5 | 2.5 | 2.5 | Rights checks and processing contracts exist. Real processing/storage, bulk replacement, captions and external-video coverage remain. | 11; R04,R18 |
| 8 | Documents and downloadable resources | 2 | 0.5 | 2.5 | 2.5 | Document editor and file handling exist. Complete version/expiry/replacement workflows and provider delivery need proof. | 12; R04,R18 |
| 9 | Products and other content modules | 2 | 1 | 3 | 2 | Standalone project, news, event, leadership, application/industry, location, career, FAQ, certification and partner workflows now connect scoped editing, review, guarded publication and anonymous delivery with broad local evidence. Product/Shopify ownership, remaining reuse/relationship and multilingual coverage, and hosted/client acceptance remain. | 13–14; R09–10 |
| 10 | Global menus, footer and site settings | 2 | 0.5 | 2.5 | 2.5 | Editors and delivery contracts exist; every live global consumer still needs connection and verification. | 15; R12 |
| 11 | Editorial review, revisions and audit | 2 | 1 | 3 | 2 | Revision-bound approval, concurrency and audit checks exist. Coordinated release workflow and end-to-end approval trials remain. | 19; R19 |
| 12 | Publishing, restoration and scheduling | 2 | 1 | 3 | 2 | Local publish/restore/withdraw lifecycle works. Durable scheduling, real cache delivery and all route connections remain. | 20; R03,R05–07,R19 |
| 13 | Languages, regions and translations | 2 | 1 | 3 | 2 | Source-linked creation/recovery, revision status, saved comparison/review and navigation are implemented across twelve content families with local database/API/browser evidence. Documents require their own translated PDF; copied page filters/canonicals are adapted. An opt-in translated custom-page route and language-bound shared shell are locally rendered; custom pages now complete trusted validation and approved release locally. Translated navigation also passes approved release locally. Shared settings now complete approved release and feed the assembled anonymous page/shell loaders with matching revisions. Editorial language selection, reciprocal metadata and translated sitemap discovery now pass local integration checks. Other visitor families, regional overrides, translated search/commerce and fallback remain unfinished. | 21; R20 |
| 14 | SEO, search, dashboard and content health | 2 | 1 | 3 | 2 | Metadata/search policies, sitemap and editorial hreflang exist. Content health now has permission-scoped record checks, saved findings, exact editor links, audit history, publishing/delivery monitoring and recovery, document dates, asset rights and lead attention with broad local SQL/API/browser evidence. Website redirect export is locally verified. Live scans, orphan/broken-link reporting, broader SEO/search coverage and hosted acceptance remain. | 5–6,16,22–23; R21 |
| 15 | Forms, submissions and notifications | 2 | 0.5 | 2.5 | 2.5 | Form/submission contracts and durable handling exist. Real ingress, spam challenge, consent and notifications need integration. | 17; R22 |
| 16 | Lead management and CRM automation | 2 | 1 | 3 | 2 | Inbox/manual follow-up, duplicate review, controlled merging, automatic assignment, personal in-app reminders, notification recovery and bounded role-based exports have broad local core-workflow evidence. Out-of-app reminders, configured CRM delivery, larger/full-history exports, configurable stages and hosted/client acceptance remain. | 18; R23 |
| 17 | Privacy, consent and retention | 1 | 0.5 | 1.5 | 3.5 | Some settings and access protections exist. Operational consent, deletion/retention and approved analytics remain. | 26; R25 |
| 18 | Content migration and parity checks | 2 | 0.5 | 2.5 | 2.5 | Source-bound migration proposals, receipts and local tests exist. Actual migration, approvals and complete parity checks remain. | 30; R11,R26 |
| 19 | Deployment quality, monitoring and recovery | 1 | 0.5 | 1.5 | 3.5 | Local regression coverage and worker foundations exist. Deployed security/accessibility/load checks, alerts and measured restore remain. | 27–28; R01–04,R27–28 |
| 20 | Client UAT, training and launch handover | 1 | 0 | 1 | 4 | Acceptance plan and technical documentation exist. Client trials, training, operational ownership and cutover remain. | 31–34; R29–30 |
| | **Total** | **39 /60** | **13.5 /20** | **52.5 /100** | **47.5 /100** | Deployed verification: 0/10. Client acceptance: 0/10. | |

## Arithmetic

Earned = 39 implementation + 13.5 local verification + 0 deployed verification + 0 client acceptance = **52.5 points**.

Completion score = 52.5 ÷ 100 × 100 = **52.5%**.
Remaining score = 100 − 52.5 = **47.5%**.

Remaining points comprise 21 implementation + 6.5 local verification + 10 deployed verification + 10 client acceptance. These are score deficits, not estimates of hours or AI credits.

## Evidence and limitations

Primary evidence: [current readiness audit](current-audit-and-plan.md), [retained PRD](source-prd.md), and [observed setup screen](audit-2026-10-23/01-workspace.png).

The audit inspected runtime configuration presence, workspace dispatch, editors, routes, templates, SQL and worker entrypoints. The fresh local CMS suite passed 1,224 tests, zero failed/skipped, recorded at /private/tmp/cms-audit-2026-10-23-tests.log. Those results support local evidence only. That original scoring pass changed documentation only. Later implementation evidence is recorded in the change log; no deployment verification is claimed.

Source anchors by area:
- 01: database/cms; app/cms/workspace.tsx.
- 02: app/cms/access-workspace.tsx; app/cms/workspace.tsx.
- 03: app/cms/pages-workspace.tsx; app/private-aviation/page.tsx.
- 04: app/cms/page-section-options.ts; app/cms/aviation-section-preview.tsx.
- 05: app/cms/rich-text-editor.tsx; app/cms/pages-workspace.tsx.
- 06: public/cms/templates; app/cms/page-import-panel.tsx.
- 07: lib/cms image/video workers; tests/cms-hero-video-inspection.test.mjs.
- 08: app/cms/documents-workspace.tsx; tests/cms-document-file-api.test.mjs.
- 09: app/cms module workspaces; source-prd.md sections 13–14.
- 10: app/cms/settings-workspace.tsx; app/cms/menus-workspace.tsx.
- 11: database/cms; local CMS lifecycle suite summarized in current-audit-and-plan.md.
- 12: app/api/cms/workers; database/cms migrations 188–193.
- 13: database/cms migrations 242–247; lib/cms/translation-*.ts; app/cms/translation-*-panel.tsx; settings-workspace-state.ts; docs/cms/translation-tracking.md; audit R20.
- 14: app/sitemap.ts; tests/cms-public-seo-settings.test.mjs.
- 15: app/cms/forms-workspace.tsx; lib/cms/enquiry-runtime.ts.
- 16: app/cms/leads-workspace.tsx.
- 17: app/cms/settings-workspace.tsx; audit R25.
- 18: lib/cms migration modules; docs/cms editability inventories.
- 19: tests/cms-*.test.mjs; audit evidence and screenshot.
- 20: docs/cms/current-audit-and-plan.md; docs/cms/source-prd.md.

The audit is not an exhaustive security clearance. Some gaps are incomplete coverage rather than wholly absent code. Generic PRD modules remain in scope until explicitly excluded by the owner; the product/store integration decision remains unresolved. Requirements that overlap are allocated by outcome: editing convenience in area 5, approvals in 11, scheduling/delivery in 12, privacy policy in 17, infrastructure checks in 19. Do not award the same outcome twice.

## Execution order and future updates

Use the existing audit's six execution batches rather than starting another parallel plan:
1. A: working staging connection, accounts, workers and one real edit/import → preview → approve → publish → restore → unpublish workflow.
2. B: complete Aviation and other existing route/global integrations.
3. C: finish route/module coverage and page/URL management.
4. D: finish editing, import and media experience.
5. E: complete scheduling, translations, SEO/search, lead automation and governance.
6. F: migrate, verify deployment/recovery, run all 20 UAT scenarios and hand over.

After each completed batch, update affected row gates with evidence and report previous score → new score, what completed and the remaining gap. Do not promise a point increase before acceptance checks pass.

## Change log

- 2026-10-23: First fixed-denominator baseline: 45/100. Supersedes the unsubstantiated 60/40 estimate; no implementation regression is implied.


- 2026-10-23: Aviation visitor/admin/SEO/sitemap integration completed locally; 1,232 CMS tests and production build passed. Area 3 remains 2 implementation + 0.5 local points because other route/management gaps remain. Total remains 45/100; no deployed or client acceptance awarded.

- 2026-10-23: Shared page composition undo/redo implemented and verified in a real local browser. Area 5 stays at 1 implementation + 0.5 local points: full formatting, autosave and other editor recovery remain incomplete. No staging/client points awarded.

- 2026-10-23: Extended page history to title, new-page path, composition, SEO and Concept navigation; local browser fixture proved ordered recovery and save reset. Other editors, autosave and formatting gaps remain; no score gate change.

- 2026-10-23: Page/homepage save-conflict comparison and explicit reconciliation implemented; local browser verification and 1,239 CMS tests passed. Other editor recovery, autosave and rich-text scope remain; no full area or staging gate claimed.

- 2026-10-23: Area 5 implementation advances from 1 (limited subset) to 2 (substantial with gaps): page/homepage undo/redo, explicit conflict recovery and opt-in autosave now work together in local browser trials. All 1,239 CMS tests and production build passed. Full formatting and equivalent workflows in other editors remain, so implementation does not receive 3/3 and local verification stays partial. Total 45 → 46/100; weights unchanged.

- 2026-10-23: Shared paragraph schema/editor/rendering now supports bold, italic, superscript and subscript with exact fallback text and safe literal rendering. Local browser checks passed. Quotes/tables and formatting parity remain; area 5 stays at 2/3 implementation and total 46/100.

- 2026-10-23: Shared rich-text quotes and bounded accessible tables implemented and locally browser-verified. Separate journal/list formatting and import-template authoring remain. No area/staging gate change; total 46/100.

- 2026-10-23: Journal paragraph formatting connected through editor, draft/public renderers and migration 194; browser and local SQL privacy checks passed. Real migration/publication acceptance remains pending. Total stays 46/100.

- 2026-10-23: Journal tables now reuse shared schema/editor/rendering with migration 195 for bounded allowlisted delivery. Local browser and database checks passed; deployment and native import authoring remain. Total stays 46/100.

- 2026-10-28: Area 13 changes from 0 implementation + 0 local verification to 1 + 0.5. Source-linked drafts, revision-derived review flags, saved comparisons, recoverable creation/cancellation and navigation are implemented and locally verified across twelve content families. This meets the limited-subset implementation gate and partial local-verification gate. It does not meet 2/3: visitor-language delivery, regional overrides, translated references, language SEO and explicit fallback remain missing. The 1,539-test suite/build/type checks and family-specific desktop/mobile fixtures support the implemented subset, not full localization acceptance. Total **46 → 47.5/100**, remaining **52.5/100**; deployed and client-accepted points remain zero. A fresh staging preflight still reports all nine base settings missing (`/private/tmp/cms-staging-recheck-20261028.log`). No other area was rescored in this pass.

- 2026-10-28: Area 13 rises from 1 implementation + 0.5 local verification to 2 + 1. Translation authoring/review across twelve families is now joined by a locally rendered custom-page route and actual approved page/menu/settings publication feeding the assembled anonymous loaders. Local database checks cover stale dependencies, wrong-language targets, translation review and withdrawal; desktop/mobile checks cover public rendering and authoring controls separately. This meets substantial implementation and broad local core-workflow evidence, with material gaps retained for other visitor families, regions, search/commerce, language selection/hreflang and fallback. Total **47.5 → 49/100**, remaining **51/100**. No deployment or client-acceptance points are awarded. Evidence is detailed in translation-tracking.md and `/private/tmp/cms-localized-settings-release-full.log` (1,575 passing tests), with build/type/browser results alongside it.

- 2026-10-29: Area 14 local verification rises from 0.5 to 1 for broad implemented-core coverage across content health, findings, operational monitoring, permission failures, recovery and exact navigation (migrations 263–274, content-health.md). Implementation remains 2: live link/orphan scans, broader SEO/search and other PRD dashboard coverage remain. Migration 275 additionally completes local website-wide redirect export with global permission/MFA enforcement, one-statement inventory, bounds and no partial download. All 1,635 CMS tests, production build, TypeScript and desktop/mobile download checks pass. Total **49 → 49.5/100**, remaining **50.5/100**; zero hosted/client points. Fresh staging preflight still reports all nine base settings missing. Evidence: `/private/tmp/cms-site-redirect-{full,build,types,browser,migrations}.log` and `/private/tmp/cms-staging-recheck-20261029.log`.

- 2026-10-29: Area 16 moves from 1 implementation + 0.5 local verification to 2 + 1. Current source and retained local evidence show a substantial lead workflow: permission-scoped duplicate review, controlled merging with request recovery, ordered automatic assignment, generation-bound personal reminders, exhausted notification recovery and audited operational JSON export (SQL 290–295). Database tests cover permissions, stale state, atomic failure and exact replay; browser checks cover the implemented client workflows at 1280/390 widths. Latest full suite: 1,705 passed, no skips, `/private/tmp/cms-lead-export-full.log`; feature browser logs and limitations are linked from the lead guides. CRM/provider delivery, larger/full-history exports, configurable stages and hosted/client verification remain, so implementation is not 3/3. Total **49.5 → 51/100**, remaining **49/100**. Fresh presence-only staging preflight still reports all nine base settings missing (`/private/tmp/cms-progress-recheck-20261029.log`); no hosted or client points are awarded. Area 9 stays unchanged after the [structured-module reconciliation](structured-module-coverage.md).

- 2026-10-30: Area 9 moves from 1 implementation + 0.5 local verification to 2 + 1 after reconciling retained PRD §13–14 with the current workspace, migration guards, anonymous readers and actual local workflow tests. This recognizes substantial standalone module behavior beyond the earlier project draft foundation. In particular, certification evidence ownership/sign-off, trusted validation, approved publication, private-field exclusion, rights revocation and withdrawal are exercised in the real local database; career scheduling/import/application workflows and the other named modules have retained local database/browser evidence. The latest full suite passed 2,414 tests; the later template-only batch passed 20 targeted tests and desktop/mobile import/download/recovery checks. Product/Shopify management and dedicated dealers/service partners remain missing, while other module reuse/translation/relationship and acceptance gaps remain explicit. These prevent 3/3 implementation. Total **51 → 52.5/100**, remaining **47.5/100**; no hosted/client points awarded. See structured-module-coverage.md for the corrected current ledger. This is a readiness score, not an elapsed-time estimate.
