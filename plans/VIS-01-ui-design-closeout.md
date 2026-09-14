# UI design review closeout

Requirements: `VIS-01`, `VIS-02`, `RSP-01`, `A11Y-01`, and `PRJ-04`

## Objective

Close the advisory September 2026 UI design review through focused responsive improvements, preserving the stronger visual system introduced after that review. The finished product should use less visual noise, make operational information easier to scan, and retain mobile as a first-class composition rather than a reduced desktop layout.

This plan is the durable acceptance and decision record for the review. `DESIGN.md` remains authoritative for confirmed product behavior.

## Confirmed visual principles

- Preserve the full-bleed, high-contrast Overview metric band. Deep navy, rich gold, and dark green remain the strongest use of saturated color in the product.
- Preserve the mobile project and activity tile grammar: a saturated identity header, quiet operational body, and neutral footer. Mobile tiles do not become compressed desktop tables.
- Wide desktop Projects and Activities remain table-first for operational scanning. High-contrast tile styling may extend to intermediate widths when a table becomes cramped, but does not replace the wide-screen tables wholesale.
- Reuse high-contrast metric tiles on detail pages only for meaningful, actionable summaries such as progress, overdue work, blockers, or next due. Ordinary metadata such as type or raw dates remains in quieter surfaces.
- Tightening removes redundant copy, borders, padding, and competing hierarchy. It must not flatten the signature tiles, shrink mobile touch targets, or remove mobile information and actions.
- Serif typography remains for page and principal section headings. Operational names, counts, dates, statuses, controls, timelines, tables, and tile content use the UI sans serif.

## Responsive timeline contract

Project and activity-context timelines share one responsive scale model.

- Short and medium date domains expand to use the available timeline pane rather than retaining an arbitrary fixed pixel width.
- Equal calendar durations use equal spatial widths within a timeline.
- Day width is bounded. The timeline grows to fill unused space, but it stops compressing when calendar geometry or labels would become unreadable; longer domains then scroll horizontally.
- Mobile retains an explicit horizontal-scroll affordance and a sticky label lane.
- Calendar labels and subdivision density adapt to the visible domain and available width. Do not render labels so densely that they collide.
- Project end and Today markers remain visible when they fall within the domain.
- One-day activities retain a visible minimum bar or milestone without changing their date position or implying a longer duration.
- The domain continues to include activity work before project start or after project end.
- Dependency connectors remain excluded.

## Accepted closeout work

### Shared hierarchy and interaction

- Complete coherent hover, pressed, focus, disabled, and loading states for recurring controls and interactive rows.
- Remove generic or repetitive eyebrows and subtitles when they add no orientation.
- Reduce redundant nested borders and unnecessary desktop padding while retaining clear group boundaries.
- Use sentence-case status labels, consistent priority/date presentation, tabular numbers, and correct singular/plural count copy.
- Retain wrapping rather than truncating operational names by default.

### Overview

- Preserve the existing saturated metric band and its direct links to detailed attention sections.
- Correct count grammar and allow sparse attention panels to size naturally.
- Bound long attention lists and provide a clear path to the complete Activities view.
- Retain text-labelled project statuses instead of adding a redundant blanket Gantt legend. Clearly present Draft and Completed checkboxes as visibility filters.
- Preserve the fitted Overview master Gantt, Today marker, mobile project tiles, and accessible Team workload semantics.

### Projects and Activities

- Improve wide-screen table scanning with tabular numeric alignment, compact progress visualization, explicit sorting where useful, and consistent row interaction.
- Use sticky headers only when actual page length makes them useful.
- Preserve immediate mobile search, complete filter disclosures, clear-filter behavior, and every established project/activity tile field.
- Consider the established high-contrast tiles as the intermediate-width fallback when a desktop table no longer scans comfortably.

### Project and Activity detail

- Add accessible visual progress where a fraction alone is difficult to scan.
- Present linked parent-project context clearly on activity detail.
- Present one-day date ranges as one date where doing so is unambiguous.
- Reduce excess desktop metadata height and surface nesting.
- Extend high-contrast metric tiles only where the summary is actionable; do not turn routine metadata into a saturated dashboard.
- Apply the shared responsive timeline contract to both detail timelines.

### Administration

- Use shared Add and row-action treatments, useful section counts, and tighter desktop spacing.
- Retain visible Edit and Archive actions. Do not hide routine actions in an overflow menu without evidence that density requires it.
- Preserve archive confirmation and visible touch access on mobile.

## Declined or narrowed recommendations

- Do not globally increase desktop page titles to a 48–56px display scale.
- Do not globally compact controls or reduce the established mobile touch and form-text sizes.
- Do not add a redundant status legend where each timeline bar already has a text label.
- Do not truncate operational names by default.
- Do not replace established tokens wholesale.
- Do not convert wide-screen Projects and Activities into saturated tile grids by default.
- Do not hide Administration actions in overflow menus without demonstrated need.

## Delivery slices

1. **Decision reconciliation:** link this plan, update confirmed design and traceability, and activate the initiative in `TASKS.md`.
2. **Responsive timelines:** implement the shared responsive scale for project and activity context, with adaptive marks, bounded fitting, mobile scroll, and regression coverage.
3. **Overview and metric system:** preserve the signature Overview treatment, finish count/list refinements, and define a reusable detail metric treatment.
4. **Lists and responsive tiles:** improve wide desktop tables while preserving mobile tiles and selecting a deliberate intermediate composition.
5. **Details and Administration:** simplify detail hierarchy and Administration actions/surfaces; selectively apply actionable metric treatments.
6. **Closeout gate:** perform mobile, intermediate, and desktop visual review; run the required repository, build, responsive, and accessibility checks; reconcile documentation with the actual result; then remove the standalone advisory review.

Implementation status: all six slices are implemented on `feature/ux-design-closeout`. The standalone advisory review was removed after this plan captured its accepted, declined, and narrowed recommendations. Repository verification passes with 83 unit checks; the production build passes; read-only mobile, intermediate, and desktop review confirms the intended compositions; and the mobile/desktop responsive and required accessibility suites pass against the guarded development tier. Feature pull-request, stable-staging, and release gates remain operational delivery work rather than unfinished design behavior.

## Acceptance matrix

| Area | Required outcome |
| --- | --- |
| Overview identity | Saturated metric band, mobile project tiles, fitted master Gantt, and accessible workload presentation remain intact. |
| Mobile identity | Project and activity tiles retain saturated headers, quiet bodies, neutral footers, complete fields, and touch-accessible actions. |
| Desktop density | Tables and detail surfaces are easier to scan without turning all content into cards or reducing legibility. |
| Timelines | Project and activity timelines fill available width when readable, scroll only when minimum scale requires it, and retain factual date geometry. |
| Responsive transition | Phone, intermediate, and wide layouts do not clip, duplicate focus targets, or lose filters, actions, labels, or context. |
| Accessibility | Keyboard focus, dialog behavior, contrast, textual chart/timeline equivalents, and non-color status cues remain effective. |
| Documentation | Every advisory recommendation is implemented, declined, or deferred in authoritative tracked sources before the standalone review is removed. |

## Verification

- `pnpm map:check`
- `pnpm verify`
- `pnpm build`
- Direct unit coverage for the responsive timeline scale and date/count formatting helpers.
- Mobile Chromium at 390 × 844, an intermediate viewport, and desktop Chromium at 1440 × 900 for every affected route.
- Required axe-core accessibility coverage after shared responsive or interaction changes.

Browser screenshots are temporary review artifacts by default. Store them outside the repository and remove them after review unless Peter explicitly approves a durable baseline.
