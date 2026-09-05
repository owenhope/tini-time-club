BEGIN;
SELECT plan(23);

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
SELECT ok(pg_get_functiondef('public.reconcile_my_passport_v1()'::regprocedure) LIKE '%pg_advisory_xact_lock%','Reconciliation serializes per member');
SELECT ok(pg_get_functiondef('public.reconcile_my_passport_v1()'::regprocedure) LIKE '%revoked_at IS NULL%','Revoked awards do not contribute points');
SELECT ok(pg_get_functiondef('public.reconcile_my_passport_v1()'::regprocedure) LIKE '%passport_achievement%','New stamps append a Passport Activity event');
SELECT ok(pg_get_functiondef('public.reconcile_my_passport_v1()'::regprocedure) LIKE '%awarded_at%','Reconciliation returns complete stamp display data');

SELECT * FROM finish();
ROLLBACK;
