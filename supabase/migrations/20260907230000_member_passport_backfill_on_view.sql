BEGIN;

-- Passports only materialized when the owner's device ran the reconcile, so
-- profiles of members who haven't opened a passport-era build looked empty
-- to visitors. The reconcile core now takes a profile id, and viewing a
-- member's Passport reconciles them first — identical effects to their own
-- reconcile (awards, the same batched notifications, points invariant), just
-- triggered by the visit.

CREATE OR REPLACE FUNCTION public.reconcile_passport_for_v1(p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := p_profile_id;
  v_new_ids uuid[] := ARRAY[]::uuid[];
  v_new jsonb := '[]'::jsonb;
  v_points integer;
  v_previous_points integer;
BEGIN
  IF v_actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_actor AND NOT p.deleted
  ) THEN
    RAISE EXCEPTION 'Passport is unavailable' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('passport:' || v_actor::text, 0));
  SELECT passport_points INTO v_previous_points FROM public.profiles WHERE id = v_actor;

  WITH inserted AS (
    INSERT INTO public.passport_awards (
      profile_id, definition_id, progress_at_award, source
    )
    SELECT v_actor, d.id, p.progress, 'backfill'
    FROM public.passport_definitions d
    JOIN public.passport_progress_v1(v_actor) p ON p.definition_id = d.id
    WHERE p.progress >= d.threshold
    ON CONFLICT (profile_id, definition_id) DO NOTHING
    RETURNING definition_id
  )
  SELECT coalesce(array_agg(definition_id), ARRAY[]::uuid[])
  INTO v_new_ids
  FROM inserted;

  IF coalesce(array_length(v_new_ids, 1), 0) > 3 THEN
    INSERT INTO public.notifications (
      user_id, actor_id, body, type, kind, data, event_key
    )
    SELECT
      v_actor,
      NULL,
      concat('Passport Stamps · ', count(*), ' new · +',
        sum(d.points), ' pts'),
      2,
      'admin_message',
      jsonb_build_object(
        'category', 'passport_achievement',
        'stamps', count(*),
        'points', sum(d.points),
        'url', '/passport'
      ),
      concat('passport:', v_actor, ':batch:',
        md5(array_to_string(v_new_ids, ',')))
    FROM public.passport_definitions d
    WHERE d.id = ANY(v_new_ids)
    ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING;
  ELSE
    INSERT INTO public.notifications (
      user_id, actor_id, body, type, kind, data, event_key
    )
    SELECT
      v_actor,
      NULL,
      concat('Passport Stamp · ',
        CASE
          WHEN d.metric = 'combination' THEN concat_ws(' · ', s.name, t.name)
          ELSE d.threshold::text || ' ' ||
            CASE WHEN d.threshold = 1 THEN regexp_replace(d.unit, 's$', '') ELSE d.unit END
        END, ' · +', d.points, ' pts'),
      2,
      'admin_message',
      jsonb_build_object(
        'category', 'passport_achievement',
        'definitionId', d.id,
        'definitionKey', d.key,
        'points', d.points,
        'url', '/passport'
      ),
      concat('passport:', v_actor, ':', d.id)
    FROM public.passport_definitions d
    LEFT JOIN public.spirits s ON d.metric = 'combination' AND s.id = d.subject_a
    LEFT JOIN public.types t ON d.metric = 'combination' AND t.id = d.subject_b
    WHERE d.id = ANY(v_new_ids)
    ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id,
    'key', d.key,
    'series', d.series,
    'metric', d.metric,
    'threshold', d.threshold,
    'points', d.points,
    'title', d.title,
    'label', CASE
      WHEN d.metric = 'combination' THEN concat_ws(' · ', s.name, t.name)
      ELSE d.threshold::text || ' ' ||
        CASE WHEN d.threshold = 1 THEN regexp_replace(d.unit, 's$', '') ELSE d.unit END
    END,
    'unit', d.unit,
    'hint', d.hint,
    'artwork_key', d.artwork_key,
    'progress', a.progress_at_award,
    'earned', true,
    'awarded_at', a.awarded_at,
    'subject_a', d.subject_a,
    'subject_b', d.subject_b
  ) ORDER BY d.display_order), '[]'::jsonb)
  INTO v_new
  FROM public.passport_definitions d
  JOIN public.passport_awards a
    ON a.definition_id = d.id AND a.profile_id = v_actor
  LEFT JOIN public.spirits s ON d.metric = 'combination' AND s.id = d.subject_a
  LEFT JOIN public.types t ON d.metric = 'combination' AND t.id = d.subject_b
  WHERE d.id = ANY(v_new_ids);

  SELECT coalesce(sum(d.points), 0)::integer INTO v_points
  FROM public.passport_awards a
  JOIN public.passport_definitions d ON d.id = a.definition_id
  WHERE a.profile_id = v_actor AND a.revoked_at IS NULL;

  UPDATE public.profiles
  SET passport_points = v_points
  WHERE id = v_actor AND passport_points IS DISTINCT FROM v_points;

  RETURN jsonb_build_object(
    'points', v_points,
    'previousPoints', coalesce(v_previous_points, 0),
    'unlocked', v_new
  );
END;
$$;
REVOKE ALL ON FUNCTION public.reconcile_passport_for_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_passport_for_v1(uuid)
  TO service_role;

-- The member-facing entry point delegates to the core.
CREATE OR REPLACE FUNCTION public.reconcile_my_passport_v1()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Passport is unavailable' USING ERRCODE = '42501';
  END IF;
  RETURN public.reconcile_passport_for_v1(auth.uid());
END;
$$;
REVOKE ALL ON FUNCTION public.reconcile_my_passport_v1() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_my_passport_v1() TO authenticated, service_role;

-- Viewing a member's Passport reconciles them first, so profiles of members
-- who haven't opened a passport-era build read truthfully. plpgsql runs each
-- statement on a fresh snapshot, so the read below sees what the reconcile
-- wrote (the same pattern as get_my_passport_v1).
CREATE OR REPLACE FUNCTION public.get_member_passport_v1(p_profile_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
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

  PERFORM public.reconcile_passport_for_v1(p_profile_id);

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
