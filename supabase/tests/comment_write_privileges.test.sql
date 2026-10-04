BEGIN;

SELECT plan(5);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000000', '44000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'comment-author@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '44000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'comment-writer@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

INSERT INTO public.review_states (id, name)
VALUES (1, 'Active')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reviews (id, user_id, taste, presentation, state, comment)
VALUES (944001, '44000000-0000-0000-0000-000000000001', 4, 4, 1, '');

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"44000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

SELECT throws_ok(
  $$INSERT INTO public.comments (review_id, user_id, body)
    VALUES (944001, auth.uid(), 'Direct insert')$$,
  '42501', NULL,
  'Members cannot insert comments directly'
);
SELECT throws_ok(
  $$SELECT public.create_comment_v2(944001, repeat('x', 501), '[]'::jsonb)$$,
  NULL, NULL,
  'The comment RPC still rejects comments over 500 characters'
);
SELECT lives_ok(
  $$SELECT public.create_comment_v2(944001, 'Perfectly cold.', '[]'::jsonb)$$,
  'Members can comment through the RPC'
);
SELECT lives_ok(
  $$DELETE FROM public.comments WHERE user_id = auth.uid()$$,
  'Members can still delete their own comments'
);

RESET ROLE;

SELECT throws_ok(
  $$INSERT INTO public.comments (review_id, user_id, body)
    VALUES (944001, '44000000-0000-0000-0000-000000000002', repeat('x', 501))$$,
  '23514', NULL,
  'The table rejects comments over 500 characters'
);

SELECT * FROM finish();
ROLLBACK;
