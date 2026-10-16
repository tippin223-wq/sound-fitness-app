import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('planning migrations enforce ownership, optimistic revisions, and atomic idempotent completion', async () => {
  const db = new PGlite();
  const alice = '00000000-0000-4000-8000-000000000001';
  const bob = '00000000-0000-4000-8000-000000000002';
  try {
    await db.exec(`
      create role authenticated;
      create role anon;
      alter default privileges in schema public grant execute on functions to anon, authenticated;
      alter default privileges in schema public grant all on tables to anon, authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to authenticated;
      create table public.profiles(id uuid primary key, role text default 'member');
      insert into profiles(id) values ('${alice}'), ('${bob}');
      create table public.member_messages(id uuid primary key default gen_random_uuid(), member_id uuid references profiles(id), sent_by text not null, body text not null, created_at timestamptz default now());
      alter table public.member_messages enable row level security;
      create policy message_read_own on public.member_messages for select to authenticated using (member_id = auth.uid());
    `);
    const base = await readFile(new URL('../supabase/migrations/20260506233000_workout_templates_and_logs.sql', import.meta.url), 'utf8');
    await db.exec(base.replace('create extension if not exists pgcrypto;', ''));
    for (const file of ['20261012090000_planning_documents.sql', '20261012091000_planning_workout_completion.sql', '20261012092000_member_app_messages.sql', '20261012093000_atomic_workout_templates.sql', '20261013130000_workout_exercise_semantics.sql', '20261013133000_workout_template_identity.sql']) {
      await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
    }
    // Production explicitly grants anon EXECUTE by default; PUBLIC revocation alone is insufficient.
    for (const signature of [
      'save_planning_document(bigint,jsonb)', 'save_completed_planning_workout(text,jsonb,jsonb)',
      'send_app_member_message(text,uuid,uuid)', 'save_workout_template_atomic(text,jsonb,jsonb)',
      'planning_workout_load_unit_version()', 'planning_workout_semantics_version()',
      'planning_workout_template_identity_version()', 'valid_workout_semantic_metadata(jsonb)',
    ]) {
      const grants = (await db.query("select has_function_privilege('anon', $1, 'EXECUTE') as anonymous, has_function_privilege('authenticated', $1, 'EXECUTE') as member", ['public.' + signature])).rows[0];
      assert.equal(grants.anonymous, false, signature + ' must reject anonymous execution privileges');
      assert.equal(grants.member, true, signature + ' must retain authenticated execution');
    }
    for (const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) {
      const grants = (await db.query("select has_table_privilege('anon','public.planning_documents',$1) as anonymous, has_table_privilege('authenticated','public.planning_documents',$1) as member", [privilege])).rows[0];
      assert.equal(grants.anonymous, false, 'planning table excludes anonymous ' + privilege);
      assert.equal(grants.member, ['SELECT','INSERT','UPDATE'].includes(privilege), 'planning table least privilege: ' + privilege);
    }
    await db.exec('set role authenticated;');
    const identity = async id => db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
    await identity(alice);
    await assert.rejects(db.query('select save_workout_template_atomic($1, $2::jsonb, $3::jsonb)', ['switched-account', JSON.stringify({ title: 'Old account workout', owner_profile_id: bob }), JSON.stringify([{ exercise_id: 'squat', exercise_name: 'Squat' }])]), error => error.code === '42501');
    const saveTemplate = (key, title, exercises, id, revision = 0, mutation = crypto.randomUUID()) => db.query('select save_workout_template_atomic($1, $2::jsonb, $3::jsonb) as result', [key, JSON.stringify({ title, id, expected_revision: revision, mutation_key: mutation }), JSON.stringify(exercises)]);
    const exercise = { exercise_id: 'squat', exercise_name: 'Squat', target_sets: 3, target_reps: '8–10', target_rest_seconds: 0, notes: 'Keep authored instructions' };
    const template = (await saveTemplate('legacy-browser-id', 'Original workout', [exercise])).rows[0].result;
    assert.equal(template.exercises.length, 1);
    for (const field of ["target_sets", "target_reps", "target_rest_seconds", "notes"]) assert.deepEqual(template.exercises[0][field], exercise[field], "atomic endpoint returns authored " + field);
    const replacement = (await saveTemplate('legacy-browser-id', 'Updated workout', [{ ...exercise, exercise_name: 'Goblet squat' }], undefined, 1, 'second-edit')).rows[0].result;
    assert.equal(replacement.template.id, template.template.id, 'legacy retries retain identity');
    assert.equal((await db.query('select * from workout_templates')).rows.length, 1);
    await assert.rejects(saveTemplate('legacy-browser-id', 'Broken replacement', [{ ...exercise, target_sets: -1 }], undefined, 2));
    assert.equal((await db.query('select title from workout_templates')).rows[0].title, 'Updated workout');
    assert.equal((await db.query('select exercise_name from workout_template_exercises')).rows[0].exercise_name, 'Goblet squat');
    const templateRetry = (await saveTemplate('legacy-browser-id', 'Updated workout', [{ ...exercise, exercise_name: 'Goblet squat' }], undefined, 1, 'second-edit')).rows[0].result;
    assert.equal(templateRetry.template.revision, 2, 'lost-response retry does not increment revision');
    await assert.rejects(saveTemplate('legacy-browser-id', 'Stale device', [exercise], undefined, 1), error => error.code === '40001');
    assert.equal((await db.query('select title from workout_templates')).rows[0].title, 'Updated workout');
    await identity(bob);
    await assert.rejects(saveTemplate('stolen-id', 'Unauthorized', [exercise], template.template.id));
    assert.equal((await db.query('select * from workout_templates')).rows.length, 0);
    await identity(alice);
    const saveDocument = (revision, payload) => db.query('select save_planning_document($1, $2::jsonb) as revision', [revision, JSON.stringify(payload)]);
    assert.equal((await saveDocument(0, { goal: 'Strength' })).rows[0].revision, 1);
    await assert.rejects(saveDocument(0, { goal: 'Overwritten' }), error => error.code === '40001');
    assert.equal((await saveDocument(1, { goal: 'Mobility' })).rows[0].revision, 2);
    await identity(bob);
    assert.equal((await db.query('select * from planning_documents')).rows.length, 0);
    assert.equal((await saveDocument(0, { goal: 'Build Muscle' })).rows[0].revision, 1);
    await db.exec('reset role');
    const originalDocuments = (await db.query('select * from planning_documents order by profile_id')).rows;
    await db.exec('set role authenticated');
    await assert.rejects(db.exec('truncate public.planning_documents'), error => error.code === '42501');
    await assert.rejects(db.exec('delete from public.planning_documents'), error => error.code === '42501');
    await db.exec('set role anon');
    await assert.rejects(db.exec('select * from public.planning_documents'), error => error.code === '42501');
    await assert.rejects(db.exec('truncate public.planning_documents'), error => error.code === '42501');
    await db.exec('reset role');
    assert.deepEqual((await db.query('select * from planning_documents order by profile_id')).rows, originalDocuments, 'denied anonymous and bulk-clear operations preserve both member originals');
    await db.exec('set role authenticated');


    const complete = (key, assignment = 'assignment-one', sets = 3) => db.query('select save_completed_planning_workout($1, $2::jsonb, $3::jsonb) as id', [key, JSON.stringify({ title: 'Strength', completed_at: '2026-10-12T16:00:00Z', assignment_id: assignment, workout_template_id: '00000000-0000-4000-8000-000000000099' }), JSON.stringify([{ exercise_id: 'squat', exercise_name: 'Squat', weight: 20, reps: 8, sets, performed_at: '2026-10-12T16:00:00Z', order_index: 0 }])]);
    await identity(alice);
    assert.equal((await db.query('select planning_workout_load_unit_version() as version')).rows[0].version, 1);
    const first = (await complete('session-one')).rows[0].id;
    const originalCompletion = { logs: (await db.query('select * from workout_logs')).rows, sets: (await db.query('select * from workout_set_logs')).rows };
    await assert.rejects(db.query('select save_completed_planning_workout($1, $2::jsonb, $3::jsonb)', ['switched-session', JSON.stringify({ title: 'Old account workout', profile_id: bob, completed_at: '2026-10-12T16:00:00Z' }), JSON.stringify([{ exercise_id: 'squat', exercise_name: 'Squat', sets: 3, performed_at: '2026-10-12T16:00:00Z' }])]), error => error.code === '42501');
    assert.equal((await complete('session-one')).rows[0].id, first);
    await assert.rejects(complete('session-retried-with-new-id'), error => error.code === '23505' && /another session/.test(error.message));
    await assert.rejects(complete('session-one', 'assignment-one', 9), error => error.code === '23505' && /different saved exercise/.test(error.message));
    await assert.rejects(complete('session-one', 'assignment-two'), error => error.code === '23505' && /different saved workout/.test(error.message));
    const replayWith = (logChanges = {}, setChanges = {}, duplicate = false) => {
      const entry = { exercise_id: 'squat', exercise_name: 'Squat', weight: 20, reps: 8, sets: 3, performed_at: '2026-10-12T16:00:00Z', order_index: 0, ...setChanges };
      return db.query('select save_completed_planning_workout($1, $2::jsonb, $3::jsonb) as id', ['session-one', JSON.stringify({ title: 'Strength', completed_at: '2026-10-12T16:00:00Z', assignment_id: 'assignment-one', ...logChanges }), JSON.stringify(duplicate ? [entry, entry] : [entry])]);
    };
    for (const changes of [{ title: 'Changed title' }, { started_at: '2026-10-12T15:00:00Z' }, { completed_at: '2026-10-12T17:00:00Z' }, { plan_id: 'different-plan' }, { plan_day_id: 'different-day' }]) {
      await assert.rejects(replayWith(changes), error => error.code === '23505' && /different saved workout/.test(error.message));
    }
    for (const changes of [{ exercise_id: 'press' }, { exercise_name: 'Changed exercise' }, { body: 'upper' }, { pattern: 'push' }, { equipment: 'barbell' }, { weight: 21 }, { reps: 9 }, { performed_at: '2026-10-12T17:00:00Z' }, { order_index: 1 }]) {
      await assert.rejects(replayWith({}, changes), error => error.code === '23505' && /different saved exercise/.test(error.message));
    }
    await assert.rejects(replayWith({}, {}, true), error => error.code === '23505', 'duplicate rows are a changed completion');
    assert.equal((await replayWith({ completed_at: '2026-10-12T09:00:00-07:00', workout_template_id: template.template.id }, { weight: '20.00', reps: '8', sets: '3', performed_at: '2026-10-12T09:00:00-07:00' })).rows[0].id, first, 'equivalent typed values and later template availability safely replay');
    assert.equal((await db.query('select * from workout_logs')).rows.length, 1);
    assert.equal((await db.query('select * from workout_set_logs')).rows.length, 1);
    assert.equal((await db.query('select sets from workout_set_logs')).rows[0].sets, 3, 'same-session retries cannot replace original sets');
    assert.deepEqual({ logs: (await db.query('select * from workout_logs')).rows, sets: (await db.query('select * from workout_set_logs')).rows }, originalCompletion, 'rejected and equivalent retries preserve every original column');
    await assert.rejects(complete('invalid-session', 'assignment-two', -1));
    const validSet = { exercise_id: 'squat', exercise_name: 'Squat', weight: 20, reps: 8, sets: 3, performed_at: '2026-10-12T16:00:00Z', order_index: 0 };
    const validLog = { title: 'Payload validation', completed_at: '2026-10-12T16:00:00Z' };
    const unitFields = ['weightUnit', 'weight_unit', 'loadUnit', 'load_unit', 'unit', 'weightPounds', 'weightLb', 'weightLbs', 'weightKg', 'weightKilograms', 'loadPounds', 'loadLb', 'loadLbs', 'loadKg', 'loadKilograms'];
    for (const field of unitFields) {
      for (const value of ['kg', 'lb', 0, false, {}, []]) {
        const evidence = { [field]: value };
        const canonicalUnit = field === 'weight_unit' && ['lb', 'kg'].includes(value);
        const refusesUnit = error => error.code === '22023' && /load-unit metadata/.test(error.message);
        if (!canonicalUnit) await assert.rejects(db.query('select save_completed_planning_workout($1, $2::jsonb, $3::jsonb)', [
          `unit-set-${field}`, JSON.stringify(validLog), JSON.stringify([validSet, { ...validSet, order_index: 1, ...evidence }]),
        ]), refusesUnit);
        await assert.rejects(db.query('select save_completed_planning_workout($1, $2::jsonb, $3::jsonb)', [
          `unit-log-${field}`, JSON.stringify({ ...validLog, ...evidence }), JSON.stringify([validSet]),
        ]), refusesUnit);
        await assert.rejects(replayWith({}, evidence), canonicalUnit ? error => error.code === '23505' : refusesUnit, 'an existing unitless session cannot be confirmed as unit-bearing or discard unsupported units');
        await assert.rejects(replayWith(evidence), refusesUnit, 'root-level units cannot be discarded on replay either');
      }
      for (const value of [null, '', ' \t\n\r ']) {
        assert.equal((await replayWith({ [field]: value }, { [field]: value })).rows[0].id, first, 'empty optional unit metadata remains unreported');
      }
      assert.deepEqual({ logs: (await db.query('select * from workout_logs')).rows, sets: (await db.query('select * from workout_set_logs')).rows }, originalCompletion, 'unit rejection and empty metadata replay preserve all original columns');
    }
    await db.exec('begin');
    try {
      const unitEntries = ['lb', 'kg', null].map((weight_unit, order_index) => ({ ...validSet, weight: order_index === 0 ? 0 : 20, weight_unit, order_index }));
      const saveUnits = entries => db.query('select save_completed_planning_workout($1, $2::jsonb, $3::jsonb) as id', ['recorded-unit-workout', JSON.stringify(validLog), JSON.stringify(entries)]);
      const saved = (await saveUnits(unitEntries)).rows[0].id;
      const before = (await db.query('select * from workout_set_logs where workout_log_id = $1 order by order_index', [saved])).rows;
      assert.deepEqual(before.map(row => [Number(row.weight), row.weight_unit]), [[0, 'lb'], [20, 'kg'], [20, null]], 'the backend preserves explicit units and keeps older/unreported units null');
      assert.equal((await saveUnits(unitEntries)).rows[0].id, saved);
      for (const weight_unit of ['kg', null]) {
        await db.exec('savepoint unit_replay_check');
        await assert.rejects(saveUnits(unitEntries.map((entry, index) => index === 0 ? { ...entry, weight_unit } : entry)), error => error.code === '23505', 'changing or removing the recorded unit changes idempotent content, even for zero load');
        await db.exec('rollback to savepoint unit_replay_check');
        await db.exec('release savepoint unit_replay_check');
      }
      assert.deepEqual((await db.query('select * from workout_set_logs where workout_log_id = $1 order by order_index', [saved])).rows, before);
      await assert.rejects(db.query('update workout_set_logs set weight_unit = $1 where workout_log_id = $2', ['stones', saved]), error => error.code === '23514');
    } finally { await db.exec('rollback'); }
    assert.deepEqual({ logs: (await db.query('select * from workout_logs')).rows, sets: (await db.query('select * from workout_set_logs')).rows }, originalCompletion);
    for (const [key, logPayload, setPayloads] of [
      ['null-sets', validLog, null], ['object-sets', validLog, {}], ['empty-sets', validLog, []],
      ['null-log', null, [validSet]], ['array-log', [], [validSet]], ['   ', validLog, [validSet]],
    ]) {
      await assert.rejects(db.query('select save_completed_planning_workout($1, $2::jsonb, $3::jsonb)', [key, JSON.stringify(logPayload), JSON.stringify(setPayloads)]), error => error.code === '22023');
    }
    await assert.rejects(db.query('select save_completed_planning_workout($1, $2::jsonb, $3::jsonb)', ['sql-null-sets', JSON.stringify(validLog), null]), error => error.code === '22023');
    assert.deepEqual({ logs: (await db.query('select * from workout_logs')).rows, sets: (await db.query('select * from workout_set_logs')).rows }, originalCompletion, 'malformed payloads cannot create a completion without sets');
    for (const field of ['plan_id', 'plan_day_id', 'assignment_id', 'workout_template_id']) {
      for (const value of [false, 0, true, 42, {}, []]) {
        await assert.rejects(db.query('select save_completed_planning_workout($1, $2::jsonb, $3::jsonb)', [
          `invalid-link-${field}`, JSON.stringify({ ...validLog, [field]: value }), JSON.stringify([validSet]),
        ]), error => error.code === '22023');
        assert.deepEqual({ logs: (await db.query('select * from workout_logs')).rows, sets: (await db.query('select * from workout_set_logs')).rows }, originalCompletion);
      }
    }
    for (const [index, title] of [false, 0, true, 42, {}, [], undefined, null, '', ' \t\n\r '].entries()) {
      await assert.rejects(db.query('select save_completed_planning_workout($1, $2::jsonb, $3::jsonb)', [
        `invalid-title-${index}`, JSON.stringify({ ...validLog, title }), JSON.stringify([validSet]),
      ]), error => error.code === '22023');
      assert.deepEqual({ logs: (await db.query('select * from workout_logs')).rows, sets: (await db.query('select * from workout_set_logs')).rows }, originalCompletion, 'invalid workout titles cannot create or change completion records');
    }
    const invalidDatePayloads = [
      [{ completed_at: null }, {}], [{ completed_at: true }, {}], [{ completed_at: 'infinity' }, {}], [{ completed_at: '-infinity' }, {}],
      [{ completed_at: '2026-02-30T16:00:00Z' }, {}], [{ started_at: 'infinity' }, {}], [{ started_at: '2026-10-12T17:00:00Z' }, {}],
      [{}, { performed_at: null }], [{}, { performed_at: false }], [{}, { performed_at: 'infinity' }], [{}, { performed_at: '2026-02-30T16:00:00Z' }],
    ];
    for (const [index, [logChanges, setChanges]] of invalidDatePayloads.entries()) {
      await assert.rejects(db.query('select save_completed_planning_workout($1, $2::jsonb, $3::jsonb)', [
        `invalid-date-${index}`, JSON.stringify({ title: 'Invalid date workout', completed_at: '2026-10-12T16:00:00Z', ...logChanges }),
        JSON.stringify([validSet, { ...validSet, order_index: 1, ...setChanges }]),
      ]), error => ['22007', '22008'].includes(error.code));
      assert.deepEqual({ logs: (await db.query('select * from workout_logs')).rows, sets: (await db.query('select * from workout_set_logs')).rows }, originalCompletion, 'invalid dates roll back workout and any earlier inserted sets');
    }
    assert.equal((await db.query('select * from workout_logs')).rows.length, 1, 'invalid set must roll back its workout');
    for (const [index, weight] of ['NaN', 'Infinity', '-Infinity'].entries()) {
      await assert.rejects(db.query('select save_completed_planning_workout($1, $2::jsonb, $3::jsonb)', [
        `invalid-weight-${index}`, JSON.stringify(validLog), JSON.stringify([validSet, { ...validSet, order_index: 1, weight }]),
      ]), error => error.code === '22003');
      assert.deepEqual({ logs: (await db.query('select * from workout_logs')).rows, sets: (await db.query('select * from workout_set_logs')).rows }, originalCompletion, 'nonfinite weights roll back the workout and earlier valid sets');
    }
    await db.exec('begin');
    try {
      const weights = [null, 0, '12.75', '1e2'];
      const accepted = await db.query('select save_completed_planning_workout($1, $2::jsonb, $3::jsonb) as id', [
        'recorded-weight-types', JSON.stringify(validLog), JSON.stringify(weights.map((weight, order_index) => ({ ...validSet, weight, order_index }))),
      ]);
      const recorded = await db.query('select weight::text as weight from workout_set_logs where workout_log_id = $1 order by order_index', [accepted.rows[0].id]);
      assert.deepEqual(recorded.rows.map(row => row.weight), [null, '0', '12.75', '100']);
    } finally { await db.exec('rollback'); }
    assert.deepEqual({ logs: (await db.query('select * from workout_logs')).rows, sets: (await db.query('select * from workout_set_logs')).rows }, originalCompletion);
    const malformedExercises = [
      { exercise_name: true }, { exercise_name: {} }, { exercise_name: ['Squat'] }, { exercise_name: null }, { exercise_name: ' \t\n ' },
      ...['exercise_id', 'body', 'pattern', 'equipment'].flatMap(field => [true, 42, {}, []].map(value => ({ [field]: value }))),
      { order_index: null }, { order_index: -1 }, { order_index: 0 },
    ];
    for (const [index, changes] of malformedExercises.entries()) {
      await assert.rejects(db.query('select save_completed_planning_workout($1, $2::jsonb, $3::jsonb)', [
        `invalid-exercise-${index}`, JSON.stringify(validLog), JSON.stringify([validSet, { ...validSet, order_index: 1, ...changes }]),
      ]), error => error.code === '22023');
      assert.deepEqual({ logs: (await db.query('select * from workout_logs')).rows, sets: (await db.query('select * from workout_set_logs')).rows }, originalCompletion, 'malformed metadata or duplicate order rolls back all new rows');
    }
    // Recorded variations are per occurrence, optional for older clients, and immutable on completion replay.
    assert.equal((await db.query('select planning_workout_semantics_version() as version')).rows[0].version, 1);
    const front = { coreMovementPattern: 'squat', semanticVariationId: 'front', semanticVariationName: 'Front Squat', generatedTitle: 'Paused Front Squat', selectedModifierIds: ['paused'] };
    const back = { coreMovementPattern: 'squat', semanticVariationId: 'back', selectedModifierIds: ['wide'] };
    const semanticExercises = [front, back].map(semantic_metadata => ({ ...exercise, semantic_metadata }));
    const semanticTemplate = (await saveTemplate('semantic-template', 'Recorded variations', semanticExercises)).rows[0].result;
    assert.deepEqual(semanticTemplate.exercises.map(item => item.semantic_metadata), [front, back]);
    const templateBefore = { templates: (await db.query('select * from workout_templates order by id')).rows, exercises: (await db.query('select * from workout_template_exercises order by id')).rows };
    const invalidSemantics = [null, false, [], 'squat', { semanticVariationId: 4 }, { selectedModifierIds: 'paused' }, { selectedModifierIds: [false] }, { unknown: 'discarded?' }];
    for (const semantic_metadata of invalidSemantics) {
      await assert.rejects(saveTemplate('semantic-template', 'Invalid replacement', [{ ...exercise, semantic_metadata }], undefined, 1), error => error.code === '22023');
      assert.deepEqual({ templates: (await db.query('select * from workout_templates order by id')).rows, exercises: (await db.query('select * from workout_template_exercises order by id')).rows }, templateBefore);
    }
    const semanticSets = [front, back].map((semantic_metadata, order_index) => ({ ...validSet, order_index, semantic_metadata }));
    const saveSemanticCompletion = sets => db.query('select save_completed_planning_workout($1, $2::jsonb, $3::jsonb) as id', ['semantic-session', JSON.stringify(validLog), JSON.stringify(sets)]);
    const semanticLogId = (await saveSemanticCompletion(semanticSets)).rows[0].id;
    assert.deepEqual((await db.query('select semantic_metadata from workout_set_logs where workout_log_id = $1 order by order_index', [semanticLogId])).rows.map(item => item.semantic_metadata), [front, back]);
    assert.equal((await saveSemanticCompletion(semanticSets)).rows[0].id, semanticLogId);
    const semanticBefore = { logs: (await db.query('select * from workout_logs order by id')).rows, sets: (await db.query('select * from workout_set_logs order by id')).rows };
    await assert.rejects(saveSemanticCompletion(semanticSets.map(item => ({ ...item, semantic_metadata: front }))), error => error.code === '23505');
    await assert.rejects(saveSemanticCompletion(semanticSets.map(({ semantic_metadata, ...item }) => item)), error => error.code === '23505');
    for (const [index, semantic_metadata] of invalidSemantics.entries()) {
      await assert.rejects(db.query('select save_completed_planning_workout($1, $2::jsonb, $3::jsonb)', ['invalid-semantic-' + index, JSON.stringify(validLog), JSON.stringify([{ ...validSet, semantic_metadata }])]), error => error.code === '22023');
    }
    assert.deepEqual({ logs: (await db.query('select * from workout_logs order by id')).rows, sets: (await db.query('select * from workout_set_logs order by id')).rows }, semanticBefore);
    await assert.rejects(db.query("update workout_set_logs set semantic_metadata = '[]'::jsonb where workout_log_id = $1", [semanticLogId]), error => error.code === '23514');
    // Stable local template keys survive absent uploads and resolve only owned relational templates.
    assert.equal((await db.query('select planning_workout_template_identity_version() as version')).rows[0].version, 1);
    const linked = (key, templateKey, templateUuid = null) => db.query('select save_completed_planning_workout($1, $2::jsonb, $3::jsonb) as id', [key, JSON.stringify({ ...validLog, template_client_key: templateKey, workout_template_id: templateUuid }), JSON.stringify([validSet])]);
    const linkedId = (await linked('client-key-session', 'legacy-browser-id')).rows[0].id;
    const linkedRow = (await db.query('select * from workout_logs where id = $1', [linkedId])).rows[0];
    assert.equal(linkedRow.template_client_key, 'legacy-browser-id'); assert.equal(linkedRow.workout_template_id, template.template.id);
    assert.equal((await linked('client-key-session', 'legacy-browser-id')).rows[0].id, linkedId);
    await assert.rejects(linked('client-key-session', 'semantic-template'), error => error.code === '23505');
    await assert.rejects(linked('client-key-session', null), error => error.code === '23505');
    await assert.rejects(linked('mismatched-link-session', 'semantic-template', template.template.id), error => error.code === '22023');
    const pendingId = (await linked('pending-template-session', 'not-uploaded-template')).rows[0].id;
    const pendingRow = (await db.query('select * from workout_logs where id = $1', [pendingId])).rows[0];
    assert.equal(pendingRow.workout_template_id, null); assert.equal(pendingRow.template_client_key, 'not-uploaded-template');
    const legacyLinkedId = (await linked('legacy-uuid-session', null, template.template.id)).rows[0].id;
    assert.equal((await linked('legacy-uuid-session', 'legacy-browser-id', template.template.id)).rows[0].id, legacyLinkedId);
    assert.equal((await db.query('select template_client_key from workout_logs where id = $1', [legacyLinkedId])).rows[0].template_client_key, null, 'legacy proof allows equivalent replay without rewriting history');
    const legacyUuid = '33333333-3333-4333-8333-333333333333';
    await db.query("insert into workout_templates(id, owner_profile_id, title, source, status) values ($1, $2, 'Legacy UUID workout', 'builder', 'active')", [legacyUuid, alice]);
    await saveTemplate(legacyUuid, 'Colliding client key workout', [exercise]);
    await assert.rejects(linked('ambiguous-template-session', legacyUuid), error => error.code === '22023' && /ambiguous/.test(error.message));
    const identityBefore = { logs: (await db.query('select * from workout_logs order by id')).rows, sets: (await db.query('select * from workout_set_logs order by id')).rows };
    for (const templateKey of ['', '   ', 'x'.repeat(201), false, {}, []]) await assert.rejects(linked('invalid-template-key', templateKey), error => error.code === '22023');
    assert.deepEqual({ logs: (await db.query('select * from workout_logs order by id')).rows, sets: (await db.query('select * from workout_set_logs order by id')).rows }, identityBefore);
    await identity(bob);
    assert.equal((await db.query('select * from workout_logs')).rows.length, 0);
    assert.equal((await db.query('select * from workout_set_logs')).rows.length, 0);
    const requestId = '00000000-0000-4000-8000-000000000010';
    await assert.rejects(db.query('select * from send_app_member_message($1, $2, $3)', ['Wrong account', requestId, alice]), error => error.code === '42501');
    assert.equal((await db.query('select * from member_messages')).rows.length, 0);
    const message = await db.query('select * from send_app_member_message($1, $2)', ['Hello coach', requestId]);
    assert.equal(message.rows[0].sent_by, 'member');
    const retry = await db.query('select * from send_app_member_message($1, $2)', ['Hello coach', requestId]);
    assert.equal(retry.rows[0].id, message.rows[0].id);
    await assert.rejects(db.query('select * from send_app_member_message($1, $2)', ['Changed retry body', requestId]), error => error.code === '23505');
    assert.deepEqual((await db.query('select * from member_messages')).rows, message.rows);
    assert.equal((await db.query('select * from member_messages')).rows.length, 1);
    await assert.rejects(db.query("insert into member_messages(member_id,sent_by,body) values ($1,'coach','Impersonation')", [bob]));
    await identity(alice);
    assert.equal((await db.query('select * from member_messages')).rows.length, 0);
    await identity('');
    await assert.rejects(saveDocument(0, {}), /Authentication required/);
    await assert.rejects(complete('anonymous'), /Authentication required/);
  } finally { await db.close(); }
});
