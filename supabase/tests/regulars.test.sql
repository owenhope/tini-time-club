BEGIN;

SELECT plan(7);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'regular-repeat@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'regular-once@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

INSERT INTO public.locations (id, name, address, location, created_by)
VALUES (
  941001,
  'Regulars Test Bar',
  '1 Test Row',
  'SRID=4326;POINT(-123.1 49.28)',
  '41000000-0000-0000-0000-000000000001'
);

INSERT INTO public.review_states (id, name)
VALUES (1, 'Active')
ON CONFLICT (id) DO NOTHING;

-- One review each: nobody is a Regular yet, however few reviewers there are.
INSERT INTO public.reviews (id, user_id, location, taste, presentation, state, comment)
VALUES
  (941101, '41000000-0000-0000-0000-000000000001', 941001, 4, 4, 1, ''),
  (941102, '41000000-0000-0000-0000-000000000002', 941001, 4, 4, 1, '');

SELECT is(
  (SELECT count(*)::integer FROM public.regular_memberships WHERE location_id = 941001),
  0,
  'A single review at a location does not make a Regular'
);
SELECT is(
  (SELECT count(*)::integer FROM public.notifications
   WHERE kind = 'regular_joined' AND (data ->> 'locationId')::bigint = 941001),
  0,
  'Single-review members are not told they became a Regular'
);

-- A second review at the same location earns the spot.
INSERT INTO public.reviews (id, user_id, location, taste, presentation, state, comment)
VALUES (941103, '41000000-0000-0000-0000-000000000001', 941001, 5, 5, 1, '');

SELECT results_eq(
  $$SELECT profile_id, rank::integer, review_count
    FROM public.regular_memberships WHERE location_id = 941001$$,
  $$VALUES ('41000000-0000-0000-0000-000000000001'::uuid, 1, 2)$$,
  'Two reviews make a Regular, and one-review members stay off the list'
);
SELECT is(
  (SELECT count(*)::integer FROM public.notifications
   WHERE kind = 'regular_joined'
     AND user_id = '41000000-0000-0000-0000-000000000001'
     AND (data ->> 'locationId')::bigint = 941001),
  1,
  'The repeat reviewer is notified once on becoming a Regular'
);

SELECT throws_ok(
  $$INSERT INTO public.regular_memberships (location_id, profile_id, rank, review_count)
    VALUES (941001, '41000000-0000-0000-0000-000000000002', 2, 1)$$,
  '23514',
  NULL,
  'The membership table rejects single-review Regulars'
);

-- Dropping back to one review removes the spot.
DELETE FROM public.reviews WHERE id = 941103;

SELECT is(
  (SELECT count(*)::integer FROM public.regular_memberships WHERE location_id = 941001),
  0,
  'Falling back to one review removes Regular status'
);
SELECT is(
  (SELECT count(*)::integer FROM public.notifications
   WHERE kind = 'regular_left'
     AND user_id = '41000000-0000-0000-0000-000000000001'
     AND (data ->> 'locationId')::bigint = 941001),
  1,
  'The member is notified when they lose Regular status'
);
SELECT * FROM finish();
ROLLBACK;
