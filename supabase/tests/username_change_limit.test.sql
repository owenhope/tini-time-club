BEGIN;

SELECT plan(10);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000000', '43000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'rename-me@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '43000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'rename-other@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

UPDATE public.profiles SET username = 'taken_name'
WHERE id = '43000000-0000-0000-0000-000000000002';

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"43000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

SELECT lives_ok(
  $$UPDATE public.profiles SET username = 'first_pick' WHERE id = auth.uid()$$,
  'Choosing a first username is allowed'
);
SELECT is(
  (SELECT username_changed_at FROM public.profiles WHERE id = auth.uid()),
  NULL::timestamptz,
  'The first username does not start the rename clock'
);
SELECT throws_ok(
  $$UPDATE public.profiles SET username = 'no spaces!' WHERE id = auth.uid()$$,
  '22023', NULL,
  'Renames must use the username format'
);
SELECT throws_ok(
  $$UPDATE public.profiles SET username = 'TAKEN_NAME' WHERE id = auth.uid()$$,
  '23505', NULL,
  'Renames cannot take another member''s name in any case'
);
SELECT lives_ok(
  $$UPDATE public.profiles SET username = 'second_pick' WHERE id = auth.uid()$$,
  'A member can rename themselves once'
);
SELECT isnt(
  (SELECT username_changed_at FROM public.profiles WHERE id = auth.uid()),
  NULL::timestamptz,
  'A rename stamps the rename clock'
);
SELECT throws_ok(
  $$UPDATE public.profiles SET username = 'third_pick' WHERE id = auth.uid()$$,
  'P0001', NULL,
  'A second rename within 3 months is refused'
);
SELECT lives_ok(
  $$UPDATE public.profiles SET bio = 'Still editable' WHERE id = auth.uid()$$,
  'Other profile fields stay editable during the cooldown'
);
SELECT throws_ok(
  $$UPDATE public.profiles SET username_changed_at = NULL WHERE id = auth.uid()$$,
  '42501', NULL,
  'Members cannot reset the rename clock'
);

RESET ROLE;

-- Once 3 months have passed the member may rename again.
UPDATE public.profiles
SET username_changed_at = now() - interval '3 months 1 day'
WHERE id = '43000000-0000-0000-0000-000000000001';

SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$UPDATE public.profiles SET username = 'third_pick' WHERE id = auth.uid()$$,
  'A rename is allowed again after 3 months'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
