BEGIN;

SELECT plan(4);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000', '43000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'location-writer@example.test', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"43000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

SELECT throws_ok(
  $$INSERT INTO public.locations (name, address, location, created_by, place_id)
    VALUES ('Spoofed Bar', 'x', 'SRID=4326;POINT(-123.1 49.28)', auth.uid(), 'spoofed-place-id')$$,
  '42501', NULL,
  'Members cannot insert locations directly'
);
SELECT throws_ok(
  $$UPDATE public.locations SET name = 'Renamed' WHERE true$$,
  '42501', NULL,
  'Members cannot update locations directly'
);
SELECT throws_ok(
  $$DELETE FROM public.locations WHERE true$$,
  '42501', NULL,
  'Members cannot delete locations directly'
);

RESET ROLE;

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'locations' AND cmd = 'INSERT'
  ),
  'No direct INSERT policy remains on locations'
);

SELECT * FROM finish();
ROLLBACK;
