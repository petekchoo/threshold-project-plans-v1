# TPL-01/TPL-02 Project templates and project materialization

## Purpose

Reusable project templates describe undated activity schedules for recurring work. A valid template can be materialized from a project name and project end date into one editable Draft project with a complete Not Started activity graph.

This plan is binding for `TPL-01` and `TPL-02`. It supplements the concise product rules in `DESIGN.md`.

## Classification

`changes-design`: templates and template activities are new product objects. They are stored separately from dated projects and activities so existing project, status, ownership, and date invariants remain intact.

## Template contract

### Project template

A project template stores:

- a required unique display name;
- a required active project type;
- ordered template activities;
- created/updated timestamps and an optional archive timestamp.

It does not store a project description, status, dates, team members, notes, or links.

### Template activity

A template activity stores, in editor order:

1. a required scheduling rule;
2. one integer calendar-day offset;
3. one integer calendar-day duration;

It also stores a required name, required active activity type, stable identifier, and display order. It does not store status, priority, team members, notes, or links.

Duration is elapsed calendar-day distance: `0` produces a same-day activity and `N` produces a finish `N` calendar days after its start. Offset is always entered as a non-negative magnitude; the selected rule supplies its direction and anchor.

Supported rules:

| Rule | Required reference | Date formula | Generated constraint |
| --- | --- | --- | --- |
| Finish before project end | None | `finish = project end - offset`; `start = finish - duration` | Advance project-end timing rule |
| Finish after project end | None | `finish = project end + offset`; `start = finish - duration` | Post-project timing rule and outside-project exception |
| Start after activity finishes | Another activity in this template | `start = referenced finish + offset`; `finish = start + duration` | Finish-to-start dependency |
| Finish after activity finishes | Another activity in this template | `finish = referenced finish + offset`; `start = finish - duration` | Finish-to-finish dependency |

`Finish after project end` requires an offset of at least one. All other rules permit zero. A reference cannot target the same activity.

Each template activity has exactly one primary scheduling rule. Display order and creation order do not affect schedule resolution. Every activity-relative reference chain must be acyclic and terminate at an activity directly anchored to project end.

## Authoring journey (`TPL-01`)

- Templates are managed from a dedicated responsive **Templates** destination.
- The list supports text search, creation, editing, archive visibility, and archiving.
- A template derives **Ready** when it contains at least one activity and its complete graph satisfies this contract. Otherwise it derives **Needs setup**; this is not stored workflow status.
- Needs-setup templates remain editable but do not appear in the project-from-template picker.
- The activity editor requires name, type, rule, offset, and duration before saving.
- Activity-relative rules require an existing referenced activity. Their selector provides an inline **Create activity** path; after the new activity saves, the user returns to the original editor with it selected.
- The database validates references, rule shapes, offset bounds, cycles, and complete project-end reachability rather than trusting UI ordering.
- Templates and template activities are archived rather than permanently deleted in normal use. An archived template is omitted from creation choices. Existing projects are unaffected.

## Project creation journey (`TPL-02`)

- **Add project** offers **Start a blank project** and **Start from template**.
- Starting from a template opens a searchable modal containing Ready, non-archived templates with project type, activity count, and calculated lead-in summary.
- After selecting a template, the user enters only required project name and end date.
- A preview lists the resulting project window and every activity date before creation.
- One authoritative transaction creates the project, activities, dependencies, and project-relative timing configuration. Partial creation is never committed.
- The project type is inherited from the template, project description is empty, project status is Draft, and project team members are empty.
- Activity names and types are inherited. Activity status is Not Started, priority uses the existing Normal default, and owners, notes, and links are empty.
- Project start is the earlier of the earliest generated activity start and the supplied project end. This preserves the project date-order invariant when a valid template contains only post-project work.
- Generated activities finishing after project end receive the required explicit outside-project exception.
- The created project is an independent snapshot. Later template edits or archiving never update it.
- On success the application opens the new project for detailed editing.

## Validation and failure rules

A template is not Ready when any of these conditions exists:

- no active template activities;
- missing name, type, rule, offset, or duration;
- a negative offset or duration;
- a project-after offset below one;
- a missing, cross-template, archived, or self reference;
- a reference cycle;
- a reference chain that does not reach a project-end anchor;
- an archived or missing project/activity type.

Materialization repeats authoritative validation in the same transaction. A stale or newly invalid template fails without creating any project records.

## Delivery slices

### Slice 1 — scheduling model and persistence

- Pure deterministic graph resolution with calendar-boundary unit coverage.
- Template tables, access policies, integrity triggers/functions, archive behavior, and authoritative preview/materialization RPCs.
- Transaction coverage for success, rollback, graph rejection, status/ownership exclusions, and generated dependency/timing fields.

### Slice 2 — template authoring

- Templates navigation and searchable responsive list.
- Template and template-activity editors, derived readiness, archive controls, and inline referenced-activity creation.

### Slice 3 — create project from template

- Add-project choice, searchable Ready-template picker, minimal name/end-date form, schedule preview, atomic confirmation, and redirect to the generated project.

## Release gates

- `pnpm map:generate`
- `pnpm verify`
- template database integration suite against a disposable local stack
- `pnpm build`
- focused desktop and 390×844 mobile core-journey coverage when live browser testing is authorized
- repository and deployment checks before merge

