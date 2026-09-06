# QA-05 end-to-end core journeys

## Purpose

QA-05 protects complete user journeys that cross routing, responsive layout, authentication, client state, and persisted data. It complements Vitest unit tests under QA-03 and database tests under QA-04; it does not replace either suite.

## Test environments

- Chromium is the baseline browser for the first slice.
- Mobile assertions run at 390 × 844 and desktop assertions run at 1440 × 900.
- Tests authenticate with a dedicated non-production account supplied through `THRESHOLD_E2E_EMAIL` and `THRESHOLD_E2E_PASSWORD`.
- Local runs load those values directly from the ignored `.env.local` file when present; shell sourcing is not required.
- The baseline account must have at least one active project. Credentials, generated browser state, screenshots, traces, and reports are never committed.
- Slice 1 is read-only: editors are opened and cancelled, and tests must not save, archive, or otherwise change application data.

## Slice 1: responsive UX smoke coverage

The first persistent smoke suite covers the regressions most likely to escape component and calculation tests:

| Surface | Mobile, 390 × 844 | Desktop, 1440 × 900 |
| --- | --- | --- |
| Navigation | Route-aware bottom navigation; hidden sidebar; accessible More dialog, focus, Escape, and focus return | Sidebar remains visible; mobile navigation remains hidden |
| Lists and filters | Activity cards replace the table; filters disclose, count, and clear; project search, sort, archive, and count remain contained; custom checkboxes preserve 20px geometry and accessible labels | Tables and expanded filters remain visible with the same shared checkbox treatment |
| Project editor | Add team member remains available; Save and Cancel stay inside the viewport and dialog | Add team member and actions remain available and contained |
| Validation | Error summary, linked inline error, invalid state, and focus on the first invalid field | Covered through the same shared editor implementation |
| Overview | Project tiles remain visible; desktop-only timeline ranges remain hidden while Draft and Completed controls remain usable | Timeline range controls remain visible and functional |
| Project and activity detail | Schedule labels remain distinct at narrow date-domain boundaries; summary values remain inside their cells; the project activity editor keeps required markers, nested sections, and final actions visually contained | Existing schedule remains visible, and only one Add activity action is exposed |
| Administration | Rows and their actions remain contained at the narrow viewport | Cards retain the shared visual primitives and layout |

## Execution policy

- Run `pnpm verify` for every local change and in the standard GitHub verification workflow.
- Run `pnpm test:e2e:mobile` when changing responsive navigation, mobile lists/cards, filters, dialogs, or narrow-screen CSS.
- Run `pnpm test:e2e:desktop` when changing the sidebar, desktop tables, filters, dialogs, or wide-screen CSS.
- Run the complete `pnpm test:e2e` suite before merging changes that affect shared shell behavior, responsive breakpoints, forms, routing, or both layouts.
- Install the pinned Chromium runtime once per machine or CI image with `pnpm exec playwright install chromium`.

## Future slices

- Add isolated authentication, overview, activity-editor disclosure, timeline Today marker, dependency, and administration journeys.
- Add create/edit/archive tests only with disposable seeded fixtures and teardown. They must not write to a shared development or production project.
- Add a required GitHub Actions browser-test job after a dedicated CI account or disposable local Supabase fixture lifecycle is available.

## Acceptance gate

Slice 1 is complete when Playwright discovers both viewport projects, the repository verification suite passes, the production build passes, and the browser smoke suite passes with dedicated E2E credentials. Failed runs retain traces and screenshots outside version control.
