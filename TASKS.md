# Project Work State

This file is the durable handoff for work that spans Codex tasks. Keep entries concise; product decisions and implementation traceability belong in `DESIGN.md` and `implementation-map.yaml`.

See `DEVELOPMENT.md` for the new-task startup, GitHub, Supabase, verification, and synchronization workflow.

## Active

- Continue the approved `PRJ-06` project-rescheduling plan in `plans/PRJ-06-project-rescheduling.md`. Slice 1's pure planner, unit matrix, and Luna/Terra review gate are complete; begin Slice 2 with the authoritative database preview and atomic transaction design.

## Next

- Deliver project schedule shifting so a user can move a project to new calendar dates and preview an atomic shift of its active activities. Preserve activity durations, relative spacing, dependency relationships, and project-relative timing rules; cover the resulting client calculations and database transaction path with automated tests.
- Design and deliver reusable project templates for common or repeating work such as private dinners and menu launches. Define which project fields, activity details, relative date offsets, dependencies, project-relative timing rules, and assignments belong in a template; support template maintenance and atomic creation of an editable dated project with its complete activity graph. Reuse the project schedule-shifting model for date materialization and add unit, database, and core-journey coverage.
- Expand scheduling unit tests to cover both dependency types and project-edit scenarios (`QA-03`).
- Add database integration tests for dependency, timing, archive, and RLS behavior (`QA-04`).
- Add end-to-end coverage for the core journeys (`QA-05`).

## Working conventions

- Start from a requirement ID in `implementation-map.yaml`.
- Keep each commit focused on one concern and include its map/design/test updates.
- Run `pnpm verify` before committing.
- Never record credentials, access tokens, database passwords, or user data here.
