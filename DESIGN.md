# Product and Design Specification

> Status: Discovery in progress  
> Last updated: 2026-08-31
> Role: Canonical source of truth for product, UX, visual design, and implementation decisions.

## How to Use This Document

- Consult this document before designing or implementing features and components.
- Record confirmed decisions here as discovery and implementation continue.
- Label assumptions and unresolved choices explicitly; do not silently treat them as requirements.
- When implementation and this document disagree, resolve the discrepancy and update one or both before proceeding.

## Confirmed Project Constraints

- The product will be a custom responsive web application for desktop and mobile.
- Frontend: React and TypeScript.
- Styling: Tailwind CSS.
- Source control and collaboration: GitHub; an empty repository already exists.
- Deployment: Vercel free tier.
- Access control and persistent backend/db: Supabase

## Product Definition

### Problem statement

Threshold's management team currently plans projects, events, and restaurant activities offline, in ad hoc documents, or from memory. This makes deadlines difficult to manage, obscures overall progress, and creates occasional misalignment between team members.

### Target users

- **Primary:** Threshold's restaurant management team. MVP users share one universal permission level.
- **Future:** Team members with limited or read-only access to their own responsibilities.

### Value proposition

Give the management team one shared, quickly editable view of all operational work: what is happening, what comes next, who owns it, and what is on track or at risk.

### Goals and success measures

- Centralize project, event, activity, and task planning.
- Make timing, sequencing, dependencies, ownership, and blockers visible.
- Allow users to quickly identify priorities and update task information.
- Deliver a working prototype for management-team review during the week following 2026-08-29.

Initial success measures remain to be defined. Candidate prototype measures include successful completion of the core journeys, management-team comprehension of project health without explanation, and perceived usefulness versus current ad hoc methods.

### Non-goals

- Role-based access control in the first release.
- Mass or bulk updates.
- Task automations and recurring workflows.
- Text-message or email integrations and notifications.
- Replacing a full-purpose project management platform for audiences beyond Threshold.

## Experience Design

### Core user journeys

1. A user signs in and lands on an overview of all active projects.
2. The user scans a cross-project Gantt view, status indicators, and task metrics to understand overall health.
3. The user toggles draft and completed projects into or out of the overview.
4. The user opens a project to see its information, project-specific Gantt view, task sequence, and dependencies.
5. The user opens a task or activity to inspect and quickly edit its owner, type, status, dates, links, dependencies, and other details.
6. The user opens a task-focused view and filters tasks by owner, type, status, and due date to identify priorities.
7. The user creates a project or event and adds its tasks, prerequisites, timing, and dependencies.
8. An administrator centrally manages project types, activity types, and the team-member directory.

### Information architecture

- **Sign in**
- **Overview / Home:** Cross-project Gantt, project status, project visibility controls, linked summary activity metrics, team workload, and actionable overdue, due-in-seven-days, and unassigned activity lists.
- **Projects:** A dedicated searchable and sortable project list/table in addition to the overview Gantt.
- **Project detail:** Project summary, followed by a full-width project-level Gantt, followed by the activity list. The summary uses compact content-sized Status, Dates, and Activity Progress regions, while Next Due receives the remaining width and wraps long activity names. The activity list provides the same status, priority, team member, type, due-date, sort, and archive controls as the global Activities view; its project scope is implicit. The whole activity row opens editing, without a separate Edit affordance. A separate Attention-count panel is intentionally omitted because the filterable activity list exposes the actionable work directly.
- **Activities:** Filterable, sortable cross-project activity table.
- **Activity detail:** A full-page editing surface with owners, required dates, status, priority, plain-text notes, labeled external links, dependency search/assignment, and linked dependency references.
- **Administration:** Centrally manage project types, activity types, and team members.
- **Create/edit surfaces:** Projects and activities; exact use of pages, drawers, dialogs, and inline controls remains partly open.
- The project-level activity editing pane closes without saving when the user chooses Cancel, presses Escape, or clicks the backdrop outside the pane. When a child modal is open within the pane, Escape or a click on that modal's backdrop closes only the child modal and leaves the activity pane open.
- Modal keyboard behavior follows one shared policy: Enter/Return performs the active modal's Save action, Escape performs its Cancel action, and only the topmost modal responds. Enter does not bypass validation or a disabled Save action, and multiline text fields retain Enter for line breaks unless a specific editor explicitly overrides that behavior.

### Navigation

- **Desktop:** Persistent left sidebar with Overview, Projects, Activities, Administration, and user/profile controls.
- **Mobile:** Bottom navigation with Overview, Projects, and Activities. Administration and account controls live in an overflow/menu surface.
- The shell does not include a global top search, connection-status indicator, or create button; Projects and Activities provide local text search and filters, while creation actions remain on their owning pages.
- Navigation destinations and all creation/editing capabilities are available on both desktop and mobile.

### Responsive behavior

The application must support desktop and mobile. Desktop provides the densest planning experience. Mobile uses a project-tile overview rather than compressing the master Gantt and supports full project/activity creation and editing with the same underlying controls adapted responsively. Mobile project tiles show project name, type, status, start/end dates, completion progress, overdue and blocked activity counts, and the next upcoming activity. Exact breakpoints and individual control adaptations remain open.

- Mobile retains the confirmed bottom navigation rather than replacing it with a top-level drawer. The current destination is visibly and semantically identified, account/Administration actions use an accessible overflow surface, and fixed navigation respects device safe areas.
- On small screens, primary search remains immediately available while secondary activity filters may use a compact disclosure. Every confirmed filter remains available, active filters are apparent, and users can clear them together.
- Dense desktop tables become labelled cards on mobile. Project-detail schedules remain available as timelines, with an explicit horizontal-scroll affordance when the complete date-scaled view is wider than the phone.
- Responsive changes must preserve the desktop information hierarchy and controls. Release review covers both a 390×844 phone viewport and representative desktop widths.

### Accessibility

Requirements remain open. The default implementation target will be semantic, keyboard-accessible UI with visible focus states and appropriate contrast unless superseded by a confirmed requirement.

Project and activity forms identify required fields visibly, associate inline errors with their fields, summarize submission errors, and move focus to the first invalid field. Native browser constraints and authoritative scheduling/database validation remain in force. A collapsed editor section automatically opens when it contains existing data that needs review or a validation error.

## Visual Direction

