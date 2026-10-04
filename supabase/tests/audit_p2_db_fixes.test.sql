BEGIN;

SELECT plan(16);

-- A blocks B. C is unrelated to the block.
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
SELECT
  '00000000-0000-0000-0000-000000000000', member.id, 'authenticated',
  'authenticated', member.email, '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
FROM (VALUES
  ('27000000-0000-0000-0000-00000000000a'::uuid, 'audit-p2-a@example.test'),
  ('27000000-0000-0000-0000-00000000000b'::uuid, 'audit-p2-b@example.test'),
  ('27000000-0000-0000-0000-00000000000c'::uuid, 'audit-p2-c@example.test')
) AS member(id, email);

INSERT INTO public.review_states (id, name) VALUES (1, 'Active')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.notification_types (id, name)
VALUES (1, 'Review'), (2, 'Comment')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.locations (id, name, address, location, created_by)
VALUES
  (927001, 'Canonical Bar', '1 Merge Row', 'SRID=4326;POINT(-123.1 49.28)', '27000000-0000-0000-0000-00000000000c'),
  (927002, 'Duplicate Bar', '1 Merge Row', 'SRID=4326;POINT(-123.1 49.28)', '27000000-0000-0000-0000-00000000000c');

INSERT INTO public.reviews (id, user_id, taste, presentation, state, location)
VALUES
  (927101, '27000000-0000-0000-0000-00000000000b', 4, 4, 1, NULL),
  (927102, '27000000-0000-0000-0000-00000000000c', 4, 4, 1, NULL),
  -- C is a Regular at the canonical bar, A at the duplicate.
  (927103, '27000000-0000-0000-0000-00000000000c', 4, 4, 1, 927001),
  (927104, '27000000-0000-0000-0000-00000000000c', 4, 4, 1, 927001),
  (927105, '27000000-0000-0000-0000-00000000000a', 4, 4, 1, 927002),
  (927106, '27000000-0000-0000-0000-00000000000a', 4, 4, 1, 927002);

INSERT INTO public.comments (id, user_id, review_id, body)
VALUES
  (927201, '27000000-0000-0000-0000-00000000000b', 927102, 'Blocked member comment'),
  (927202, '27000000-0000-0000-0000-00000000000c', 927102, 'Visible member comment');

-- 27. A block removes follows in both directions.
INSERT INTO public.followers (follower_id, following_id)
VALUES
  ('27000000-0000-0000-0000-00000000000a', '27000000-0000-0000-0000-00000000000b'),
  ('27000000-0000-0000-0000-00000000000b', '27000000-0000-0000-0000-00000000000a'),
  ('27000000-0000-0000-0000-00000000000c', '27000000-0000-0000-0000-00000000000b');
INSERT INTO public.blocks (blocker_id, blocked_id)
VALUES ('27000000-0000-0000-0000-00000000000a', '27000000-0000-0000-0000-00000000000b');

SELECT is(
  (SELECT count(*) FROM public.followers
   WHERE '27000000-0000-0000-0000-00000000000a' IN (follower_id, following_id)
     AND '27000000-0000-0000-0000-00000000000b' IN (follower_id, following_id)),
  0::bigint,
  'Blocking removes follows in both directions'
);

-- 28. Seed share events as the service: repeats and unfinished outcomes.
INSERT INTO public.review_share_events (user_id, review_id, channel, outcome)
VALUES
  ('27000000-0000-0000-0000-00000000000a', 927102, 'message', 'started'),
  ('27000000-0000-0000-0000-00000000000a', 927102, 'message', 'opened'),
  ('27000000-0000-0000-0000-00000000000a', 927102, 'whatsapp', 'opened'),
  ('27000000-0000-0000-0000-00000000000a', 927101, 'instagram_story', 'previewed'),
  ('27000000-0000-0000-0000-00000000000a', 927103, 'copy_link', 'copied');

SELECT is(
  (SELECT p.progress FROM public.passport_progress_v1('27000000-0000-0000-0000-00000000000a') p
   JOIN public.passport_definitions d ON d.id = p.definition_id
   WHERE d.metric = 'shares' LIMIT 1),
  2,
  'Share progress counts distinct reviews with a completed outcome'
);

-- 35. Merging locations recomputes Regulars once, without notifications.
CREATE TEMP TABLE regular_notifications_before AS
SELECT count(*) AS n FROM public.notifications
WHERE kind IN ('regular_joined', 'regular_left')
  AND user_id IN ('27000000-0000-0000-0000-00000000000a', '27000000-0000-0000-0000-00000000000c');

