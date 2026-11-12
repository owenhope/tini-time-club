UPDATE public.profiles
SET username = 'Tini Time Club', name = 'Tini Time Club'
WHERE id = 'c74ac2d4-e405-4b2d-a14c-813b7be780e1'
  AND (username IS DISTINCT FROM 'Tini Time Club' OR name IS DISTINCT FROM 'Tini Time Club');
