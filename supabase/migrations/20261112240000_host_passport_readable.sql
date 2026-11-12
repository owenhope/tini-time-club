BEGIN;

-- Opening the club host's profile called get_member_passport_v1, which always
-- reconciled first; reconcile refuses the host, so every such read failed
-- with "Passport is unavailable". Current app builds hide the host's
-- Passport, but 4.9.2 and a fresh 4.10.0 install's first launch still ask.

CREATE OR REPLACE FUNCTION public.get_member_passport_v1(p_profile_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Passport is unavailable' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = p_profile_id AND NOT p.deleted
      AND public.is_member_visible(p_profile_id)
  ) THEN
    RAISE EXCEPTION 'Passport is unavailable' USING ERRCODE = '42501';
  END IF;

  -- The club host holds the catalog maximum and is never reconciled
  -- (reconcile_passport_for_v1 refuses it). Skip that step so reading the
  -- host's Passport returns its stored points instead of an error.
  IF p_profile_id <> 'c74ac2d4-e405-4b2d-a14c-813b7be780e1' THEN
    PERFORM public.reconcile_passport_for_v1(p_profile_id);
  END IF;

  RETURN (
    WITH rows AS (
      SELECT d.id,d.key,d.series,d.metric,d.threshold,d.points,d.title,d.unit,d.hint,d.artwork_key,
        CASE WHEN d.metric='combination' THEN concat_ws(' · ',s.name,t.name)
          ELSE d.threshold::text || ' ' || CASE WHEN d.threshold=1 THEN regexp_replace(d.unit,'s$','') ELSE d.unit END
        END AS label,
        p.progress,(a.id IS NOT NULL AND a.revoked_at IS NULL) earned,a.awarded_at,d.display_order,d.subject_a,d.subject_b
      FROM public.passport_definitions d
      JOIN public.passport_progress_v1(p_profile_id) p ON p.definition_id=d.id
      LEFT JOIN public.passport_awards a ON a.definition_id=d.id AND a.profile_id=p_profile_id
      LEFT JOIN public.spirits s ON d.metric='combination' AND s.id=d.subject_a
      LEFT JOIN public.types t ON d.metric='combination' AND t.id=d.subject_b
      WHERE d.enabled
    ) SELECT jsonb_build_object(
      'points',(SELECT passport_points FROM public.profiles WHERE id=p_profile_id),
      'stamps',coalesce(jsonb_agg(to_jsonb(rows) ORDER BY display_order),'[]'::jsonb)
    ) FROM rows
  );
END; $$;

COMMIT;
