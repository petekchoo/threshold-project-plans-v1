# QA-05 end-to-end core journeys

## Purpose

QA-05 protects complete user journeys that cross routing, responsive layout, authentication, client state, and persisted data. It complements Vitest unit tests under QA-03 and database tests under QA-04; it does not replace either suite.

## Test environments

- Chromium is the baseline browser for the first slice.
- Mobile assertions run at 390 × 844 and desktop assertions run at 1440 × 900.
- Both viewport projects target the same application server and therefore the same Supabase backend. “Mobile” changes the viewport and responsive behavior; it is not a separate application deployment or database environment.
- Physical-device validation uses the same server and backend. Start the server with `THRESHOLD_ALLOWED_DEV_ORIGINS=<mac-lan-address>`, open the printed port-3000 `Network` URL on a phone sharing the trusted network, and confirm the server reports no blocked cross-origin development-resource requests. Never commit the machine-specific address.
- Treat the phone URL as a separate authentication origin from `localhost`, earlier LAN addresses, and Docker-backed runs. Sign in at the current phone URL; if a restarted development session shows a stale error overlay or unresponsive controls, fully reload or open a new tab before classifying it as a product defect.
- Without `E2E_BASE_URL`, Playwright starts or reuses `http://localhost:3000`. With `E2E_BASE_URL`, it targets that explicit server and does not start the local Next.js process.
- The targeted application's `NEXT_PUBLIC_SUPABASE_URL` determines its backend. Docker-local Supabase is used by database tests but does not become the browser backend unless the application process is explicitly configured for it.
- Before every browser run, classify the target backend as Docker-local, dedicated development, preview/staging, or production/shared without exposing its URL, credentials, or project identifier. Record that classification in the task handoff.
- Tests authenticate with the dedicated development account supplied through `THRESHOLD_DEV_E2E_EMAIL` and `THRESHOLD_DEV_E2E_PASSWORD`. The development suite must never fall back to production smoke credentials.
- Local runs load those values directly from the ignored `.env.local` file when present; shell sourcing is not required.
- The baseline account and resettable fixture graph live in the dedicated hosted development project. `pnpm db:seed:dev` creates or updates the account and replaces only records using reserved fixture identifiers; credentials, generated browser state, screenshots, traces, and reports are never committed.
- Slice 1 is read-only: editors are opened and cancelled, and tests must not save, archive, or otherwise change application data.
- Data-changing journeys must refuse to run against production or another shared backend. Activity and administration mutation journeys run in CI against disposable local Supabase with deterministic fixture setup and teardown. The dedicated development backend and reserved fixture-reset lifecycle remain available for separately authorized local mutation runs. Future project and template mutation journeys must meet the same scoped-fixture and verified-cleanup requirements before enforcement.

## Slice 1: responsive UX smoke coverage

The first persistent smoke suite covers the regressions most likely to escape component and calculation tests:

| Surface | Mobile, 390 × 844 | Desktop, 1440 × 900 |
| --- | --- | --- |
| Navigation | In-flow linked Threshold header; hidden sidebar and bottom navigation; complete route-aware drawer with focus, Escape, and focus return | Sidebar remains visible; mobile header remains hidden |
| Lists and filters | Activity cards replace the table and omit secondary priority while elevating overdue state; activity and project filters disclose, count, and clear; project status, owner, type, end date, sort, archive, and count remain contained; custom checkboxes preserve 20px geometry and accessible labels | Tables and the complete activity/project filter sets remain expanded with the same shared checkbox treatment |
| Project editor | Add team member remains available; Save and Cancel stay inside the viewport and dialog | Add team member and actions remain available and contained |
| Validation | Error summary, linked inline error, invalid state, and focus on the first invalid field | Covered through the same shared editor implementation |
| Overview | Shared project tiles show exactly aligned project-window and activity-progress tracks; project dates frame elapsed time and Today appears only inside the window; desktop-only timeline ranges remain hidden while Draft and Completed controls remain usable on a dedicated row beneath the title | Timeline range controls remain visible and functional |
| Project and activity detail | Fixed daily schedule spacing, weekly Monday labels, and the dated end marker remain legible while opaque row labels mask bars at the boundary; the activity relationship timeline defaults to one available relationship group; the read-only activity summary forms an equal 2×2 grid with a Dates label; Add activity does not wrap; the project activity editor opens only Activity details initially and keeps required markers, nested sections, full-width Notes, and final actions visually contained | The same fixed schedule scale remains visible; the activity relationship timeline exposes project, selected activity, direct relationships, textual direction, and working filters; the activity summary uses four equal cells; only one Add activity action is exposed |
| Administration | Rows and their actions remain contained at the narrow viewport | Cards retain the shared visual primitives and layout |

