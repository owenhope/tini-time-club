BEGIN;
SELECT no_plan();

SELECT ok(NOT has_table_privilege('anon', 'public.admin_email_recipients', 'SELECT'), 'Anonymous users cannot read recipient emails');
SELECT ok(NOT has_table_privilege('authenticated', 'public.admin_email_campaigns', 'INSERT'), 'Members cannot create campaigns');
SELECT ok(NOT has_table_privilege('authenticated', 'public.admin_email_optouts', 'DELETE'), 'Members cannot remove opt-outs');
SELECT ok(NOT has_function_privilege('authenticated', 'public.admin_email_audience(text,integer)', 'EXECUTE'), 'Audience RPC is server-only');
SELECT ok(NOT has_function_privilege('anon', 'public.create_admin_email_campaign(uuid,text,text,text,text,text,uuid[])', 'EXECUTE'), 'Draft RPC is server-only');
SELECT ok(NOT has_function_privilege('authenticated', 'public.claim_admin_email_recipients(uuid)', 'EXECUTE'), 'Claim RPC is server-only');
SELECT ok(NOT has_function_privilege('authenticated', 'public.get_admin_email_campaign(uuid)', 'EXECUTE'), 'History RPC is server-only');
SELECT ok(NOT has_function_privilege('anon', 'public.can_send_admin_email_recipient(uuid)', 'EXECUTE'), 'Eligibility RPC is server-only');
SELECT ok(has_function_privilege('service_role', 'public.claim_admin_email_recipients(uuid)', 'EXECUTE'), 'Service role can claim sends');

