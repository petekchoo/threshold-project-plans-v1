# Project Work State

This file is the durable handoff for work that spans Codex tasks. Keep entries concise; product decisions and implementation traceability belong in `DESIGN.md` and `implementation-map.yaml`.

See `DEVELOPMENT.md` for the new-task startup, GitHub, Supabase, verification, and synchronization workflow.

## Active

- Resolve the direct-write exception gap recorded under `DEP-09`.

## Next

- Evaluate project-date change behavior, including when significant start/end changes should preserve activity dates, propose schedule shifts, propagate changes through dependencies, or require manual resolution and confirmation.
- Evaluate reusable project templates that preserve a project's activity structure and relative scheduling, then generate a new project and activity set with updated dates and editable details.
- Expand scheduling unit tests to cover both dependency types and project-edit scenarios (`QA-03`).
- Add database integration tests for dependency, timing, archive, and RLS behavior (`QA-04`).
- Add end-to-end coverage for the core journeys (`QA-05`).

## Working conventions

- Start from a requirement ID in `implementation-map.yaml`.
- Keep each commit focused on one concern and include its map/design/test updates.
- Run `pnpm verify` before committing.
- Never record credentials, access tokens, database passwords, or user data here.
