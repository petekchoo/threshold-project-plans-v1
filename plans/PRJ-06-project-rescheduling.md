# PRJ-06 Project Rescheduling Implementation Plan

> Status: Implementation in progress — Slice 1 complete
> Requirement: `PRJ-06`
> Last updated: 2026-09-04

## Outcome

Let a user reschedule a project by editing its start and end dates directly. Before saving, show the complete proposed project and activity schedule, identify every blocking constraint, and commit an approved valid schedule atomically.

There is no movement-offset input. The application derives the activity movement from the difference between the old and new project end dates.

## Confirmed scheduling contract

### Move entire schedule

Use when the active project contains no completed activities.

- `end delta = new project end - old project end`, measured in calendar days.
- Shift every active activity start and due date by the end delta.
- Use the project start and end dates entered by the user.
- Leave archived activities and archived relationships unchanged.
- Preserve activity durations, relative spacing, internal dependencies, `DEP-06`, `DEP-07`, and valid `DEP-09` exceptions.
- Expansion creates unused planning space; it does not stretch activity dates.
- Compression consumes existing unused space; it does not shorten activity durations or gaps.
- If the shifted earliest activity precedes the entered project start, block confirmation and offer the containing start date for the user to apply explicitly.

### Reschedule remaining work

Use when at least one active activity is completed.

- Preserve the existing project start. A changed start is rejected with explanatory copy.
- Preserve completed activity dates.
- Shift each active incomplete activity by the end delta.
- Leave archived activities unchanged.
- Completion status does not waive dependency chronology. Without an actual completion timestamp, a completed prerequisite's retained due date remains its completion boundary everywhere: a finish-to-start dependent cannot begin before it, and a finish-to-finish dependent cannot finish before it.
- A completed dependent with an incomplete prerequisite is inconsistent and blocks the reschedule.
- If a fixed completed activity becomes invalid under `DEP-06`, `DEP-07`, `DEP-09`, or the project-start envelope, block and identify the conflict. Do not move completed dates, clear an exception, or alter a timing rule silently.

### Shared behavior

- Users may reopen completed activities through separate status changes. When no active activity remains Completed, a subsequent project-date edit uses Move entire schedule. A completed project itself must likewise be intentionally reopened in a separate save before it can be rescheduled.
- Project-relative timing rules and explicit exceptions remain hard constraints.
- Never move activities in another project automatically.
- Valid cross-project relationships remain unchanged. Invalid incoming or outgoing relationships are all listed and block the save until manually resolved.
- Canceling a preview makes no writes.
- Confirming a valid preview commits the project, owners, and all activity date changes in one transaction.
- A stale preview or any final-state validation failure rolls the entire transaction back.

## Architecture

### Pure scheduling planner

Add a focused planning module, preferably `lib/planning/project-reschedule.ts`, with typed inputs and outputs in `lib/planning/types.ts`.

The planner must:

1. Select `move_entire_schedule` or `reschedule_remaining_work` from active activity statuses.
2. Calculate the calendar-day end delta.
3. Produce every proposed activity date without mutating input data.
4. Classify moved, preserved-completed, and unchanged-archived activities.
5. Calculate expansion, compression, available lead-in, and the earliest containing project start.
6. Validate project date order, activity date order, `DEP-06`, `DEP-07`, `DEP-09`, and `DEP-10` against the proposed final state.
7. Validate internal and cross-project finish-to-start and finish-to-finish relationships in both directions, including the retained due-date boundaries of completed prerequisites.
8. Return all conflicts as structured records with stable codes and neutral user-facing facts.

The client planner supports responsive preview and fast feedback. It is not the authority for persistence.

### Authoritative Supabase planner and transaction

Add one cumulative migration containing shared database planning logic and two authenticated functions:

- `preview_project_reschedule(project_id, new_start, new_end)` returns the authoritative mode, end delta, proposed changes, conflicts, containing start option, and schedule fingerprint.
- `reschedule_project(project_payload, owner_ids, expected_schedule_fingerprint)` locks, recalculates, validates, and writes the final schedule.

The commit function must:

1. Require `auth.uid()` and an active project.
2. Lock the project, its active activities, active dependency edges, and directly affected external endpoints in stable identifier order.
3. Recalculate the proposal on the server; never accept client-supplied activity dates.
4. Compare a fingerprint covering the project dates/status, active activity dates/status/timing/exception fields, relevant dependency edges, and external counterpart state.
5. Reject stale previews and return a refresh-and-review message.
6. Reject completed projects, invalid date order, containment failures, fixed-completed conflicts, and all internal or external dependency conflicts.
7. Update project metadata, project owners, project dates, and derived activity dates in one transaction.
8. Force final constraint evaluation before returning a compact applied summary.

Replace the immediate project/activity timing triggers with equivalent `DEFERRABLE INITIALLY DEFERRED` constraint triggers, or another reviewed final-state mechanism. Do not use a caller-set session flag to bypass validation.

Harden the project write boundary consistently with `DEP-09`:

- Make authoritative project save/reschedule functions security-definer functions with explicit authentication checks and restricted execution grants.
- Prevent direct authenticated project-date writes from bypassing rescheduling.
- Preserve ordinary authenticated reads and realtime refresh.
- Review direct dependency and project-owner writes; route them through existing authoritative functions where the application already does so.
- Regenerate `database.types.ts` after applying the migration.

### Client preview and commit flow

Refactor `components/projects/project-form.tsx` so an existing project date change requests a preview instead of calling `save_project` immediately.

Add `components/projects/reschedule-preview-dialog.tsx` as the topmost modal. It must show:

