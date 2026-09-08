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
- Data-changing journeys must refuse to run against production or another shared backend. The dedicated development backend and reserved fixture-reset lifecycle are available; mutation journeys remain deferred until each test is scoped to those fixtures and proves cleanup or reset behavior.

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

## Future slices

- Add project/template mutation journeys and deeper validation-recovery coverage as those workflows change.
- Add an automated accessibility audit after choosing and documenting its standards and exception policy.

## Acceptance gate

QA-05 is release-gate ready when Playwright discovers both responsive projects plus the core journeys, repository verification and the production build pass, the disposable local mutation run passes, and the required GitHub browser job passes on the final revision. Failed runs retain traces and screenshots outside version control.
