BEGIN;
SELECT plan(31);

-- Passport reconciliation emits notifications in a fresh database too.
INSERT INTO public.notification_types (id, name)
VALUES (2, 'Comment') ON CONFLICT (id) DO NOTHING;

-- A member whose favorites survive from the legacy shape: jsonb string
-- scalars holding a stringified array, which the app parses but strict
-- jsonb_array_length calls reject.
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '77700000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'passport-legacy@example.test',
  '',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now()
);
UPDATE public.profiles
SET favorite_spirits = to_jsonb('["1","2"]'::text),
    favorite_types = to_jsonb('["3"]'::text)
WHERE id = '77700000-0000-0000-0000-000000000001';

SELECT has_table('public','passport_definitions','Passport definitions exist');
SELECT has_table('public','passport_awards','Passport awards exist');
SELECT has_column('public','profiles','passport_points','Profiles expose canonical Passport points');
SELECT col_not_null('public','profiles','passport_points','Passport points never become null');
SELECT ok(NOT has_table_privilege('authenticated','public.passport_awards','SELECT'),'Awards are private');
SELECT ok(NOT has_table_privilege('authenticated','public.passport_definitions','SELECT'),'Definitions are private');
SELECT function_privs_are('public','get_my_passport_v1',ARRAY[]::text[],'authenticated',ARRAY['EXECUTE'],'Members can read their Passport');
SELECT function_privs_are('public','reconcile_my_passport_v1',ARRAY[]::text[],'authenticated',ARRAY['EXECUTE'],'Members can reconcile their Passport');
SELECT ok(NOT has_function_privilege('anon','public.get_my_passport_v1()','EXECUTE'),'Visitors cannot read Passport');
SELECT ok(NOT has_function_privilege('authenticated','public.passport_progress_v1(uuid)','EXECUTE'),'Clients cannot inspect another member');
SELECT is((SELECT count(*)::integer FROM public.passport_definitions WHERE series='Community'),15,'Only three five-tier community series ship');
SELECT is((SELECT count(*)::integer FROM public.passport_definitions WHERE metric IN ('followers','following')),0,'Follower achievements are excluded');
SELECT set_eq(
  $$SELECT DISTINCT metric FROM public.passport_definitions WHERE series='Community'$$,
  $$VALUES ('comments'::text),('likes_received'::text),('shares'::text)$$,
  'Community contains Comments, Likes received, and Shares'
);
SELECT set_eq(
  $$SELECT points::integer FROM public.passport_definitions WHERE metric='comments' ORDER BY threshold$$,
  $$VALUES (10),(25),(50),(100),(200)$$,
  'Community milestones use the standard reward curve'
);
SELECT ok(
  NOT EXISTS(
    SELECT 1 FROM public.passport_definitions
    WHERE points NOT IN (10,25,50,100,200)
  ),
  'Every Passport achievement uses a standard reward value'
);
SELECT is(
  (SELECT unit FROM public.passport_definitions WHERE key = 'first-photo'),
  'profile picture',
  'The First Steps photo stamp is called Profile Picture'
);
SELECT ok(
  NOT EXISTS(
    SELECT 1 FROM public.passport_definitions
    WHERE metric = 'combination' AND points <> 10
  ),
  'Every Martini Explorer combination awards ten points'
);
SELECT is(
  (SELECT max(threshold) FROM public.passport_definitions WHERE metric = 'locations' AND enabled),
  100,
  'Total Locations caps at one hundred venues'
);
SELECT ok(EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.passport_awards'::regclass AND contype='u'),'Awards are idempotent per member and definition');
SELECT ok(pg_get_functiondef('public.passport_progress_v1(uuid)'::regprocedure) LIKE '%r.state=1%','Only active reviews advance review metrics');
-- The member-facing reconcile_my_passport_v1 delegates to this core.
SELECT ok(pg_get_functiondef('public.reconcile_passport_for_v1(uuid)'::regprocedure) LIKE '%pg_advisory_xact_lock%','Reconciliation serializes per member');
SELECT ok(pg_get_functiondef('public.reconcile_passport_for_v1(uuid)'::regprocedure) LIKE '%revoked_at IS NULL%','Revoked awards do not contribute points');
SELECT ok(pg_get_functiondef('public.reconcile_passport_for_v1(uuid)'::regprocedure) LIKE '%passport_achievement%','New stamps append a Passport Activity event');
SELECT ok(pg_get_functiondef('public.reconcile_passport_for_v1(uuid)'::regprocedure) LIKE '%awarded_at%','Reconciliation returns complete stamp display data');
SELECT ok(pg_get_functiondef('public.reconcile_my_passport_v1()'::regprocedure) LIKE '%reconcile_passport_for_v1%','Member reconcile delegates to the shared core');
SELECT ok(
  pg_get_functiondef('public.get_feed_page_v1(uuid,integer,timestamptz,bigint,uuid,bigint,boolean,boolean)'::regprocedure)
    ~ $pattern$'passport_points'\s*,\s*p\.passport_points$pattern$,
  'Review feed author profiles expose current Passport points'
);
SELECT ok(
  pg_get_functiondef('public.get_feed_page_v1(uuid,integer,timestamptz,bigint,uuid,bigint,boolean,boolean)'::regprocedure)
    ~ $pattern$'passport_points'\s*,\s*preview\.profile_passport_points$pattern$,
  'Review feed comment profiles expose current Passport points'
);

SELECT is(
  public.normalize_favorite_ids(to_jsonb('["1","2"]'::text)),
  '["1","2"]'::jsonb,
  'Legacy stringified favorites normalize to arrays'
);
SELECT is(
  public.normalize_favorite_ids(to_jsonb('martini'::text)),
  '[]'::jsonb,
  'Unparseable legacy favorites normalize to empty'
);
SELECT lives_ok(
  $$SELECT public.reconcile_passport_for_v1('77700000-0000-0000-0000-000000000001')$$,
  'Reconciliation survives legacy string-shaped favorites'
);
SELECT is(
  (
    SELECT p.progress
    FROM public.passport_progress_v1('77700000-0000-0000-0000-000000000001') p
    JOIN public.passport_definitions d ON d.id = p.definition_id
    WHERE d.metric = 'taste_profile'
  ),
  1,
  'Legacy string-shaped favorites still earn the taste profile stamp'
);

SELECT * FROM finish();
ROLLBACK;
