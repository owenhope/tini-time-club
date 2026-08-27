begin;

select plan(15);

select has_table('public', 'activity_receipts', 'Activity receipts table exists');
select has_table('public', 'activity_withdrawals', 'Activity withdrawals table exists');
select has_function(
  'public',
  'get_activity_page',
  array['timestamp with time zone', 'uuid', 'integer'],
  'Activity page RPC exists'
);
select has_function(
  'public',
  'get_activity_unseen_count',
  array[]::text[],
  'Activity unseen count RPC exists'
);
select has_function(
  'public',
  'mark_activity_seen_through',
  array['timestamp with time zone'],
  'Activity seen watermark RPC exists'
);
select has_function(
  'public',
  'mark_activity_read',
  array['uuid[]'],
  'Activity read RPC exists'
);
select function_returns('public', 'activity_supported_notification', array['text'], 'boolean', 'Supported-kind helper returns boolean');
select col_is_pk('public', 'activity_receipts', array['user_id', 'notification_id'], 'Activity receipts are keyed per user and notification');

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000000', '31000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'activity-actor@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '31000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'activity-target@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

UPDATE public.profiles
SET username = CASE id
  WHEN '31000000-0000-0000-0000-000000000001' THEN 'activity_actor'
  ELSE 'activity_target'
END
WHERE id IN (
  '31000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000002'
);

INSERT INTO public.review_states (id, name)
VALUES (1, 'Active')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reviews (id, user_id, taste, presentation, state, comment)
VALUES (940001, '31000000-0000-0000-0000-000000000001', 4, 4, 1, '');

INSERT INTO public.followers (follower_id, following_id)
VALUES (
  '31000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000002'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"31000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

SELECT is(
  (
    SELECT count(*)
    FROM jsonb_array_elements(public.get_activity_page(NULL, NULL, 50)->'events') event
    WHERE event->>'kind' = 'user_followed'
  ),
  1::bigint,
  'A follow notification appears in the Activity page'
);
SELECT is(
  public.get_activity_unseen_count(),
  1::bigint,
  'A follow notification contributes to the unseen Activity count'
);

RESET ROLE;
SELECT is(
  (
    SELECT count(*)
    FROM public.notifications
    WHERE user_id = '31000000-0000-0000-0000-000000000002'
      AND kind = 'user_followed'
  ),
  1::bigint,
  'The follow trigger creates one Activity notification'
);

SET LOCAL ROLE authenticated;
SELECT public.mark_activity_read(
  ARRAY[
    (SELECT id FROM public.notifications
     WHERE user_id = '31000000-0000-0000-0000-000000000002'
       AND kind = 'user_followed')
  ]
);
RESET ROLE;
SELECT ok(
  (
    SELECT read_at IS NOT NULL
    FROM public.activity_receipts receipt
    JOIN public.notifications notification
      ON notification.id = receipt.notification_id
    WHERE receipt.user_id = '31000000-0000-0000-0000-000000000002'
      AND notification.kind = 'user_followed'
  ),
  'A follow notification can be marked read'
);

INSERT INTO public.notifications (
  user_id, actor_id, body, type, kind, data, event_key
)
VALUES (
  '31000000-0000-0000-0000-000000000002',
  '31000000-0000-0000-0000-000000000001',
  'activity_actor mentioned you in a review.',
  2,
  'mentioned_in_review',
  '{"kind":"mentioned_in_review","reviewId":940001}'::jsonb,
  'activity-test:mentioned-in-review'
);

SET LOCAL ROLE authenticated;
SELECT is(
  (
    SELECT count(*)
    FROM jsonb_array_elements(public.get_activity_page(NULL, NULL, 50)->'events') event
    WHERE event->>'kind' = 'mentioned_in_review'
  ),
  1::bigint,
  'A review mention appears in the Activity page'
);
SELECT is(
  public.get_activity_unseen_count(),
  1::bigint,
  'A review mention contributes to the unseen Activity count'
);
SELECT public.mark_activity_seen_through(now());
SELECT is(
  public.get_activity_unseen_count(),
  0::bigint,
  'A review mention can be marked seen through the Activity watermark'
);
RESET ROLE;

select * from finish();
rollback;
