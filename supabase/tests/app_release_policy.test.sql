BEGIN;
SELECT plan(6);

SELECT ok(
  NOT has_table_privilege('anon', 'public.app_release_policy', 'SELECT'),
  'Visitors cannot read the policy table directly'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.app_release_policy', 'UPDATE'),
  'Members cannot change the minimum version'
);
SELECT ok(
  has_function_privilege('anon', 'public.get_app_release_policy_v1(text)', 'EXECUTE'),
  'Visitors can check the minimum version before signing in'
);
SELECT is(
  public.get_app_release_policy_v1('ios')->>'minSupportedVersion',
  '4.8.0',
  'iOS starts at the oldest version in active use'
);
SELECT is(
  public.get_app_release_policy_v1('android')->>'storeUrl',
  'https://play.google.com/store/apps/details?id=com.ohope.tinitimeclub',
  'Android points at the Play listing'
);
SELECT is(
  public.get_app_release_policy_v1('web'),
  NULL,
  'Unknown platforms have no policy'
);

SELECT * FROM finish();
ROLLBACK;
