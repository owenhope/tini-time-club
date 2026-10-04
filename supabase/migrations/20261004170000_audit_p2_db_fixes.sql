-- Audit P2 database fixes (BUG_AUDIT_2026-10-03.md, items 27, 28, 35, 36, 37).

BEGIN;

-- ── 27. Blocks are enforced on follows and likes ────────────────────────────
-- Neither member of a block can follow or like the other, follower lists hide
-- rows involving a blocked member, and a new block removes follows both ways.

DROP POLICY IF EXISTS "Allow inserting own follower" ON public.followers;
CREATE POLICY "Allow inserting own follower"
  ON public.followers FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = follower_id
    AND follower_id <> following_id
    AND public.is_member_visible(following_id)
  );

DROP POLICY IF EXISTS "Authenticated users can read followers" ON public.followers;
CREATE POLICY "Authenticated users can read followers"
  ON public.followers FOR SELECT TO authenticated
  USING (
    public.is_member_visible(follower_id)
    AND public.is_member_visible(following_id)
  );

DROP POLICY IF EXISTS "Allow insert likes" ON public.likes;
CREATE POLICY "Allow insert likes"
  ON public.likes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.id = review_id
        AND public.is_member_visible(r.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can like as themselves" ON public.comment_likes;
CREATE POLICY "Users can like as themselves"
  ON public.comment_likes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.comments c
      WHERE c.id = comment_id
        AND public.is_member_visible(c.user_id)
    )
  );

