-- Welcome comment on a member's first review.
--
-- When a member publishes their first review, a short comment from the club
-- account (configured in club_welcome_settings) is queued for 5-15 minutes
-- later, so it reads like someone noticed rather than an instant bot reply.
-- A pg_cron job posts due comments every minute; the existing comment
-- trigger then notifies the member like any other comment.
--
-- Copy follows the voice of the club's verified members: short, dry, martini
-- slang, no emojis, and "Welcome to the club" only some of the time.
--
-- Safety:
-- - The queue trigger swallows its own errors, so it can never block a review
--   from publishing.
-- - Each member is welcomed at most once (queue keyed by member).
-- - Nothing posts if the review was removed or hidden, the member was
--   deleted, either side blocked the other, or the club already commented.
-- - With no club account configured, nothing is queued (e.g. the dev branch).

BEGIN;

CREATE TABLE IF NOT EXISTS public.club_welcome_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  account_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.club_welcome_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.club_welcome_settings FROM PUBLIC, anon, authenticated;

-- Seed with the club account where it exists (production). Other environments
-- stay unconfigured until an operator sets account_id.
INSERT INTO public.club_welcome_settings (id, account_id)
SELECT true, p.id
FROM public.profiles p
WHERE p.username = 'Tini Time Club'
ORDER BY p.id
LIMIT 1
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.club_welcome_queue (
  user_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  review_id bigint NOT NULL,
  due_at timestamptz NOT NULL,
  processed_at timestamptz,
  comment_id integer,
  skipped_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS club_welcome_queue_due_idx
  ON public.club_welcome_queue (due_at)
  WHERE processed_at IS NULL;

ALTER TABLE public.club_welcome_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.club_welcome_queue FROM PUBLIC, anon, authenticated;

-- Picks the comment text for a review. Low scores get their own pool, so the
-- club never says "Excellent choice" about a bad pour; everything else draws
-- from the general pool plus any lines that match the style, spirit, score
-- or bar.
CREATE OR REPLACE FUNCTION public.club_welcome_comment_body(p_review_id bigint)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_overall numeric;
  v_type text;
  v_spirit text;
  v_bar text;
  v_lines text[];
BEGIN
  SELECT
    (COALESCE(r.taste, 0) + COALESCE(r.presentation, 0)) / 2.0,
    lower(t.name),
    lower(s.name),
    NULLIF(btrim(l.name), '')
  INTO v_overall, v_type, v_spirit, v_bar
  FROM public.reviews r
  LEFT JOIN public.types t ON t.id = r.type
  LEFT JOIN public.spirits s ON s.id = r.spirit
  LEFT JOIN public.locations l ON l.id = r.location
  WHERE r.id = p_review_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_overall < 3 THEN
    v_lines := ARRAY[
      'Not every pour is a winner. The next one will be colder',
      'Rough first round, but thanks for telling it straight',
      'Honest reviews are the best reviews. Welcome to the club',
      'That one sounds like a lesson learned',
      'Better luck next round',
      'Thanks for taking one for the team',
      'Noted. We will steer clear',
      'Can''t win them all. Welcome to the club'
    ];
  ELSE
    v_lines := ARRAY[
      'First tini on the record. Welcome to the club',
      'And so it begins',
      'One down, many more to go',
      'The first of many, we hope',
      'Look who just joined the club',
      'Glad you''re here. Cheers to the first of many',
      'A very respectable opening pour',
      'Now we''re talking',
      'Your first review and it''s a good one',
      'Officially part of the club now',
      'Excellent choice',
      'Cheers to that',
      'Welcome in. Pull up a stool',
      'First round''s on the record'
    ];

    IF v_bar IS NOT NULL THEN
      v_lines := v_lines || ARRAY[
        v_bar || ' for the first one. Excellent choice',
        'Starting things off at ' || v_bar || '. Welcome to the club',
        v_bar || ' is a solid place to start',
        'Noted: ' || v_bar || '. We''ll be checking it out'
      ];
    END IF;

    IF v_overall >= 4.5 THEN
      v_lines := v_lines || ARRAY[
        'What a first pour',
        'Setting the bar high on day one',
        'That''s a hard one to top. Welcome to the club'
      ];
      IF v_bar IS NOT NULL THEN
        v_lines := v_lines || ('Starting strong at ' || v_bar);
      ELSE
        v_lines := v_lines || 'Starting strong'::text;
      END IF;
    END IF;

    v_lines := v_lines || CASE v_type
      WHEN 'dirty' THEN ARRAY[
        'Starting dirty. Excellent choice',
        'Dirty out of the gate. We respect it',
        'Olives on day one. Welcome to the club'
      ]
      WHEN 'filthy' THEN ARRAY[
        'Starting filthy. Excellent choice',
        'Filthy on the first try. Respect',
        'The filthier the better'
      ]
      WHEN 'espresso' THEN ARRAY[
        'An espresso tini to kick things off',
        'Espresso tini. Clearly a night is happening'
      ]
      WHEN 'gibson' THEN ARRAY[
        'A Gibson first. Respect',
        'Onions over olives. Bold opening'
      ]
      WHEN 'twist' THEN ARRAY[
        'Starting with a twist. Classy',
        'A twist to start. Very elegant'
      ]
      WHEN 'dry' THEN ARRAY['Bone dry to start. Respect']
      WHEN '50/50' THEN ARRAY['A 50/50 to start. Very civilised']
      WHEN 'classic' THEN ARRAY['Keeping it classic. Excellent choice']
      ELSE ARRAY[]::text[]
    END;

    v_lines := v_lines || CASE v_spirit
      WHEN 'vesper' THEN ARRAY['A Vesper on day one. Bold']
      WHEN 'gin' THEN ARRAY['Gin from the start. Respect']
      ELSE ARRAY[]::text[]
    END;
  END IF;

  RETURN v_lines[1 + floor(random() * array_length(v_lines, 1))::int];
END;
$$;

REVOKE ALL ON FUNCTION public.club_welcome_comment_body(bigint)
  FROM PUBLIC, anon, authenticated;

-- Queues the welcome when a member publishes their first review.
CREATE OR REPLACE FUNCTION public.queue_club_welcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  BEGIN
    SELECT account_id INTO v_account_id
    FROM public.club_welcome_settings
    WHERE enabled;

    IF v_account_id IS NULL OR NEW.user_id = v_account_id THEN
      RETURN NEW;
    END IF;

    -- First review ever, including any the member later deleted.
    IF EXISTS (
      SELECT 1 FROM public.reviews
      WHERE user_id = NEW.user_id AND id <> NEW.id
    ) THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.club_welcome_queue (user_id, review_id, due_at)
    VALUES (
      NEW.user_id,
      NEW.id,
      now() + make_interval(secs => 300 + floor(random() * 600)::int)
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'queue_club_welcome failed for review %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_club_welcome()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS queue_club_welcome_on_review_insert ON public.reviews;
CREATE TRIGGER queue_club_welcome_on_review_insert
AFTER INSERT ON public.reviews
FOR EACH ROW
WHEN (NEW.state = 1)
EXECUTE FUNCTION public.queue_club_welcome();

-- Posts every due welcome. Run by pg_cron each minute; safe to run in
-- parallel or by hand. Returns the number of comments posted.
CREATE OR REPLACE FUNCTION public.post_due_club_welcomes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
  v_item record;
  v_reason text;
  v_body text;
  v_comment_id integer;
  v_posted integer := 0;
BEGIN
  SELECT account_id INTO v_account_id
  FROM public.club_welcome_settings
  WHERE enabled;

  IF v_account_id IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_item IN
    SELECT q.user_id, q.review_id
    FROM public.club_welcome_queue q
    WHERE q.processed_at IS NULL AND q.due_at <= now()
    ORDER BY q.due_at
    LIMIT 50
    FOR UPDATE SKIP LOCKED
  LOOP
    v_reason := NULL;
    v_comment_id := NULL;

    IF NOT EXISTS (
      SELECT 1 FROM public.reviews
      WHERE id = v_item.review_id AND user_id = v_item.user_id AND state = 1
    ) THEN
      v_reason := 'review_unavailable';
    ELSIF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = v_item.user_id AND COALESCE(deleted, false)
    ) THEN
      v_reason := 'member_deleted';
    ELSIF public.push_users_are_blocked(v_account_id, v_item.user_id) THEN
      v_reason := 'blocked';
    ELSIF EXISTS (
      SELECT 1 FROM public.comments
      WHERE review_id = v_item.review_id AND user_id = v_account_id
    ) THEN
      v_reason := 'already_commented';
    ELSE
      v_body := public.club_welcome_comment_body(v_item.review_id);
      IF v_body IS NULL THEN
        v_reason := 'review_unavailable';
      ELSE
        INSERT INTO public.comments (user_id, review_id, body)
        VALUES (v_account_id, v_item.review_id, v_body)
        RETURNING id INTO v_comment_id;
        v_posted := v_posted + 1;
      END IF;
    END IF;

    UPDATE public.club_welcome_queue
    SET processed_at = now(),
        comment_id = v_comment_id,
        skipped_reason = v_reason
    WHERE user_id = v_item.user_id;
  END LOOP;

  RETURN v_posted;
END;
$$;

REVOKE ALL ON FUNCTION public.post_due_club_welcomes()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.post_due_club_welcomes() TO service_role;

COMMIT;

-- Scheduling lives outside the transaction: enabling pg_cron is a no-op where
-- the extension is unavailable (local stacks), keeping the migration portable.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
    PERFORM cron.schedule(
      'club-welcome-comments',
      '* * * * *',
      'SELECT public.post_due_club_welcomes()'
    );
  END IF;
END;
$$;
