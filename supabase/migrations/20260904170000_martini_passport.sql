BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS passport_points integer NOT NULL DEFAULT 0
  CHECK (passport_points >= 0);

CREATE TABLE public.passport_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  series text NOT NULL,
  metric text NOT NULL CHECK (metric IN (
    'locations', 'martinis', 'combination', 'type_reviews',
    'regulars', 'comments', 'likes_received', 'shares'
  )),
  subject_a bigint,
  subject_b bigint,
  threshold integer NOT NULL CHECK (threshold > 0),
  points smallint NOT NULL CHECK (points BETWEEN 0 AND 1000),
  title text NOT NULL,
  unit text NOT NULL,
  hint text NOT NULL,
  artwork_key text NOT NULL,
  display_order integer NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.passport_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  definition_id uuid NOT NULL REFERENCES public.passport_definitions(id) ON DELETE RESTRICT,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  triggering_review_id bigint REFERENCES public.reviews(id) ON DELETE SET NULL,
  progress_at_award integer NOT NULL CHECK (progress_at_award >= 0),
  source text NOT NULL CHECK (source IN ('review', 'backfill')),
  revoked_at timestamptz,
  revoked_reason text,
  UNIQUE (profile_id, definition_id)
);

CREATE INDEX passport_awards_profile_idx
  ON public.passport_awards (profile_id, awarded_at DESC);
ALTER TABLE public.passport_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_awards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.passport_definitions, public.passport_awards FROM anon, authenticated;
GRANT ALL ON public.passport_definitions, public.passport_awards TO service_role;

-- Reward curve: within each achievement family (metric + subjects, ordered by
-- threshold) tiers award 10/25/50/100/200 points, flattening at 200. Each
-- one-step combination family awards 10. Totals are the sum of a member's
-- non-revoked awards; disabling a definition never silently changes totals —
-- retiring an achievement must revoke its awards explicitly.
INSERT INTO public.passport_definitions
  (key, series, metric, threshold, points, title, unit, hint, artwork_key, display_order)
VALUES
  ('locations-1','Totals','locations',1,10,'Total Locations','locations','Review different venues. Each venue counts once, wherever you go.','location-outline',10),
  ('locations-5','Totals','locations',5,25,'Total Locations','locations','Review different venues. Each venue counts once, wherever you go.','storefront-outline',11),
  ('locations-10','Totals','locations',10,50,'Total Locations','locations','Review different venues. Each venue counts once, wherever you go.','map-outline',12),
  ('locations-25','Totals','locations',25,100,'Total Locations','locations','Review different venues. Each venue counts once, wherever you go.','compass-outline',13),
  ('locations-50','Totals','locations',50,200,'Total Locations','locations','Review different venues. Each venue counts once, wherever you go.','globe-outline',14),
  ('locations-100','Totals','locations',100,200,'Total Locations','locations','Review different venues. Each venue counts once, wherever you go.','flag-outline',15),
  ('martinis-1','Totals','martinis',1,10,'Total Martinis','martinis','Publish martini reviews. Every active review counts.','wine-outline',20),
  ('martinis-5','Totals','martinis',5,25,'Total Martinis','martinis','Publish martini reviews. Every active review counts.','wine-outline',21),
  ('martinis-10','Totals','martinis',10,50,'Total Martinis','martinis','Publish martini reviews. Every active review counts.','wine-outline',22),
  ('martinis-50','Totals','martinis',50,100,'Total Martinis','martinis','Publish martini reviews. Every active review counts.','wine-outline',23),
  ('martinis-100','Totals','martinis',100,200,'Total Martinis','martinis','Publish martini reviews. Every active review counts.','wine-outline',24),
  ('martinis-200','Totals','martinis',200,200,'Total Martinis','martinis','Publish martini reviews. Every active review counts.','wine-outline',25),
  ('martinis-500','Totals','martinis',500,200,'Total Martinis','martinis','Publish martini reviews. Every active review counts.','wine-outline',26),
  ('martinis-1000','Totals','martinis',1000,200,'Total Martinis','martinis','Publish martini reviews. Every active review counts.','wine-outline',27),
  ('regulars-1','Venues','regulars',1,10,'Regulars','regulars','Earn a current Regular spot at different venues.','storefront-outline',400),
  ('regulars-5','Venues','regulars',5,25,'Regulars','regulars','Earn a current Regular spot at different venues.','storefront-outline',401),
  ('regulars-10','Venues','regulars',10,50,'Regulars','regulars','Earn a current Regular spot at different venues.','storefront-outline',402),
  ('regulars-25','Venues','regulars',25,100,'Regulars','regulars','Earn a current Regular spot at different venues.','storefront-outline',403),
  ('regulars-50','Venues','regulars',50,200,'Regulars','regulars','Earn a current Regular spot at different venues.','storefront-outline',404),
  ('regulars-100','Venues','regulars',100,200,'Regulars','regulars','Earn a current Regular spot at different venues.','storefront-outline',405);

