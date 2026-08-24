BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(27);

SELECT has_table('public', 'review_mentions', 'Review mention metadata exists');
SELECT has_table('public', 'comment_mentions', 'Comment mention metadata exists');
SELECT has_table(
  'public',
  'mention_delivery_ledger',
  'Mention delivery has an immutable deduplication ledger'
);
SELECT has_column(
  'public',
  'profiles',
  'mention_notifications_enabled',
  'Members have a mention notification preference'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.review_mentions', 'SELECT'),
  'Clients cannot read raw review mention metadata'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.mention_delivery_ledger', 'SELECT'),
  'Clients cannot read delivery history'
);
SELECT function_privs_are(
  'public',
  'search_mention_candidates_v1',
  ARRAY['text', 'integer'],
  'authenticated',
  ARRAY['EXECUTE'],
  'Signed-in members can use the bounded candidate search RPC'
);
SELECT ok(
  public.mention_token_matches_utf16('hello @member', 6, '@member', 7),
  'Server token validation accepts a basic JavaScript offset'
);
SELECT ok(
  public.mention_token_matches_utf16('🍸 hi @member', 6, '@member', 7),
  'Server token validation counts astral emoji as two UTF-16 units'
);
SELECT ok(
  NOT public.mention_token_matches_utf16('🍸 hi @member', 5, '@member', 7),
  'Server token validation rejects a forged offset'
);
SELECT ok(
  NOT public.mention_token_matches_utf16('hello @members', 6, '@member', 7),
  'Server token validation rejects a token that continues into more username characters'
);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'mentions-actor@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'mentions-2@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'mentions-3@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'mentions-4@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'mentions-5@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'mentions-6@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'mentions-7@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

UPDATE public.profiles
SET username = CASE id
  WHEN '30000000-0000-0000-0000-000000000001' THEN 'mention_actor'
  WHEN '30000000-0000-0000-0000-000000000002' THEN 'target02'
  WHEN '30000000-0000-0000-0000-000000000003' THEN 'target03'
  WHEN '30000000-0000-0000-0000-000000000004' THEN 'target04'
  WHEN '30000000-0000-0000-0000-000000000005' THEN 'target05'
  WHEN '30000000-0000-0000-0000-000000000006' THEN 'target06'
  ELSE 'target07'
END
WHERE id::text LIKE '30000000-0000-0000-0000-00000000000%';

INSERT INTO public.review_states (id, name)
VALUES (1, 'Active') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.notification_types (id, name)
VALUES (2, 'Comment') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reviews (id, user_id, taste, presentation, state, comment)
VALUES
  (930001, '30000000-0000-0000-0000-000000000001', 4, 4, 1, ''),
  (930002, '30000000-0000-0000-0000-000000000002', 4, 4, 1, '');

INSERT INTO public.followers (follower_id, following_id)
VALUES
  ('30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001');

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

SELECT is(
  public.search_mention_candidates_v1('', 5)->0->>'username',
  'target02',
  'Mutual follows rank ahead of one-way relationships'
);
SELECT is(
  public.search_mention_candidates_v1('target03', 5)->0->>'username',
  'target03',
  'Exact candidate search returns the matching followed member'
);

SELECT lives_ok(
  $$SELECT public.replace_review_mentions_v1(
    930001,
    '🍸 hi @target02 and @target02',
    '[{"profile_id":"30000000-0000-0000-0000-000000000002","username":"target02","start":6,"length":9},{"profile_id":"30000000-0000-0000-0000-000000000002","username":"target02","start":20,"length":9}]'::jsonb
  )$$,
  'A review accepts repeated selected occurrences for one member'
);

RESET ROLE;
SELECT is(
  (SELECT count(*) FROM public.review_mentions WHERE review_id = 930001),
  2::bigint,
  'Both selected occurrences are stored'
);
SELECT is(
  (SELECT count(*) FROM public.notifications WHERE event_key = 'mention:review:930001:30000000-0000-0000-0000-000000000002'),
  1::bigint,
  'Repeated occurrences create one notification'
);

SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.replace_review_mentions_v1(930001, 'plain text', '[]'::jsonb);
END;
$$;
RESET ROLE;
SELECT is(
  (SELECT count(*) FROM public.activity_withdrawals withdrawal JOIN public.notifications notification ON notification.id = withdrawal.notification_id WHERE notification.event_key = 'mention:review:930001:30000000-0000-0000-0000-000000000002'),
  1::bigint,
  'Removing a mention withdraws it from Activity'
);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.replace_review_mentions_v1(
    930001,
    '@target02',
    '[{"profile_id":"30000000-0000-0000-0000-000000000002","username":"target02","start":0,"length":9}]'::jsonb
  );
