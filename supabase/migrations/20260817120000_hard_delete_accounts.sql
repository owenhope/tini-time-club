BEGIN;

-- Locations are shared place records and may be referenced by other members'
-- reviews. Keep the place, but erase its association with a deleted account.
ALTER TABLE public.locations
  ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.locations
  DROP CONSTRAINT IF EXISTS locations_created_by_fkey;

ALTER TABLE public.locations
  ADD CONSTRAINT locations_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Reviews are user-generated content and must disappear with the account.
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_user_id_fkey1;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_user_id_fkey1
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Called only by the account-deletion Edge Function using the service role.
-- Storage and the Auth record are deliberately handled by that function; this
-- transaction removes every live public-schema record containing the member's
-- content or identity before auth.admin.deleteUser is attempted.
CREATE OR REPLACE FUNCTION public.delete_account_data(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Reports can retain snapshots after their source is removed, so delete them
  -- before comments and reviews apply their ON DELETE SET NULL constraints.
  DELETE FROM public.reports
  WHERE reporter_id = p_user_id
     OR creator_id = p_user_id
     OR review_id IN (
       SELECT id FROM public.reviews WHERE user_id = p_user_id
     )
     OR comment_id IN (
       SELECT id FROM public.comments WHERE user_id = p_user_id
     );

  -- Comments on reviews owned by other members are not reached by deleting the
  -- member's reviews, so remove those explicitly.
  DELETE FROM public.comments WHERE user_id = p_user_id;
  DELETE FROM public.reviews WHERE user_id = p_user_id;

  -- Remove both received activity and activity generated for other members.
  -- Push tickets, receipts, and withdrawals cascade from these rows.
  DELETE FROM public.notifications
  WHERE user_id = p_user_id OR actor_id = p_user_id;

  -- Profile-linked rows (follows, likes, blocks, memberships, and remaining
  -- reports) cascade from the profile. Auth-linked analytics and push tokens
  -- cascade when the Edge Function deletes auth.users.
  DELETE FROM public.profiles WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_account_data(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_account_data(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_account_data(uuid) TO service_role;

COMMIT;
