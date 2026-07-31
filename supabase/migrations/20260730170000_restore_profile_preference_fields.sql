ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS favorite_spirits jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS favorite_types jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.name IS
  'Display name for the user profile';

COMMENT ON COLUMN public.profiles.favorite_spirits IS
  'Array of favorite spirit IDs stored as JSONB';

COMMENT ON COLUMN public.profiles.favorite_types IS
  'Array of favorite cocktail type IDs stored as JSONB';

NOTIFY pgrst, 'reload schema';