INSERT INTO public.passport_definitions
  (key, series, metric, threshold, points, title, unit, hint, artwork_key, display_order)
SELECT metric || '-' || threshold, 'Community', metric, threshold,
  CASE tier WHEN 1 THEN 10 WHEN 2 THEN 25 WHEN 3 THEN 50 WHEN 4 THEN 100 ELSE 200 END,
  CASE metric WHEN 'comments' THEN 'Comments' WHEN 'likes_received' THEN 'Likes' ELSE 'Shares' END,
  CASE metric WHEN 'likes_received' THEN 'likes' ELSE metric END,
  CASE metric
    WHEN 'comments' THEN 'Join the conversation. Each comment you post counts.'
    WHEN 'likes_received' THEN 'Likes received on your active reviews count.'
    ELSE 'Share reviews from the app to grow this milestone.' END,
  CASE metric WHEN 'comments' THEN 'chatbubble-outline' WHEN 'likes_received' THEN 'heart-outline' ELSE 'share-outline' END,
  500 + metric_order * 10 + tier
FROM (VALUES ('comments',0),('likes_received',1),('shares',2)) metrics(metric, metric_order)
CROSS JOIN (VALUES (1,1),(10,2),(50,3),(100,4),(500,5)) tiers(threshold,tier);

INSERT INTO public.passport_definitions
  (key, series, metric, subject_a, threshold, points, title, unit, hint, artwork_key, display_order)
SELECT 'type-' || t.id || '-' || threshold, 'Drinks', 'type_reviews', t.id,
  threshold, CASE tier WHEN 1 THEN 10 WHEN 2 THEN 25 ELSE 50 END,
  coalesce(t.name,'Martini') || ' milestones', 'reviews',
  'Publish ' || threshold || ' ' || coalesce(t.name,'Martini') || ' reviews. Every active review counts.',
  'wine-outline', 200 + dense_rank() OVER (ORDER BY t.id)::integer * 10 + tier
FROM public.types t
CROSS JOIN (VALUES (10,1),(50,2),(100,3)) tiers(threshold,tier);

INSERT INTO public.passport_definitions
  (key, series, metric, subject_a, subject_b, threshold, points, title, unit, hint, artwork_key, display_order)
SELECT 'combo-' || s.id || '-' || t.id, 'Drinks', 'combination', s.id, t.id,
  1, 10, 'Martini Explorer', 'combinations',
  'Review each spirit and martini type combination once.', 'sparkles-outline',
  100 + row_number() OVER (ORDER BY s.id,t.id)::integer
FROM public.spirits s CROSS JOIN public.types t;

