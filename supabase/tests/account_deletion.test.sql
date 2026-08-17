BEGIN;

SELECT plan(6);

SELECT has_function(
  'public',
  'delete_account_data',
  ARRAY['uuid'],
  'Server-side account data deletion function exists'
);

SELECT col_is_null(
  'public',
  'locations',
  'created_by',
  'Shared locations no longer require a live creator account'
);

SELECT is(
  (
    SELECT confdeltype
    FROM pg_constraint
    WHERE conname = 'locations_created_by_fkey'
  ),
  'n'::"char",
  'Deleting an account clears the location creator association'
);

SELECT is(
  (
    SELECT confdeltype
    FROM pg_constraint
    WHERE conname = 'reviews_user_id_fkey'
  ),
  'c'::"char",
  'Reviews cascade from the Auth user'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.delete_account_data(uuid)',
    'EXECUTE'
  ),
  'App users cannot invoke privileged deletion for arbitrary accounts'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.delete_account_data(uuid)',
    'EXECUTE'
  ),
  'Only the server service role can execute account data deletion'
);

SELECT * FROM finish();
ROLLBACK;
