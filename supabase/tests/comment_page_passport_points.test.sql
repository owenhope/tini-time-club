BEGIN;
SELECT plan(6);

INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
VALUES ('77700000-0000-0000-0000-000000000017', 'authenticated', 'authenticated',
        'comment-ring@example.test', '{"provider":"email","providers":["email"]}', '{}');

INSERT INTO public.review_states (id, name)
VALUES (1, 'Active') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.notification_types (id, name)
VALUES (2, 'Comment') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reviews (id, user_id, taste, presentation, state, comment)
VALUES (937017, '77700000-0000-0000-0000-000000000017', 4, 4, 1, '');
INSERT INTO public.comments (user_id, review_id, body)
VALUES ('77700000-0000-0000-0000-000000000017', 937017, 'Ring regression');

-- Deliberately use different totals to catch a return to review-based ranks.
UPDATE public.profiles SET passport_points = 500, review_count = 1
WHERE id = '77700000-0000-0000-0000-000000000017';
SELECT set_config('request.jwt.claim.sub', '77700000-0000-0000-0000-000000000017', true);

SELECT is(
  (public.get_comment_page_v1(937017, auth.uid())->'comments'->0->'profile'->>'passport_points')::integer,
  500,
  'Comment pages expose author Passport points for the avatar ring'
);
SELECT is(
  (public.get_comment_page_v1(937017, auth.uid())->'comments'->0->'profile'->>'review_count')::integer,
  1,
  'Comment pages preserve the legacy review count independently'
);
-- Exercise the write response through the member role, not a fabricated payload.
SET LOCAL ROLE authenticated;
SELECT set_config('test.created_comment', public.create_comment_v2(937017, 'New ring regression', '[]'::jsonb)::text, true) IS NOT NULL;
SELECT is(
  (current_setting('test.created_comment')::jsonb->'profile'->>'passport_points')::integer,
  500,
  'New comments expose author Passport points immediately'
);
SELECT is(
  (current_setting('test.created_comment')::jsonb->'profile'->>'review_count')::integer,
  1,
  'New comments preserve the independent review count'
);
SELECT is(
  (public.get_comment_page_v1(937017, auth.uid())->'comments'->1->'profile'->>'passport_points')::integer,
  500,
  'Reloading a newly posted comment preserves its ring points'
);
RESET ROLE;
UPDATE public.profiles SET passport_points = 0
WHERE id = '77700000-0000-0000-0000-000000000017';
SELECT is(
  (public.get_comment_page_v1(937017, auth.uid())->'comments'->0->'profile'->>'passport_points')::integer,
  0,
  'Confirmed zero points are returned explicitly'
);
SELECT * FROM finish();
ROLLBACK;
