-- New regions should remain off until an operator confirms the region has
-- enough qualifying review coverage in the admin readiness view.

ALTER TABLE public.regions
  ALTER COLUMN enabled SET DEFAULT false;
