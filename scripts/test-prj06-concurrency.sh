#!/usr/bin/env bash
set -euo pipefail

container="supabase_db_threshold-projects"
psql=(docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres)
tmp_dir="$(mktemp -d)"
session_names=""
next_fd=10

left_project="fd100000-0000-0000-0000-000000000001"
right_project="fd100000-0000-0000-0000-000000000002"
isolated_project="fd100000-0000-0000-0000-000000000003"
move_project="fd100000-0000-0000-0000-000000000004"
left_activity="fd200000-0000-0000-0000-000000000001"
right_activity="fd200000-0000-0000-0000-000000000002"
isolated_activity="fd200000-0000-0000-0000-000000000003"
move_activity="fd200000-0000-0000-0000-000000000004"
dependency_id="fd300000-0000-0000-0000-000000000001"
expansion_dependency_id="fd300000-0000-0000-0000-000000000002"

sql() {
  "${psql[@]}" -Atqc "$1"
}

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

assert_sql() {
  local description="$1" query="$2" expected="$3" actual
  actual="$(sql "$query")"
  [[ "$actual" == "$expected" ]] || fail "$description (expected $expected, got $actual)"
  printf 'ok - %s\n' "$description"
}

start_session() {
  local name="$1" fifo out fd="$next_fd"
  fifo="$tmp_dir/$name.in"
  out="$tmp_dir/$name.out"
  mkfifo "$fifo"
  "${psql[@]}" >"$out" 2>&1 <"$fifo" &
  eval "session_pid_$name=$!"
  eval "exec ${fd}>\"$fifo\""
  next_fd=$((next_fd + 1))
  eval "session_fd_$name=$fd"
  eval "session_out_$name=\"$out\""
  session_names="$session_names $name"
  printf 'begin; set application_name = %s;\n' "'$name'" >&"$fd"
}

send_session() {
  local name="$1"
  shift
  local fd
  eval "fd=\$session_fd_$name"
  printf '%s\n' "$*" >&"$fd"
}

close_input() {
  local name="$1" fd
  eval "fd=\$session_fd_$name"
  eval "exec ${fd}>&-"
}

wait_for_query() {
  local description="$1" query="$2" expected="$3" actual="" i
  for i in $(seq 1 200); do
    actual="$(sql "$query")"
    if [[ "$actual" == "$expected" ]]; then
      printf 'barrier - %s\n' "$description"
      return 0
    fi
    sleep 0.05
  done
  fail "$description (last value: $actual)"
}

wait_idle_transaction() {
  local name="$1"
  wait_for_query "$name reached idle-in-transaction barrier" \
    "select count(*) from pg_stat_activity where application_name = '$name' and state = 'idle in transaction'" 1
}

wait_lock_wait() {
  local name="$1"
  wait_for_query "$name is blocked on a lock" \
    "select count(*) from pg_stat_activity where application_name = '$name' and wait_event_type = 'Lock'" 1
}

finish_session() {
  local name="$1" command="${2:-commit;}" pid out fd
  eval "pid=\$session_pid_$name"
  eval "out=\$session_out_$name"
  eval "fd=\$session_fd_$name"
  printf '%s\n\\q\n' "$command" >&"$fd"
  close_input "$name"
  if ! wait "$pid"; then
    cat "$out" >&2
    fail "$name did not finish successfully"
  fi
}

expect_session_error() {
  local name="$1" pattern="$2" pid out
  eval "pid=\$session_pid_$name"
  eval "out=\$session_out_$name"
  close_input "$name"
  if wait "$pid"; then
    cat "$out" >&2
    fail "$name unexpectedly succeeded"
  fi
  if ! grep -Fq "$pattern" "$out"; then
    cat "$out" >&2
    fail "$name did not return $pattern"
  fi
  printf 'ok - %s returned %s\n' "$name" "$pattern"
}

