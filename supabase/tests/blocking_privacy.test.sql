BEGIN;

SELECT plan(14);

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'blocking-a@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'blocking-b@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'blocking-control@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  );

UPDATE public.profiles
SET username = CASE id
  WHEN '10000000-0000-0000-0000-000000000001' THEN 'blocking_a'
  WHEN '10000000-0000-0000-0000-000000000002' THEN 'blocking_b'
  ELSE 'blocking_control'
END
WHERE id IN (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003'
);

INSERT INTO public.review_states (id, name)
VALUES (1, 'Active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.notification_types (id, name)
VALUES
  (1, 'Review'),
  (2, 'Comment')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reviews (id, user_id, taste, presentation, state)
VALUES
  (910001, '10000000-0000-0000-0000-000000000001', 4, 4, 1),
  (910002, '10000000-0000-0000-0000-000000000002', 4, 4, 1),
  (910003, '10000000-0000-0000-0000-000000000003', 4, 4, 1);

INSERT INTO public.comments (id, user_id, review_id, body)
VALUES
  (
    910001,
    '10000000-0000-0000-0000-000000000002',
    910003,
    'Blocked member comment on a visible review'
  ),
  (
    910002,
    '10000000-0000-0000-0000-000000000003',
    910002,
    'Visible member comment on a blocked review'
  );

INSERT INTO public.blocks (blocker_id, blocked_id)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002'
);

INSERT INTO public.followers (follower_id, following_id)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

SELECT is(
  (SELECT count(*) FROM public.profiles WHERE id = '10000000-0000-0000-0000-000000000002'),
  0::bigint,
  'A blocker cannot read the blocked member profile'
);
SELECT is(
  (SELECT count(*) FROM public.reviews WHERE id = 910002),
  0::bigint,
  'A blocker cannot read the blocked member review'
);
SELECT is(
  (SELECT count(*) FROM public.comments WHERE id = 910001),
  0::bigint,
  'A blocker cannot read comments authored by the blocked member'
);
SELECT is(
  (SELECT count(*) FROM public.comments WHERE id = 910002),
  0::bigint,
  'A blocker cannot read comments attached to the blocked member review'
);
SELECT is(
  (SELECT count(*) FROM public.profiles WHERE id = '10000000-0000-0000-0000-000000000003'),
  1::bigint,
  'Blocking does not hide unrelated members'
);
SELECT is(
  (SELECT count(*) FROM public.reviews WHERE id = 910003),
  1::bigint,
  'Blocking does not hide unrelated published reviews'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.feed_reviews(
      '10000000-0000-0000-0000-000000000001',
      20,
      0,
      '10000000-0000-0000-0000-000000000002',
      NULL,
      false
    )
  ),
  0::bigint,
  'A client cannot disable server-side blocking in the feed RPC'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.feed_reviews_followed(
      '10000000-0000-0000-0000-000000000001',
      20,
      0,
      NULL,
      NULL,
      true,
      true
    )
  ),
  1::bigint,
  'The followed feed returns reviews from members the viewer follows'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.feed_reviews_followed(
      '10000000-0000-0000-0000-000000000003',
      20,
      0,
      NULL,
      NULL,
      true,
      true
    )
  ),
  0::bigint,
  'A client cannot request another member followed feed'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

SELECT is(
  (SELECT count(*) FROM public.profiles WHERE id = '10000000-0000-0000-0000-000000000001'),
  0::bigint,
  'A blocked member cannot read the blocker profile'
);
SELECT is(
  (SELECT count(*) FROM public.reviews WHERE id = 910001),
  0::bigint,
  'A blocked member cannot read the blocker review'
);
SELECT is(
  (SELECT count(*) FROM public.profiles WHERE id = '10000000-0000-0000-0000-000000000002'),
  1::bigint,
  'A blocked member can still read their own profile'
);
SELECT is(
  (SELECT count(*) FROM public.reviews WHERE id = 910002),
  1::bigint,
  'A blocked member can still read their own published review'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.feed_reviews(
      '10000000-0000-0000-0000-000000000002',
      20,
      0,
      '10000000-0000-0000-0000-000000000001',
      NULL,
      false
    )
  ),
  0::bigint,
  'A blocked client cannot disable reciprocal server-side blocking'
);

SELECT * FROM finish();
ROLLBACK;
