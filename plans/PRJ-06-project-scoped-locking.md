# PRJ-06 Slice 2.1 — Project-Scoped Schedule Locking

> Status: Implemented and locally verified
> Requirement: `PRJ-06`

## Authority and purpose

This plan governs concurrency for every authoritative project, activity, and dependency write. Any change to those write paths must review this document and update its `PRJ06-CON-*` coverage. It replaces the Slice 2 global schedule mutex with one-hop project locking so unrelated projects can be changed concurrently without weakening final-state validity.

## Binding rules

- Locks exist only during database transactions, never while a form is open.
- Unrelated projects do not share a schedule lock; writes to the same project serialize.
- Cross-project protection includes only projects directly connected by active dependencies. It never recursively traverses the graph.
- All project locks use a namespaced deterministic key and are acquired in sorted UUID order.
- Archived dependencies and endpoints do not expand the set unless the operation restores them.
- Applied Slice 2 migrations remain immutable; Slice 2.1 uses forward migrations.
- Lock waits are bounded and produce a recognizable retryable outcome, never an ordinary schedule conflict.
- A stale preview is rejected after locking and rereading; it is never silently recalculated and committed.

## Required lock sets

| Operation | Project locks |
| --- | --- |
| Project metadata save | Selected project |
| Project preview/reschedule | Selected project plus projects directly connected to its active activities |
| Activity create | Destination project plus projects referenced by submitted dependencies |
| Activity update | Previous and destination projects plus projects connected by existing or submitted dependencies |
| Activity archive | Its project plus projects connected through active dependencies |
| Project archive | Selected project plus projects connected to any active project activity |
| Dependency create/update/restore/archive | Both endpoint projects |

Owners and links inherit their parent project/activity operation's lock set.

## Acquisition protocol

1. Authenticate and validate required identifiers without writing.
2. Discover, deduplicate, and sort the complete one-hop project set.
3. Acquire transaction-scoped advisory locks for that set in order.
4. Rediscover the required set under lock.
5. If rediscovery contains any project not already locked, abort the transaction with SQLSTATE `40001` and the stable `PROJECT_SCHEDULE_LOCK_SET_CHANGED` outcome. Do not append-lock a newly discovered project because it may sort before a held lock. A rediscovered subset is safe.
6. Lock and reread relevant rows, verify any expected fingerprint, recalculate, write atomically, and force deferred validation.

No function may acquire a project or schedule row lock before it knows the complete sorted advisory-lock set for that attempt. After stabilization, row locks use the universal order: projects, activities, then dependencies, each sorted by ID.

## Error contract for Slice 3

- Preserve the existing stale-preview refresh-and-review outcome.
- Return `PROJECT_SCHEDULE_LOCK_SET_CHANGED` with SQLSTATE `40001` when graph discovery expands. The caller may retry the whole transaction at most twice with a short randomized delay.
- Return `PROJECT_SCHEDULE_BUSY` with SQLSTATE `55P03` when bounded lock acquisition expires. Apply the timeout locally so pooled sessions cannot retain it.
- Preserve structured business-rule conflicts and blocking-commit behavior.
- The UI never calculates or displays lock sets.

## Acceptance matrix

| ID | Scenario | Required result |
| --- | --- | --- |
| PRJ06-CON-01 | Unrelated project writes overlap | Neither waits on a repository-wide lock; both commit independently. |
| PRJ06-CON-02 | Same-project writes share a fingerprint | They serialize; exactly one commits and the stale follower writes nothing. |
| PRJ06-CON-03 | Directly connected projects change concurrently | Both endpoint projects form the consistency boundary; no mixed graph commits. |
| PRJ06-CON-04 | Connected operations begin from opposite endpoints | Sorted acquisition completes without deadlock or partial writes. |
| PRJ06-CON-05 | A direct dependency changes during acquisition | Rediscovery detects the changed set and exits without writes. |
| PRJ06-CON-06 | Relevant state changes after preview | Fingerprint validation rejects stale state before any write. |
| PRJ06-CON-07 | Lock wait exceeds its bound | A stable schedule-busy outcome returns and the transaction writes nothing. |
| PRJ06-CON-08 | Activity moves between projects | Old, new, and directly connected endpoint projects are protected. |
| PRJ06-CON-09 | Activity/project archive races a schedule write | Operations serialize; the pre-archive preview becomes stale. |
| PRJ06-CON-10 | Archived relationship is unrelated | It creates no contention and does not constrain the operation. |
| PRJ06-CON-11 | Dependency is created or restored | Both endpoint projects are locked before mutation. |
| PRJ06-CON-12 | Either peer fails | Its complete graph write rolls back; the successful peer remains atomic. |
| PRJ06-CON-13 | Test exits by any path | Sessions release locks and every isolated fixture is removed. |

## Verification gate

- SQL tests cover set discovery, ordering, archive behavior, and stable errors.
- Multi-session tests use explicit barriers—not timing assumptions—to prove unrelated overlap, same/connected serialization, reverse-order completion, timeout rollback, and stale rejection.
- Audit every authoritative RPC and table-write path for protocol participation.
- Verify cumulative grants still prevent authenticated direct writes to schedule graph tables; operational administration SQL must use the same locking protocol or a maintenance window.
- Require schema lint, migration dry run, regenerated types, `pnpm verify`, and production build before merge.

## Implementation status

Migrations `202609040007`–`202609050001` replace the global mutex with deterministic one-hop advisory locks, centralized acquisition and rediscovery, active-row locking, bounded transaction-local lock waits, and protected authoritative project/activity/archive write paths. Migration `202609040008` verifies scope discovery, ordering, archived-edge exclusion, activity-move coverage, timeout isolation, trigger removal, and fixture cleanup transactionally. Migration `202609050002` makes deferred final validation retain private-validator access when an authenticated archive commits after its security-definer RPC returns.

The full migration history replays locally from empty state, all 19 PRJ-06 pgTAP assertions pass, and `scripts/test-prj06-concurrency.sh` passes `PRJ06-CON-01`–`PRJ06-CON-13` with independent sessions and observed transaction/lock barriers. The matrix covers unrelated overlap, same/connected serialization, reverse endpoints, lock-set expansion, stale fingerprints, bounded busy errors, activity moves, archived and restored relationships, archive races, peer rollback, and fixture cleanup.
