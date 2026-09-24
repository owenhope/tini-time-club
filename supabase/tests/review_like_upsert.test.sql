BEGIN;
SELECT plan(6);
INSERT INTO public.notification_types (id, name)
VALUES (1, 'Review'), (3, 'Like') ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
VALUES ('77700000-0000-0000-0000-000000000024', 'authenticated', 'authenticated',
        'review-like@example.test', '{"provider":"email","providers":["email"]}', '{}');
INSERT INTO public.review_states (id, name)
VALUES (1, 'Active') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reviews (id, user_id, taste, presentation, state, comment)
VALUES (937024, '77700000-0000-0000-0000-000000000024', 4, 4, 1, '');
SELECT set_config('request.jwt.claim.sub', '77700000-0000-0000-0000-000000000024', true);
SET LOCAL ROLE authenticated;

SELECT lives_ok($$
  INSERT INTO public.likes (review_id, user_id) VALUES (937024, auth.uid())
  ON CONFLICT (user_id, review_id) DO UPDATE
  SET review_id = excluded.review_id, user_id = excluded.user_id
$$, 'A member can upsert a new review like');
SELECT lives_ok($$
  INSERT INTO public.likes (review_id, user_id) VALUES (937024, auth.uid())
  ON CONFLICT (user_id, review_id) DO UPDATE
  SET review_id = excluded.review_id, user_id = excluded.user_id
$$, 'A stale client can upsert an existing review like');
SELECT is((SELECT count(*) FROM public.likes WHERE review_id = 937024), 1::bigint,
  'Repeated likes preserve exactly one row');
SELECT throws_ok($$
  UPDATE public.likes SET user_id = '77700000-0000-0000-0000-000000000025'
  WHERE review_id = 937024
$$, '42501', 'new row violates row-level security policy for table "likes"',
  'A member cannot transfer a like to another user');

SELECT set_config('request.jwt.claim.sub', '77700000-0000-0000-0000-000000000025', true);
WITH changed AS (
  UPDATE public.likes SET liked_at = now() WHERE review_id = 937024 RETURNING 1
) SELECT is((SELECT count(*) FROM changed), 0::bigint, 'Other members cannot update the like');
SELECT set_config('request.jwt.claim.sub', '77700000-0000-0000-0000-000000000024', true);
WITH removed AS (
  DELETE FROM public.likes WHERE review_id = 937024 RETURNING 1
) SELECT is((SELECT count(*) FROM removed), 1::bigint, 'The owner can still unlike the review');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
