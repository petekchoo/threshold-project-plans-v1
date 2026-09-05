# Project Work State

This file is the durable handoff for work that spans Codex tasks. Keep entries concise; product decisions and implementation traceability belong in `DESIGN.md` and `implementation-map.yaml`.

See `DEVELOPMENT.md` for the new-task startup, GitHub, Supabase, verification, and synchronization workflow.

## Active

- Complete the PRJ-06 Slice 2.1 release gate under `plans/PRJ-06-project-scoped-locking.md`: migration `202609050002` is applied to the linked Supabase project; linked lint, generated types, local verification, and build checks pass. GitHub PR #22 is open and mergeable; confirm the current head's Vercel check, then review and merge before Slice 3.
- Slice 2.1 verification handoff: the complete migration history replays from empty local state; all 19 pgTAP assertions and the explicit-barrier `PRJ06-CON-01`–`PRJ06-CON-13` matrix pass. The matrix found the authenticated archive commit defect corrected by `202609050002`; rerun the matrix after any concurrency-path change. Docker Desktop folder sharing must remain enabled for this repository.

## Next

- Deliver Slice 3 of project schedule shifting: connect project date edits to the authoritative preview and confirmation flow, including complete conflict recovery and accessible responsive behavior.
- Selectively incorporate Instinct's external feedback before beginning project templates. Inventory each recommendation, compare it with Threshold's confirmed product rules and current implementation, record an explicit adopt/adapt/defer/reject decision with rationale, and implement only the approved changes with appropriate requirement mapping and verification.
- Design and deliver reusable project templates for common or repeating work such as private dinners and menu launches. Define which project fields, activity details, relative date offsets, dependencies, project-relative timing rules, and assignments belong in a template; support template maintenance and atomic creation of an editable dated project with its complete activity graph. Reuse the project schedule-shifting model for date materialization and add unit, database, and core-journey coverage.
- Extend scheduling unit coverage as later project-rescheduling slices and dependency behaviors are implemented (`QA-03`).
- Add database integration tests for dependency, timing, archive, and RLS behavior (`QA-04`).
- Add end-to-end coverage for the core journeys (`QA-05`).

## Working conventions

- Start from a requirement ID in `implementation-map.yaml`.
- Keep each commit focused on one concern and include its map/design/test updates.
- Run `pnpm verify` before committing.
- Never record credentials, access tokens, database passwords, or user data here.
