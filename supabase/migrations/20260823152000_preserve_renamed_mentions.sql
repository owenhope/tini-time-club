-- A selected mention stores the username shown at selection time. Preserve
-- that identity-bound snapshot when an author edits their caption after the
-- mentioned member renames their account.

BEGIN;

CREATE OR REPLACE FUNCTION public.replace_review_mentions_v1(
  p_review_id bigint,
  p_body text,
  p_mentions jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_item record;
  v_old_mentions jsonb;
  v_old_targets uuid[];
  v_result jsonb := '[]'::jsonb;
  v_target_id uuid;
  v_target_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF v_actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.reviews review
    WHERE review.id = p_review_id AND review.user_id = v_actor_id
  ) THEN
    RAISE EXCEPTION 'The review is unavailable' USING ERRCODE = '42501';
  END IF;
  IF char_length(COALESCE(p_body, '')) > 500 THEN
    RAISE EXCEPTION 'Review captions are limited to 500 characters'
      USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(COALESCE(p_mentions, '[]'::jsonb)) <> 'array'
     OR jsonb_array_length(COALESCE(p_mentions, '[]'::jsonb)) > 25 THEN
    RAISE EXCEPTION 'Mention payload is invalid' USING ERRCODE = '22023';
  END IF;

  SELECT
    COALESCE(
      jsonb_agg(jsonb_build_object(
        'profile_id', mention.mentioned_profile_id,
        'username', mention.username_snapshot
      )),
      '[]'::jsonb
    ),
    COALESCE(
      array_agg(DISTINCT mention.mentioned_profile_id)
        FILTER (WHERE mention.mentioned_profile_id IS NOT NULL),
      ARRAY[]::uuid[]
    )
  INTO v_old_mentions, v_old_targets
  FROM public.review_mentions mention
  WHERE mention.review_id = p_review_id;

  DELETE FROM public.review_mentions WHERE review_id = p_review_id;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(COALESCE(p_mentions, '[]'::jsonb))
      AS item(profile_id text, username text, start integer, length integer)
    ORDER BY start
  LOOP
    SELECT target.id INTO v_target_id
    FROM public.profiles target
    WHERE target.id::text = v_item.profile_id
      AND public.mention_target_is_eligible(v_actor_id, target.id)
      AND (
        lower(target.username) = lower(v_item.username)
        OR EXISTS (
          SELECT 1
          FROM jsonb_to_recordset(v_old_mentions)
            AS old(profile_id text, username text)
          WHERE old.profile_id = target.id::text
            AND old.username = v_item.username
        )
      )
      AND v_item.username ~ '^[A-Za-z0-9_]{3,20}$'
      AND v_item.length = char_length(v_item.username) + 1
      AND public.mention_token_matches_utf16(
        p_body, v_item.start, '@' || v_item.username, v_item.length
      );

    IF v_target_id IS NULL THEN CONTINUE; END IF;
    IF NOT v_target_id = ANY(v_target_ids) THEN
      IF cardinality(v_target_ids) >= 5 THEN CONTINUE; END IF;
      v_target_ids := array_append(v_target_ids, v_target_id);
    END IF;

    BEGIN
      INSERT INTO public.review_mentions (
        review_id, mentioned_profile_id, username_snapshot,
        start_offset, token_length, created_by
      ) VALUES (
        p_review_id, v_target_id, v_item.username,
        v_item.start, v_item.length, v_actor_id
      );
      v_result := v_result || jsonb_build_array(jsonb_build_object(
        'profileId', v_target_id,
        'username', v_item.username,
        'start', v_item.start,
        'length', v_item.length
      ));
    EXCEPTION WHEN unique_violation OR check_violation THEN
      CONTINUE;
    END;
  END LOOP;

  FOREACH v_target_id IN ARRAY v_target_ids LOOP
    PERFORM public.enqueue_mention_once(
      'review', p_review_id, v_actor_id, v_target_id, p_review_id, NULL
    );
  END LOOP;

  FOREACH v_target_id IN ARRAY v_old_targets LOOP
    IF NOT v_target_id = ANY(v_target_ids) THEN
      INSERT INTO public.activity_withdrawals (notification_id, user_id, reason)
      SELECT notification.id, notification.user_id, 'action_undone'
      FROM public.notifications notification
      WHERE notification.event_key = concat(
        'mention:review:', p_review_id, ':', v_target_id
      )
      ON CONFLICT (notification_id) DO UPDATE
      SET reason = EXCLUDED.reason, withdrawn_at = now();
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_review_mentions_v1(bigint, text, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_review_mentions_v1(bigint, text, jsonb)
  TO authenticated, service_role;

COMMIT;
