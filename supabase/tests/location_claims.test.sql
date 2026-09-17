BEGIN;

SELECT plan(25);

SELECT has_table('public', 'location_claims', 'Location claims table exists');
SELECT has_table('public', 'location_verifications', 'Location verifications table exists');
SELECT has_table('public', 'location_managers', 'Location managers table exists');

SELECT col_is_pk('public', 'location_claims', 'id', 'Claims use UUID primary keys');
SELECT col_is_fk('public', 'location_claims', 'location_id', 'Claims reference locations');
SELECT col_is_fk('public', 'location_claims', 'requester_profile_id', 'Claim requester is profile-linked');
SELECT col_is_fk('public', 'location_verifications', 'source_claim_id', 'Verification retains source claim');
SELECT col_is_fk('public', 'location_managers', 'profile_id', 'Managers reference profiles');

SELECT has_index('public', 'location_claims', 'location_claims_pending_requester_unique_idx', 'One pending claim per requester/location is indexed');
SELECT has_index('public', 'location_verifications', 'location_verifications_one_active_idx', 'One active verification per location is indexed');
SELECT has_index('public', 'location_managers', 'location_managers_active_pair_unique_idx', 'One active manager assignment per pair is indexed');

SELECT has_function('public', 'submit_location_claim', ARRAY['bigint', 'text', 'text', 'text', 'text'], 'Member claim submission RPC exists');
SELECT has_function('public', 'get_my_location_claim_status', ARRAY['bigint'], 'Safe member claim status RPC exists');
SELECT has_function('public', 'resolve_or_create_location', ARRAY['text', 'text', 'text', 'double precision', 'double precision'], 'Narrow location resolver exists');
SELECT has_function('public', 'approve_location_claim', ARRAY['uuid'], 'Admin approval RPC exists');
SELECT has_function('public', 'admin_verify_location', ARRAY['bigint', 'text'], 'Direct admin verification RPC exists');
SELECT has_function('public', 'merge_locations_v1', ARRAY['bigint', 'bigint'], 'Deterministic merge RPC exists');

SELECT ok(
  has_function_privilege('authenticated', 'public.submit_location_claim(bigint,text,text,text,text)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.approve_location_claim(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.admin_verify_location(bigint,text)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.location_claim_notification(uuid,uuid,bigint,text,text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.location_claim_notification(uuid,uuid,bigint,text,text)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.get_admin_locations_page(text,integer,text,text,integer,integer)', 'EXECUTE'),
  'Member/admin function privileges are separated'
);

SELECT ok(
  has_function_privilege('service_role', 'public.admin_verify_location(bigint,text)', 'EXECUTE'),
  'Service role can perform direct admin verification'
);

-- Web claims: owners claiming from the public website with no member account.
SELECT has_column('public', 'location_claims', 'source', 'Claims record their origin');
SELECT col_default_is('public', 'location_claims', 'source', 'app', 'Member claims stay the default origin');
SELECT ok(
  NOT has_function_privilege('anon', 'public.submit_web_location_claim(bigint,text,text,text,text,text)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.submit_web_location_claim(bigint,text,text,text,text,text)', 'EXECUTE'),
  'Web claim submission is server-only'
);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '98700000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'claims-fixture@example.test',
  '',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now()
);
INSERT INTO public.locations (id, name, address, location, created_by)
VALUES (
  987001,
  'Claimable Bar',
  '1 Test Row',
  'SRID=4326;POINT(-123.1 49.28)',
  '98700000-0000-0000-0000-000000000001'
);

SELECT is(
  (public.submit_web_location_claim(
    987001, 'Pat Owner', 'Owner', 'PAT@claimablebar.test', NULL,
    'I own this bar and want it verified.'
  )) ->> 'status',
  'pending',
  'A web claim lands pending with no member account'
);
SELECT is(
  (public.submit_web_location_claim(
    987001, 'Pat Owner', 'Owner', 'pat@claimablebar.test', NULL,
    'Second submission of the same claim.'
  )) ->> 'duplicate',
  'true',
  'A pending web claim dedupes per location and business email'
);
SELECT is(
  (SELECT source || ':' || COALESCE(requester_profile_id::text, 'none')
   FROM public.location_claims
   WHERE location_id = 987001 AND business_email = 'pat@claimablebar.test'),
  'web:none',
  'Web claims store a normalized email, web source, and no requester'
);

SELECT * FROM finish();
ROLLBACK;