The desktop project also checks activity-context containment at an intermediate 820px viewport. These checks assert semantic visibility and page containment rather than brittle exact placement.

## Execution policy

- Run `pnpm verify` for every local change and in the standard GitHub verification workflow.
- Run `pnpm test:e2e:mobile` when changing responsive navigation, mobile lists/cards, filters, dialogs, or narrow-screen CSS.
- Run `pnpm test:e2e:desktop` when changing the sidebar, desktop tables, filters, dialogs, or wide-screen CSS.
- Run the complete `pnpm test:e2e` suite before merging changes that affect shared shell behavior, responsive breakpoints, forms, routing, or both layouts.
- Install the pinned Chromium runtime once per machine or CI image with `pnpm exec playwright install chromium`.

## Slice 2: isolated core journeys and required CI

- `e2e/core-journeys.spec.ts` covers unauthenticated routing, the authenticated overview, activity create/edit/archive with a persisted dependency, and administration create/edit/archive.
- Mutation journeys run only when `THRESHOLD_E2E_MUTATIONS=1`. The required CI job sets this flag only through `scripts/run-local-e2e.mjs`, which requires a running disposable local Supabase stack, creates a local-only account, and replaces only deterministic QA fixtures before Playwright starts.
- Guarded development runs use the reserved fixture graph and delete standalone reference rows only when their names carry the `DEV QA E2E` prefix; reset the fixtures after every mutation run.
- The required browser job always reports a result. `scripts/e2e-scope.mjs` selects requirement-tagged core journeys for narrow changes, skips execution for documentation-only changes, and runs the complete responsive and core suite for shared, persistence, test-infrastructure, or otherwise cross-cutting changes.
- Automated scope selection may increase but never reduce ambiguous coverage. The complete suite remains the release gate for shared shell behavior, routing, forms, responsive breakpoints, persistence, and QA-05 infrastructure.
- Manual focused runs may pass a Playwright tag expression such as `@activities|@dependencies`; they do not replace the automatically selected pull-request gate.

## Slice 3: isolated project mutation journey

Add a `@projects` mutation journey to `e2e/core-journeys.spec.ts`. It must use only deterministic QA fixtures and run only when `THRESHOLD_E2E_MUTATIONS=1`.

The journey covers this complete lifecycle:

1. Create a blank project with a unique QA name, valid dates, project type, status, description, and assigned team member.
2. Confirm the saved project detail and list representation expose the persisted values.
3. Edit non-scheduling fields and confirm the updated values persist after navigation or reload.
4. Change project dates, assert the authoritative reschedule preview identifies the old and proposed windows and affected activities, confirm the applicable movement, and verify the resulting project and activity dates.
5. Exercise one recoverable validation path before a successful save. Prefer a stable client-owned case such as end before start; do not manufacture a database race solely for browser coverage.
6. Archive the project, confirm the impact prompt, return to the project list, and verify the record is absent by default and present when archived records are shown.

Fixture and cleanup requirements:

- Extend the disposable seed only where a deterministic project with movable activities is needed; do not mutate a baseline record needed by responsive tests unless the runner can restore it before another test observes it.
- Make the journey self-identifying through a reserved QA name or ID and safe to rerun after interruption.
- Verify cleanup through archive state or an explicit scoped reset. A passing UI assertion without fixture cleanup is insufficient.
- Keep the journey serial if it shares records with another mutation journey; otherwise preserve parallel execution.

## Slice 4: isolated template and materialization journeys

Add `@templates` to the scope selector and cover template authoring separately from project materialization so failures identify the broken boundary.

### Template authoring journey

1. Create a template with a unique QA name and project type.
2. Add at least two template activities with positive inclusive durations.
3. Add a project-end rule and an activity-relative rule, then verify the template becomes Ready and the relationship summaries persist after reload.
4. Edit the template and one activity, including a rule or duration change, and verify the updated schedule summary.
5. Exercise a recoverable invalid state, such as an unconnected activity or incomplete relative rule, and verify the user can correct it.
6. Archive the created template and verify default/archived list visibility.

