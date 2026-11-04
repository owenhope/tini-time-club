BEGIN;
SELECT plan(14);

INSERT INTO public.notification_types (id, name)
VALUES (1, 'Review'), (2, 'Comment') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.review_states (id, name)
VALUES (1, 'Active'), (3, 'Removed') ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
VALUES
  ('71000000-0000-0000-0000-000000000001','authenticated','authenticated','club@example.test','{"provider":"email"}','{}'),
  ('71000000-0000-0000-0000-000000000002','authenticated','authenticated','newbie@example.test','{"provider":"email"}','{}'),
  ('71000000-0000-0000-0000-000000000003','authenticated','authenticated','gone@example.test','{"provider":"email"}','{}'),
  ('71000000-0000-0000-0000-000000000004','authenticated','authenticated','blocker@example.test','{"provider":"email"}','{}');
INSERT INTO public.profiles (id, username) VALUES
  ('71000000-0000-0000-0000-000000000001', 'welcome-club-test'),
  ('71000000-0000-0000-0000-000000000002', 'welcome-newbie-test'),
  ('71000000-0000-0000-0000-000000000003', 'welcome-gone-test'),
  ('71000000-0000-0000-0000-000000000004', 'welcome-blocker-test')
ON CONFLICT (id) DO UPDATE SET username = excluded.username;
INSERT INTO public.locations (id, name, location, created_by)
VALUES (971000, 'Welcome Test Bar', 'SRID=4326;POINT(-123.1 49.28)',
        '71000000-0000-0000-0000-000000000001');

INSERT INTO public.club_welcome_settings (id, account_id, enabled)
VALUES (true, '71000000-0000-0000-0000-000000000001', true)
ON CONFLICT (id) DO UPDATE SET account_id = excluded.account_id, enabled = true;

-- First review queues one welcome, 5-15 minutes out.
INSERT INTO public.reviews (id, user_id, taste, presentation, state, comment, location)
VALUES (971001, '71000000-0000-0000-0000-000000000002', 5, 5, 1, '', 971000);
SELECT is(
  (SELECT review_id FROM public.club_welcome_queue
   WHERE user_id = '71000000-0000-0000-0000-000000000002'),
  971001::bigint,
  'A first review queues a welcome'
);
SELECT ok(
  (SELECT due_at BETWEEN now() + interval '5 minutes' AND now() + interval '15 minutes'
   FROM public.club_welcome_queue
   WHERE user_id = '71000000-0000-0000-0000-000000000002'),
  'The welcome is due 5 to 15 minutes later'
);

-- A second review does not queue again.
INSERT INTO public.reviews (id, user_id, taste, presentation, state, comment)
VALUES (971002, '71000000-0000-0000-0000-000000000002', 4, 4, 1, '');
SELECT is(
  (SELECT count(*) FROM public.club_welcome_queue
   WHERE user_id = '71000000-0000-0000-0000-000000000002'),
  1::bigint,
  'Later reviews do not queue another welcome'
);

-- The club account never welcomes itself.
INSERT INTO public.reviews (id, user_id, taste, presentation, state, comment)
VALUES (971003, '71000000-0000-0000-0000-000000000001', 4, 4, 1, '');
SELECT is(
  (SELECT count(*) FROM public.club_welcome_queue
   WHERE user_id = '71000000-0000-0000-0000-000000000001'),
  0::bigint,
  'The club account is never welcomed'
);

-- Nothing posts before it is due.
SELECT is(public.post_due_club_welcomes(), 0, 'Nothing posts before it is due');

-- Once due, the welcome posts as the club and notifies the member.
UPDATE public.club_welcome_queue SET due_at = now() - interval '1 minute'
WHERE user_id = '71000000-0000-0000-0000-000000000002';
SELECT is(public.post_due_club_welcomes(), 1, 'A due welcome posts');
SELECT is(
  (SELECT count(*) FROM public.comments
   WHERE review_id = 971001 AND user_id = '71000000-0000-0000-0000-000000000001'),
  1::bigint,
  'The comment is on the first review, from the club account'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = '71000000-0000-0000-0000-000000000002'
      AND kind = 'review_commented'
      AND actor_id = '71000000-0000-0000-0000-000000000001'
  ),
  'The member is notified like any other comment'
);
SELECT is(public.post_due_club_welcomes(), 0, 'A welcome posts only once');

-- A review removed before the welcome is due is skipped.
INSERT INTO public.reviews (id, user_id, taste, presentation, state, comment)
VALUES (971004, '71000000-0000-0000-0000-000000000003', 2, 2, 1, '');
UPDATE public.reviews SET state = 3 WHERE id = 971004;
UPDATE public.club_welcome_queue SET due_at = now() - interval '1 minute'
WHERE user_id = '71000000-0000-0000-0000-000000000003';
SELECT is(public.post_due_club_welcomes(), 0, 'Removed reviews are not welcomed');
SELECT is(
  (SELECT skipped_reason FROM public.club_welcome_queue
   WHERE user_id = '71000000-0000-0000-0000-000000000003'),
  'review_unavailable',
  'The skip is recorded'
);

-- Members who blocked the club are not welcomed.
INSERT INTO public.blocks (blocker_id, blocked_id)
VALUES ('71000000-0000-0000-0000-000000000004', '71000000-0000-0000-0000-000000000001');
INSERT INTO public.reviews (id, user_id, taste, presentation, state, comment)
VALUES (971005, '71000000-0000-0000-0000-000000000004', 4, 4, 1, '');
UPDATE public.club_welcome_queue SET due_at = now() - interval '1 minute'
WHERE user_id = '71000000-0000-0000-0000-000000000004';
SELECT is(public.post_due_club_welcomes(), 0, 'Blocked members are not welcomed');

-- Low scores never get an upbeat line.
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM generate_series(1, 200)
    WHERE public.club_welcome_comment_body(971004) ~* 'excellent|strong|respect'
  ),
  'Low-scored reviews only draw from the low-score lines'
);

SELECT ok(
  NOT has_function_privilege('authenticated', 'public.post_due_club_welcomes()', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.post_due_club_welcomes()', 'EXECUTE'),
  'Members and visitors cannot trigger welcome posting'
);

SELECT * FROM finish();
ROLLBACK;
