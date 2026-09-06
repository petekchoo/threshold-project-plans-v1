# Project Work State

This file is the durable handoff for work that spans Codex tasks. Keep entries concise; product decisions and implementation traceability belong in `DESIGN.md` and `implementation-map.yaml`.

See `DEVELOPMENT.md` for the new-task startup, GitHub, Supabase, verification, and synchronization workflow.

Synchronization note: local `main` intentionally contains post-merge documentation commits beyond `origin/main` at `063e581`. They record the completed PR #26 handoff below and make the local-handoff branching exception explicit in `DEVELOPMENT.md`. Start the next task by branching from local `main`; carry these documentation commits through that feature branch and its pull request. Do not push the local-only commits directly to `origin/main`. Replace this note after the next feature PR is merged and local `main` is synchronized again.

## Active

- `TPL-01` / `TPL-02` project templates and project-from-template creation are active on `feature/project-templates`. Separate undated templates, deterministic rule/offset/duration scheduling, graph validation, Templates navigation, derived readiness, inline referenced-activity creation, searchable project creation, preview, and atomic materialization are implemented. `pnpm verify` passes with 64 tests, the production build passes, local schema lint reports no errors, and `pnpm db:test` passes 31 assertions including the 12-case template transaction suite after applying `202609060001` only to the disposable local stack. Linked status and dry-run confirm that `202609060001_project_templates.sql` is the only pending remote migration; it has not been applied remotely. Browser verification and pull-request release gates remain. This branch carries the intentional post-PR #26 local handoff commits beyond `origin/main`.

## Recently completed

- The phased responsive-web UX follow-up merged through GitHub PR #26 at merge commit `063e581`. GitHub Verify run 61 and Vercel passed on final head `023cb27`; `pnpm verify` passed with 58 tests, the production build passed, and Chromium smoke coverage passed 8/8 mobile checks at 390×844 and 4/4 desktop checks at 1440×900. The release replaces the unstable fixed mobile bottom navigation with a document-flow ginkgo header and complete drawer; standardizes responsive controls, filters, editors, typography, and containment; fixes mobile project schedules with a daily scale and Monday labels; and adds shared project tiles comparing elapsed time with activity completion. Commit `9cd0e87` remains the clean reference for the superseded Chrome workaround. The feature branch was removed locally and remotely, and local `main` was synchronized to `origin/main` before this handoff commit.
- The Instinct/mobile UX review and QA-05 browser-smoke release gate merged through GitHub PR #25 at merge commit `ca94e6c`. Repository Verify and Vercel passed on the final PR head; `pnpm verify` passed with 51 tests, the production build passed, all seven persistent Playwright checks passed across 390×844 mobile and 1440×900 desktop, and the feature branch was removed locally and remotely. The release implemented responsive navigation, filters, schedules, mobile cards, accessible form validation and activity disclosures, corrected project-team and Save controls, unified activity CTAs and empty states, stronger table/card legibility and contrast, and the Today treatment. Rejected or deferred review items remain documented and out of scope: top-drawer navigation, a mandatory 768px breakpoint, renaming All Events, a blanket timeline legend, wholesale copy/restyling, and unnecessary archive restyling.
- PRJ-06 Slice 3 and its release gate merged through GitHub PR #24 at merge commit `4c38fe3`. Repository and Vercel checks passed on the final PR head. `pnpm verify` passed with 48 tests and the production build passed; authorized live testing covered desktop and 390×844 mobile layout, keyboard cancellation/confirmation, atomic movement, conflict recovery, and stale-preview refresh with all test data restored. Local `main` was synchronized and the merged feature branch was removed locally and remotely.
- PRJ-06 Slice 2.1 merged through GitHub PR #22 at merge commit `ae5b130`. Vercel passed on the final PR head, and local `main` was fast-forwarded to `origin/main`; the merged feature branch was removed locally and remotely.
- Slice 2.1 verification handoff: migration `202609050002` is applied to the linked Supabase project; linked lint, generated types, `pnpm verify`, and production build pass. The complete migration history replays from empty local state; all 19 pgTAP assertions and the explicit-barrier `PRJ06-CON-01`–`PRJ06-CON-13` matrix pass. The matrix found the authenticated archive commit defect corrected by `202609050002`; rerun the matrix after any concurrency-path change. Docker Desktop folder sharing must remain enabled for this repository.

## Next

- Complete and release `TPL-01` / `TPL-02` using the linked requirement plan, including unit, database, and core-journey coverage.
- Establish a dedicated development Supabase backend for local application testing, separate from production. Define safe environment selection, credentials, migration promotion, seed/disposable fixture handling, and safeguards against accidental production writes. Docker remains the disposable database-test environment until this work is intentionally started.
- Extend scheduling unit coverage as later project-rescheduling slices and dependency behaviors are implemented (`QA-03`).
- Add database integration tests for dependency, timing, archive, and RLS behavior (`QA-04`).
- Extend QA-05 beyond the responsive smoke slice with disposable-fixture authentication, overview, CRUD, dependency, timeline, and administration journeys, then make it a required CI job.

## Distant future

- Consider a de novo native mobile client built with Expo and React Native after the mobile and desktop web experiences are robust. Keep the existing Next.js application unchanged as the web client; share the Supabase backend, authentication, row-level security, generated data types, and suitable pure scheduling logic while designing native navigation and screens independently. Begin only with a small read-only iPhone prototype covering sign-in, overview, projects, project detail, activity sequence, and activity detail, then evaluate the native experience before authorizing editing, notifications, TestFlight, or App Store release work.

## Working conventions

- Start from a requirement ID in `implementation-map.yaml`.
- Keep each commit focused on one concern and include its map/design/test updates.
- Run `pnpm verify` before committing.
- Never record credentials, access tokens, database passwords, or user data here.