cleanup() {
  local name
  for name in $session_names; do
    local pid
    eval "pid=\$session_pid_$name"
    kill "$pid" 2>/dev/null || true
  done
  sql "delete from public.projects where id in ('$left_project', '$right_project', '$isolated_project', '$move_project');" >/dev/null 2>&1 || true
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

sql "
delete from public.projects where id in ('$left_project', '$right_project', '$isolated_project', '$move_project');
insert into public.projects(id, name, description, status, start_date, end_date) values
  ('$left_project', 'Concurrency left', '', 'on_track', '2026-08-01', '2026-08-10'),
  ('$right_project', 'Concurrency right', '', 'on_track', '2026-08-01', '2026-08-10'),
  ('$isolated_project', 'Concurrency isolated', '', 'on_track', '2026-08-01', '2026-08-10'),
  ('$move_project', 'Concurrency move', '', 'on_track', '2026-08-01', '2026-08-10');
insert into public.activities(id, project_id, name, status, priority, start_date, due_date, allow_outside_project) values
  ('$left_activity', '$left_project', 'Concurrency left activity', 'not_started', 'normal', '2026-08-02', '2026-08-03', false),
  ('$right_activity', '$right_project', 'Concurrency right activity', 'not_started', 'normal', '2026-08-05', '2026-08-06', false),
  ('$isolated_activity', '$isolated_project', 'Concurrency isolated activity', 'not_started', 'normal', '2026-08-02', '2026-08-03', false),
  ('$move_activity', '$move_project', 'Concurrency move activity', 'not_started', 'normal', '2026-08-02', '2026-08-03', false);
insert into public.activity_dependencies(id, activity_id, depends_on_activity_id, constraint_type)
values ('$dependency_id', '$right_activity', '$left_activity', 'finish_to_start');
" >/dev/null

# PRJ06-CON-01: an isolated lock completes while a connected scope is held.
start_session con01_left
send_session con01_left "select public.lock_project_schedule_scope(array['$left_project'::uuid]);"
wait_idle_transaction con01_left
start_session con01_isolated
send_session con01_isolated "select public.lock_project_schedule_scope(array['$isolated_project'::uuid]);"
wait_idle_transaction con01_isolated
finish_session con01_isolated
finish_session con01_left
printf 'ok - PRJ06-CON-01 unrelated project writes overlap\n'

# PRJ06-CON-03/04: either endpoint discovers the same sorted boundary and waits.
start_session con04_left
send_session con04_left "select public.lock_project_schedule_scope(array['$left_project'::uuid]);"
wait_idle_transaction con04_left
start_session con04_right
send_session con04_right "select public.lock_project_schedule_scope(array['$right_project'::uuid]);"
wait_lock_wait con04_right
finish_session con04_left
wait_idle_transaction con04_right
finish_session con04_right
printf 'ok - PRJ06-CON-03/04 connected reverse-endpoint operations serialize without deadlock\n'

# PRJ06-CON-07/12: bounded failure writes nothing and the successful holder commits.
start_session con07_holder
send_session con07_holder "select public.lock_project_schedule_set(array['$isolated_project'::uuid]);"
wait_idle_transaction con07_holder
start_session con07_waiter
send_session con07_waiter "select public.lock_project_schedule_set(array['$isolated_project'::uuid], 100);"
expect_session_error con07_waiter "PROJECT_SCHEDULE_BUSY"
finish_session con07_holder
assert_sql "PRJ06-CON-07/12 timeout leaves fixture unchanged" \
  "select end_date from public.projects where id = '$isolated_project'" "2026-08-10"

# PRJ06-CON-02/06: a stale follower waits, rejects, and writes nothing.
fingerprint="$(sql "begin; set local role authenticated; select set_config('request.jwt.claim.sub','fd900000-0000-0000-0000-000000000001',true); select public.preview_project_reschedule('$left_project','2026-08-02','2026-08-11')->>'schedule_fingerprint'; rollback;" | tail -n 1)"
start_session con02_winner
send_session con02_winner "set local role authenticated; select set_config('request.jwt.claim.sub','fd900000-0000-0000-0000-000000000001',true); select public.reschedule_project('{\"id\":\"$left_project\",\"name\":\"Concurrency left\",\"description\":\"\",\"status\":\"on_track\",\"start_date\":\"2026-08-02\",\"end_date\":\"2026-08-11\"}'::jsonb, '{}'::uuid[], '$fingerprint');"
wait_idle_transaction con02_winner
start_session con02_stale
send_session con02_stale "set local role authenticated; select set_config('request.jwt.claim.sub','fd900000-0000-0000-0000-000000000001',true); select public.reschedule_project('{\"id\":\"$left_project\",\"name\":\"Concurrency left\",\"description\":\"\",\"status\":\"on_track\",\"start_date\":\"2026-08-03\",\"end_date\":\"2026-08-12\"}'::jsonb, '{}'::uuid[], '$fingerprint');"
wait_lock_wait con02_stale
finish_session con02_winner
expect_session_error con02_stale "The project schedule changed after preview"
assert_sql "PRJ06-CON-02/06 exactly the winner committed" \
  "select start_date || '|' || end_date from public.projects where id = '$left_project'" "2026-08-02|2026-08-11"

# PRJ06-CON-05: graph expansion between discovery and acquisition aborts.
start_session con05_blocker
send_session con05_blocker "select public.lock_project_schedule_set(array['$right_project'::uuid]);"
wait_idle_transaction con05_blocker
start_session con05_subject
send_session con05_subject "select public.lock_project_schedule_scope(array['$left_project'::uuid]);"
wait_lock_wait con05_subject
sql "insert into public.activity_dependencies(id, activity_id, depends_on_activity_id, constraint_type) values ('$expansion_dependency_id', '$isolated_activity', '$left_activity', 'finish_to_start');" >/dev/null
finish_session con05_blocker
expect_session_error con05_subject "PROJECT_SCHEDULE_LOCK_SET_CHANGED"
sql "delete from public.activity_dependencies where id = '$expansion_dependency_id';" >/dev/null

# PRJ06-CON-08/10/11: exact discovery for moves, archived edges, and restores.
assert_sql "PRJ06-CON-08 activity move protects old, new, and connected projects" \
  "select public.discover_activity_mutation_scope('$left_activity','$move_project','[]') @> array['$left_project','$right_project','$move_project']::uuid[]" t
sql "update public.activity_dependencies set archived_at = now() where id = '$dependency_id';" >/dev/null
assert_sql "PRJ06-CON-10 archived relationship creates no contention scope" \
  "select public.discover_project_schedule_scope(array['$left_project'::uuid]) = array['$left_project'::uuid]" t
assert_sql "PRJ06-CON-11 submitted dependency locks both endpoint projects" \
  "select public.discover_activity_mutation_scope('$isolated_activity','$isolated_project',jsonb_build_array(jsonb_build_object('depends_on_activity_id','$left_activity'))) @> array['$isolated_project','$left_project']::uuid[]" t
sql "update public.activity_dependencies set archived_at = null where id = '$dependency_id';" >/dev/null

# PRJ06-CON-09: an archive wins; the waiting preview fingerprint becomes stale.
move_fingerprint="$(sql "begin; set local role authenticated; select set_config('request.jwt.claim.sub','fd900000-0000-0000-0000-000000000001',true); select public.preview_project_reschedule('$move_project','2026-08-02','2026-08-11')->>'schedule_fingerprint'; rollback;" | tail -n 1)"
start_session con09_archive
send_session con09_archive "set local role authenticated; select set_config('request.jwt.claim.sub','fd900000-0000-0000-0000-000000000001',true); select public.archive_activity('$move_activity');"
wait_idle_transaction con09_archive
start_session con09_reschedule
send_session con09_reschedule "set local role authenticated; select set_config('request.jwt.claim.sub','fd900000-0000-0000-0000-000000000001',true); select public.reschedule_project('{\"id\":\"$move_project\",\"name\":\"Concurrency move\",\"description\":\"\",\"status\":\"on_track\",\"start_date\":\"2026-08-02\",\"end_date\":\"2026-08-11\"}'::jsonb, '{}'::uuid[], '$move_fingerprint');"
wait_lock_wait con09_reschedule
finish_session con09_archive
expect_session_error con09_reschedule "The project schedule changed after preview"
assert_sql "PRJ06-CON-09 archive commits and stale reschedule writes nothing" \
  "select (activities.archived_at is not null)::text || '|' || projects.end_date from public.activities cross join public.projects where activities.id = '$move_activity' and projects.id = '$move_project'" "true|2026-08-10"

# PRJ06-CON-13: cleanup is verified after every exit path.
sql "delete from public.projects where id in ('$left_project', '$right_project', '$isolated_project', '$move_project');" >/dev/null
assert_sql "PRJ06-CON-13 every fixture is removed" \
  "select count(*) from public.projects where id in ('$left_project', '$right_project', '$isolated_project', '$move_project')" 0

trap - EXIT
rm -rf "$tmp_dir"
printf 'All PRJ06-CON scenarios passed.\n'
