BEGIN;

SELECT plan(3);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000000', '45000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'passport-blocker@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '45000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'passport-blocked@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '45000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'passport-other@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

INSERT INTO public.blocks (blocker_id, blocked_id)
VALUES ('45000000-0000-0000-0000-000000000001', '45000000-0000-0000-0000-000000000002');

SET LOCAL ROLE authenticated;

SELECT set_config('request.jwt.claims', '{"sub":"45000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.get_member_passport_v1('45000000-0000-0000-0000-000000000001')$$,
  '42501', NULL,
  'A blocked member cannot read the blocker''s Passport'
);

SELECT set_config('request.jwt.claims', '{"sub":"45000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.get_member_passport_v1('45000000-0000-0000-0000-000000000002')$$,
  '42501', NULL,
  'The blocker cannot read the blocked member''s Passport either'
);

SELECT set_config('request.jwt.claims', '{"sub":"45000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT lives_ok(
  $$SELECT public.get_member_passport_v1('45000000-0000-0000-0000-000000000001')$$,
  'Other members can still read the Passport'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
