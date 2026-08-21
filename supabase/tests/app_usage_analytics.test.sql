BEGIN;

SELECT plan(15);

SELECT has_table(
  'public',
  'app_usage_presence',
  'App usage has a current-presence table'
);

SELECT has_table(
  'public',
  'app_usage_daily',
  'App usage has a daily activity table'
);

SELECT col_is_pk(
  'public',
  'app_usage_presence',
  ARRAY['installation_id'],
  'Presence keeps one current audience per installation'
);

SELECT col_is_pk(
  'public',
  'app_usage_daily',
  ARRAY['usage_date', 'installation_id', 'audience'],
  'Daily usage deduplicates an installation within each audience and day'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.app_usage_presence', 'SELECT'),
  'Visitors cannot read raw presence identifiers'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.app_usage_daily', 'SELECT'),
  'Visitors cannot read raw daily identifiers'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.app_usage_presence', 'SELECT'),
  'Members cannot read raw presence identifiers'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.app_usage_daily', 'SELECT'),
  'Members cannot read raw daily identifiers'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.app_usage_presence', 'INSERT'),
  'Visitors cannot forge raw presence rows'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.app_usage_daily', 'INSERT'),
  'Members cannot forge raw daily rows'
);

SELECT ok(
  has_table_privilege('service_role', 'public.app_usage_presence', 'SELECT, INSERT, UPDATE'),
  'The server can maintain presence rows'
);

SELECT ok(
  has_table_privilege('service_role', 'public.app_usage_daily', 'SELECT, INSERT, UPDATE'),
  'The server can maintain daily rows'
);

SELECT has_function(
  'public',
  'get_app_usage_summary',
  ARRAY['date', 'date', 'timestamp with time zone'],
  'The dashboard has an aggregate audience function'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.get_app_usage_summary(date,date,timestamptz)',
    'EXECUTE'
  ),
  'Members cannot query aggregate operator analytics'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.get_app_usage_summary(date,date,timestamptz)',
    'EXECUTE'
  ),
  'The server-side dashboard can query aggregate audience analytics'
);

SELECT * FROM finish();
ROLLBACK;
