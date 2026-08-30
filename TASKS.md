# Project Work State

This file is the durable handoff for work that spans Codex tasks. Keep entries concise; product decisions and implementation traceability belong in `DESIGN.md` and `implementation-map.yaml`.

See `DEVELOPMENT.md` for the new-task startup, GitHub, Supabase, verification, and synchronization workflow.

## Active

- Complete the project-relative timing feature verification and resolve the partial-coverage items recorded under `DEP-07` and `DEP-09`.

## Next

- Evaluate reformatting or decomposing `components/threshold-app.tsx` so future changes can use precise, reviewable patches without broad mechanical text replacement.
- Evaluate project-date change behavior, including when significant start/end changes should preserve activity dates, propose schedule shifts, propagate changes through dependencies, or require manual resolution and confirmation.
- Evaluate reusable project templates that preserve a project's activity structure and relative scheduling, then generate a new project and activity set with updated dates and editable details.
- Add automated scheduling unit tests (`QA-03`).
- Add database integration tests for dependency, timing, archive, and RLS behavior (`QA-04`).
- Add end-to-end coverage for the core journeys (`QA-05`).

## Working conventions

- Start from a requirement ID in `implementation-map.yaml`.
- Keep each commit focused on one concern and include its map/design/test updates.
- Run `pnpm verify` before committing.
- Never record credentials, access tokens, database passwords, or user data here.
