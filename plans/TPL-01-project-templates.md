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

A template activity stores a required name, required active activity type, stable identifier, display order, one positive integer calendar-day duration, and one or more scheduling constraints. Each constraint stores a required rule, one integer calendar-day offset, and an activity reference when the rule requires one. It does not store status, priority, team members, notes, or links.

Duration belongs to the activity rather than to a constraint. It defaults to `1`, cannot be zero or negative, and uses inclusive calendar-day counting: `1` produces a same-day activity and `N` produces a finish `N - 1` calendar days after its start. Offset is always entered as a non-negative magnitude; the selected rule supplies its direction and anchor.

Supported constraints:

| Constraint | Required reference | Boundary | Generated constraint |
| --- | --- | --- | --- |
| Finish before project end | None | `finish <= project end - offset` | Advance project-end timing rule |
| Finish after project end | None | `project end < finish <= project end + offset` | Post-project timing rule and outside-project exception |
| Start after activity finishes | Another activity in this template | `start >= referenced finish + offset` | Finish-to-start dependency |
| Finish after activity finishes | Another activity in this template | `finish >= referenced finish + offset` | Finish-to-finish dependency |

`Finish after project end` requires an offset of at least one. All other constraints permit zero. A reference cannot target the same activity.

The resolver places the project-end-anchored chain as late as possible while satisfying every constraint and preserving each duration. A referenced prerequisite may have no rule of its own when an incoming relationship from an anchored dependent supplies its finite latest placement. Once that backward pass resolves a shared prerequisite, an otherwise-unplaced dependent branch is scheduled forward at its earliest valid date; all of that branch's referenced activities must already be resolved, and multiple prerequisites use the latest required date. This forward pass repeats for branches of any depth. The result must be deterministic and independent of display or creation order. Every activity must connect directly or transitively to the resolved graph, the graph must be acyclic, and all constraints must be jointly satisfiable. A disconnected graph or a graph with contradictory bounds is invalid.

## Authoring journey (`TPL-01`)

- Templates are managed from a dedicated responsive **Templates** destination.
- The list supports text search, creation, editing, archive visibility, and archiving.
- A template derives **Ready** when it contains at least one activity and its complete graph satisfies this contract. Otherwise it derives **Needs setup**; this is not stored workflow status.
- Needs-setup templates remain editable but do not appear in the project-from-template picker.
- The activity editor presents name, type, and duration once in activity details, with duration defaulting to `1`. It prevents zero and negative duration entries.
- The **Schedule** section starts blank and shows **+ Add schedule rule**, matching the staged-item interaction used for links and team members. Selecting it opens a rule editor containing the rule dropdown and offset input.
- Selecting an activity-relative rule reveals the activity dropdown and an inline **+ Create activity** action. Project-relative rules do not show an activity selector.
- Saving a complete rule adds a readable row to the Schedule section. Selecting the row reopens that rule for editing. Each saved row also has a separate trash-icon Remove action with an accessible name and a touch-friendly target.
- An activity may be saved while its Schedule section is blank. It can participate in a Ready template when another project-end-connected activity references it and the complete graph resolves its finite latest placement; otherwise it remains disconnected and the template remains Needs setup.
- The template activity table shows each activity’s explicit rules and derived incoming relationships. Start dependencies read **Can’t start until [activity] is complete** on the dependent and **[dependent] can’t start until this is complete** on the reference. Finish dependencies use the corresponding **can’t finish** wording. Both directions include the configured offset.
- In the activity editor, incoming relationships appear in a separate read-only **Targeted by other activities** section beneath Schedule. They cannot be edited or removed from the referenced activity, but each row opens the targeting template activity where the rule is managed.
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
- missing name, type, duration, or fields within a rule that has been added;
- a zero or negative duration, or a negative offset;
- a project-after offset below one;
- a missing, cross-template, archived, or self reference;
- a reference cycle;
- an activity that cannot be reached through either the backward project-end-anchored chain or a forward dependent branch from that resolved graph;
- an unbounded graph for which no latest finite schedule exists;
- constraints whose lower and upper bounds cannot coexist for the activity durations;
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

### Slice 4 — positive inclusive durations and multiple constraints

- Migrate existing duration values from elapsed-day distance to inclusive day count (`duration + 1`), default new activity durations to `1`, and reject zero or negative values in the UI and database.
- Replace the single primary rule fields with ordered repeatable constraints while preserving existing templates through migration.
- Implement deterministic latest-valid graph resolution, including project-end traceability, cycle detection, boundedness, and joint-satisfiability diagnostics.
- Update template authoring so duration appears once in activity details and constraints can be added, edited, and removed independently.
- Implement the blank Schedule section, **+ Add schedule rule** staged editor, conditional activity selector and inline creation path, readable saved-rule rows, row editing, and accessible trash-icon removal across desktop and mobile.
- Materialize every constraint into the corresponding project-relative timing rule or activity dependency in the same authoritative transaction.
- Extend unit, database, desktop, and mobile coverage for multiple compatible constraints, shared-prerequisite dependent branches, contradictory bounds, disconnected graphs, cycles, one-day activities, offset-preserving materialization, migration compatibility, and atomic rollback.

## Release gates

- `pnpm map:generate`
- `pnpm verify`
- template database integration suite against a disposable local stack
- `pnpm build`
- focused desktop and 390×844 mobile core-journey coverage when live browser testing is authorized
- repository and deployment checks before merge
