BEGIN;
SELECT plan(8);

SELECT has_table('public', 'business_inquiries', 'Business inquiries table exists');
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.business_inquiries'::regclass),
  'Business inquiries are protected by RLS'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.business_inquiries', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.business_inquiries', 'SELECT'),
  'Inquiries are operator-only'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.submit_business_inquiry(text,text,text,text,text)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.submit_business_inquiry(text,text,text,text,text)', 'EXECUTE'),
  'Inquiry submission is server-only'
);

SELECT is(
  (public.submit_business_inquiry(
    'Pat Owner', 'Claimable Bar', 'PAT@claimablebar.test', NULL,
    'We pour a serious Martini and want to get verified.'
  )) ->> 'status',
  'new',
  'A web inquiry lands as new'
);
SELECT is(
  (SELECT business_email FROM public.business_inquiries WHERE business_name = 'Claimable Bar'),
  'pat@claimablebar.test',
  'Inquiry emails are normalized to lowercase'
);
SELECT throws_ok(
  $$SELECT public.submit_business_inquiry('Pat', 'Bar', 'not-an-email', NULL, 'hello')$$,
  '22023',
  'Enter a valid business email',
  'Invalid emails are rejected'
);
SELECT is(
  (public.mark_business_inquiry_handled(
    (SELECT id FROM public.business_inquiries WHERE business_name = 'Claimable Bar')
  )) ->> 'status',
  'handled',
  'The operator can mark an inquiry handled'
);

SELECT * FROM finish();
ROLLBACK;