- Original and entered project windows.
- Move mode and derived calendar-day end movement.
- Whether the window shifts, expands, or compresses.
- Every moved activity with old and proposed dates.
- Completed and archived activities that remain fixed.
- Preserved timing rules and project-date exceptions.
- The containing project-start option when compression does not fit.
- Every internal, external, timing, exception, or stale-state conflict.

Save is enabled only for an authoritative conflict-free preview. Enter confirms only when enabled; Escape or the preview backdrop cancels only the preview and preserves the project form. Confirmation calls only `reschedule_project`, then uses the existing refresh and toast flow.

## Delivery slices and validation gates

### Slice 1 — Pure planner and unit coverage

- Add rescheduling domain types and pure final-state calculation.
- Add scenario fixtures and Vitest coverage.
- Do not change persistence or UI behavior yet.

**Agent gate A:** Assign Luna agents the broad scenario matrix and Terra agents adversarial dependency/timing review. Require their tests to run against the same planner and fixtures. Reconcile any divergent interpretation before Slice 2.

### Slice 2 — Database preview, atomic commit, and integration coverage

- Add shared SQL planner, preview RPC, locked commit RPC, fingerprint, deferred final-state validation, and grant hardening.
- Add database tests for success, rejection, permissions, concurrency, and rollback.
- Apply the reviewed migration only after lint and dry run authorization.

**Agent gate B — primary code-level validation:** Give Terra agents the transaction, concurrency, RLS, and rollback scenarios against a disposable/local Supabase test database. Give Luna agents the full functional matrix against the real RPCs. Cross-review the two test sets. This is the earliest stage at which agents can validate detailed behavior through authoritative application code rather than only reviewing requirements.

### Slice 3 — Preview interface

- Wire project date edits to the authoritative preview.
- Add the responsive, keyboard-accessible preview and confirmation flow.
- Preserve ordinary non-date project editing.

**Agent gate C:** Run code-level requirement audits, then end-to-end browser scenarios for preview completeness, confirm/cancel, conflict recovery, mobile layout, and keyboard behavior. Live browser testing requires current-task authorization under `AGENTS.md`.

### Slice 4 — Release and handoff

- Run `pnpm verify`, database tests, `pnpm build`, schema lint, and migration dry run.
- Update `DESIGN.md`, `implementation-map.yaml`, and `TASKS.md` with actual coverage and known gaps.
- Apply authorized migrations, regenerate types, open a focused PR, require repository and Vercel checks, merge, and synchronize local/remote `main`.

## Acceptance matrix

| ID | Scenario | Required result |
| --- | --- | --- |
| PRJ06-01 | Whole schedule shifts later or earlier | Every active activity moves by the same end delta; durations and gaps are unchanged. |
| PRJ06-02 | Project has no active activities | Project dates save with no activity writes. |
| PRJ06-03 | Shift and expand | Activities move uniformly; added envelope space remains unused. |
| PRJ06-04 | Shift and compress with enough lead-in | Activities move uniformly and remain contained. |
| PRJ06-05 | Shift and compress beyond available lead-in | Preview blocks and offers the earliest containing project start; no automatic compression. |
| PRJ06-06 | Only project start changes | Activities do not move; later start is allowed only when it contains every active activity. |
| PRJ06-07 | Invalid or unchanged dates | Invalid order is rejected; unchanged dates use ordinary project save without a reschedule preview. |
| PRJ06-08 | Completed work exists | Project start and completed dates remain fixed; incomplete activities move by the end delta. |
| PRJ06-09 | Completed prerequisite | Its retained due date remains the completion boundary; moving an incomplete dependent before that finish-to-start or finish-to-finish boundary blocks the preview. |
| PRJ06-10 | Completed dependent with incomplete prerequisite | Preview identifies inconsistent state and blocks. |
| PRJ06-11 | Internal FTS and FTF relationships | Common movement preserves each relationship and existing scheduling space. |
| PRJ06-12 | Incoming cross-project conflict | External work remains fixed; preview lists the conflict and blocks. |
| PRJ06-13 | Outgoing cross-project conflict | External work remains fixed; preview lists every affected dependent and blocks. |
| PRJ06-14 | Valid cross-project relationship | Project moves without changing the external activity or relationship. |
| PRJ06-15 | Active `DEP-06` or `DEP-07` activity | Project and activity movement preserves the rule exactly. |
| PRJ06-16 | Fixed completed timing activity becomes invalid | Preview blocks without changing its dates or rule. |
| PRJ06-17 | Active approved after-project exception | Project and activity move together; the exception remains valid without a second warning. |
| PRJ06-18 | Fixed completed exception becomes inconsistent | Preview blocks without silently changing the flag or completed dates. |
| PRJ06-19 | Archived activities or relationships | They remain untouched and do not constrain the operation. |
| PRJ06-20 | Completed project | Rescheduling is blocked until a separate intentional reopen. |
| PRJ06-21 | Cancel and confirm | Cancel writes nothing; confirm commits exactly the authoritative preview. |
| PRJ06-22 | Final validation failure | Project, owner, and activity changes all roll back. |
| PRJ06-23 | Direct or unauthenticated write | Direct date bypass and unauthenticated RPC execution are denied. |
| PRJ06-24 | Concurrent edit after preview | Stale fingerprint is rejected and the user must refresh the preview. |
| PRJ06-25 | Leap day or daylight-saving boundary | Calendar-day delta and resulting ISO dates remain exact. |
| PRJ06-26 | Responsive and keyboard preview | Full impact remains usable on mobile; topmost-modal Enter/Escape policy is preserved. |

## Explicit non-goals

- Proportional stretching or compression of activity durations or gaps.
- Automatically moving another project through a cross-project dependency.
- Moving archived or completed activity dates.
- Capturing an actual completion timestamp.
- Combining completed-project reopening with rescheduling.
- Implementing reusable project templates in this change.
