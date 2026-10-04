BEGIN;

SELECT plan(9);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000000', '42000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'profile-writer@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '42000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'profile-followed@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

SELECT throws_ok(
  $$UPDATE public.profiles SET is_verified = true WHERE id = auth.uid()$$,
  '42501', NULL,
  'Members cannot verify themselves'
);
SELECT throws_ok(
  $$UPDATE public.profiles SET review_count = 9999 WHERE id = auth.uid()$$,
  '42501', NULL,
  'Members cannot set their review count'
);
SELECT throws_ok(
  $$UPDATE public.profiles SET follower_count = 9999 WHERE id = auth.uid()$$,
  '42501', NULL,
  'Members cannot set their follower count'
);
SELECT throws_ok(
  $$UPDATE public.profiles SET passport_points = 1000000 WHERE id = auth.uid()$$,
  '42501', NULL,
  'Members cannot set their Passport points'
);
SELECT throws_ok(
  $$UPDATE public.profiles SET deleted = false, deleted_at = NULL WHERE id = auth.uid()$$,
  '42501', NULL,
  'Members cannot undo an account removal'
);

SELECT lives_ok(
  $$UPDATE public.profiles
    SET bio = 'Dry, stirred.', is_public = false,
        mention_notifications_enabled = false
    WHERE id = auth.uid()$$,
  'Members can still edit their own profile fields'
);

-- Backend-maintained counters still update when members act.
INSERT INTO public.followers (follower_id, following_id)
VALUES (
  '42000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000002'
);

RESET ROLE;

SELECT is(
  (SELECT bio FROM public.profiles WHERE id = '42000000-0000-0000-0000-000000000001'),
  'Dry, stirred.',
  'The member edit was saved'
);
SELECT is(
  (SELECT follower_count FROM public.profiles WHERE id = '42000000-0000-0000-0000-000000000002'),
  1,
  'Follower counts still sync from follow activity'
);
SELECT lives_ok(
  $$UPDATE public.profiles SET is_verified = true
    WHERE id = '42000000-0000-0000-0000-000000000002'$$,
  'The backend can still verify members'
);

SELECT * FROM finish();
ROLLBACK;
