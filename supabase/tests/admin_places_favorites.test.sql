BEGIN;
SELECT plan(3);

SELECT ok(
  pg_get_functiondef('public.get_admin_locations_page(text,integer,text,text,integer,integer)'::regprocedure) LIKE '%''favorites_count'', favorites_count%',
  'Admin Places rows carry how many members liked each place'
);
SELECT ok(
  pg_get_functiondef('public.get_admin_locations_page(text,integer,text,text,integer,integer)'::regprocedure) LIKE '%''reviews'', ''favorites''%',
  'Admin Places can sort by favorites'
);
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.get_admin_locations_page(text,integer,text,text,integer,integer)', 'EXECUTE'),
  'Members still cannot page admin places'
);

SELECT * FROM finish();
ROLLBACK;