INSERT INTO auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
SELECT ('70000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'email-test-' || n || '@example.test', CASE WHEN n = 4 THEN NULL ELSE now() END, '{}'::jsonb, now(), now()
FROM generate_series(1, 4) n;
UPDATE public.profiles SET deleted = (id = '70000000-0000-0000-0000-000000000003')
WHERE id IN (SELECT ('70000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid FROM generate_series(1,4) n);
INSERT INTO public.admin_email_optouts(email) VALUES ('email-test-2@example.test');

SELECT is(jsonb_array_length(public.admin_email_audience('email-test-', 50)->'members'), 1, 'Search excludes deleted, unconfirmed and opted-out users');
SELECT is(jsonb_array_length(public.admin_email_audience('%', 50)->'members'), 0, 'Search treats percent as a literal, not a wildcard');
SELECT throws_ok($$SELECT public.create_admin_email_campaign('71000000-0000-0000-0000-000000000001', 'Hello', 'Body', 'hello@example.test', 'https://example.test', 'selected', '{}')$$,
  'P0001', 'Select at least one member', 'Empty selected audience is rejected');

SELECT public.create_admin_email_campaign('71000000-0000-0000-0000-000000000001', 'Hello', 'Body', 'hello@example.test', 'https://example.test', 'selected',
  ARRAY['70000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000004']::uuid[]);
SELECT is((SELECT count(*)::integer FROM public.admin_email_recipients WHERE campaign_id = '71000000-0000-0000-0000-000000000001'), 1, 'Selection is deduplicated and filtered server-side');
SELECT public.create_admin_email_campaign('71000000-0000-0000-0000-000000000001', 'Changed', 'Changed', 'hello@example.test', 'https://example.test', 'all');
SELECT is((SELECT subject FROM public.admin_email_campaigns WHERE id = '71000000-0000-0000-0000-000000000001'), 'Hello', 'Repeating creation preserves the original draft');
SELECT throws_ok($$SELECT public.claim_admin_email_recipients('71000000-0000-0000-0000-000000000001')$$,
  'P0001', 'Campaign has not been started', 'Saving a draft does not authorize delivery');

UPDATE public.admin_email_campaigns SET started_at = now() WHERE id = '71000000-0000-0000-0000-000000000001';
SELECT is((SELECT count(*)::integer FROM public.claim_admin_email_recipients('71000000-0000-0000-0000-000000000001')), 1, 'Started campaign claims its recipient');
SELECT is((SELECT count(*)::integer FROM public.claim_admin_email_recipients('71000000-0000-0000-0000-000000000001')), 0, 'Active leases prevent concurrent duplicate sends');
UPDATE public.admin_email_recipients SET lease_until = now() - interval '1 minute' WHERE campaign_id = '71000000-0000-0000-0000-000000000001';
SELECT is((SELECT count(*)::integer FROM public.claim_admin_email_recipients('71000000-0000-0000-0000-000000000001')), 1, 'Expired lease can resume inside the idempotency window');
INSERT INTO public.admin_email_optouts(email) VALUES ('email-test-1@example.test');
SELECT ok(NOT public.can_send_admin_email_recipient((SELECT id FROM public.admin_email_recipients WHERE campaign_id = '71000000-0000-0000-0000-000000000001')), 'Opt-out is honored even after claiming a recipient');
UPDATE public.admin_email_recipients SET first_attempt_at = now() - interval '24 hours', lease_until = now() - interval '1 minute' WHERE campaign_id = '71000000-0000-0000-0000-000000000001';
SELECT is((SELECT count(*)::integer FROM public.claim_admin_email_recipients('71000000-0000-0000-0000-000000000001')), 0, 'Expired idempotency window cannot resend');
SELECT is((public.get_admin_email_campaign('71000000-0000-0000-0000-000000000001')->'counts'->>'uncertain')::integer, 1, 'Expired attempts require manual reconciliation');

DELETE FROM public.admin_email_optouts WHERE email IN ('email-test-1@example.test', 'email-test-2@example.test');
SELECT public.create_admin_email_campaign('71000000-0000-0000-0000-000000000002', 'Group', 'Body', 'hello@example.test', 'https://example.test', 'selected',
  ARRAY['70000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002']::uuid[]);
SELECT is((public.get_admin_email_campaign('71000000-0000-0000-0000-000000000002')->'counts'->>'pending')::integer, 2, 'A selected collection includes both eligible members');
SELECT public.create_admin_email_campaign('71000000-0000-0000-0000-000000000003', 'All', 'Body', 'hello@example.test', 'https://example.test', 'all');
SELECT is((public.get_admin_email_campaign('71000000-0000-0000-0000-000000000003')->'counts'->>'pending')::integer,
  (public.admin_email_audience()->>'total')::integer, 'All-member draft snapshots the complete eligible audience');
INSERT INTO public.admin_email_optouts(email) VALUES ('email-test-2@example.test');
UPDATE public.profiles SET deleted = true WHERE id = '70000000-0000-0000-0000-000000000001';
UPDATE public.admin_email_campaigns SET started_at = now() WHERE id = '71000000-0000-0000-0000-000000000002';
SELECT is((SELECT count(*)::integer FROM public.claim_admin_email_recipients('71000000-0000-0000-0000-000000000002')), 0, 'Unsubscribed and deleted members are excluded after draft review');
SELECT is((public.get_admin_email_campaign('71000000-0000-0000-0000-000000000002')->'counts'->>'skipped')::integer, 2, 'Skipped recipients are reflected in campaign progress');

SELECT ok(NOT has_function_privilege('authenticated', 'public.admin_email_all_members(text)', 'EXECUTE'), 'Full member list is server-only');
SELECT ok(NOT has_function_privilege('anon', 'public.create_admin_email_campaign_excluding(uuid,text,text,text,text,text,uuid[],uuid[])', 'EXECUTE'), 'Exclusion-aware creation is server-only');
UPDATE public.profiles SET deleted = false WHERE id = '70000000-0000-0000-0000-000000000001';
DELETE FROM public.admin_email_optouts WHERE email = 'email-test-2@example.test';
INSERT INTO auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
SELECT ('72000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'email-big-list-' || n || '@example.test', now(), '{}'::jsonb, now(), now()
FROM generate_series(1, 51) n;
SELECT is((SELECT count(*)::integer FROM jsonb_array_elements(public.admin_email_all_members()) member WHERE member->>'email' LIKE 'email-big-list-%'), 51, 'Full list is not truncated at the typeahead search limit');
SELECT is(jsonb_array_length(public.admin_email_all_members()), (public.admin_email_audience()->>'total')::integer, 'Full member list contains every eligible email');
SELECT public.create_admin_email_campaign_excluding('71000000-0000-0000-0000-000000000004', 'Exclude one', 'Body', 'hello@example.test', 'https://example.test', 'all', '{}', ARRAY['70000000-0000-0000-0000-000000000001']::uuid[]);
SELECT is((SELECT count(*)::integer FROM public.admin_email_recipients WHERE campaign_id = '71000000-0000-0000-0000-000000000004' AND email = 'email-test-1@example.test'), 0, 'Excluded member is absent from the actual delivery ledger');
SELECT is((public.get_admin_email_campaign('71000000-0000-0000-0000-000000000004')->'counts'->>'pending')::integer, (public.admin_email_audience()->>'total')::integer - 1, 'Exclusions reduce the saved audience count');
SELECT public.create_admin_email_campaign_excluding('71000000-0000-0000-0000-000000000004', 'Changed', 'Body', 'hello@example.test', 'https://example.test', 'all', '{}', '{}');
SELECT is((SELECT count(*)::integer FROM public.admin_email_recipients WHERE campaign_id = '71000000-0000-0000-0000-000000000004' AND email = 'email-test-1@example.test'), 0, 'Retrying draft creation cannot reintroduce exclusions');

SELECT ok(NOT has_function_privilege('authenticated', 'public.admin_email_all_members(text)', 'EXECUTE'), 'Segment member list is server-only');
SELECT ok(NOT has_function_privilege('anon', 'public.admin_email_audience_counts()', 'EXECUTE'), 'Audience counts are server-only');
SELECT ok(NOT has_function_privilege('authenticated', 'public.admin_email_segment_matches(text,uuid)', 'EXECUTE'), 'Segment predicate is server-only');
INSERT INTO public.reviews(user_id, inserted_at) VALUES
  ('70000000-0000-0000-0000-000000000001', now() - interval '5 days'),
  ('70000000-0000-0000-0000-000000000002', now() - interval '120 days');
SELECT is((SELECT count(*)::integer FROM jsonb_array_elements(public.admin_email_all_members('active')) m WHERE (m->>'email') LIKE 'email-test-%'), 1, 'Active segment lists only members with a recent review');
SELECT is((SELECT count(*)::integer FROM jsonb_array_elements(public.admin_email_all_members('inactive')) m WHERE (m->>'email') = 'email-test-2@example.test'), 1, 'A stale reviewer counts as inactive');
SELECT is((public.admin_email_audience_counts()->>'active')::integer, 1, 'Audience counts report the active segment');
SELECT is((public.admin_email_audience_counts()->>'all')::integer,
  (public.admin_email_audience_counts()->>'active')::integer + (public.admin_email_audience_counts()->>'inactive')::integer,
  'Active and inactive segments partition the full audience');
SELECT throws_ok($$SELECT public.create_admin_email_campaign_excluding('71000000-0000-0000-0000-000000000006', 'Bad', 'Body', 'hello@example.test', 'https://example.test', 'everyone', '{}', '{}')$$,
  'P0001', 'Invalid audience', 'Unknown audiences are rejected');
SELECT public.create_admin_email_campaign_excluding('71000000-0000-0000-0000-000000000005', 'Active only', 'Body', 'hello@example.test', 'https://example.test', 'active', '{}', '{}');
SELECT is((SELECT count(*)::integer FROM public.admin_email_recipients WHERE campaign_id = '71000000-0000-0000-0000-000000000005'), 1, 'Active-segment draft snapshots only active members');
SELECT is((SELECT email FROM public.admin_email_recipients WHERE campaign_id = '71000000-0000-0000-0000-000000000005'), 'email-test-1@example.test', 'Active-segment recipient is the recent reviewer');
INSERT INTO public.app_usage_presence(installation_id, audience, user_id, session_id, platform, last_seen_at)
  VALUES (gen_random_uuid(), 'member', '70000000-0000-0000-0000-000000000002', gen_random_uuid(), 'ios', now() - interval '2 days');
SELECT is((public.admin_email_audience_counts()->>'active')::integer, 2, 'Opening the app recently counts as active without a recent review');
SELECT is((SELECT count(*)::integer FROM jsonb_array_elements(public.admin_email_all_members('inactive')) m WHERE (m->>'email') = 'email-test-2@example.test'), 0, 'A recent app open removes a member from the inactive segment');
UPDATE public.app_usage_presence SET last_seen_at = now() - interval '120 days' WHERE user_id = '70000000-0000-0000-0000-000000000002';
SELECT is((public.admin_email_audience_counts()->>'active')::integer, 1, 'A stale app open does not count as active');

SELECT * FROM finish();
ROLLBACK;
