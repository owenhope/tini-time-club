BEGIN;

-- Existing clients use ON CONFLICT DO UPDATE when liking a review. A stale
-- has_liked value must not make an already-owned like fail the UPDATE RLS check.
GRANT UPDATE ON TABLE public.likes TO authenticated;

CREATE POLICY "Users can update their own review likes"
  ON public.likes FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMIT;
