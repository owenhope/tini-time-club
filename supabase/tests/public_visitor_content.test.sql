BEGIN;

SELECT plan(14);

SELECT has_column(
  'public',
  'profiles',
  'is_public',
  'Profiles have an explicit visitor-visibility choice'
);

SELECT col_not_null(
  'public',
  'profiles',
  'is_public',
  'Profile visibility cannot be ambiguous'
);

SELECT is(
  (
    SELECT column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'is_public'
  ),
  'true'::text,
  'Profiles opt into visitor discovery by default'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.profiles', 'SELECT'),
  'Anonymous clients cannot select raw profile rows'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.reviews', 'SELECT'),
  'Anonymous clients cannot select raw review rows'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.comments', 'SELECT'),
  'Anonymous clients cannot select raw comment rows'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'reviews', 'comments')
      AND cmd = 'SELECT'
      AND (
        'public'::name = ANY (roles)
        OR 'anon'::name = ANY (roles)
      )
  ),
  'No raw content RLS policy grants anonymous reads'
);

SELECT function_privs_are(
  'public',
  'get_regulars_for_locations',
  ARRAY['bigint[]', 'integer'],
  'anon',
  ARRAY['EXECUTE'],
  'Visitors may call only the sanitized regulars function'
);

SELECT function_privs_are(
  'public',
  'get_profile_regular_places',
  ARRAY['uuid'],
  'anon',
  ARRAY['EXECUTE'],
  'Visitors may call only the sanitized regular-places function'
);

SELECT ok(
  (
    SELECT prosecdef
    FROM pg_proc
    WHERE oid = 'public.get_regulars_for_locations(bigint[],integer)'::regprocedure
  ),
  'The regulars visitor function owns its protected-table read boundary'
);

SELECT ok(
  pg_get_functiondef(
    'public.get_regulars_for_locations(bigint[],integer)'::regprocedure
  ) LIKE '%p.is_public = true%',
  'Visitor regulars omit private profiles'
);

SELECT ok(
  pg_get_functiondef(
    'public.get_regulars_for_locations(bigint[],integer)'::regprocedure
  ) LIKE '%is_member_visible(p.id)%',
  'Member regulars preserve mutual-block visibility'
);

SELECT ok(
  pg_get_functiondef(
    'public.get_profile_regular_places(uuid)'::regprocedure
  ) LIKE '%p.is_public = true%',
  'Visitor profile places omit private profiles'
);

SELECT ok(
  pg_get_functiondef(
    'public.get_profile_regular_places(uuid)'::regprocedure
  ) LIKE '%is_member_visible(p_profile_id)%',
  'Member profile places preserve mutual-block visibility'
);

SELECT * FROM finish();
ROLLBACK;
