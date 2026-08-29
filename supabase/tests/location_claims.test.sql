BEGIN;

SELECT plan(19);

SELECT has_table('public', 'location_claims', 'Location claims table exists');
SELECT has_table('public', 'location_verifications', 'Location verifications table exists');
SELECT has_table('public', 'location_managers', 'Location managers table exists');

SELECT col_is_pk('public', 'location_claims', 'id', 'Claims use UUID primary keys');
SELECT col_is_fk('public', 'location_claims', 'location_id', 'Claims reference locations');
SELECT col_is_fk('public', 'location_claims', 'requester_profile_id', 'Claim requester is profile-linked');
SELECT col_is_fk('public', 'location_verifications', 'source_claim_id', 'Verification retains source claim');
SELECT col_is_fk('public', 'location_managers', 'profile_id', 'Managers reference profiles');

SELECT has_index('public', 'location_claims_pending_requester_unique_idx', 'One pending claim per requester/location is indexed');
SELECT has_index('public', 'location_verifications_one_active_idx', 'One active verification per location is indexed');
SELECT has_index('public', 'location_managers_active_pair_unique_idx', 'One active manager assignment per pair is indexed');

SELECT has_function('public', 'submit_location_claim', ARRAY['bigint', 'text', 'text', 'text', 'text'], 'Member claim submission RPC exists');
SELECT has_function('public', 'get_my_location_claim_status', ARRAY['bigint'], 'Safe member claim status RPC exists');
SELECT has_function('public', 'resolve_or_create_location', ARRAY['text', 'text', 'text', 'double precision', 'double precision'], 'Narrow location resolver exists');
SELECT has_function('public', 'approve_location_claim', ARRAY['uuid'], 'Admin approval RPC exists');
SELECT has_function('public', 'admin_verify_location', ARRAY['bigint', 'text'], 'Direct admin verification RPC exists');
SELECT has_function('public', 'merge_locations_v1', ARRAY['bigint', 'bigint'], 'Deterministic merge RPC exists');

SELECT ok(
  has_function_privilege('authenticated', 'public.submit_location_claim(bigint,text,text,text,text)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.approve_location_claim(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.admin_verify_location(bigint,text)', 'EXECUTE'),
  'Member/admin function privileges are separated'
);

SELECT ok(
  has_function_privilege('service_role', 'public.admin_verify_location(bigint,text)', 'EXECUTE'),
  'Service role can perform direct admin verification'
);

SELECT * FROM finish();
ROLLBACK;
