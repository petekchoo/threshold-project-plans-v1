# DEP-11 Dated activity schedule rules

## Purpose and classification

This plan governs applying the template activity **Schedule** interaction to dated project activities. It is a `clarifies` change: the staged presentation is shared, while confirmed live-date, dependency, exception, and project-rescheduling behavior remains unchanged.

## Product contract

- The dated activity editor replaces the separate Project timing and Prerequisites presentations with one staged **Schedule** section and schedule-rule modal. It continues to persist the existing single optional project-relative rule and multiple activity prerequisites; it does not copy template rule rows into the live schema.
- Live activities remain explicitly dated. The template resolver's latest-valid placement is used only while materializing an undated template and never silently reflows an existing project.
- Adding or editing a rule preserves every entered date that remains valid. If the edited activity is invalid, the planner proposes the smallest calendar-day shift of its complete start/due window that satisfies the rule intersection. Equal-distance ambiguity resolves to the later placement. Automatic rule-driven movement preserves inclusive duration.
- Removing a rule removes only the constraint and never changes dates. Dates that gain scheduling space remain where the user put them.
- Project-relative rules contribute finish bounds: advance deadline supplies an inclusive upper bound; post-project completion supplies an inclusive range from the day after project end through the configured deadline.
- Prerequisites contribute lower bounds to the dependent. Existing incoming relationships contribute upper bounds to the edited prerequisite. Multiple rules form one intersection; an empty intersection is a blocking conflict, not a partially applied schedule.
- Rule viability is evaluated for the activity being edited against the fixed dates of related activities. Adding or editing a rule may propose dates only for the current activity; it never changes a referenced prerequisite or downstream dependent.
- Incoming and outgoing relationships both contribute fixed boundaries. If the current activity cannot fit between them, or moving it would invalidate another activity, the rule is blocked with the conflicting activity names, boundary dates, and reason. Graph optimization and multi-activity propagation are deferred because they require a separate, deliberately initiated workflow.
- Completed activity dates and archived activities/relationships never move automatically. A required completed-date change blocks and offers separate reopening or rule revision. Cross-project activities also remain fixed and produce manual-resolution conflicts.
- If a proposal starts before the project, preview may include the existing atomic project-start adjustment. A finish after project end is authorized automatically only by a conforming post-project rule; otherwise preview requires the existing explicit exception confirmation. Removing a post-project rule preserves dates and offers conversion to an ordinary exception when needed. A stale exception is cleared when the final finish is within the project.
- Creating an activity without complete dates remains invalid. When dates are present, rules use the same preservation-first derivation.
- The rule modal evaluates the current unsaved project, dates, and staged rules. A valid rule with unchanged dates is staged immediately; a viable date change requires an explicit **Apply rule and update dates** action that changes only the unsaved current activity; an impossible placement keeps the modal open and blocks the rule. Final form save revalidates the same state. Any current-activity date, project-boundary, or exception change requires preview and confirmation before one authoritative atomic save. Cancel writes nothing.
- Project rescheduling continues to shift eligible activities by project-end delta and then validates these same persisted rules. It does not invoke template latest-valid placement or compress scheduling slack.

## Delivery slices

### Slice 1 — Pure placement kernel

Implement and unit-test deterministic, duration-preserving placement of one dated activity against combined start and finish bounds. This slice performs no persistence or UI changes.

Status: implemented.

### Slice 2 — Isolated rule-viability planner

Compile the current activity's staged project and relationship rules into fixed bounds, add project-start and exception proposals, and return structured no-change, current-activity-change, or blocking-conflict outcomes. Evaluate unsaved form values and never propose another activity's dates.

Status: client planner implemented for project timing, prerequisites, incoming dependents, missing references, contradictions, and cycles. Authoritative stale-state protection remains in Slice 3.

### Slice 3 — Authoritative preview and atomic commit

Add scoped-locking RPCs and database coverage. Reuse the `PRJ-06` one-hop lock protocol. Apply migrations only after review, dry run, and explicit authorization.

Status: the existing authoritative `save_activity` RPC and deferred `validate_project_schedule` boundary already provide scoped locking, atomic rule persistence, dependency chronology, completed-state, timing, exception, and rollback enforcement. The activity database suite now explicitly covers rejection and rollback when editing the current activity would invalidate a fixed incoming dependent; no new migration is required.

### Slice 4 — Staged Schedule interface

Adopt the template interaction pattern in the dated activity editor, add the full preview/confirmation dialog, and preserve keyboard, responsive, and validation behavior.

Status: staged Schedule rows and rule modal are implemented with live unsaved-date evaluation, current-activity adjustment confirmation, fixed incoming relationship context, and final-save revalidation. Authorized desktop and 390×844 browser review against reset development fixtures confirmed valid staging, precise impossible-rule messaging, fixed incoming context, and responsive containment. Persistent automated coverage remains a later QA-05 release-gate extension.

Follow-up scope: activity scheduling now uses one Add scheduling rule modal for project-relative and activity-relative rules. Activity dependencies carry nonnegative calendar-day offsets. Referenced activities are selected through a portfolio-wide picker with name search plus project, type, and team-member filters; a referenced activity can also be created inline, defaulting to the current project, and is selected on successful creation.

## Acceptance matrix

| ID | Scenario | Required result |
| --- | --- | --- |
| DEP11-01 | Existing dates satisfy all staged rules | Preserve every date. |
| DEP11-02 | New lower bound is later | Shift the whole activity by the minimum days required. |
| DEP11-03 | New upper bound is earlier | Shift the whole activity by the minimum days required. |
| DEP11-04 | Multiple bounds overlap | Choose the placement nearest the current dates; equal-distance ambiguity resolves later. |
| DEP11-05 | Bounds do not overlap | Return a blocking contradiction and no proposed write. |
| DEP11-06 | Rule removed | Preserve dates; resolve only exception validity if necessary. |
| DEP11-07 | Related activity dates establish a viable range | Change only the current activity by the minimum required shift. |
| DEP11-08 | Current activity cannot fit between fixed relationship bounds | Keep the rule modal open and explain the conflicting activities and dates. |
| DEP11-09 | Current activity movement would invalidate a dependent | Keep every related activity fixed and block the rule for manual resolution. |
| DEP11-10 | Proposal crosses project boundary | Include project-start adjustment or exception handling in the same preview. |
| DEP11-11 | Rule-only change leaves final state valid | Save atomically without a date-change preview. |
| DEP11-12 | Any derived state changes | Preview all changes and save only after confirmation. |
| DEP11-13 | Project is rescheduled later | Existing PRJ-06 movement and validation semantics remain unchanged. |
| DEP11-14 | Concurrent graph edit follows preview | Reject stale state under the PRJ-06 scoped-lock contract. |
| DEP11-15 | Rule is added before the activity exists | Evaluate the live unsaved dates and staged rules exactly as for an existing activity. |
| DEP11-16 | Dates change after a rule is staged | Revalidate on final form save and block or preview the current-activity correction. |

## Release gates

- `pnpm verify`, relevant database suites, and production build pass.
- Migration lint, dry run, application, and data-changing browser validation require their existing authorization gates.
- Update `DESIGN.md`, `implementation-map.yaml`, this plan, and `TASKS.md` as slices become implemented.
