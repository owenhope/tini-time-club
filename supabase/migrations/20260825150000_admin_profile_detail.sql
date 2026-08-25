-- Fetch auth metadata for one admin profile without listing every auth user.

CREATE OR REPLACE FUNCTION public.get_admin_profile_detail(
  p_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT CASE WHEN profile.id IS NULL THEN NULL ELSE jsonb_build_object(
    'id', profile.id,
    'username', profile.username,
    'name', profile.name,
    'avatar_url', profile.avatar_url,
    'is_verified', profile.is_verified,
    'deleted', profile.deleted,
    'deleted_at', profile.deleted_at,
    'review_count', profile.review_count,
    'bio', profile.bio,
    'email', auth_user.email,
    'created_at', auth_user.created_at,
    'last_sign_in_at', auth_user.last_sign_in_at
  ) END
  FROM public.profiles profile
  JOIN auth.users auth_user ON auth_user.id = profile.id
  WHERE profile.id = p_id;
$$;

GRANT ALL ON FUNCTION public.get_admin_profile_detail(uuid)
  TO service_role;