### Project-from-template journey

1. Select the deterministic Ready fixture template from the Add project flow.
2. Enter a project name and end date and assert the previewed project window and activity dates.
3. Create the project and verify its Draft status, inherited type, complete Not Started activity graph, durations, rules, and materialized dates through the UI.
4. Reload the project detail to prove persistence rather than relying on optimistic client state.
5. Archive the generated project and reset or remove every journey-owned record through the scoped fixture lifecycle.

The browser journey verifies user-visible orchestration; existing Vitest and pgTAP suites remain authoritative for exhaustive graph resolution, rollback, and constraint matrices. Do not duplicate those matrices in Playwright.

## Slice 5: automated accessibility policy

Status: confirmed and implemented.

- Audit the axe-core rules tagged for detectable WCAG 2.2 Level A and AA conformance in Chromium.
- Fail the browser gate on serious or critical violations. Report moderate findings for triage without failing the gate.
- Audit sign-in, overview, project/activity/template lists and details, administration, and representative top-level and nested dialogs in both 390 × 844 mobile and 1440 × 900 desktop Chromium. Audit mobile navigation in the mobile project.
- Use the authenticated development fixture without enabling mutations; use an isolated anonymous context for sign-in.
- Wait for each named heading or dialog before auditing and exclude only incomplete transition/loading states.
- Report rule IDs, impact, selectors, failure summaries, and help links in test output and attachments.
- No exceptions are currently accepted. Any future exception must record the rule ID, exact selector scope, rationale, owner, and review date.
- No blanket rule disable, broad selector exclusion, or baseline snapshot that silently accepts existing violations is allowed.

## Slice 6: automated accessibility audit

Implementation and enforcement requirements:

1. Add the audit library as a direct development dependency and a small shared Playwright audit helper.
2. Add a dedicated accessibility spec or clearly marked tests so `scripts/e2e-scope.mjs` can require them for shared shell, responsive, form, and accessibility-related changes.
3. Audit the confirmed stable states and viewports, including modal focus state where applicable.
4. Report actionable rule IDs, affected selectors, impact, and help URLs while retaining normal Playwright traces/screenshots on failure.
5. Fix unexcepted violations before enabling the audit as a required CI gate.
6. Update `DESIGN.md`, `implementation-map.yaml`, and this plan with the confirmed policy, covered states, exceptions, and verification command.

Baseline implementation completed on 2026-09-09 and promoted to enforcement on 2026-09-11:

- `e2e/accessibility-baseline.spec.ts` audits sign-in, overview, project/activity/template lists and details, administration, representative project/template/nested dialogs, and the mobile navigation dialog.
- Both 390 × 844 mobile Chromium and 1440 × 900 desktop Chromium run the baseline through `pnpm test:e2e:accessibility` or the complete browser suite.
- Each state reports violation counts, serious/critical candidates, rule IDs, selectors, failure summaries, and help links. Serious and critical findings fail the release gate; moderate findings remain visible for triage.
- The first read-only run found color contrast in every audited state, a mobile template-list scroll-region focusability issue, and desktop project/team-member dialog target-size findings. Shared contrast tokens and metadata styles, the template scroll region, and the affected table targets were remediated. On 2026-09-11 the complete read-only suite passed 21 checks with two mutation journeys correctly skipped, and every covered state reported zero detectable violations.
- No application data was changed.

## Delivery sequence

- Deliver Slice 3 first because it extends the proven isolated mutation pattern and covers the existing project-rescheduling boundary.
- Deliver Slice 4 second because its fixture graph and cleanup surface are broader and it depends on stable project creation assertions.
- Slice 5 policy, Slice 6 remediation, and enforcement are complete. Maintain the gate as covered states evolve.
- QA-03 is not a prerequisite. Add unit coverage only if implementing these journeys exposes or changes pure scheduling behavior.

## Acceptance gate

Each remaining slice is release-gate ready when Playwright discovers the new tagged journeys in the intended projects, repository verification and the production build pass, the disposable local mutation run passes where applicable, scoped cleanup is verified, and the required GitHub browser job passes on the final revision. Accessibility auditing additionally requires the confirmed policy, zero unexcepted failures at the chosen threshold, and narrow documented exceptions. Failed runs retain traces and screenshots outside version control.
