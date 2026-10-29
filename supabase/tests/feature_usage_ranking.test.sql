BEGIN;
SELECT plan(17);

SELECT ok(NOT has_table_privilege('anon','public.admin_usage_events','INSERT'), 'Visitors cannot forge admin events');
SELECT ok(NOT has_table_privilege('authenticated','public.admin_usage_events','SELECT'), 'Members cannot read admin sessions');
SELECT ok(NOT has_function_privilege('authenticated','public.get_feature_usage_ranking(date,date,text,text)','EXECUTE'), 'Ranking is private');
SELECT ok(has_function_privilege('service_role','public.get_feature_usage_ranking(date,date,text,text)','EXECUTE'), 'Admin server can rank features');
SELECT is((SELECT count(*)::integer FROM public.feature_usage_catalog WHERE surface='app' AND event_name IN ('screen_location_claim','screen_location_verification_info')), 0, 'Venue claim screens are not ranked as app features');

INSERT INTO auth.users(id) VALUES ('ca100000-0000-4000-8000-000000000001'), ('ca100000-0000-4000-8000-000000000002');
INSERT INTO public.app_analytics_events(id,installation_id,session_id,user_id,event_name,platform,app_environment,occurred_at) VALUES
('ca200000-0000-4000-8000-000000000001','ca300000-0000-4000-8000-000000000001','ca400000-0000-4000-8000-000000000001','ca100000-0000-4000-8000-000000000001','screen_home','ios','production','2099-01-01 00:00:00+00'),
('ca200000-0000-4000-8000-000000000002','ca300000-0000-4000-8000-000000000002','ca400000-0000-4000-8000-000000000002','ca100000-0000-4000-8000-000000000001','screen_home','ios','production','2099-01-01 12:00:00+00'),
('ca200000-0000-4000-8000-000000000003','ca300000-0000-4000-8000-000000000003','ca400000-0000-4000-8000-000000000003',NULL,'screen_home','ios','production','2099-01-01 23:59:59+00'),
('ca200000-0000-4000-8000-000000000004','ca300000-0000-4000-8000-000000000003','ca400000-0000-4000-8000-000000000003','ca100000-0000-4000-8000-000000000002','screen_home','ios','development','2099-01-01 12:00:00+00'),
('ca200000-0000-4000-8000-000000000005','ca300000-0000-4000-8000-000000000003','ca400000-0000-4000-8000-000000000003',NULL,'screen_home','ios','production','2099-01-02 00:00:00+00');
INSERT INTO public.admin_usage_events(id,event_name,session_hash,app_environment,occurred_at) VALUES
('ca500000-0000-4000-8000-000000000001','page_dashboard',repeat('a',64),'production','2099-01-01 12:00:00+00'),
('ca500000-0000-4000-8000-000000000002','page_dashboard',repeat('a',64),'production','2099-01-01 13:00:00+00'),
('ca500000-0000-4000-8000-000000000003','page_dashboard',repeat('b',64),'development','2099-01-01 13:00:00+00');

SET LOCAL ROLE service_role;
CREATE TEMP TABLE app_ranking AS SELECT value AS row FROM jsonb_array_elements(public.get_feature_usage_ranking('2099-01-01','2099-01-01','app','production')->'rows');
SELECT is((SELECT (row->>'events')::int FROM app_ranking WHERE row->>'event'='screen_home'),3,'Counts UTC boundaries and excludes development');
SELECT is((SELECT (row->>'members')::int FROM app_ranking WHERE row->>'event'='screen_home'),1,'Deduplicates members across devices');
SELECT is((SELECT (row->>'installations')::int FROM app_ranking WHERE row->>'event'='screen_home'),3,'Includes visitors as installations, not members');
SELECT is((SELECT (row->>'events')::int FROM app_ranking WHERE row->>'event'='screen_passport'),0,'Includes unobserved features');
SELECT is((SELECT row->>'lastUsed' FROM app_ranking WHERE row->>'event'='screen_passport'),NULL::text,'No invented last-use date');
SELECT is((SELECT (value->>'events')::int FROM jsonb_array_elements(public.get_feature_usage_ranking('2099-01-01','2099-01-01','app','development')->'rows') WHERE value->>'event'='screen_home'),1,'Development can be inspected independently');
SELECT is((SELECT (value->>'sessions')::int FROM jsonb_array_elements(public.get_feature_usage_ranking('2099-01-01','2099-01-01','admin','production')->'rows') WHERE value->>'event'='page_dashboard'),1,'Admin reach deduplicates signed-in sessions');
SELECT is((SELECT (value->>'events')::int FROM jsonb_array_elements(public.get_feature_usage_ranking('2099-01-01','2099-01-01','admin','production')->'rows') WHERE value->>'event'='page_dashboard'),2,'Admin event frequency remains separate');
SELECT ok(NOT EXISTS (SELECT 1 FROM app_ranking WHERE row->>'event' LIKE 'page_%'),'Surfaces never mix');
SELECT throws_ok($$SELECT public.get_feature_usage_ranking('2099-01-02','2099-01-01','app','production')$$,'P0001','Analytics range must contain between 1 and 366 days','Rejects reversed range');
SELECT throws_ok($$SELECT public.get_feature_usage_ranking('2099-01-01','2100-01-02','app','production')$$,'P0001','Analytics range must contain between 1 and 366 days','Bounds query window');
SELECT throws_ok($$SELECT public.get_feature_usage_ranking('2099-01-01','2099-01-02','app','all')$$,'P0001','Invalid analytics surface or environment','Rejects ambiguous environment');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