The product should borrow design cues from [Threshold's public website](https://www.thresholdcatskills.com/) while remaining legible and efficient as an internal planning tool.

### Product identity

- Product name: **Threshold Projects**.
- Use the supplied Threshold curved horizontal logos, with light and dark variants selected for sufficient contrast. The square PNG canvases contain substantial transparent margins, so display treatments crop those margins without altering the source artwork.

Confirmed brand cues from the website's content and structure:

- Warm, welcoming hospitality rather than generic enterprise software.
- A grounded Catskills identity paired with Korean culinary character.
- Direct, restrained language and concise labels.
- Editorial typography and generous pacing can influence the shell and headings; dense planning surfaces must prioritize clarity. Record-maintenance forms use 16px control text, regular-weight 13px labels, 14px instructions and actions, visible focus rings, and approximately 44px controls so older users can work comfortably.
- Balance Threshold's warm editorial identity evenly with the clarity and efficiency of an operational planning tool.
- Aim for an elegant atmosphere with refined details and an Art Deco influence. Use the influence selectively in typography, geometry, borders, dividers, and decorative accents rather than compromising data readability.
- Use comfortable spacing and appropriately sized controls rather than a compact, high-density default.
- Keep status colors focused in badges, indicators, and timeline marks, with sufficient saturation and white centered labels for immediate legibility.
- Use gentle, brief transitions for panels, filters, and timeline changes; avoid decorative or distracting animation.
- Dark mode is deferred beyond the prototype.

Exact colors, fonts, imagery, and component styling require further visual inspection and confirmation. Brand cues should appear in the application shell and accents without compromising status semantics or data density.

## Functional Scope

### Initial release

- Supabase authentication and basic user profiles containing names.
- A universal authenticated user type with access to centrally shared data.
- Create and edit projects/events.
- Add and edit typed activities or prerequisites with dates, ownership, status, priority, notes, links, and dependencies.
- Cross-project overview with Gantt, project health, visibility controls, and basic activity metrics.
- Project detail with project-specific Gantt and visible activity sequencing/dependencies.
- Filterable activity view supporting owner, type, status, and due-date filters.
- Central administration of project types, activity types, and team members.
- Multiple owners per activity.
- Search, add, view, follow, configure, and remove dependencies from activity detail.
- Responsive desktop and mobile experience.

### Future possibilities

- Role-based and read-only access.
- Bulk updates.
- Activity automations and recurring workflows.
- Text-message and email integrations or notifications.
- Additional collaboration capabilities as validated by the management team.
- Dark mode.

## Data and Integrations

- Use Supabase authentication.
- Store the user's name in the initial profile; add roles and access control later.
- Store project and activity information centrally and make it available to every authenticated MVP user.
- The initial conceptual model includes users, projects, activities, types, ownership, status, priority, dates, links, notes, and activity-to-activity dependencies.
- The formal work hierarchy and interface vocabulary is **Project → Activity**.
- Projects and activities each have centrally administered types. Example project types include Maintenance, Event, and Marketing. Example activity types include Menu Development and Social Media Post.
- Team members are centrally administered, and an activity can have multiple owners.
- Project owners are manually assigned by the creating/editing user and are not derived from activity ownership.
- The interface calls assigned people **team members** at the project and activity levels. “Owner” remains an internal data-model term only and is not user-facing vocabulary.
- Project and activity forms show only currently assigned team members. An **Add team member** button opens a searchable multi-select modal populated from Administration; saving the modal applies the staged selection to the form, and each assigned team member has an explicit Remove action.
- Each activity requires a start date and end/due date before it can be saved.
- Each activity supports plain-text notes.
- Each activity has a priority: Low, Normal, High, or Urgent.
- Each activity supports multiple external links. The form initially shows assigned link tiles and an **Add link** button. The button opens a modal with a required URL, optional label, and Save/Cancel actions. Saving adds a tile whose link opens in a new browser tab or window; each tile has an explicit Remove action. Links appear at the bottom of the activity detail page.
- Activity-to-activity dependencies support two constraint types:
  - **Can't start until this activity is completed:** The dependent activity's start date cannot be earlier than the prerequisite's end date.
  - **Can't finish until this activity is completed:** The dependent activity's end date cannot be earlier than the prerequisite's end date.
- Project-relative timing is configured separately in Activity Details rather than as an activity-to-activity prerequisite. Both rules are anchored automatically to the project end date and require only a calendar-day count; the user does not select an additional project date:
  - **Complete X days before project end date:** The activity must finish at least the specified number of calendar days before the project's end date.
  - **Complete within X days after project end date:** The activity must finish after the project's end date and on or before the end date plus the specified number of calendar days. The offset must be at least one day. The activity may start before the project ends; this rule constrains only its finish date.
- A project-relative timing rule is a hard constraint. Activity or project date changes that would violate it are not saved; the app states the relevant dates and amount of difference in neutral language so the user can revise the activity, prerequisite, project date, or timing rule.
- An activity cannot start before its project starts. Creating, editing, or dependency-adjusting an activity to an earlier date previews an atomic change to move the project start to that date; declining saves neither change. A project start cannot be moved later than any active activity's start date.
- Activities may finish after their project's end date. A conforming post-project completion window is explicit scheduling intent and does not also trigger the generic after-project warning.
- Scheduling warnings use neutral, factual language: state the change, identify the constraint and dates, quantify the difference where possible, and present choices without judgment or urgency language.
- Users add prerequisites through an **Add activity** modal. The modal filters non-archived activities by a selected project or all projects, searches Activity Name within that scope, stages one selection, and applies it only when the user saves. Selected dependencies appear as visible links in activity detail, open the referenced activity when clicked, expose their constraint type through a dropdown, and can be removed.
- In activity editing, selected prerequisites are displayed as concrete relationship rows with their constraint type and an explicit Remove action.
- When adding a dependency to an activity with dates already entered, the app evaluates its date constraints. If dates must change, it previews the affected dates and asks for confirmation. Confirming saves the dependency and adjusted dates; declining saves neither change.
- Activity dates always remain editable within dependency constraints. An invalid edit is rejected with a message naming the dependency and offering the user the choice to update that dependency or remove the relationship.
- When a prerequisite's dates move later, affected downstream activities move forward only after the user confirms a summary of all affected changes.
- Completion status does not waive dependency chronology. Because the current model does not store an actual completion date, a completed prerequisite's retained due date remains its completion boundary: finish-to-start dependents cannot begin before it, and finish-to-finish dependents cannot finish before it. This rule applies consistently to activity editing, dependency validation, propagation, and project rescheduling. A completed dependent whose prerequisite remains incomplete represents inconsistent state and must be resolved rather than silently rescheduled.
- If a user changes a downstream activity to dates that would violate a prerequisite constraint, the app may propose corresponding changes to the prerequisite/source activity. It must preview every affected date change and obtain confirmation before updating either activity.
- A user-entered date that remains valid after another related date change is preserved. Dependency constraints do not overwrite valid intentional scheduling space.
- Moving a prerequisite earlier does not necessarily require downstream dates to move earlier: dependency rules establish earliest allowed boundaries rather than requiring dates to be equal. Whether to offer an explicit schedule-compression action remains open.
- Circular dependencies are blocked at selection time. The error explains the relationship path that would form the cycle.
- Past due dates must be permitted, including for work completed operationally but updated later in the app.
- “Overdue” is a derived flag, not an activity status. It applies when an incomplete activity's end/due date is before the current date.
- Projects use manually selected status in the MVP. Automated status logic is deferred.
- Project status values and colors: Draft (grey), On Track (green), At Risk (yellow), Blocked (red), Completed (blue).
- Activity status values and colors: Not Started (grey), In Progress (green), Blocked (red), Completed (blue).
- Projects and activities are archived rather than deleted in normal use.
- Before archiving an activity referenced as a dependency, the app displays every affected downstream activity and requests confirmation. Confirming archives both the activity and those dependency relationships in one operation.
- Archived dependency relationships remain stored for history but are hidden from users and do not participate in date constraints.
- An activity with no downstream dependents can be archived without the additional dependency-impact confirmation.
- A long-term permanent-deletion and retention policy remains open.
- Every project has a start and end date. The start date represents the beginning of project work and must be on or before every active activity's start date. The end date remains a manually entered operating or event milestone and is not derived from activity dates.
- An activity finishing after its project's end date, whether caused by direct editing or dependency propagation, triggers an overridable warning naming the project boundary and relevant activity/dependency unless a conforming post-project completion window already authorizes the finish date.
- The stored `allow_outside_project` flag records an explicit project-date exception. Authenticated activity writes use the authoritative save/archive functions; direct authenticated inserts, updates, and deletes on the activity table are denied so callers cannot bypass exception validation. The database rejects an exception flag unless the activity actually finishes after project end, and rejects an unauthorized finish after project end.
- Users reschedule a project by editing its start and end dates directly; they do not enter a movement offset. When no activities are completed, **Move entire schedule** derives one calendar-day shift from the difference between the old and new project end dates and applies it to every active activity's start and due dates. The operation preserves activity durations, relative spacing, dependencies, project-relative timing rules, and approved project-date exceptions.
- Project end is the schedule anchor when the edited project window changes duration. Expansion creates unused planning space rather than stretching activity dates. Compression consumes existing unused space but does not shorten activity durations or gaps. If the shifted earliest activity would precede the edited project start, the preview offers to move project start earlier to contain it or return to manual schedule editing; it does not automatically compress the activity formation.
- When completed activities exist, **Reschedule remaining work** preserves the project start and completed activity dates and shifts incomplete activities by the project-end date difference. Archived activities remain unchanged. Users may intentionally reopen completed activities in a separate save; once no active activity remains Completed, a subsequent project-date edit can use **Move entire schedule**. A completed project is not ordinarily rescheduled; it must first be intentionally reopened or recreated from a template.
- Every project reschedule previews all affected dates and unresolved constraints before one atomic save. Cross-project dependencies are identified for manual resolution rather than silently moving work in another project.

## Technical Direction

The confirmed stack is React, TypeScript, Tailwind CSS, GitHub, Vercel free tier, and Supabase for authentication and shared persistence. Vitest unit testing and GitHub Actions verification are adopted; database integration coverage is partial. Playwright provides an initial authenticated, read-only responsive smoke suite, while isolated data-changing end-to-end journeys and required CI execution remain open. Technical choices should favor rapid prototyping without closing off a maintainable production path.

### Dashboard and timeline behavior

- **Desktop:** The homepage centers on a master Gantt containing all projects. Each project row exposes its timeline, status, and key metrics, with filtering and sorting within the view. Initial sort options include start date, end date, and status.
- The master Gantt defaults to **Month** and offers Week, Quarter, Half-year, Year, and All Events ranges.
- Timeline granularity adapts to the selected range:
  - Week: the seven-day window beginning today, divided by day.
  - Month: today through one calendar month forward, divided by week.
  - Quarter: today through three calendar months forward, with labelled month boundaries and weekly subdivision lines.
  - Half-year: today through six calendar months forward, divided at calendar-month boundaries.
  - Year: today through twelve calendar months forward, divided at calendar-quarter boundaries.
  - All Events: the complete visible-project date span expanded to quarter boundaries and divided by quarter.
- Project bars use inclusive project end dates, are clipped cleanly to the selected window, and retain proportional positions. A bar continuing before or after the visible window ends in an outward triangular point on that side; a fully contained bar has flat ends. Every range fits the available timeline pane without horizontal scrolling.
- **Mobile:** The leading direction is a tile-based project overview suited to available screen width. Final treatment remains open.
- Summary metrics include overdue activities, non-overdue activities due from today through the next seven days, and unassigned activities. Each metric links to its matching detailed section above Team Workload. Activity rows in those sections open the same editing panel used by project detail, and successful saves refresh the overview in place. Active and at-risk/blocked project health is primarily communicated by the master Gantt itself.
- After those detailed activity lists, **Activity breakdown by team member** appears as a bar chart: total activity volume per team member, segmented by activity-status color.

### Timeline hierarchy

- **Home Gantt:** Each timeline chevron/bar represents a project.
- **Project Gantt:** The first bar represents the project window and clearly marks project end; each following bar represents an activity positioned by its actual start and due dates. The visible domain includes any work that begins before the project or finishes after it. Up to one calendar month uses labelled weeks with daily subdivisions; up to six calendar months uses labelled months with weekly subdivisions; longer ranges use labelled quarters with monthly subdivisions. Dependency connectors are not shown.
- **Activity Gantt:** Provides focused context with the overarching project timeline as the top chevron/bar and the current activity emphasized in bold/highlight.
- Prerequisites and downstream dependents appear simultaneously by default in clearly labeled lanes around the selected activity. Relationship labels/icons supplement color so direction does not depend on color perception alone.
- Filter chips provide **All**, **Prerequisites**, and **Dependents** views. On smaller screens, the timeline defaults to one relationship group at a time to control density.
- A valid activity with no dependency relationships still shows the project and selected-activity timelines.

### List and card views

- The cross-project Activities table defaults to columns for Activity, Project, Type, Team members, Status, Priority, Start, Due, and Overdue.
- Columns are sortable where meaningful; filter controls sit above the table.
- The dedicated Projects destination provides a searchable list/table in addition to the visual overview.
- Default Projects columns are Project, Type, Status, Start, End, Activity Progress, Overdue Activities, and Team members.
- **Activity Progress** is calculated as completed active activities divided by all active activities; archived activities are excluded. It is distinct from manually selected project Status, which communicates the owner's judgment of project health.
- Project owners are selected manually rather than inferred from activity owners.
- Archived projects and activities are hidden by default in list views and exposed through a **Show archived** filter.
- Mobile project tiles contain project name/type, status, date range, completion progress, overdue and blocked counts, and next upcoming activity.
- Activity creation uses the consistent label **Add activity**. A true zero-record state says **No activities yet** and offers that action; a zero-result filtered state says **No activities match these filters** and offers **Clear filters**.
- Primary desktop table content uses at least 14px text, dates/counts use tabular numerals, and truncated project descriptions have an accessible way to reveal the full text. Mobile activity cards retain compact type, assignment, status, priority, date, and overdue context.
- Activity editors use progressive disclosure to reduce initial length: Details and Schedule/notes remain open, while optional Timing, Team members, Links, and Prerequisites sections may collapse. Populated or invalid sections open automatically and collapsed sections summarize their contents.

<!-- implementation-map:start -->
## Implementation Map

> Generated from `implementation-map.yaml`. Do not edit this section directly; run `pnpm map:generate`.

This map connects the functional specification to its current implementation. Requirement IDs are stable references for discussion, implementation, review, and testing. File paths and named symbols are preferred over line numbers because symbols remain useful as files change.

### Maintenance convention

- Begin implementation work from the applicable requirement ID and inspect every mapped UI, application, and database location before changing behavior.
- Update the specification, decision log, implementation map, and verification entry in the same change whenever user-visible behavior changes.
- Add a new requirement ID when a capability does not fit an existing row; do not silently extend an unrelated requirement.
- Mark coverage **Partial**, **Planned**, or **Deferred** when implementation does not fully satisfy the confirmed behavior.
- When code moves, update symbol references without changing the requirement ID.
- Cross-check in both directions during feature review: every confirmed requirement must be mapped, and every material product behavior in code must have a requirement ID.
- Database migrations are cumulative and applied in filename order. Later migrations that replace functions are the authoritative implementation of those functions.
- Classify each change as **conforms**, **clarifies**, **changes-design**, or **no-product-impact**. A change that conflicts with confirmed design requires user direction before implementation; lower-level plans, tests, and code do not silently override `DESIGN.md`.

### Path and verification key

- `app/*`: Next.js routes and document metadata.
- `components/threshold-app.tsx`: Thin client orchestrator for session-aware data refresh, shared search, routing context, and editor state.
- `components/{shell,shared,overview,projects,activities,administration}/*`: Navigation, reusable UI, and feature-specific views and forms.
- `lib/data/planning-data.ts`: Shared planning-data query and relationship assembly.
- `lib/planning/*`: Planning types and pure date, progress, and scheduling helpers.
- `lib/supabase.ts`: Browser Supabase client configuration.
- `supabase/migrations/*`: Persistent schema, row-level access, database functions, and triggers.
- `app/globals.css` and `app/extended.css`: Responsive layout, visual system, and component presentation.
- **Manual UI** means the behavior has been inspected in the running local application. Automated coverage exists for selected scheduling and database behavior, but not for every manually verified surface.
- `implementation-map.yaml` is the editable traceability source. The readable map in `DESIGN.md` is generated and verified in CI.
- Supabase migrations, including RLS policies, are versioned in `supabase/migrations/*` and applied through the CLI workflow documented in `supabase/README.md`.

### Automated verification catalog

| ID | Kind | Command | Executable files |
| --- | --- | --- | --- |
| unit-vitest | unit | `pnpm test` | `lib/planning/scheduling.test.ts`; `lib/planning/project-schedule.test.ts`; `lib/planning/project-reschedule.test.ts`; `lib/planning/overview-timeline.test.ts`; `components/projects/reschedule-preview-dialog.test.ts` |
| prj06-database | database | `pnpm db:test` | `supabase/tests/prj06_project_rescheduling.sql` |
| qa05-browser-smoke | end-to-end | `pnpm test:e2e` | `e2e/auth.setup.ts`; `e2e/mobile-ux.spec.ts`; `e2e/desktop-ux.spec.ts` |

### Authentication, shell, and shared data

| ID | Capability | Primary implementation | Database / persistence | Coverage | Verification / known gap | Traceability |
| --- | --- | --- | --- | --- | --- | --- |
| AUTH-01 | Sign up, sign in, sign out, and redirect unauthenticated users | `app/sign-in/page.tsx`; `components/threshold-app.tsx`; `components/shell/sidebar.tsx`; `components/shell/mobile-nav.tsx` | Supabase Auth; `profiles`; `handle_new_user` | Implemented | Manual UI; no automated auth tests. | Design: [#confirmed-project-constraints](#confirmed-project-constraints), [#experience-design](#experience-design), [#data-and-integrations](#data-and-integrations) |
| AUTH-02 | Universal authenticated access to shared MVP data | `lib/data/planning-data.ts` (`loadData`); `lib/supabase.ts` | RLS policies named `authenticated shared access` in `202608290001_initial_schema.sql` | Implemented | Database policy inspection; role-based access intentionally deferred. | Design: [#confirmed-project-constraints](#confirmed-project-constraints), [#experience-design](#experience-design), [#data-and-integrations](#data-and-integrations) |
| DATA-01 | Load shared planning data and refresh on database changes | `lib/data/planning-data.ts` (`loadData`); `components/threshold-app.tsx` (`refresh`, `threshold-live`) | Projects, activities, types, owners, links, and dependencies tables | Implemented | Manual UI. Realtime behavior has no automated integration test. | Design: [#confirmed-project-constraints](#confirmed-project-constraints), [#experience-design](#experience-design), [#data-and-integrations](#data-and-integrations) |
| DATA-02 | Recover once from a transient JWT/session timing error without a refresh loop | `components/threshold-app.tsx` (`isRetryableAuthError`, `refresh`, `refreshInFlight`) | Supabase session refresh | Implemented | Type check and manual reload. Retry is bounded to one session refresh and one data retry. | Design: [#confirmed-project-constraints](#confirmed-project-constraints), [#experience-design](#experience-design), [#data-and-integrations](#data-and-integrations) |
| DATA-03 | Retain created/updated timestamps for future history surfaces | Not currently displayed | `created_at`; `updated_at`; `set_updated_at` triggers | Partial | Timestamps are stored, but visible history remains open under D-39. | Design: [#confirmed-project-constraints](#confirmed-project-constraints), [#experience-design](#experience-design), [#data-and-integrations](#data-and-integrations) |
| NAV-01 | Desktop sidebar navigation and account controls | `components/shell/sidebar.tsx`; routes under `app/` | Profile name from `profiles` | Implemented | Manual desktop UI. | Design: [#confirmed-project-constraints](#confirmed-project-constraints), [#experience-design](#experience-design), [#data-and-integrations](#data-and-integrations) |
| NAV-02 | Mobile bottom navigation with administration/account overflow | `components/shell/mobile-nav.tsx`; `app/extended.css` | Supabase sign-out | Implemented | Route-aware current state, safe-area layout, and accessible overflow dismissal/focus behavior are implemented. Manual mobile and desktop regression testing remains required. | Design: [#confirmed-project-constraints](#confirmed-project-constraints), [#experience-design](#experience-design), [#data-and-integrations](#data-and-integrations) |
| SHELL-01 | Product metadata, document shell, and application identity | `app/layout.tsx`; `RootLayout`; public favicon and logo assets | None | Implemented | Metadata names Threshold Projects; the shell omits the redundant global search, connection indicator, and context-switching create action. Social-image treatment is not defined. | Design: [#confirmed-project-constraints](#confirmed-project-constraints), [#experience-design](#experience-design), [#data-and-integrations](#data-and-integrations) |

### Overview and portfolio planning

| ID | Capability | Primary implementation | Database / persistence | Coverage | Verification / known gap | Traceability |
| --- | --- | --- | --- | --- | --- | --- |
| OVR-01 | Cross-project overview timeline with project bars | `components/overview/overview.tsx`; `lib/planning/overview-timeline.ts`; `/` route | Project dates and statuses | Implemented | Integer calendar-day positioning clips inclusive project ranges to the selected half-open window and fits every subdivision into the pane. Outward triangular ends indicate continuation before or after the visible window. Unit coverage verifies Today-marker positioning at interior and boundary dates. | Design: [#experience-design](#experience-design), [#dashboard-and-timeline-behavior](#dashboard-and-timeline-behavior); Verification: `pnpm test` |
| OVR-02 | Week, Month, Quarter, Half-year, Year, and All Events ranges; Month default | `components/overview/overview.tsx` range state and range tabs; `lib/planning/overview-timeline.ts` | None | Implemented | Month is the default on the desktop Gantt. Forward windows all begin today and end after 7 days or 1, 3, 6, or 12 calendar months; All Events uses the quarter-normalized full visible-project span. Quarter uses monthly labels with weekly subdivision lines; other views use day, week, month, or quarter divisions as specified. Mobile uses project tiles instead of the Gantt, so its non-operative desktop range selector is hidden. | Design: [#experience-design](#experience-design), [#dashboard-and-timeline-behavior](#dashboard-and-timeline-behavior) |
| OVR-03 | Draft and completed project visibility controls | `components/overview/overview.tsx` visibility state | Project status | Implemented | Manual UI. | Design: [#experience-design](#experience-design), [#dashboard-and-timeline-behavior](#dashboard-and-timeline-behavior) |
| OVR-04 | Linked overdue, due-in-seven-days, and unassigned metrics with actionable activity lists | `components/overview/overview.tsx`; `components/overview/activity-attention-list.tsx`; `components/activities/activity-panel.tsx`; `lib/planning/dates.ts` (`isoDate`, `addDays`) | Activity dates, status, and owners | Implemented | Metric cards link to matching sections above Team Workload. Rows open the shared activity editor panel; due-in-seven-days explicitly excludes overdue work. Derived client-side; no boundary-date unit tests. | Design: [#experience-design](#experience-design), [#dashboard-and-timeline-behavior](#dashboard-and-timeline-behavior) |
| OVR-05 | Activity breakdown by team member segmented by status | `components/overview/owner-breakdown.tsx` | Team members, activity owners, activity status | Implemented | Manual UI. | Design: [#experience-design](#experience-design), [#dashboard-and-timeline-behavior](#dashboard-and-timeline-behavior) |
| OVR-06 | Mobile project tiles with health, progress, counts, and next activity | `components/overview/project-card.tsx`; `lib/planning/progress.ts`; `app/extended.css` | Projects and activities | Implemented | Manual responsive UI. | Design: [#experience-design](#experience-design), [#dashboard-and-timeline-behavior](#dashboard-and-timeline-behavior) |

### Projects

| ID | Capability | Primary implementation | Database / persistence | Coverage | Verification / known gap | Traceability |
| --- | --- | --- | --- | --- | --- | --- |
| PRJ-01 | Searchable, sortable project list with required default columns | `components/projects/projects-list.tsx`; `/projects` route; shared search in `components/threshold-app.tsx` | Projects, types, owners, activities | Partial | Core columns and selector sorting exist. Primary table content uses 14px text and tabular numerals, and project briefs have an expandable desktop disclosure. Mobile search, sort, archive visibility, and result count are contained in a responsive control grid. Labels shorten “Activity Progress” and “Overdue Activities,” and status sorting is lexical rather than workflow ordered. | Design: [#experience-design](#experience-design), [#data-and-integrations](#data-and-integrations), [#timeline-hierarchy](#timeline-hierarchy), [#list-and-card-views](#list-and-card-views) |
| PRJ-02 | Create and edit project name, description, type, status, dates, and assigned team members | `components/projects/project-form.tsx`; `components/shared/editor.tsx`; `components/projects/project-detail.tsx` | `save_project`; `projects`; `project_owners` | Implemented | Team members are staged in a searchable multi-select modal and shown with explicit Remove actions on desktop and mobile. Required markers, inline errors, linked summaries, ARIA associations, and first-invalid focus supplement client and database validation; no automated CRUD test. | Design: [#experience-design](#experience-design), [#data-and-integrations](#data-and-integrations), [#timeline-hierarchy](#timeline-hierarchy), [#list-and-card-views](#list-and-card-views) |
| PRJ-03 | Manually selected project status remains distinct from calculated activity progress | `components/shared/status-pill.tsx`; `lib/planning/progress.ts`; `components/projects/projects-list.tsx`; `components/projects/project-detail.tsx` | `project_status`; project `status` | Implemented | Archived activities are excluded because active data is passed to `progress`. Shared fixed-content status pills use centered, high-contrast labels at project and activity level. | Design: [#experience-design](#experience-design), [#data-and-integrations](#data-and-integrations), [#timeline-hierarchy](#timeline-hierarchy), [#list-and-card-views](#list-and-card-views) |
| PRJ-04 | Project detail summary, timeline before activity list, and quick activity editing | `components/projects/project-detail.tsx`; `components/projects/project-schedule.tsx`; `lib/planning/project-schedule.ts`; `components/projects/project-activity-list.tsx`; `components/activities/activity-panel.tsx`; `/projects/[id]` route | Projects, activities, dependencies | Implemented | The date-scaled timeline occupies the full workspace without a redundant Attention panel, includes the project row and end marker, maps activities to their actual dates, extends for post-project activity finishes, and adapts at one- and six-calendar-month boundaries. Scale marks before the visible date domain are excluded and narrow partial-period labels are suppressed, preventing compressed or overlapping first-month labels. The project activity list shares the global filters and opens an activity from the whole row without a redundant Edit affordance. Dependency connectors are intentionally excluded. | Design: [#experience-design](#experience-design), [#data-and-integrations](#data-and-integrations), [#timeline-hierarchy](#timeline-hierarchy), [#list-and-card-views](#list-and-card-views) |
| PRJ-05 | Project date changes respect activity timing constraints and cannot place project start after active work | `components/projects/project-form.tsx`; `components/projects/reschedule-preview-dialog.tsx`; authoritative project-reschedule preview and commit flow | `preview_project_reschedule`; `reschedule_project`; `validate_project_activity_timing` trigger, authoritative version in `202608300004_project_start_envelope.sql` | Implemented | Changed project dates use the authoritative preview, which names affected dates and timing conflicts and offers the earliest containing start when required. The atomic commit and database trigger reject invalid or stale writes; metadata-only saves remain on the ordinary project-save path. | Design: [#experience-design](#experience-design), [#data-and-integrations](#data-and-integrations), [#timeline-hierarchy](#timeline-hierarchy), [#list-and-card-views](#list-and-card-views) |
| PRJ-06 | Direct project-date edits preview and atomically move the complete or remaining schedule while preserving activity formation and completed history | Binding detail in `plans/PRJ-06-project-rescheduling.md`; Slice 2.1 concurrency contract in `plans/PRJ-06-project-scoped-locking.md`; pure planner in `lib/planning/project-reschedule.ts`; authoritative preview and commit RPCs; `components/projects/project-form.tsx`; `components/projects/reschedule-preview-dialog.tsx` | `preview_project_reschedule`, `reschedule_project`, schedule fingerprinting, deferred final validation, and protected write boundary in `202609040001`–`202609040004`; deterministic one-hop project locks, bounded waits, and secure deferred archive validation in `202609040007`–`202609050002`; transactional verification in `202609040002`, `202609040005`, `202609040006`, and `202609040008` | Implemented | The linked plan maps 34 executable PRJ-06 planner tests, 12 shared timing tests, 2 preview-copy tests, and 19 pgTAP assertions. Slice 2 live database verification covers authoritative planning, atomic persistence and rollback, schedule rules, permissions, and stale fingerprints. The local explicit-barrier harness passes `PRJ06-CON-01`–`PRJ06-CON-13` for scoped discovery, serialization, stale and busy errors, archive races, rollback, and cleanup. Authorized Slice 3 live testing passes desktop and mobile layout, keyboard confirm/cancel, atomic movement and restoration, blocking-conflict recovery, and stale-preview refresh. Pull request 24 completed the release gate with repository and Vercel checks passing; broader automated end-to-end journeys remain tracked under `QA-05`. | Design: [#experience-design](#experience-design), [#data-and-integrations](#data-and-integrations), [#timeline-hierarchy](#timeline-hierarchy), [#list-and-card-views](#list-and-card-views); Plans: `plans/PRJ-06-project-rescheduling.md`, `plans/PRJ-06-project-scoped-locking.md`; Verification: `pnpm test`, `pnpm db:test` |

### Activities and activity details

| ID | Capability | Primary implementation | Database / persistence | Coverage | Verification / known gap | Traceability |
| --- | --- | --- | --- | --- | --- | --- |
| ACT-01 | Cross-project activity table with required columns | `components/activities/activities-list.tsx`; `/activities` route | Activities, projects, types, owners | Implemented | Desktop table content uses 14px text and tabular numerals; mobile cards expose type, assignment, status, priority, dates, and overdue state. Manual responsive UI. | Design: [#experience-design](#experience-design), [#data-and-integrations](#data-and-integrations), [#list-and-card-views](#list-and-card-views) |
| ACT-02 | Filter activities by project, team member, type, status, priority, due date, and archive state; sort meaningful fields | `components/activities/activity-filters.tsx`; `components/activities/activities-list.tsx`; `components/projects/project-activity-list.tsx` | Activity fields and ownership | Partial | Shared text search and filters drive both lists; mobile keeps search visible and discloses secondary filters with an active count and Clear filters. True-empty and filtered-empty states are distinct. Status and priority currently sort lexically rather than by defined workflow/priority order; due-date options cover overdue and next seven days only. | Design: [#experience-design](#experience-design), [#data-and-integrations](#data-and-integrations), [#list-and-card-views](#list-and-card-views) |
| ACT-03 | Create and edit required dates, assigned team members, type, status, priority, notes, and project | `components/activities/activity-form.tsx`; `components/shared/editor.tsx`; `components/activities/activity-panel.tsx`; `components/activities/activity-detail.tsx`; overview and project-detail launch points | Authoritative `save_activity` in `202608300003_project_timing_constraints.sql`; activities and `activity_owners` | Implemented | Shared editors use progressive disclosure, 16px controls, 44px actions, required markers, inline errors, linked summaries, ARIA associations, and first-invalid focus. Populated or invalid sections open automatically. No automated CRUD test. | Design: [#experience-design](#experience-design), [#data-and-integrations](#data-and-integrations), [#list-and-card-views](#list-and-card-views) |
| ACT-04 | Add multiple labeled external links through a staged modal and manage them as clickable, removable tiles | `lib/data/planning-data.ts`; `components/activities/link-editor.tsx`; `components/activities/activity-form.tsx`; `components/activities/activity-detail.tsx` | `activity_links`; authoritative `save_activity` in migration `202608300003` | Partial | Modal Save/Cancel, clickable tiles, explicit removal, and active-link filtering are implemented. Links render in the side panel rather than the specified bottom position. | Design: [#experience-design](#experience-design), [#data-and-integrations](#data-and-integrations), [#list-and-card-views](#list-and-card-views) |
| ACT-05 | Full activity detail page with schedule context, notes, assigned team members, links, and relationships | `components/activities/activity-detail.tsx`; `/activities/[id]` route | Activity query assembled in `lib/data/planning-data.ts` (`loadData`) | Partial | Core details exist. Project-timing rule is editable but is not yet summarized on the read-only detail surface. | Design: [#experience-design](#experience-design), [#data-and-integrations](#data-and-integrations), [#list-and-card-views](#list-and-card-views) |
| ACT-06 | Derived overdue state permits past dates and excludes completed work | `components/activities/activities-list.tsx`; `components/overview/overview.tsx`; `components/overview/project-card.tsx` | Required activity dates; no overdue status column | Implemented | Client-derived overview metric and detail list share the same incomplete-and-before-today predicate; the next-seven-days list begins today and excludes overdue work. No date/time-zone unit tests. | Design: [#experience-design](#experience-design), [#data-and-integrations](#data-and-integrations), [#list-and-card-views](#list-and-card-views) |
| ACT-07 | Multiple assigned team members and unassigned activities | `components/activities/team-member-picker.tsx`; `components/shared/avatar-list.tsx`; overview metric/detail list and activity filters | `activity_owners`; team members | Implemented | Manual UI verifies multi-select staging and explicit removal; persistence has no automated CRUD test. | Design: [#experience-design](#experience-design), [#data-and-integrations](#data-and-integrations), [#list-and-card-views](#list-and-card-views) |

### Scheduling and dependencies

| ID | Capability | Primary implementation | Database / persistence | Coverage | Verification / known gap | Traceability |
| --- | --- | --- | --- | --- | --- | --- |
| DEP-01 | Filter non-archived activities by project, search by Activity Name, then stage, save, configure, follow, and remove prerequisites | `components/activities/dependency-picker.tsx`; `components/activities/activity-form.tsx`; `components/activities/activity-detail.tsx` | `activity_dependencies`; authoritative `save_activity` in migration `202608300003` | Partial | Project-filtered Activity Name search and staged single-selection Save/Cancel are implemented in a modal. Selected prerequisites have explicit constraint and Remove controls. Dependents are not shown on activity detail. | Design: [#data-and-integrations](#data-and-integrations), [#timeline-hierarchy](#timeline-hierarchy) |
| DEP-02 | Can't-start-until-completed and can't-finish-until-completed prerequisite constraints, including completed-prerequisite chronology | `components/activities/activity-form.tsx` (`submit`, constraint selector) | `dependency_type`; `activity_dependencies` | Partial | Direct dependent-activity adjustments exist. Completed-prerequisite due dates remain chronological boundaries and are included in the PRJ-06 plan. Database writes do not enforce FTS/FTF date validity, and prerequisite edits do not inspect downstream activities. | Design: [#data-and-integrations](#data-and-integrations), [#timeline-hierarchy](#timeline-hierarchy) |
| DEP-03 | Preview and confirm dependency-driven date changes while preserving valid scheduling space | `components/activities/activity-form.tsx` (`submit`, neutral confirmation copy) | Authoritative `save_activity` performs atomic activity/owner/link/dependency save | Partial | Handles direct changes to the edited dependent. PRJ-06 preserves completed-prerequisite chronology and blocks completed-dependent/incomplete-prerequisite inconsistencies during project rescheduling. Multi-level propagation, downstream impact previews, reverse prerequisite proposals, and the specified update/remove resolution are not implemented. | Design: [#data-and-integrations](#data-and-integrations), [#timeline-hierarchy](#timeline-hierarchy) |
| DEP-04 | Prevent circular dependencies and explain the relationship path | Dependency candidate exclusion of self; database `prevent_dependency_cycle` trigger | `prevent_dependency_cycle` in initial schema | Partial | Database blocks cycles, but selection-time path detection and full-path explanation are not implemented. | Design: [#data-and-integrations](#data-and-integrations), [#timeline-hierarchy](#timeline-hierarchy) |
| DEP-05 | Activity-level dependency timeline shows project, selected activity, prerequisites, and dependents with filters | `components/activities/activity-detail.tsx` focus timeline | Dependency data | Partial | Project and selected activity render. Relationship lanes, dependents, direction labels, and All/Prerequisites/Dependents filters are not implemented. | Design: [#data-and-integrations](#data-and-integrations), [#timeline-hierarchy](#timeline-hierarchy) |
| DEP-06 | Complete N calendar days before project end without an additional date selection | `components/activities/activity-form.tsx` Project timing controls; `lib/planning/scheduling.ts` (`projectTimingDeadline`, `projectTimingConflict`) | Activity timing columns; end-boundary normalization and enforcement in `202608310001_project_end_timing_rules.sql`; `validate_activity_project_timing`; updated `save_activity` | Implemented | Unit tests cover the inclusive advance-deadline boundary and calendar arithmetic. The end-boundary migration is applied; database integration coverage remains under QA-04. | Design: [#data-and-integrations](#data-and-integrations), [#timeline-hierarchy](#timeline-hierarchy) |
| DEP-07 | Complete after project end and within N calendar days; start may occur earlier | `components/activities/activity-form.tsx` Project timing controls; `lib/planning/scheduling.ts` (`projectTimingDeadline`, `projectTimingConflict`) | Activity timing columns; validation triggers; `202609030001_post_project_finish_window.sql`; authoritative `save_activity` | Implemented | Both inclusive finish-window boundaries and after-project warning suppression are scoped to the finish date. Unit tests cover calendar and conflict-message boundaries; the migration is applied and its preflight found no incompatible existing records. Database integration coverage remains under QA-04. | Design: [#data-and-integrations](#data-and-integrations), [#timeline-hierarchy](#timeline-hierarchy) |
| DEP-08 | Neutral, factual scheduling warnings identify dates and quantify differences | `lib/planning/scheduling.ts` (`projectTimingConflict`); dependency adjustment and outside-window copy in `components/activities/activity-form.tsx` | Database errors provide neutral fallback messages | Partial | New timing messages follow the convention. Older archive and dependency messages need a comprehensive language review. | Design: [#data-and-integrations](#data-and-integrations), [#timeline-hierarchy](#timeline-hierarchy) |
| DEP-09 | Activities may finish after project end with an explicit exception | `components/activities/activity-form.tsx` (`submit`) | `allow_outside_project`; authoritative activity functions and restricted table grants in `202609030002_protect_activity_exceptions.sql` | Implemented | The UI obtains confirmation for an unauthorized after-project finish. The database requires a consistent exception flag, denies direct authenticated activity-table writes, and limits the security-definer save/archive functions to authenticated callers. The migration preflight found no inconsistent existing flags; automated database integration coverage remains under QA-04. | Design: [#data-and-integrations](#data-and-integrations), [#timeline-hierarchy](#timeline-hierarchy) |
| DEP-10 | Project start is on or before every active activity start; an earlier activity atomically proposes moving project start | `components/activities/activity-form.tsx`; `components/projects/project-form.tsx`; `lib/planning/scheduling.ts` (`movesProjectStart`) | `validate_activity_project_timing`; `validate_project_activity_timing`; `save_activity` in `202608300004_project_start_envelope.sql` | Implemented | Client and database enforcement are implemented; automated boundary and transaction tests remain under `QA-03` and `QA-04`. | Design: [#data-and-integrations](#data-and-integrations), [#timeline-hierarchy](#timeline-hierarchy) |

### Administration, archives, responsive design, and presentation

| ID | Capability | Primary implementation | Database / persistence | Coverage | Verification / known gap | Traceability |
| --- | --- | --- | --- | --- | --- | --- |
| ADM-01 | Centrally manage team members, project types, and activity types | `components/administration/administration.tsx`; `components/administration/admin-list.tsx`; `/administration` route | `team_members`; `project_types`; `activity_types`; active-name uniqueness migration | Implemented | Add, rename, and archive exist. Long names and metadata wrap within responsive rows, and inline editors use a shrinkable input column so actions remain contained. Administration permission policy remains universal for MVP. | Design: [#experience-design](#experience-design), [#visual-direction](#visual-direction), [#data-and-integrations](#data-and-integrations) |
| ARC-01 | Hide archived projects and activities by default and expose them through filters | `lib/data/planning-data.ts`; `components/projects/projects-list.tsx`; `components/activities/activities-list.tsx` | `archived_at` fields | Partial | Archived rows appear through filters, but their detail routes resolve only active records and therefore render no detail content. | Design: [#experience-design](#experience-design), [#visual-direction](#visual-direction), [#data-and-integrations](#data-and-integrations) |
| ARC-02 | Archive projects and their activities/links/dependencies | `components/projects/project-detail.tsx` (`archiveProject`) | `archive_project` | Implemented | Confirmation exists; no restore flow. | Design: [#experience-design](#experience-design), [#visual-direction](#visual-direction), [#data-and-integrations](#data-and-integrations) |
| ARC-03 | Archive an activity with downstream-impact preview and archive affected relationships | No complete UI entry point | `archive_activity` in migration `202608300002` archives the activity, links, and relationships | Partial | Database function exists but is unreachable from the app. Activity archive control and required downstream-impact preview are missing. | Design: [#experience-design](#experience-design), [#visual-direction](#visual-direction), [#data-and-integrations](#data-and-integrations) |
| ARC-04 | Retain archived dependency relationships for history while hiding them and excluding them from scheduling/cycle logic | `lib/data/planning-data.ts` filters active dependencies | `archive_activity`; `archive_project`; `prevent_dependency_cycle`; dependency `archived_at` | Implemented | Active scheduling and cycle traversal ignore archived relationships. No visible history surface or integration test exists. | Design: [#experience-design](#experience-design), [#visual-direction](#visual-direction), [#data-and-integrations](#data-and-integrations) |
| RSP-01 | Full desktop and mobile creation/editing | Feature forms; `components/shell/*`; `components/overview/project-card.tsx`; responsive CSS | Same persistence paths on all viewports | Implemented | Editor grids stack on small screens while retaining readable 16px controls and touch-sized actions; team-member and Save controls remain visible and contained. The mobile activity panel uses the dynamic viewport and normal-flow final actions so Chrome browser chrome cannot obscure a negatively offset sticky action bar. Detail-summary values, project-card titles, administration rows, editors, and relationship URLs wrap within narrow panes. Browser coverage checks containment at 390×844 and preservation at 1440×900; a broader device matrix remains. | Design: [#experience-design](#experience-design), [#visual-direction](#visual-direction), [#data-and-integrations](#data-and-integrations) |
| A11Y-01 | Semantic, keyboard-accessible UI with focus visibility and suitable contrast | Form labels, fieldsets, status roles, dialog attributes; `components/shared/modal-keyboard.ts`; `components/shared/icon.tsx`; global/extended CSS | None | Partial | Central keyboard policy preserves topmost-modal behavior. Forms expose required state and associated inline/summary errors with first-invalid focus; required markers remain on their label line, and disclosure summaries replace visually redundant nested legends while field labels retain their accessible names. Responsive navigation exposes current state and overflow focus restoration. Shared controls provide visible focus treatment, checkboxes retain accessible labels and explicit checked states, and decorative action icons preserve text or aria-label names. No automated accessibility audit; comprehensive focus trapping and keyboard testing remain. | Design: [#experience-design](#experience-design), [#visual-direction](#visual-direction), [#data-and-integrations](#data-and-integrations) |
| VIS-01 | Threshold identity with warm editorial and restrained operational styling | `components/shell/sidebar.tsx`; `components/shared/icon.tsx`; logo assets; `app/globals.css`; `app/extended.css` | `public/threshold-logo.png`; `public/threshold-logo-white.png` | Implemented | Sidebar presentation crops the square assets' transparent margins at display time so the Threshold mark and Projects wordmark form a balanced lockup without modifying source artwork. Shared display, interface, and type-scale tokens preserve the editorial hierarchy while normalizing operational text, recurring buttons, form controls, checkboxes, focus states, and high-visibility action icons. Exact brand typography and color confirmation remain open under D-16. | Design: [#experience-design](#experience-design), [#visual-direction](#visual-direction), [#data-and-integrations](#data-and-integrations) |
| VIS-02 | Gentle responsive transitions, restrained status colors, and no dark mode | Global and extended CSS | None | Implemented | Responsive project summaries allocate content-sized columns with wrapping values; cards, administration rows, inline editors, and relationship links shrink within their panes; status pills use stronger semantic colors. Mobile and desktop browser checks cover the shared controls and key containment paths. | Design: [#experience-design](#experience-design), [#visual-direction](#visual-direction), [#data-and-integrations](#data-and-integrations) |

### Verification and delivery coverage

| ID | Capability | Current implementation | Coverage | Next verification need | Traceability |
| --- | --- | --- | --- | --- | --- |
| QA-01 | Type safety | `database.types.ts`; typed client in `lib/supabase.ts`; `tsconfig.json`; `pnpm typecheck`; `.github/workflows/verify.yml` | Implemented | CI and local verification run `tsc --noEmit`; regenerate `database.types.ts` after every schema migration. | Design: [#confirmed-project-constraints](#confirmed-project-constraints), [#technical-direction](#technical-direction) |
| QA-02 | Static code quality | `eslint.config.mjs`; `postcss.config.mjs`; `package.json` scripts | Implemented | Existing warnings for image optimization, unused prototype/fallback values, and the PostCSS export remain. | Design: [#confirmed-project-constraints](#confirmed-project-constraints), [#technical-direction](#technical-direction) |
| QA-03 | Automated unit tests for scheduling calculations | Vitest; `lib/planning/scheduling.test.ts`; `lib/planning/project-schedule.test.ts`; `lib/planning/project-reschedule.test.ts` | Partial | Project timing, project rescheduling, project-schedule scale boundaries, both dependency types, completed chronology, cross-project direction, exceptions, archive behavior, and calendar boundaries are covered. Add unit coverage for later scheduling features as they are implemented; transaction coverage remains under QA-04. | Design: [#confirmed-project-constraints](#confirmed-project-constraints), [#technical-direction](#technical-direction); Verification: `pnpm test` |
| QA-04 | Database integration tests | PRJ-06 pgTAP suite in `supabase/tests/prj06_project_rescheduling.sql`; explicit-barrier concurrency harness in `scripts/test-prj06-concurrency.sh`; transactional live verification migrations `202609040002`, `202609040005`, `202609040006`, and `202609040008` | Partial | PRJ-06 covers atomic success/rollback, timing rules, exceptions, archive behavior, permissions, stale fingerprints, and the complete scoped-lock concurrency matrix. Extend reusable database coverage to activity saves, cycle rejection, and broader RLS behavior. | Design: [#confirmed-project-constraints](#confirmed-project-constraints), [#technical-direction](#technical-direction); Verification: `pnpm db:test` |
| QA-05 | End-to-end core-journey tests | Playwright smoke suite in `e2e/*`; authenticated read-only setup; mobile Chromium at 390 × 844; desktop Chromium at 1440 × 900 | Partial | Slice 1 covers responsive navigation, project-editor team/action containment, accessible project validation, shared checkbox geometry, activity and project filter responsiveness, mobile portfolio controls, detail-summary and administration containment, mobile project-activity editor label/section/action containment, desktop layout preservation, and project schedule/CTA regressions. Add isolated activity-form mutation, CRUD, dependency, and administration mutation journeys, then require the suite in CI once disposable fixtures or a dedicated CI account are available. | Design: [#confirmed-project-constraints](#confirmed-project-constraints), [#technical-direction](#technical-direction); Plans: `plans/QA-05-end-to-end.md`; Verification: `pnpm test:e2e` |
| QA-06 | Build and deployment target | `package.json`; `next.config.ts`; `.github/workflows/verify.yml`; Tailwind/PostCSS configuration; Supabase CLI configuration and migrations | Implemented | Pull requests and main are verified in CI. Vercel deployment checks are required before merge and were confirmed on the final heads of PRJ-06 pull requests 22 and 24. | Design: [#confirmed-project-constraints](#confirmed-project-constraints), [#technical-direction](#technical-direction) |
<!-- implementation-map:end -->
## Decisions Log

| Date | Decision | Rationale | Status |
| --- | --- | --- | --- |
| 2026-08-29 | Use `DESIGN.md` as the canonical design document. | Keeps product and design intent versioned alongside implementation. | Confirmed |
| 2026-08-29 | Build a responsive web app with React, TypeScript, and Tailwind CSS, hosted on GitHub and deployed through Vercel free tier. | Initial project constraints supplied by the product owner. | Confirmed |
| 2026-08-29 | Target Threshold's management team with a universal authenticated user type for MVP. | Reduces prototype scope while validating the shared planning model. | Confirmed |
| 2026-08-29 | Use Supabase for authentication and shared application data. | Provides simple authentication and centralized persistence suitable for the prototype. | Confirmed |
| 2026-08-29 | Make timeline/status overview, project detail, task filtering, and fast editing the core experience. | These directly address visibility, deadline, and team-alignment problems. | Confirmed |
| 2026-08-29 | Defer roles, bulk updates, automation, and messaging integrations. | Keeps the first release focused on core architecture and views. | Confirmed |
| 2026-08-29 | Use Threshold's public website as the visual-brand reference. | Keeps the internal product connected to the restaurant's existing identity. | Confirmed |
| 2026-08-29 | Use a Project → Activity hierarchy with centrally administered types. | Provides one consistent planning model while supporting restaurant-specific categorization. | Confirmed |
| 2026-08-29 | Select project and activity status manually in MVP. | Keeps initial status behavior transparent and quick to implement; automation can follow later. | Confirmed |
| 2026-08-29 | Allow multiple activity owners and centrally manage team members. | Reflects shared restaurant responsibilities while keeping identity data consistent. | Confirmed |
| 2026-08-29 | Support finish-to-start and finish-to-finish dependency constraints. | Captures both “cannot begin” and “cannot finish” prerequisite relationships. | Confirmed |
| 2026-08-29 | Permit dates in the past. | Allows accurate late entry and prevents overdue records from forcing artificial scheduling cascades. | Confirmed |
| 2026-08-29 | Center the desktop homepage on a sortable/filterable master project Gantt. | Makes portfolio timing and health the primary management view. | Confirmed |
| 2026-08-29 | Use Activity consistently in the interface and data model. | It is more generic and fits the varied restaurant work represented. | Confirmed |
| 2026-08-29 | Require activity dates and support priority, plain-text notes, and labeled external links. | Establishes sufficient planning detail while keeping MVP editing simple. | Confirmed |
| 2026-08-29 | Treat dependencies as minimum date constraints and confirm any schedule shifts before saving. | Preserves user control while keeping dependent dates valid. | Confirmed |
| 2026-08-29 | Derive Overdue from date and completion state rather than adding a status. | Avoids mixing workflow state with schedule health. | Confirmed |
| 2026-08-29 | Archive projects, activities, and affected dependency relationships in normal use. | Preserves history and safely removes relationships from active scheduling logic. | Confirmed |
| 2026-08-29 | Block circular dependencies and explain the full relationship path. | Prevents impossible schedules while giving users enough context to resolve them. | Confirmed |
| 2026-08-29 | Preserve valid user-entered scheduling space and defer optional compression analysis. | Dependencies define constraints, not automatic equality between related dates. | Confirmed |
| 2026-08-29 | Allow confirmed dependency-preserving date propagation in either direction. | Supports edits from either the prerequisite or downstream activity without leaving invalid relationships. | Confirmed |
| 2026-08-29 | Enter project start and end dates manually. | Projects often represent events with fixed operating windows, such as a scheduled dinner. | Confirmed |
| 2026-08-29 | Use archive-only behavior in MVP and defer administrator-only permanent deletion. | Retains operational history without adding premature retention complexity. | Confirmed |
| 2026-08-29 | Allow explicit overrides when activities fall outside project date windows. | Event windows are meaningful, but legitimate preparation or follow-up work may extend beyond them. | Confirmed |
| 2026-08-29 | Use persistent sidebar navigation on desktop and primary bottom navigation on mobile. | Keeps core destinations continuously accessible in forms suited to each screen size. | Confirmed |
| 2026-08-29 | Provide dedicated Projects and Activities list views alongside Gantt views. | Supports searching, filtering, and scanning that timeline views alone cannot provide. | Confirmed |
| 2026-08-29 | Support full creation and editing on mobile. | Mobile web is a complete working surface, not a limited companion experience. | Confirmed |
| 2026-08-29 | Provide home-, project-, and activity-level Gantt context. | Preserves timeline orientation from portfolio level through individual dependency work. | Confirmed |
| 2026-08-29 | Show the project Gantt before its activity list. | Establishes sequence and timing context before detailed scanning or editing. | Confirmed |
| 2026-08-29 | Separate manually selected project Status from calculated Activity Progress. | Health judgment and percentage completed are related but not interchangeable. | Confirmed |
| 2026-08-29 | Assign project owners manually. | Project accountability should be explicit and not inferred from activity assignments. | Confirmed |
| 2026-08-29 | Hide archived records by default and expose them through a filter. | Keeps active planning views focused while retaining accessible history. | Confirmed |
| 2026-08-29 | Show both relationship directions in the activity Gantt with labeled lanes and filters. | Gives complete dependency context while allowing users to reduce density when needed. | Confirmed |
| 2026-08-29 | Name the product Threshold Projects. | Clearly connects the tool to its purpose and organization. | Confirmed |
| 2026-08-29 | Balance editorial hospitality branding with operational clarity. | Keeps the product recognizably Threshold without weakening planning usability. | Confirmed |
| 2026-08-29 | Use comfortable spacing, restrained status colors, and gentle transitions. | Supports a calm, elegant working environment while preserving status salience. | Confirmed |
| 2026-08-29 | Apply selective Art Deco influence and defer dark mode. | Adds refined character without expanding prototype scope or cluttering data surfaces. | Confirmed |
| 2026-08-30 | Keep project-relative timing separate from activity prerequisites. | Project boundaries and activity relationships establish different scheduling constraints and belong in different editing sections. | Confirmed |
| 2026-08-30 | Support advance deadlines and post-project completion windows as activity-level hard constraints measured in calendar days. | Covers preparation deadlines and time-limited follow-up work while retaining explicit user control over activity dates. | Confirmed |
| 2026-08-30 | Allow a post-project activity to start before project end while enforcing only its latest finish date. | Reflection, analysis, and other follow-up work may begin during an event but still needs a defined completion window. | Confirmed |
| 2026-08-30 | Use “team members” for assigned people throughout the interface and reserve “owner” for internal implementation terminology. | Keeps Administration, project assignment, and activity assignment language consistent. | Confirmed |
| 2026-08-30 | Add team members through a searchable multi-select modal and show explicit Remove actions for team-member and prerequisite relationships. | Keeps forms manageable as the team directory grows and makes relationship removal discoverable. | Confirmed |
| 2026-08-30 | Treat a conforming post-project rule as explicit authorization for dates outside the project window. | Avoids showing a redundant generic warning for an intentionally configured schedule. | Confirmed |
| 2026-08-30 | Use neutral, factual language for scheduling conflicts and warnings. | Helps users evaluate constraints without judgmental or unnecessarily urgent phrasing. | Confirmed |
| 2026-08-30 | Make `implementation-map.yaml` the editable traceability source and generate its readable representation in this document. | Preserves human readability while preventing two manually maintained maps from drifting. | Confirmed |
| 2026-08-30 | Use versioned migrations and the Supabase CLI as the canonical database write path; use project-scoped MCP access for inspection when available. | Makes schema, functions, and RLS changes reproducible and reviewable without relying on dashboard navigation. | Confirmed |
| 2026-08-30 | Generate Supabase TypeScript types after schema changes and verify the map, types, lint, and relevant tests before committing. | Surfaces schema drift and implementation mismatches early. | Confirmed |
| 2026-08-30 | Keep durable task state in `TASKS.md` and use focused, single-concern commits. | Improves handoffs, review, and rollback across agent-assisted development. | Confirmed |
| 2026-08-30 | Generate `database.types.ts` from the linked live Supabase schema and type the shared browser client with it. | Makes live schema drift visible through normal TypeScript verification. | Confirmed |
| 2026-08-30 | Treat project start and end asymmetrically: project start is the hard beginning-of-work envelope, while project end remains a meaningful event or completion milestone that may have explicit follow-up work. | Prevents a project from definitionally starting after its own work while preserving event-based post-project scheduling. | Confirmed |
| 2026-08-31 | Anchor both project-relative timing rules to project end and collect only a calendar-day offset. | Removes an unnecessary date choice and makes the before/after rules symmetrical and explicit. | Confirmed |
| 2026-08-31 | Add external links and prerequisite activities through staged modals, then show saved selections as removable tiles or relationship rows. | Keeps the activity editor concise while preserving explicit Save/Cancel control. | Confirmed |
| 2026-08-31 | Dismiss only the topmost child modal when Escape or its backdrop is used inside the activity editing pane. | Prevents an attempt to close a picker from also discarding the entire activity edit. | Confirmed |
| 2026-08-31 | Use a centralized modal keyboard policy with per-modal Save, Cancel, and validation configuration. | Makes Enter/Return and Escape consistent without coupling shared keyboard behavior to each modal's business logic. | Confirmed |
| 2026-08-31 | Scale the project schedule to actual project and activity dates, with adaptive calendar increments and an explicit project-end marker; omit dependency connectors. | Makes timing spatially meaningful while keeping the first iteration readable and allowing authorized post-project work to remain visible. | Confirmed |
| 2026-08-31 | Use shared legibility tokens and high-contrast, content-sized status pills across project and activity surfaces. | Improves scanability without requiring local font and badge decisions in every component. | Confirmed |
| 2026-08-31 | Use one shared activity-filter model globally and within project detail, with Project added only to the cross-project view. | Keeps filter behavior consistent while avoiding a redundant project selector inside an already scoped project page. | Confirmed |
| 2026-08-31 | Remove the project Attention panel and redundant row-level Edit affordance. | Gives the schedule the full content width and relies on the filterable, clickable activity list for the same actionable information. | Confirmed |
| 2026-08-31 | Size shared maintenance forms for comfortable older-user legibility rather than dense data entry. | These records require sustained reading and editing; 16px fields, larger supporting text, clear focus, and touch-sized controls reduce avoidable strain. | Confirmed |
| 2026-08-31 | Remove the global top utility bar and rely on view-specific filters and page-level creation actions. | The global search, connection indicator, and context-switching create button duplicate clearer controls within the core pages. | Confirmed |
| 2026-08-31 | Link overview attention metrics to detailed activity sections and edit those rows with the shared activity panel. | Converts summary counts into direct, in-context action without duplicating editor behavior. | Confirmed |
| 2026-08-31 | Default the overview timeline to Month and use today-anchored forward calendar windows with range-specific subdivisions fitted to the pane. | Keeps current work visible in every range and connects project-bar positions to actual calendar time rather than five decorative labels. | Confirmed |
| 2026-08-31 | Place Team Workload after the detailed overview activity lists. | Keeps metric-linked actionable records together before the aggregate ownership visualization. | Confirmed |
| 2026-09-03 | Reschedule projects through direct date editing, anchor activity movement to the project-end change, preserve completed work, and never proportionally compress activity schedules. | Keeps historical work truthful while allowing future work to move as a coherent, dependency-preserving plan. | Confirmed |
| 2026-09-04 | Preserve dependency chronology for completed prerequisites by treating their retained due dates as completion boundaries. | Completion status proves that work is done but, without an actual completion timestamp, does not prove that it finished before a proposed dependent date. | Confirmed |
| 2026-09-05 | Retain bottom navigation on mobile while improving current-state indication, safe-area handling, overflow accessibility, compact filters, and mobile timeline discoverability. | Preserves the confirmed information architecture while correcting concrete responsive and accessibility gaps found in the Instinct review. | Confirmed |
| 2026-09-05 | Use accessible validation summaries and inline field errors, plus progressive disclosure for optional activity-editor sections. | Keeps authoritative scheduling validation intact while making errors discoverable and long mobile forms easier to navigate. | Confirmed |
| 2026-09-05 | Standardize Add activity actions and distinguish true-empty from filtered-empty lists. | Removes duplicate calls to action and gives users a direct recovery action when filters hide existing work. | Confirmed |

## Open Questions

This register is cumulative. Questions remain here until answered, explicitly deferred, or superseded by a recorded decision. Partial answers should be captured without closing the overall question.

| ID | Area | Question | Status | Answer / notes |
| --- | --- | --- | --- | --- |
| D-01 | Data model | Are “project,” “event,” and “activity” types of one shared work item, or meaningfully different objects? | Confirmed | Formal hierarchy is Project → Activity. Both entities have centrally defined types. |
| D-02 | Status | Which project statuses should exist? | Confirmed | Draft (grey), On Track (green), At Risk (yellow), Blocked (red), Completed (blue). |
| D-03 | Status | Is project health manual, automatically calculated, or automatically suggested with manual override? | Confirmed | Manually selected for MVP; automated logic deferred. |
| D-04 | Status | Which activity statuses should exist? | Confirmed | Not Started (grey), In Progress (green), Blocked (red), Completed (blue). No Canceled status. |
| D-05 | Data model | Which activity types are needed? | Deferred | Types will be centrally configurable in an administrator view. Define the initial type list after the core application is running. |
| D-06 | Ownership | Can an activity have one owner, multiple owners, or no owner? | Confirmed | Multiple owners are supported from a centrally defined team-member list. Unassigned activities are supported and surfaced in dashboard metrics. |
| D-07 | Dependencies | Can an activity have multiple prerequisite activities? | Confirmed | Yes. Dependencies are searchable, linked, removable, and individually configured as finish-to-start or finish-to-finish. |
| D-08 | Dates | Does each activity need both a start and due date, or only a due date? | Confirmed | Both start and end/due dates are required by timeline and dependency logic; whether either may be blank remains open as D-19. |
| D-09 | Activity details | Do activities support notes, multiple links, and a priority level? | Confirmed | Plain-text notes; multiple URLs with optional labels shown at the bottom of activity detail; priority values Low, Normal, High, Urgent. |
| D-10 | Dependencies | When a prerequisite is delayed, should dependents be flagged, automatically rescheduled, or left unchanged? | Confirmed | Preview all affected forward shifts and require confirmation before saving. Past dates remain allowed. Earlier prerequisite dates do not invalidate later downstream dates. |
| D-11 | Dashboard | Which homepage metrics are useful? | Confirmed | Overdue, due in seven days, and unassigned activities; project health appears in master Gantt. Add status-segmented activity volume by owner below. |
| D-12 | Timeline | What default homepage Gantt horizon is best? | Confirmed | Default Month; selectable Week, Quarter, Half-year, Year, and All Events with adaptive column granularity. |
| D-13 | Editing | Should activity editing use a side panel, dedicated page, dialog, or inline editing? | Confirmed | Use a full activity detail page; lightweight inline actions may be added later where useful. |
| D-14 | Mobile | How should dense Gantt information adapt to a phone? | Confirmed | Use detailed project tiles on the overview; retain full create/edit capability through responsive versions of the same web controls. |
| D-15 | Navigation | What navigation model best fits the management team's working style? | Confirmed | Persistent desktop sidebar; mobile bottom navigation for Overview, Projects, Activities, with Administration/account in a menu. |
| D-16 | Visual design | Which exact colors, typography, imagery, spacing, and motion cues should be carried over from Threshold's brand? | Open | — |
| D-17 | Prototype | What representative prototype data is required for management-team review? | Open | — |
| D-18 | Validation | What acceptance criteria define a successful prototype review? | Open | — |
| D-19 | Dates | Are start and end/due dates required when an activity is first created, or may either remain unset? | Confirmed | Both dates are mandatory before an activity can be saved. Dependency-derived defaults may populate constrained dates during creation. |
| D-20 | Dependencies | How should the app prevent circular dependencies and explain conflicts? | Confirmed | Block the relationship at selection time and show the activity path that would create the cycle. |
| D-21 | Dependencies | When a dependency date moves, should valid downstream dates update automatically, update after confirmation, or only be flagged for manual correction? | Confirmed | Preview all required changes and update only after confirmation. Preserve any user-entered date that remains valid. A downstream edit may propose prerequisite/source changes when needed to preserve the constraint. |
| D-22 | Overdue work | How is an incomplete activity past its due date represented, and should “overdue” be a derived flag rather than a status? | Confirmed | Overdue is a derived flag for any incomplete activity whose due date is before today. |
| D-23 | Deletion | Is activity deletion recoverable, and what happens when another activity depends on the deleted activity? | Partially answered | Archive by default. Confirm downstream impact and archive affected relationships automatically. Permanent-deletion/retention policy remains open as D-26. |
| D-24 | Naming | Should the interface use “Activity” everywhere, or use a more familiar label such as “Task” while retaining Activity in the data model? | Confirmed | Use Activity consistently for now. |
| D-25 | Project dates | Are project dates entered manually, derived from activities, or derived with manual override? | Confirmed | Project end is manually entered. Project start is entered manually but moves earlier, after confirmation, when an activity begins before it; it cannot be moved later than an active activity's start. |
| D-26 | Retention | Should administrators ever permanently delete archived records, and if so, under what safeguards or retention period? | Deferred | MVP is archive-only. Consider administrator-only permanent deletion and retention safeguards later. |
| D-27 | Schedule compression | When a prerequisite moves earlier, should the app offer an optional action to pull eligible downstream activities earlier? | Deferred | Preserve valid dates for now. Later consider optional compression or surfacing activities with more schedule room than dependencies require. |
| D-28 | Project boundaries | When an activity would fall outside its manually entered project window, is the change blocked until dates are corrected, or may the user explicitly accept an exception? | Confirmed | An earlier activity start proposes moving project start and cannot remain outside it. A finish after project end requires an explicit exception unless a valid post-project window already authorizes it. |
| D-29 | Activity timeline | Should the activity-level Gantt show prerequisite activities, downstream dependent activities, or both? | Confirmed | Show both by default in labeled lanes around the highlighted activity, with All/Prerequisites/Dependents filter chips. Default to one group at a time on smaller screens. |
| D-30 | Project detail | Should the project-level Gantt appear before or after the activity list beneath the project summary? | Confirmed | Project summary → Gantt → activity list. |
| D-31 | Progress | How is project completion calculated, and does it replace status? | Confirmed | Activity Progress = completed active activities / all active activities. Archived activities are excluded. Status remains a separate manual health judgment. |
| D-32 | Project list | Which columns appear by default, and how are owners determined? | Confirmed | Project, Type, Status, Start, End, Activity Progress, Overdue Activities, Owners. Owners are manually assigned. |
| D-33 | Archives | How are archived projects and activities accessed? | Confirmed | Hidden by default; available through a Show archived filter. |
| D-34 | Product identity | What is the application called and which logo treatment should it use? | Confirmed | Name is Threshold Projects. Use the supplied curved horizontal logo variants and compensate for their transparent canvas margins in presentation styling. |
| D-35 | Visual tone | What balance of brand atmosphere, density, color, motion, and theme should guide the UI? | Confirmed | Even editorial/operational balance; comfortable spacing; restrained status color; gentle transitions; elegant Art Deco influence; dark mode deferred. |
| D-36 | Project fields | Beyond name, type, owners, status, and dates, which notes, links, location, budget, or other fields belong on a project? | Open | — |
| D-37 | Activity creation | From which screens can users create activities, and should the current project/date/filter context prefill the form? | Open | — |
| D-38 | Save behavior | Should project and activity forms use explicit Save/Cancel actions, autosave, or a hybrid? | Open | — |
| D-39 | Change history | Does the prototype need visible created/updated timestamps or an activity change log? | Open | — |
| D-40 | Administration | Can every MVP user access administration, and how should deleting/deactivating types or team members with existing records behave? | Open | — |
| D-41 | Prototype data | Which representative projects, activities, owners, and dates should seed the management-team prototype? | Open | — |
| D-42 | Project rescheduling | How should project date edits move activities when the window shifts, expands, compresses, or contains completed work? | Confirmed | Directly edited dates drive either Move entire schedule or Reschedule remaining work. Project-end movement supplies the activity shift; activity formation is preserved, completed and archived work remains fixed, and conflicts require previewed resolution before an atomic save. |

## Revision History

- 2026-08-29: Created the initial discovery scaffold and recorded confirmed project constraints.
- 2026-08-29: Defined the problem, audience, MVP scope, core journeys, Supabase direction, deferred features, and initial Threshold brand cues.
- 2026-08-29: Converted discovery questions into a persistent, numbered register with explicit answer statuses.
- 2026-08-29: Confirmed the Project → Activity model, statuses, ownership, dependency types, dashboard structure, and adaptive Gantt ranges; recorded scheduling and mobile edge cases for follow-up.
- 2026-08-29: Moved the canonical document into the active project folder; confirmed activity fields, mandatory dates, overdue derivation, full-page editing, and archive/dependency behavior; refined schedule propagation questions.
- 2026-08-29: Confirmed circular-dependency prevention, archive-only MVP behavior, preservation of valid dates, confirmed bidirectional propagation, and manually entered project windows; opened project-boundary exception behavior for clarification.
- 2026-08-29: Confirmed overridable project-window warnings for activities and dependency-driven date changes.
- 2026-08-29: Confirmed desktop/mobile navigation, dedicated list views, complete mobile editing, mobile project cards, and the three-level Gantt hierarchy; opened two timeline-presentation details.
- 2026-08-29: Confirmed project-detail ordering, calculated Activity Progress, explicit project ownership, default project columns, and archived-record filters; retained activity dependency presentation as an open design choice.
- 2026-08-30: Added project-relative advance deadlines and post-project completion windows; confirmed calendar-day offsets, hard constraint behavior, permitted out-of-window activities, and neutral scheduling messages.
- 2026-08-30: Added the implementation map with stable capability IDs, symbol/database traceability, explicit coverage states, verification gaps, and a same-change maintenance convention; completed independent coverage and reference audits.
- 2026-08-30: Made the implementation map machine-checkable and generated its readable design section; added persistent task state, CI verification, and a CLI-first Supabase workflow.
- 2026-08-30: Linked the Supabase CLI, generated live database types, and applied them to the shared client; recorded the remote migration-history reconciliation need.
- 2026-08-30: Verified the live schema against all four local migrations and reconciled Supabase CLI migration history without replaying SQL; confirmed the remote database is up to date.
- 2026-08-30: Defined project start as the hard beginning-of-work envelope with confirmed atomic expansion, while retaining project end as an event/completion milestone that supports explicit follow-up work.
- 2026-08-29: Closed activity-level Gantt presentation with labeled prerequisite/dependent lanes, relationship filters, and a lower-density mobile default.
- 2026-08-29: Confirmed Threshold Projects identity and visual direction; recorded the supplied logo variants as pending accessible asset files.
- 2026-08-31: Simplified project timing to end-date-only before/after rules; moved external-link and prerequisite addition into staged modals; clarified prerequisite labels and nested-modal dismissal behavior.
- 2026-08-31: Standardized modal keyboard behavior so Enter saves, Escape cancels, only the topmost surface responds, and multiline fields retain line-break input.
- 2026-08-31: Rebuilt the project schedule around actual dates with adaptive week/month/quarter grids and a project-end marker; added inline project-edit Escape cancellation, preserved description line breaks, rebalanced the summary, and strengthened shared typography and statuses.
- 2026-08-31: Expanded the project schedule to full width, removed redundant Attention and Edit affordances, shared activity filters between project detail and the global list, and added a global Project filter.
- 2026-08-31: Enlarged shared project/activity editor typography, help text, picker content, focus treatment, spacing, and control targets for comfortable record maintenance by older users.
- 2026-08-31: Changed ordinary maintenance-form labels to regular weight while preserving emphasis for section headings, warnings, selected record names, and actions.
- 2026-08-31: Removed the global top utility bar and added linked overview sections for overdue, next-seven-day, and unassigned activities with in-place shared-panel editing.
- 2026-08-31: Moved Team Workload below the detailed overview lists and rebuilt the Month-default portfolio ranges as fitted forward calendar windows with day, week, month, or quarter subdivisions.
- 2026-08-31: Rebalanced the sidebar brand lockup by cropping transparent PNG margins at display time and proportioning the Threshold mark against the Projects wordmark.
- 2026-09-03: Clarified post-project timing as a bounded finish window after project end while retaining advance timing as a latest-finish deadline before project end.
- 2026-09-03: Applied the post-project finish-window migration after a clean legacy-data preflight and synchronized local and remote migration history.
- 2026-09-03: Protected explicit project-date exceptions behind authenticated activity functions, denied direct activity-table writes, and added database consistency enforcement for `allow_outside_project`.
- 2026-09-03: Confirmed the project-rescheduling baseline for direct date edits, project-end anchoring, completed-work preservation, expansion/compression behavior, previews, and atomic saves.
- 2026-09-04: Confirmed that completed-prerequisite dates continue to constrain dependency chronology and retained the separate status-change path for reopening completed work before a whole-schedule move.
- 2026-09-05: Reconciled the Instinct product review with confirmed Threshold behavior; implemented approved responsive, validation, progressive-disclosure, empty-state, legibility, contrast, and Today-marker improvements while retaining the mobile bottom navigation and All Events terminology.
