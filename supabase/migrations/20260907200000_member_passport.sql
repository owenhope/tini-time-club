BEGIN;

-- Read another member's Passport. Same row shape as get_my_passport_v1 but
-- read-only: no reconcile (awards land when the owner's own client runs one),
-- and progress is computed live so viewers see current bars. Members-only:
-- signed-out visitors have no Passport surface.
CREATE OR REPLACE FUNCTION public.get_member_passport_v1(p_profile_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Passport is unavailable' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = p_profile_id AND NOT p.deleted
  ) THEN
    RAISE EXCEPTION 'Passport is unavailable' USING ERRCODE = '42501';
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
REVOKE ALL ON FUNCTION public.get_member_passport_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_passport_v1(uuid)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
