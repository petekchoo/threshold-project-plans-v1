# Project Work State

This file is the durable handoff for work that spans Codex tasks. Keep entries concise; product decisions and implementation traceability belong in `DESIGN.md` and `implementation-map.yaml`.

See `DEVELOPMENT.md` for the new-task startup, GitHub, Supabase, verification, and synchronization workflow.

Synchronization note: local `main` intentionally contains one post-merge documentation commit beyond `origin/main` at `ca94e6c`. That commit includes both the completed PR #25 handoff in this file and the clarified post-merge continuation routine in `DEVELOPMENT.md`. Start the next UI task by branching from local `main`; carry the complete documentation commit through that feature branch and its pull request. Do not push the local-only commit directly to `origin/main`. Replace this note in the next task once the feature PR is merged and local `main` is synchronized again.

## Active

- Begin a fresh UI review and improvement round. Confirm the new feedback and intended scope before changing product behavior; evaluate each item against `DESIGN.md`, the applicable requirement entries, and the responsive desktop/mobile patterns established by PR #25. Preserve desktop behavior while testing affected mobile and desktop surfaces with the QA-05 browser smoke suite.

## Recently completed

- The Instinct/mobile UX review and QA-05 browser-smoke release gate merged through GitHub PR #25 at merge commit `ca94e6c`. Repository Verify and Vercel passed on the final PR head; `pnpm verify` passed with 51 tests, the production build passed, all seven persistent Playwright checks passed across 390×844 mobile and 1440×900 desktop, and the feature branch was removed locally and remotely. The release implemented responsive navigation, filters, schedules, mobile cards, accessible form validation and activity disclosures, corrected project-team and Save controls, unified activity CTAs and empty states, stronger table/card legibility and contrast, and the Today treatment. Rejected or deferred review items remain documented and out of scope: top-drawer navigation, a mandatory 768px breakpoint, renaming All Events, a blanket timeline legend, wholesale copy/restyling, and unnecessary archive restyling.
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
