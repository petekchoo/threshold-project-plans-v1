# Project Work State

This file is the durable handoff for work that spans Codex tasks. Keep entries concise; product decisions and implementation traceability belong in `DESIGN.md` and `implementation-map.yaml`.

See `DEVELOPMENT.md` for the new-task startup, GitHub, Supabase, verification, and synchronization workflow.

## Active

- Complete the Instinct/mobile UX review release gate. The approved implementation is complete locally: responsive navigation/filters/schedules, accessible validation and activity disclosures, corrected mobile project-team and Save controls, unified activity CTAs/empty states, stronger table/card legibility and contrast, and the Today treatment. `pnpm verify` passes with 51 tests, the production build passes, and authorized browser checks pass at 390×844 and 1440×900 with no console errors. QA-05 now includes a seven-test Playwright smoke slice for the highest-risk mobile and desktop regressions; its credentialed run remains part of the pre-merge gate. Rejected or deferred items remain out of scope: top-drawer navigation, a mandatory 768px breakpoint, renaming All Events, a blanket timeline legend, wholesale copy/restyling, and unnecessary archive restyling.

## Recently completed

- PRJ-06 Slice 3 and its release gate merged through GitHub PR #24 at merge commit `4c38fe3`. Repository and Vercel checks passed on the final PR head. `pnpm verify` passed with 48 tests and the production build passed; authorized live testing covered desktop and 390×844 mobile layout, keyboard cancellation/confirmation, atomic movement, conflict recovery, and stale-preview refresh with all test data restored. Local `main` was synchronized and the merged feature branch was removed locally and remotely.
- PRJ-06 Slice 2.1 merged through GitHub PR #22 at merge commit `ae5b130`. Vercel passed on the final PR head, and local `main` was fast-forwarded to `origin/main`; the merged feature branch was removed locally and remotely.
- Slice 2.1 verification handoff: migration `202609050002` is applied to the linked Supabase project; linked lint, generated types, `pnpm verify`, and production build pass. The complete migration history replays from empty local state; all 19 pgTAP assertions and the explicit-barrier `PRJ06-CON-01`–`PRJ06-CON-13` matrix pass. The matrix found the authenticated archive commit defect corrected by `202609050002`; rerun the matrix after any concurrency-path change. Docker Desktop folder sharing must remain enabled for this repository.

## Next

- Design and deliver reusable project templates for common or repeating work such as private dinners and menu launches. Define which project fields, activity details, relative date offsets, dependencies, project-relative timing rules, and assignments belong in a template; support template maintenance and atomic creation of an editable dated project with its complete activity graph. Reuse the project schedule-shifting model for date materialization and add unit, database, and core-journey coverage.
- Extend scheduling unit coverage as later project-rescheduling slices and dependency behaviors are implemented (`QA-03`).
- Add database integration tests for dependency, timing, archive, and RLS behavior (`QA-04`).
- Extend QA-05 beyond the responsive smoke slice with disposable-fixture authentication, overview, CRUD, dependency, timeline, and administration journeys, then make it a required CI job.

## Working conventions

- Start from a requirement ID in `implementation-map.yaml`.
- Keep each commit focused on one concern and include its map/design/test updates.
- Run `pnpm verify` before committing.
- Never record credentials, access tokens, database passwords, or user data here.