CREATE OR REPLACE FUNCTION public.remove_follows_on_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.followers
  WHERE (follower_id = NEW.blocker_id AND following_id = NEW.blocked_id)
     OR (follower_id = NEW.blocked_id AND following_id = NEW.blocker_id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_follows_on_block() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS remove_follows_on_block_insert ON public.blocks;
CREATE TRIGGER remove_follows_on_block_insert
AFTER INSERT ON public.blocks
FOR EACH ROW EXECUTE FUNCTION public.remove_follows_on_block();

-- ── 28. Share stamps count distinct reviews actually shared ─────────────────
-- log_review_share still records every event for analytics; passport progress
-- now counts each review once, and only completed outcomes ('previewed',
-- 'started', 'unavailable' and 'failed' don't count). Awards already earned
-- are kept: reconciliation only inserts awards, it never revokes them.

CREATE OR REPLACE FUNCTION public.passport_progress_v1(p_profile_id uuid)
RETURNS TABLE (definition_id uuid, progress integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT d.id,
    CASE d.metric
      WHEN 'locations' THEN (SELECT count(DISTINCT r.location)::integer FROM public.reviews r WHERE r.user_id=p_profile_id AND r.state=1 AND r.location IS NOT NULL)
      WHEN 'martinis' THEN (SELECT count(*)::integer FROM public.reviews r WHERE r.user_id=p_profile_id AND r.state=1)
      WHEN 'combination' THEN (SELECT count(*)::integer FROM public.reviews r WHERE r.user_id=p_profile_id AND r.state=1 AND r.spirit=d.subject_a AND r.type=d.subject_b)
      WHEN 'type_reviews' THEN (SELECT count(*)::integer FROM public.reviews r WHERE r.user_id=p_profile_id AND r.state=1 AND r.type=d.subject_a)
      WHEN 'spirit_reviews' THEN (SELECT count(*)::integer FROM public.reviews r WHERE r.user_id=p_profile_id AND r.state=1 AND r.spirit=d.subject_a)
      WHEN 'regulars' THEN (SELECT count(*)::integer FROM public.regular_memberships m WHERE m.profile_id=p_profile_id)
      WHEN 'comments' THEN (SELECT count(*)::integer FROM public.comments c WHERE c.user_id=p_profile_id)
      WHEN 'likes_received' THEN (SELECT count(*)::integer FROM public.likes l JOIN public.reviews r ON r.id=l.review_id WHERE r.user_id=p_profile_id AND r.state=1)
      WHEN 'shares' THEN (SELECT count(DISTINCT s.review_id)::integer FROM public.review_share_events s WHERE s.user_id=p_profile_id AND s.outcome IN ('opened', 'copied', 'shared', 'completed'))
      WHEN 'profile_photo' THEN (SELECT CASE WHEN p.avatar_url IS NOT NULL THEN 1 ELSE 0 END FROM public.profiles p WHERE p.id=p_profile_id)
      WHEN 'favorite_location' THEN (SELECT CASE WHEN p.favorite_location_id IS NOT NULL THEN 1 ELSE 0 END FROM public.profiles p WHERE p.id=p_profile_id)
      WHEN 'taste_profile' THEN (SELECT CASE WHEN jsonb_array_length(public.normalize_favorite_ids(p.favorite_spirits)) > 0 AND jsonb_array_length(public.normalize_favorite_ids(p.favorite_types)) > 0 THEN 1 ELSE 0 END FROM public.profiles p WHERE p.id=p_profile_id)
      WHEN 'bio' THEN (SELECT CASE WHEN length(trim(coalesce(p.bio, ''))) > 0 THEN 1 ELSE 0 END FROM public.profiles p WHERE p.id=p_profile_id)
    END
  FROM public.passport_definitions d WHERE d.enabled;
$$;
REVOKE ALL ON FUNCTION public.passport_progress_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.passport_progress_v1(uuid) TO service_role;

-- ── 35. Location merges don't spam Regular notifications ────────────────────
-- merge_locations_v1 sets ttc.suppress_regular_refresh for its transaction.
-- The per-row review trigger skips its refresh, and Regular joined/left
-- notifications are dropped before insert (so no push webhook fires) while the
-- merge recomputes the canonical location once.

CREATE OR REPLACE FUNCTION public.refresh_regulars_after_review_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('ttc.suppress_regular_refresh', true) = 'on' THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_regular_memberships(OLD.location);
  ELSIF TG_OP = 'UPDATE' AND OLD.location IS DISTINCT FROM NEW.location THEN
    PERFORM public.refresh_regular_memberships(OLD.location);
    PERFORM public.refresh_regular_memberships(NEW.location);
  ELSE
    PERFORM public.refresh_regular_memberships(NEW.location);
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_regulars_after_review_change() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.suppress_regular_notifications_during_merge()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_setting('ttc.suppress_regular_refresh', true) = 'on' THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.suppress_regular_notifications_during_merge()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS suppress_regular_notifications_during_merge
  ON public.notifications;
CREATE TRIGGER suppress_regular_notifications_during_merge
BEFORE INSERT ON public.notifications
FOR EACH ROW
WHEN (NEW.kind IN ('regular_joined', 'regular_left'))
EXECUTE FUNCTION public.suppress_regular_notifications_during_merge();

CREATE OR REPLACE FUNCTION public.merge_locations_v1(
  p_duplicate_id bigint,
  p_canonical_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_duplicate_claim public.location_claims%ROWTYPE;
  v_keep_claim uuid;
  v_canonical_verified uuid;
  v_duplicate_verified public.location_verifications%ROWTYPE;
  v_duplicate_manager public.location_managers%ROWTYPE;
BEGIN
  IF p_duplicate_id = p_canonical_id THEN
    RAISE EXCEPTION 'A location cannot be merged into itself' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.locations WHERE id = p_canonical_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Canonical location does not exist' USING ERRCODE = '23503'; END IF;
  PERFORM 1 FROM public.locations WHERE id = p_duplicate_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Duplicate location does not exist' USING ERRCODE = '23503'; END IF;

  -- Preserve the oldest pending claim for each requester and supersede the
  -- later one before moving the duplicate location's rows.
  FOR v_duplicate_claim IN
    SELECT duplicate_claim.*
    FROM public.location_claims duplicate_claim
    WHERE duplicate_claim.location_id = p_duplicate_id
      AND duplicate_claim.status = 'pending'
      AND EXISTS (
        SELECT 1 FROM public.location_claims canonical_claim
        WHERE canonical_claim.location_id = p_canonical_id
          AND canonical_claim.requester_profile_id = duplicate_claim.requester_profile_id
          AND canonical_claim.status = 'pending'
      )
    ORDER BY duplicate_claim.requester_profile_id, duplicate_claim.submitted_at, duplicate_claim.id
    FOR UPDATE
  LOOP
    SELECT c.id INTO v_keep_claim
    FROM public.location_claims c
    WHERE c.location_id IN (p_duplicate_id, p_canonical_id)
      AND c.requester_profile_id = v_duplicate_claim.requester_profile_id
      AND c.status = 'pending'
    ORDER BY c.submitted_at, c.id
    LIMIT 1;
    IF v_keep_claim <> v_duplicate_claim.id THEN
      UPDATE public.location_claims
      SET status = 'superseded', decided_at = now(), superseded_by_claim_id = v_keep_claim
      WHERE id = v_duplicate_claim.id;
    ELSE
      UPDATE public.location_claims canonical_claim
      SET status = 'superseded', decided_at = now(), superseded_by_claim_id = v_duplicate_claim.id
      WHERE canonical_claim.location_id = p_canonical_id
        AND canonical_claim.requester_profile_id = v_duplicate_claim.requester_profile_id
        AND canonical_claim.status = 'pending';
    END IF;
  END LOOP;
  UPDATE public.location_claims SET location_id = p_canonical_id
  WHERE location_id = p_duplicate_id;

  SELECT id INTO v_canonical_verified FROM public.location_verifications
  WHERE location_id = p_canonical_id AND revoked_at IS NULL LIMIT 1;
  FOR v_duplicate_verified IN
    SELECT * FROM public.location_verifications
    WHERE location_id = p_duplicate_id ORDER BY verified_at, id FOR UPDATE
  LOOP
    IF v_canonical_verified IS NOT NULL AND v_duplicate_verified.revoked_at IS NULL THEN
      UPDATE public.location_verifications
      SET revoked_at = now(), revocation_reason = 'location_merge'
      WHERE id = v_duplicate_verified.id;
    END IF;
    UPDATE public.location_verifications SET location_id = p_canonical_id
    WHERE id = v_duplicate_verified.id;
    IF v_canonical_verified IS NULL AND v_duplicate_verified.revoked_at IS NULL THEN
      v_canonical_verified := v_duplicate_verified.id;
    END IF;
  END LOOP;

  FOR v_duplicate_manager IN
    SELECT duplicate_manager.* FROM public.location_managers duplicate_manager
    WHERE duplicate_manager.location_id = p_duplicate_id
      AND duplicate_manager.status = 'active'
      AND EXISTS (
        SELECT 1 FROM public.location_managers canonical_manager
        WHERE canonical_manager.location_id = p_canonical_id
          AND canonical_manager.profile_id = duplicate_manager.profile_id
          AND canonical_manager.status = 'active'
      )
    ORDER BY duplicate_manager.added_at, duplicate_manager.id FOR UPDATE
  LOOP
    UPDATE public.location_managers
    SET status = 'removed', removed_at = now(), removal_reason = 'location_merge'
    WHERE id = v_duplicate_manager.id;
  END LOOP;
  UPDATE public.location_managers SET location_id = p_canonical_id
  WHERE location_id = p_duplicate_id;

  -- Moving reviews row by row would refresh Regulars after every row and send
  -- members a burst of bogus joined/left notifications. Skip the per-row
  -- refresh and recompute the canonical location once, silently, below.
  PERFORM set_config('ttc.suppress_regular_refresh', 'on', true);
  UPDATE public.reviews SET location = p_canonical_id WHERE location = p_duplicate_id;
  UPDATE public.profiles SET favorite_location_id = p_canonical_id
  WHERE favorite_location_id = p_duplicate_id;
  UPDATE public.notifications notification
  SET data = jsonb_set(
    jsonb_set(notification.data, '{locationId}', to_jsonb(p_canonical_id), false),
    '{url}', to_jsonb('/places/' || p_canonical_id::text), false
  )
  WHERE notification.data ->> 'locationId' = p_duplicate_id::text;
  IF to_regclass('public.regular_memberships') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.regular_memberships WHERE location_id = $1' USING p_duplicate_id;
  END IF;
  DELETE FROM public.locations WHERE id = p_duplicate_id;

  -- Recompute with whatever Regulars rule refresh_regular_memberships
  -- implements; the flag drops its joined/left notifications before insert.
  PERFORM public.refresh_regular_memberships(p_canonical_id);
  PERFORM set_config('ttc.suppress_regular_refresh', 'off', true);

  -- The canonical location's reviewer set changed; rebuild Golden Glass now
  -- instead of waiting for the daily refresh.
  PERFORM public.refresh_golden_glass_v1();

  RETURN jsonb_build_object('duplicateId', p_duplicate_id, 'canonicalId', p_canonical_id);
END;
$$;

REVOKE ALL ON FUNCTION public.merge_locations_v1(bigint, bigint)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.merge_locations_v1(bigint, bigint) TO service_role;

-- ── 36. Push tokens can't be taken over ─────────────────────────────────────
-- An existing token row moves only when the caller already owns it or it
-- belongs to the same installation (an account switch on one device).

CREATE OR REPLACE FUNCTION public.register_push_token(
  p_token text,
  p_installation_id uuid,
  p_platform text,
  p_app_environment text DEFAULT 'production'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_token !~ '^(ExponentPushToken|ExpoPushToken)\[[^]]+\]$' THEN
    RAISE EXCEPTION 'Invalid Expo push token';
  END IF;

  IF p_platform NOT IN ('ios', 'android') THEN
    RAISE EXCEPTION 'Unsupported push platform';
  END IF;

  DELETE FROM public.push_tokens
  WHERE installation_id = p_installation_id
    AND expo_push_token <> p_token;

  INSERT INTO public.push_tokens (
    expo_push_token,
    installation_id,
    user_id,
    platform,
    app_environment,
    updated_at,
    last_error
  ) VALUES (
    p_token,
    p_installation_id,
    v_user_id,
    p_platform,
    COALESCE(NULLIF(p_app_environment, ''), 'production'),
    now(),
    NULL
  )
  ON CONFLICT (expo_push_token) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    installation_id = EXCLUDED.installation_id,
    platform = EXCLUDED.platform,
    app_environment = EXCLUDED.app_environment,
    updated_at = now(),
    last_error = NULL
  WHERE push_tokens.user_id = EXCLUDED.user_id
     OR push_tokens.installation_id = EXCLUDED.installation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_push_token(text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_token(text, uuid, text, text) TO authenticated;

-- ── 37. handle_new_user pins its search_path ────────────────────────────────
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;

NOTIFY pgrst, 'reload schema';

COMMIT;