SELECT lives_ok(
  $$SELECT public.merge_locations_v1(927002, 927001)$$,
  'Merge succeeds'
);
SELECT set_eq(
  $$SELECT profile_id FROM public.regular_memberships WHERE location_id = 927001$$,
  $$VALUES ('27000000-0000-0000-0000-00000000000a'::uuid), ('27000000-0000-0000-0000-00000000000c'::uuid)$$,
  'Canonical Regulars are recomputed after the merge'
);
SELECT is(
  (SELECT count(*) FROM public.notifications
   WHERE kind IN ('regular_joined', 'regular_left')
     AND user_id IN ('27000000-0000-0000-0000-00000000000a', '27000000-0000-0000-0000-00000000000c')),
  (SELECT n FROM regular_notifications_before),
  'A merge sends no Regular joined/left notifications'
);
SELECT is(
  current_setting('ttc.suppress_regular_refresh', true),
  'off',
  'The merge clears its suppression flag'
);

-- 37. handle_new_user pins search_path.
SELECT ok(
  (SELECT proconfig::text LIKE '%search_path=public, pg_temp%'
   FROM pg_proc WHERE oid = 'public.handle_new_user()'::regprocedure),
  'handle_new_user has a fixed search_path'
);

-- Member checks run as A, who blocked B.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"27000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

SELECT throws_ok(
  $$INSERT INTO public.followers (follower_id, following_id)
    VALUES ('27000000-0000-0000-0000-00000000000a', '27000000-0000-0000-0000-00000000000b')$$,
  '42501', NULL,
  'A blocker cannot follow the blocked member'
);
SELECT throws_ok(
  $$INSERT INTO public.likes (user_id, review_id)
    VALUES ('27000000-0000-0000-0000-00000000000a', 927101)$$,
  '42501', NULL,
  'A blocker cannot like the blocked member review'
);
SELECT throws_ok(
  $$INSERT INTO public.comment_likes (user_id, comment_id)
    VALUES ('27000000-0000-0000-0000-00000000000a', 927201)$$,
  '42501', NULL,
  'A blocker cannot like the blocked member comment'
);
SELECT lives_ok(
  $$INSERT INTO public.followers (follower_id, following_id)
    VALUES ('27000000-0000-0000-0000-00000000000a', '27000000-0000-0000-0000-00000000000c');
    INSERT INTO public.likes (user_id, review_id)
    VALUES ('27000000-0000-0000-0000-00000000000a', 927102);
    INSERT INTO public.comment_likes (user_id, comment_id)
    VALUES ('27000000-0000-0000-0000-00000000000a', 927202)$$,
  'Unrelated members can still be followed and liked'
);
SELECT is(
  (SELECT count(*) FROM public.followers
   WHERE following_id = '27000000-0000-0000-0000-00000000000b'),
  0::bigint,
  'A blocker cannot read follower rows involving the blocked member'
);

-- 36. Push tokens can't be taken over by another account.
SELECT lives_ok(
  $$SELECT public.register_push_token('ExponentPushToken[audit-p2]',
    '27000000-0000-0000-0000-0000000000f1', 'ios')$$,
  'A member registers a push token'
);

SELECT set_config('request.jwt.claims',
  '{"sub":"27000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*) FROM public.followers
   WHERE following_id = '27000000-0000-0000-0000-00000000000b'),
  1::bigint,
  'Unblocked members still read follower rows'
);

SELECT public.register_push_token('ExponentPushToken[audit-p2]',
  '27000000-0000-0000-0000-0000000000f2', 'ios');
RESET ROLE;
SELECT is(
  (SELECT user_id FROM public.push_tokens WHERE expo_push_token = 'ExponentPushToken[audit-p2]'),
  '27000000-0000-0000-0000-00000000000a'::uuid,
  'Another installation cannot take over an existing token'
);

SET LOCAL ROLE authenticated;
SELECT public.register_push_token('ExponentPushToken[audit-p2]',
  '27000000-0000-0000-0000-0000000000f1', 'ios');
RESET ROLE;
SELECT is(
  (SELECT user_id FROM public.push_tokens WHERE expo_push_token = 'ExponentPushToken[audit-p2]'),
  '27000000-0000-0000-0000-00000000000c'::uuid,
  'The same installation can move its token to a new account'
);

SELECT * FROM finish();
ROLLBACK;
