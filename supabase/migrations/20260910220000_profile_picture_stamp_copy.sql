BEGIN;

-- First Steps stamps name completed profile actions rather than quantities.
-- Use the member-facing term consistently in Passport data and previously
-- stored single-stamp Activity notifications.
UPDATE public.passport_definitions
SET unit = 'profile picture'
WHERE key = 'first-photo'
  AND unit IS DISTINCT FROM 'profile picture';

UPDATE public.notifications n
SET body = concat('Passport Stamp · Profile Picture · +', d.points, ' pts')
FROM public.passport_definitions d
WHERE n.kind = 'admin_message'
  AND n.data->>'category' = 'passport_achievement'
  AND n.data->>'definitionId' = d.id::text
  AND d.key = 'first-photo';

COMMIT;
