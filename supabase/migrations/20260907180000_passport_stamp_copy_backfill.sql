BEGIN;

-- Notification bodies are stored at award time, so rows written before
-- 20260907170000 still carry the old label copy. Rewrite them to the
-- "Passport Stamp · <name>" form the client now shows for new awards.
UPDATE public.notifications n
SET body = concat('Passport Stamp · ',
  CASE
    WHEN d.metric = 'combination' THEN concat_ws(' · ', s.name, t.name)
    ELSE d.threshold::text || ' ' ||
      CASE WHEN d.threshold = 1 THEN regexp_replace(d.unit, 's$', '') ELSE d.unit END
  END, ' · +', d.points, ' pts')
FROM public.passport_definitions d
LEFT JOIN public.spirits s ON d.metric = 'combination' AND s.id = d.subject_a
LEFT JOIN public.types t ON d.metric = 'combination' AND t.id = d.subject_b
WHERE n.kind = 'admin_message'
  AND n.data->>'category' = 'passport_achievement'
  AND n.data->>'definitionId' IS NOT NULL
  AND d.id = (n.data->>'definitionId')::uuid;

UPDATE public.notifications n
SET body = concat('Passport Stamps · ', n.data->>'stamps', ' new · +',
  n.data->>'points', ' pts')
WHERE n.kind = 'admin_message'
  AND n.data->>'category' = 'passport_achievement'
  AND n.data->>'stamps' IS NOT NULL;

COMMIT;
