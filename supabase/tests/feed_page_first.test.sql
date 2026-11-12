BEGIN;
SELECT plan(9);

INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
VALUES ('77800000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
        'feed-page-first@example.test', '{"provider":"email","providers":["email"]}', '{}');

INSERT INTO public.review_states (id, name)
VALUES (1, 'Active') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.notification_types (id, name)
VALUES (1, 'Review'), (2, 'Comment') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, name, address, location, created_by)
VALUES (
  938001,
  'Feed Page Bar',
  '1 Feed Row',
  'SRID=4326;POINT(-123.1 49.28)',
  '77800000-0000-0000-0000-000000000001'
);
INSERT INTO public.reviews
  (id, user_id, location, taste, presentation, state, comment, inserted_at)
VALUES
  (938011, '77800000-0000-0000-0000-000000000001', 938001, 5, 4, 1, '',
   '2099-01-03T00:00:00Z'),
  (938012, '77800000-0000-0000-0000-000000000001', 938001, 3, 3, 1, '',
   '2099-01-02T00:00:00Z'),
  (938013, '77800000-0000-0000-0000-000000000001', NULL, 4, 4, 1, '',
   '2099-01-01T00:00:00Z');

SELECT set_config(
  'request.jwt.claim.sub', '77800000-0000-0000-0000-000000000001', true
);
SET LOCAL ROLE authenticated;

-- The whole-view join made the feed quadratic in the review count. Guard the
-- structure so a later rewrite cannot quietly reintroduce it.
SELECT unalike(
  pg_get_functiondef(
    'public.get_feed_page_v1(uuid,integer,timestamptz,bigint,uuid,bigint,boolean,boolean)'::regprocedure
  ),
  '%JOIN public.location_ratings%',
  'The feed does not join the whole location_ratings view'
);

SELECT set_config(
  'test.feed_first',
  public.get_feed_page_v1(auth.uid(), 2)::text,
  true
) IS NOT NULL;

SELECT is(
  (SELECT jsonb_agg((review->>'id')::bigint ORDER BY ordinality)
   FROM jsonb_array_elements(
     current_setting('test.feed_first')::jsonb->'reviews'
   ) WITH ORDINALITY AS page(review, ordinality)),
  '[938011, 938012]'::jsonb,
  'The first page returns the newest reviews in order'
);
SELECT is(
  (current_setting('test.feed_first')::jsonb->>'hasMore')::boolean,
  true,
  'A full page with more rows behind it reports hasMore'
);
SELECT is(
  (current_setting('test.feed_first')::jsonb->'reviews'->0->'location'->>'rating')::numeric,
  (SELECT rating FROM public.location_ratings WHERE id = 938001),
  'The feed location rating matches location_ratings'
);
SELECT is(
  (current_setting('test.feed_first')::jsonb->'reviews'->0->'location'->>'total_ratings')::integer,
  2,
  'The feed location rating count covers every published review there'
);
SELECT is(
  current_setting('test.feed_first')::jsonb->'reviews'->0->'location'->'is_golden_glass',
  'false'::jsonb,
  'The feed carries the Golden Glass flag'
);
SELECT is(
  current_setting('test.feed_first')::jsonb->'reviews'->0->'location'->'is_location_verified',
  'false'::jsonb,
  'The feed carries the verified-location flag'
);

SELECT set_config(
  'test.feed_second',
  public.get_feed_page_v1(
    auth.uid(),
    2,
    (current_setting('test.feed_first')::jsonb->'nextCursor'->>'insertedAt')::timestamptz,
    (current_setting('test.feed_first')::jsonb->'nextCursor'->>'id')::bigint
  )::text,
  true
) IS NOT NULL;

SELECT is(
  (current_setting('test.feed_second')::jsonb->'reviews'->0->>'id')::bigint,
  938013::bigint,
  'The cursor continues after the last row of the previous page'
);
SELECT is(
  (current_setting('test.feed_second')::jsonb->'reviews'->0->'location'->>'total_ratings')::integer,
  0,
  'A review without a location still returns a rating count'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
