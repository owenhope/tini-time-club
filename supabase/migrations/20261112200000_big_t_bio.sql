UPDATE public.profiles
SET bio = 'Master of Martinis'
WHERE id = 'c74ac2d4-e405-4b2d-a14c-813b7be780e1'
  AND bio IS DISTINCT FROM 'Master of Martinis';
