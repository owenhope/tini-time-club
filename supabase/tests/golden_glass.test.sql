BEGIN;

SELECT plan(37);

SELECT has_table('public', 'regions', 'Canonical Explore regions exist');
SELECT has_table('public', 'region_google_places', 'Google city mappings exist');
SELECT has_table('public', 'golden_glass_snapshot', 'Golden Glass keeps a current snapshot');
SELECT has_column('public', 'locations', 'region_id', 'Locations have one canonical region assignment');
SELECT has_column('public', 'regions', 'catchment_radius_m', 'Regions have an explicit automatic catchment radius');
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.locations'::regclass
      AND tgname = 'locations_auto_assign_region'
      AND tgenabled <> 'D'
  ),
  'Locations receive automatic region assignments from their coordinates'
);
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.regions'::regclass
      AND tgname = 'regions_refresh_location_assignments'
      AND tgenabled <> 'D'
  ),
  'Changing a region catchment re-evaluates existing locations'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'regions'
      AND column_name IN (
        'viewport_ne_lat',
        'viewport_ne_lon',
        'viewport_sw_lat',
        'viewport_sw_lon'
      )
  ),
  'Regions no longer store a manual viewport rectangle'
);
SELECT has_column('public', 'locations', 'neighborhood', 'Locations have an optional neighborhood');
SELECT has_column('public', 'locations', 'golden_glass_eligible', 'Locations have an eligibility control');
SELECT has_column('public', 'locations', 'golden_glass_ineligibility_reason', 'Locations store exclusion reasons');
SELECT has_column('public', 'golden_glass_snapshot', 'raw_overall', 'Snapshot stores raw Overall');
SELECT has_column('public', 'golden_glass_snapshot', 'adjusted_score', 'Snapshot stores internal Bayesian score');
SELECT has_column('public', 'golden_glass_snapshot', 'distinct_reviewers', 'Snapshot stores distinct reviewer count');
SELECT has_column('public', 'golden_glass_snapshot', 'latest_review_at', 'Snapshot stores latest review recency');
SELECT col_not_null('public', 'locations', 'golden_glass_eligible', 'Eligibility is explicit');
SELECT col_not_null('public', 'golden_glass_snapshot', 'refreshed_at', 'Snapshot refresh time is explicit');

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'locations_golden_glass_eligibility_check'
  ),
  'Ineligible locations require a nonblank reason and eligible locations clear it'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.golden_glass_snapshot'::regclass
      AND conname = 'golden_glass_snapshot_region_id_rank_key'
  ),
  'A region cannot expose two rows at the same calculated rank'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.golden_glass_snapshot', 'SELECT'),
  'Anonymous clients cannot read raw ranking snapshots'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.golden_glass_snapshot', 'SELECT'),
  'Client roles cannot read raw ranking snapshots'
);
SELECT function_privs_are(
  'public', 'get_golden_glass_v1', ARRAY['bigint'], 'authenticated', ARRAY['EXECUTE'],
  'Members can call the authenticated Golden Glass interface'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.get_golden_glass_v1(bigint)', 'EXECUTE'),
  'Anonymous clients cannot execute the Golden Glass interface'
);
SELECT function_privs_are(
  'public', 'refresh_golden_glass_v1', ARRAY[]::text[], 'service_role', ARRAY['EXECUTE'],
  'Only the service role can refresh recognition'
);
SELECT ok(
  pg_get_functiondef('public.refresh_golden_glass_v1()'::regprocedure) LIKE '%count(*) >= 3%',
  'Ranking requires at least three distinct member contributions'
);
SELECT ok(
  pg_get_functiondef('public.refresh_golden_glass_v1()'::regprocedure) LIKE '%avg((r.taste + r.presentation) / 2.0)%',
  'Overall uses taste and presentation at half-point precision'
);
SELECT ok(
  pg_get_functiondef('public.refresh_golden_glass_v1()'::regprocedure) LIKE '%(candidates.distinct_reviewers + 3)%',
  'Ranking uses the specified Bayesian m value'
);
SELECT ok(
  pg_get_functiondef('public.refresh_golden_glass_v1()'::regprocedure) LIKE '%distinct_reviewers DESC%'
    AND pg_get_functiondef('public.refresh_golden_glass_v1()'::regprocedure) LIKE '%raw_overall DESC%'
    AND pg_get_functiondef('public.refresh_golden_glass_v1()'::regprocedure) LIKE '%latest_review_at DESC%'
    AND pg_get_functiondef('public.refresh_golden_glass_v1()'::regprocedure) LIKE '%location_id ASC%',
  'All deterministic tie breakers are part of the ranking order'
);
SELECT ok(
  pg_get_functiondef('public.refresh_golden_glass_v1()'::regprocedure) LIKE '%calculated_rank <= 10%',
  'Only ten rows per region enter the current snapshot'
);
SELECT ok(
  pg_get_functiondef('public.refresh_golden_glass_v1()'::regprocedure) LIKE '%r.state = 1%'
    AND pg_get_functiondef('public.refresh_golden_glass_v1()'::regprocedure) LIKE '%p.deleted = false%',
  'Only active reviews from live profiles participate'
);
SELECT ok(
  pg_get_functiondef('public.refresh_golden_glass_v1()'::regprocedure) LIKE '%l.golden_glass_eligible = true%',
  'Ineligible locations are excluded before scoring'
);
SELECT ok(
  pg_get_functiondef('public.get_golden_glass_v1(bigint)'::regprocedure) LIKE '%auth.uid() IS NOT NULL%',
  'The public result interface derives and requires an authenticated caller'
);
SELECT ok(
  pg_get_functiondef('public.get_region_members_v1(bigint,text,integer)'::regprocedure) LIKE '%l.region_id = p_region_id%',
  'Member discovery is scoped by location region rather than profile home city'
);
SELECT ok(
  (SELECT count(*) FROM public.regions WHERE slug IN ('vancouver','seattle','los-angeles','new-york','paris','bangkok')) = 6,
  'The six initial canonical regions are seeded'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.region_google_places WHERE google_place_id = ''
  ),
  'Seed data does not invent production Google Place IDs'
);
SELECT ok(
  pg_get_functiondef('public.refresh_golden_glass_v1()'::regprocedure) LIKE '%DELETE FROM public.golden_glass_snapshot WHERE true%',
  'Refresh replaces the current projection instead of accumulating history'
);
SELECT lives_ok(
  $$SELECT * FROM public.get_golden_glass_inspection_v1(NULL)$$,
  'Inspection RPC executes without ambiguous region references'
);

SELECT * FROM finish();
ROLLBACK;