END;
$$;
RESET ROLE;
SELECT is(
  (SELECT count(*) FROM public.notifications WHERE event_key = 'mention:review:930001:30000000-0000-0000-0000-000000000002'),
  1::bigint,
  'Removing and re-adding never redelivers the mention'
);
SELECT is(
  (SELECT count(*) FROM public.activity_withdrawals withdrawal JOIN public.notifications notification ON notification.id = withdrawal.notification_id WHERE notification.event_key = 'mention:review:930001:30000000-0000-0000-0000-000000000002'),
  0::bigint,
  'Re-adding a mention restores its withdrawn Activity row'
);

SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.replace_review_mentions_v1(
    930001,
    '🍸 hi @target02',
    '[{"profile_id":"30000000-0000-0000-0000-000000000002","username":"target02","start":5,"length":9}]'::jsonb
  );
END;
$$;
RESET ROLE;
SELECT is(
  (SELECT count(*) FROM public.review_mentions WHERE review_id = 930001),
  0::bigint,
  'A forged UTF-16 offset is discarded'
);

SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.replace_review_mentions_v1(
    930001,
    '@mention_actor',
    '[{"profile_id":"30000000-0000-0000-0000-000000000001","username":"mention_actor","start":0,"length":14}]'::jsonb
  );
END;
$$;
RESET ROLE;
SELECT is(
  (SELECT count(*) FROM public.review_mentions WHERE review_id = 930001),
  0::bigint,
  'Self-mentions are discarded'
);

SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.replace_review_mentions_v1(
    930001,
    '@target02 @target03 @target04 @target05 @target06 @target07',
    '[{"profile_id":"30000000-0000-0000-0000-000000000002","username":"target02","start":0,"length":9},{"profile_id":"30000000-0000-0000-0000-000000000003","username":"target03","start":10,"length":9},{"profile_id":"30000000-0000-0000-0000-000000000004","username":"target04","start":20,"length":9},{"profile_id":"30000000-0000-0000-0000-000000000005","username":"target05","start":30,"length":9},{"profile_id":"30000000-0000-0000-0000-000000000006","username":"target06","start":40,"length":9},{"profile_id":"30000000-0000-0000-0000-000000000007","username":"target07","start":50,"length":9}]'::jsonb
  );
END;
$$;
RESET ROLE;
SELECT is(
  (SELECT count(DISTINCT mentioned_profile_id) FROM public.review_mentions WHERE review_id = 930001),
  5::bigint,
  'The server enforces five unique mention targets'
);

SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.replace_review_mentions_v1(
    930001,
    '@target02',
    '[{"profile_id":"30000000-0000-0000-0000-000000000002","username":"target02","start":0,"length":9}]'::jsonb
  );
END;
$$;
RESET ROLE;
UPDATE public.profiles
SET username = 'renamed02'
WHERE id = '30000000-0000-0000-0000-000000000002';
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.replace_review_mentions_v1(
    930001,
    '@target02 still here',
    '[{"profile_id":"30000000-0000-0000-0000-000000000002","username":"target02","start":0,"length":9}]'::jsonb
  );
END;
$$;
RESET ROLE;
SELECT is(
  (SELECT count(*) FROM public.review_mentions WHERE review_id = 930001 AND username_snapshot = 'target02' AND mentioned_profile_id = '30000000-0000-0000-0000-000000000002'),
  1::bigint,
  'Editing preserves a selected old handle after the target renames'
);

SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.create_comment_v2(
    930002,
    '@renamed02 great review',
    '[{"profile_id":"30000000-0000-0000-0000-000000000002","username":"renamed02","start":0,"length":10}]'::jsonb
  );
END;
$$;
RESET ROLE;
SELECT is(
  (SELECT count(*) FROM public.notifications WHERE kind = 'mentioned_in_comment' AND data->>'reviewId' = '930002'),
  1::bigint,
  'Mentioning a review owner in a comment creates the mention notification'
);
SELECT is(
  (SELECT count(*) FROM public.notifications WHERE kind = 'review_commented' AND data->>'reviewId' = '930002'),
  0::bigint,
  'A mentioned review owner does not also receive a generic comment notification'
);

INSERT INTO public.blocks (blocker_id, blocked_id)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000002'
);
SET LOCAL ROLE authenticated;
SELECT is(
  jsonb_array_length(
    public.get_mention_spans_v1(ARRAY[930001], ARRAY[]::integer[])->'mentions'
  ),
  0,
  'Blocked targets expose no mention metadata'
);
RESET ROLE;
DELETE FROM public.blocks
WHERE blocker_id = '30000000-0000-0000-0000-000000000001'
  AND blocked_id = '30000000-0000-0000-0000-000000000002';
UPDATE public.profiles
SET deleted = true
WHERE id = '30000000-0000-0000-0000-000000000002';
SET LOCAL ROLE authenticated;
SELECT is(
  jsonb_array_length(
    public.get_mention_spans_v1(ARRAY[930001], ARRAY[]::integer[])->'mentions'
  ),
  0,
  'Deleted targets expose no mention metadata'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
