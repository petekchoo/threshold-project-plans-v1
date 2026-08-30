# Product and Design Specification

> Status: Discovery in progress  
> Last updated: 2026-08-29  
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
- **Overview / Home:** Cross-project Gantt, project status, project visibility controls, and summary activity metrics.
- **Projects:** A dedicated searchable and sortable project list/table in addition to the overview Gantt.
- **Project detail:** Project summary, followed by the project-level Gantt, followed by the activity list.
- **Activities:** Filterable, sortable cross-project activity table.
- **Activity detail:** A full-page editing surface with owners, required dates, status, priority, plain-text notes, labeled external links, dependency search/assignment, and linked dependency references.
- **Administration:** Centrally manage project types, activity types, and team members.
- **Create/edit surfaces:** Projects and activities; exact use of pages, drawers, dialogs, and inline controls remains partly open.

### Navigation

- **Desktop:** Persistent left sidebar with Overview, Projects, Activities, Administration, and user/profile controls.
- **Mobile:** Bottom navigation with Overview, Projects, and Activities. Administration and account controls live in an overflow/menu surface.
- Navigation destinations and all creation/editing capabilities are available on both desktop and mobile.

### Responsive behavior

The application must support desktop and mobile. Desktop provides the densest planning experience. Mobile uses a project-tile overview rather than compressing the master Gantt and supports full project/activity creation and editing with the same underlying controls adapted responsively. Mobile project tiles show project name, type, status, start/end dates, completion progress, overdue and blocked activity counts, and the next upcoming activity. Exact breakpoints and individual control adaptations remain open.

### Accessibility

Requirements remain open. The default implementation target will be semantic, keyboard-accessible UI with visible focus states and appropriate contrast unless superseded by a confirmed requirement.

## Visual Direction

