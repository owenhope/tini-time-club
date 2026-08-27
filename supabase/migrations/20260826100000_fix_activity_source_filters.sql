BEGIN;

-- Older notification rows predate actor_id being populated. The legacy event
-- key still contains the actor, so restore that identity before the Activity
-- projection applies its actor filter.
UPDATE public.notifications n
SET actor_id = split_part(n.event_key, ':', 3)::uuid
WHERE n.kind = 'review_liked'
  AND n.actor_id IS NULL
  AND n.event_key ~ '^like:[0-9]+:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND EXISTS (
    SELECT 1
    FROM public.profiles actor
    WHERE actor.id = split_part(n.event_key, ':', 3)::uuid
  );

-- Keep the four Activity RPCs on the same source-eligibility rules. The
-- existing functions are redefined from their installed bodies so this
-- migration stays small while preserving all unrelated query behavior.
DO $$
DECLARE
  v_function_name text;
  v_function_definition text;
BEGIN
  FOREACH v_function_name IN ARRAY ARRAY[
    'get_activity_page',
    'get_activity_unseen_count',
    'mark_activity_seen_through',
    'mark_activity_read'
  ] LOOP
    SELECT pg_get_functiondef(p.oid)
    INTO v_function_definition
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = v_function_name;

    IF v_function_definition IS NULL THEN
      RAISE EXCEPTION 'Activity function % was not found', v_function_name;
    END IF;

    v_function_definition := replace(
      v_function_definition,
      'n.kind = ''admin_message''',
      'n.kind IN (''admin_message'', ''user_followed'')'
    );
    v_function_definition := replace(
      v_function_definition,
      'n.kind = ''review_liked''',
      'n.kind IN (''review_liked'', ''mentioned_in_review'')'
    );

    EXECUTE v_function_definition;
  END LOOP;
END;
$$;

COMMIT;
