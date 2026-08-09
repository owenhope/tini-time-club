BEGIN;

-- Supabase upsert uses ON CONFLICT DO UPDATE, so liking requires UPDATE even
-- when the row does not exist yet. Keep that privilege scoped to each user's
-- own likes through RLS.
GRANT UPDATE ON TABLE public.comment_likes TO authenticated;

CREATE POLICY "Users can update their own comment likes"
  ON public.comment_likes FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMIT;
