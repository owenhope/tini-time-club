-- One-time assignment for the existing admin profiles. Verification remains
-- attached to each profile id if either username changes later.
UPDATE public.profiles
SET is_verified = true
WHERE lower(username) IN ('odope', 'anothertest');
