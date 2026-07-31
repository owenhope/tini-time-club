ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bio_length_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT bio_length_check
      CHECK (bio IS NULL OR length(bio) <= 150);
  END IF;
END
$$;

COMMENT ON COLUMN public.profiles.bio IS
  'User biography (max 150 characters)';

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS place_id text;

COMMENT ON COLUMN public.locations.place_id IS
  'Google Places API place_id for location matching';

CREATE UNIQUE INDEX IF NOT EXISTS locations_place_id_unique_idx
  ON public.locations (place_id)
  WHERE place_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
