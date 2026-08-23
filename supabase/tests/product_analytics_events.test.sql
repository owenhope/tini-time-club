BEGIN;

SELECT plan(8);

SELECT has_table(
  'public',
  'app_analytics_events',
  'Product analytics has a server-owned event table'
);

SELECT col_is_pk(
  'public',
  'app_analytics_events',
  ARRAY['id'],
  'Client event IDs make delivery idempotent'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.app_analytics_events', 'SELECT'),
  'Visitors cannot read raw product events'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.app_analytics_events', 'SELECT'),
  'Members cannot read raw product events'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.app_analytics_events', 'INSERT'),
  'Members cannot forge product events directly'
);

SELECT has_function(
  'public',
  'get_product_analytics_summary',
  ARRAY['date', 'date'],
  'The dashboard has a privacy-safe product summary function'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.get_product_analytics_summary(date,date)',
    'EXECUTE'
  ),
  'Members cannot query operator product analytics'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.get_product_analytics_summary(date,date)',
    'EXECUTE'
  ),
  'The server-side dashboard can query product analytics'
);

SELECT * FROM finish();
ROLLBACK;