The product should borrow design cues from [Threshold's public website](https://www.thresholdcatskills.com/) while remaining legible and efficient as an internal planning tool.

### Product identity

- Product name: **Threshold Projects**.
- Use the supplied Threshold curved horizontal logos, with light and dark variants selected for sufficient contrast. The asset files must be reattached or placed in the project folder before implementation because their referenced download paths are unavailable.

Confirmed brand cues from the website's content and structure:

- Warm, welcoming hospitality rather than generic enterprise software.
- A grounded Catskills identity paired with Korean culinary character.
- Direct, restrained language and concise labels.
- Editorial typography and generous pacing can influence the shell and headings; dense planning surfaces must prioritize clarity.
- Balance Threshold's warm editorial identity evenly with the clarity and efficiency of an operational planning tool.
- Aim for an elegant atmosphere with refined details and an Art Deco influence. Use the influence selectively in typography, geometry, borders, dividers, and decorative accents rather than compromising data readability.
- Use comfortable spacing and appropriately sized controls rather than a compact, high-density default.
- Keep status colors restrained, primarily in badges, indicators, and timeline marks, so warning colors retain meaning.
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
- Each activity requires a start date and end/due date before it can be saved.
- Each activity supports plain-text notes.
- Each activity has a priority: Low, Normal, High, or Urgent.
- Each activity supports multiple external links. Every link stores a URL and optional label; links appear at the bottom of the activity detail page.
- Activity-to-activity dependencies support two constraint types:
  - **Finish-to-start:** “This activity can't start until this dependency is completed.” The dependent activity's start date cannot be earlier than the dependency's end date.
  - **Finish-to-finish:** “This activity can start, but can't be completed until this dependency is completed.” The dependent activity's end date cannot be earlier than the dependency's end date.
- Users find dependencies through a search-and-select modal. Selected dependencies appear as visible links in activity detail, open the referenced activity when clicked, expose their constraint type through a dropdown, and can be removed.
- When adding a dependency to an activity with dates already entered, the app evaluates its date constraints. If dates must change, it previews the affected dates and asks for confirmation. Confirming saves the dependency and adjusted dates; declining saves neither change.
- Activity dates always remain editable within dependency constraints. An invalid edit is rejected with a message naming the dependency and offering the user the choice to update that dependency or remove the relationship.
- When a prerequisite's dates move later, affected downstream activities move forward only after the user confirms a summary of all affected changes.
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
- Every project has manually entered start and end dates. These dates represent an intentional operating or event window and are not derived from activity dates.
- An activity outside its project's date window, whether caused by direct editing or dependency propagation, triggers an overridable warning naming the project boundary and relevant activity/dependency. The user may explicitly accept the exception and save it without changing the project dates.

## Technical Direction

The confirmed stack is React, TypeScript, Tailwind CSS, GitHub, Vercel free tier, and Supabase for authentication and shared persistence. Framework choice, package manager, Gantt implementation, testing strategy, and CI/CD details remain open. Technical choices should favor rapid prototyping without closing off a maintainable production path.

### Dashboard and timeline behavior

- **Desktop:** The homepage centers on a master Gantt containing all projects. Each project row exposes its timeline, status, and key metrics, with filtering and sorting within the view. Initial sort options include start date, end date, and status.
- The master Gantt defaults to **Month** and offers Week, Quarter, Half-year, Year, and All Events ranges.
- Timeline granularity adapts to the selected range:
  - Week: day columns.
  - Month and quarter: week columns, with bars positioned using actual start and end dates rather than rounded to whole weeks.
  - Half-year and year: month columns.
  - Ranges longer than a year: quarter columns.
- **Mobile:** The leading direction is a tile-based project overview suited to available screen width. Final treatment remains open.
- Summary metrics include overdue activities, activities due in the next seven days, and unassigned activities. Active and at-risk/blocked project health is primarily communicated by the master Gantt itself.
- A lower dashboard section should show **Activity breakdown by owner** as a bar chart: total activity volume per team member, segmented by activity-status color.

### Timeline hierarchy

- **Home Gantt:** Each timeline chevron/bar represents a project.
- **Project Gantt:** Each timeline chevron/bar represents an activity within that project.
- **Activity Gantt:** Provides focused context with the overarching project timeline as the top chevron/bar and the current activity emphasized in bold/highlight.
- Prerequisites and downstream dependents appear simultaneously by default in clearly labeled lanes around the selected activity. Relationship labels/icons supplement color so direction does not depend on color perception alone.
- Filter chips provide **All**, **Prerequisites**, and **Dependents** views. On smaller screens, the timeline defaults to one relationship group at a time to control density.
- A valid activity with no dependency relationships still shows the project and selected-activity timelines.

### List and card views

- The cross-project Activities table defaults to columns for Activity, Project, Type, Owners, Status, Priority, Start, Due, and Overdue.
- Columns are sortable where meaningful; filter controls sit above the table.
- The dedicated Projects destination provides a searchable list/table in addition to the visual overview.
- Default Projects columns are Project, Type, Status, Start, End, Activity Progress, Overdue Activities, and Owners.
- **Activity Progress** is calculated as completed active activities divided by all active activities; archived activities are excluded. It is distinct from manually selected project Status, which communicates the owner's judgment of project health.
- Project owners are selected manually rather than inferred from activity owners.
- Archived projects and activities are hidden by default in list views and exposed through a **Show archived** filter.
- Mobile project tiles contain project name/type, status, date range, completion progress, overdue and blocked counts, and next upcoming activity.

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
| D-25 | Project dates | Are project dates entered manually, derived from activities, or derived with manual override? | Confirmed | Project start and end dates are manually entered because projects may correspond to fixed events. |
| D-26 | Retention | Should administrators ever permanently delete archived records, and if so, under what safeguards or retention period? | Deferred | MVP is archive-only. Consider administrator-only permanent deletion and retention safeguards later. |
| D-27 | Schedule compression | When a prerequisite moves earlier, should the app offer an optional action to pull eligible downstream activities earlier? | Deferred | Preserve valid dates for now. Later consider optional compression or surfacing activities with more schedule room than dependencies require. |
| D-28 | Project boundaries | When an activity would fall outside its manually entered project window, is the change blocked until dates are corrected, or may the user explicitly accept an exception? | Confirmed | Show an overridable warning naming the activity, project boundary, and relevant dependency. Explicit confirmation saves the exception without changing project dates. |
| D-29 | Activity timeline | Should the activity-level Gantt show prerequisite activities, downstream dependent activities, or both? | Confirmed | Show both by default in labeled lanes around the highlighted activity, with All/Prerequisites/Dependents filter chips. Default to one group at a time on smaller screens. |
| D-30 | Project detail | Should the project-level Gantt appear before or after the activity list beneath the project summary? | Confirmed | Project summary → Gantt → activity list. |
| D-31 | Progress | How is project completion calculated, and does it replace status? | Confirmed | Activity Progress = completed active activities / all active activities. Archived activities are excluded. Status remains a separate manual health judgment. |
| D-32 | Project list | Which columns appear by default, and how are owners determined? | Confirmed | Project, Type, Status, Start, End, Activity Progress, Overdue Activities, Owners. Owners are manually assigned. |
| D-33 | Archives | How are archived projects and activities accessed? | Confirmed | Hidden by default; available through a Show archived filter. |
| D-34 | Product identity | What is the application called and which logo treatment should it use? | Partially answered | Name is Threshold Projects. Use the supplied curved horizontal logo variants; files need to be reattached or copied into the project folder before implementation. |
| D-35 | Visual tone | What balance of brand atmosphere, density, color, motion, and theme should guide the UI? | Confirmed | Even editorial/operational balance; comfortable spacing; restrained status color; gentle transitions; elegant Art Deco influence; dark mode deferred. |
| D-36 | Project fields | Beyond name, type, owners, status, and dates, which notes, links, location, budget, or other fields belong on a project? | Open | — |
| D-37 | Activity creation | From which screens can users create activities, and should the current project/date/filter context prefill the form? | Open | — |
| D-38 | Save behavior | Should project and activity forms use explicit Save/Cancel actions, autosave, or a hybrid? | Open | — |
| D-39 | Change history | Does the prototype need visible created/updated timestamps or an activity change log? | Open | — |
| D-40 | Administration | Can every MVP user access administration, and how should deleting/deactivating types or team members with existing records behave? | Open | — |
| D-41 | Prototype data | Which representative projects, activities, owners, and dates should seed the management-team prototype? | Open | — |

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
- 2026-08-29: Closed activity-level Gantt presentation with labeled prerequisite/dependent lanes, relationship filters, and a lower-density mobile default.
- 2026-08-29: Confirmed Threshold Projects identity and visual direction; recorded the supplied logo variants as pending accessible asset files.
