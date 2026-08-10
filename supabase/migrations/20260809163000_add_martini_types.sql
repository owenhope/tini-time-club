WITH desired_types(name) AS (
  VALUES
    ('Classic'),
    ('Dry'),
    ('Filthy'),
    ('50/50')
)
INSERT INTO public.types (name)
SELECT desired_types.name
FROM desired_types
WHERE NOT EXISTS (
  SELECT 1
  FROM public.types existing
  WHERE lower(trim(existing.name)) = lower(trim(desired_types.name))
);
