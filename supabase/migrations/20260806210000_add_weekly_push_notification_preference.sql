ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weekly_push_notifications_enabled boolean;

UPDATE public.profiles
SET weekly_push_notifications_enabled = true
WHERE weekly_push_notifications_enabled IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN weekly_push_notifications_enabled SET DEFAULT true,
  ALTER COLUMN weekly_push_notifications_enabled SET NOT NULL;

COMMENT ON COLUMN public.profiles.weekly_push_notifications_enabled IS
  'Whether the member is subscribed to the weekly Tini Time push reminder. Existing members were grandfathered in as enabled.';