CREATE OR REPLACE FUNCTION public.passport_progress_v1(p_profile_id uuid)
RETURNS TABLE (definition_id uuid, progress integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT d.id,
    CASE d.metric
      WHEN 'locations' THEN (SELECT count(DISTINCT r.location)::integer FROM public.reviews r WHERE r.user_id=p_profile_id AND r.state=1 AND r.location IS NOT NULL)
      WHEN 'martinis' THEN (SELECT count(*)::integer FROM public.reviews r WHERE r.user_id=p_profile_id AND r.state=1)
      WHEN 'combination' THEN (SELECT count(*)::integer FROM public.reviews r WHERE r.user_id=p_profile_id AND r.state=1 AND r.spirit=d.subject_a AND r.type=d.subject_b)
      WHEN 'type_reviews' THEN (SELECT count(*)::integer FROM public.reviews r WHERE r.user_id=p_profile_id AND r.state=1 AND r.type=d.subject_a)
      WHEN 'regulars' THEN (SELECT count(*)::integer FROM public.regular_memberships m WHERE m.profile_id=p_profile_id)
      WHEN 'comments' THEN (SELECT count(*)::integer FROM public.comments c WHERE c.user_id=p_profile_id)
      WHEN 'likes_received' THEN (SELECT count(*)::integer FROM public.likes l JOIN public.reviews r ON r.id=l.review_id WHERE r.user_id=p_profile_id AND r.state=1)
      WHEN 'shares' THEN (SELECT count(*)::integer FROM public.review_share_events s WHERE s.user_id=p_profile_id)
    END
  FROM public.passport_definitions d WHERE d.enabled;
$$;
REVOKE ALL ON FUNCTION public.passport_progress_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.passport_progress_v1(uuid) TO service_role;

-- Reconciliation is the single award boundary. Return complete display data
-- for immediate in-app toasts and append an idempotent Activity row for each
-- newly earned stamp.
CREATE OR REPLACE FUNCTION public.reconcile_my_passport_v1()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
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

  INSERT INTO public.notifications (
    user_id, actor_id, body, type, kind, data, event_key
  )
  SELECT
    v_actor,
    NULL,
    concat('Passport stamp earned: ',
      CASE
        WHEN d.metric = 'combination' THEN concat_ws(' · ', s.name, t.name)
        ELSE d.threshold::text || ' ' ||
          CASE WHEN d.threshold = 1 THEN regexp_replace(d.unit, 's$', '') ELSE d.unit END
      END,
      ' · +', d.points, ' pts'),
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
REVOKE ALL ON FUNCTION public.reconcile_my_passport_v1() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_my_passport_v1() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_my_passport_v1()
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  -- Reconcile in its own statement: a single SQL statement takes one snapshot
  -- under READ COMMITTED, so a same-statement reconcile's inserted awards and
  -- updated points would read back stale. plpgsql runs each statement on a
  -- fresh snapshot, so the fetch below always sees what reconcile just wrote.
  PERFORM public.reconcile_my_passport_v1();
  RETURN (
    WITH rows AS (
      SELECT d.id,d.key,d.series,d.metric,d.threshold,d.points,d.title,d.unit,d.hint,d.artwork_key,
        CASE WHEN d.metric='combination' THEN concat_ws(' · ',s.name,t.name)
          ELSE d.threshold::text || ' ' || CASE WHEN d.threshold=1 THEN regexp_replace(d.unit,'s$','') ELSE d.unit END
        END AS label,
        p.progress,(a.id IS NOT NULL AND a.revoked_at IS NULL) earned,a.awarded_at,d.display_order,d.subject_a,d.subject_b
      FROM public.passport_definitions d
      JOIN public.passport_progress_v1(auth.uid()) p ON p.definition_id=d.id
      LEFT JOIN public.passport_awards a ON a.definition_id=d.id AND a.profile_id=auth.uid()
      LEFT JOIN public.spirits s ON d.metric='combination' AND s.id=d.subject_a
      LEFT JOIN public.types t ON d.metric='combination' AND t.id=d.subject_b
      WHERE d.enabled
    ) SELECT jsonb_build_object(
      'points',(SELECT passport_points FROM public.profiles WHERE id=auth.uid()),
      'stamps',coalesce(jsonb_agg(to_jsonb(rows) ORDER BY display_order),'[]'::jsonb)
    ) FROM rows
  );
END; $$;
REVOKE ALL ON FUNCTION public.get_my_passport_v1() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_passport_v1() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
