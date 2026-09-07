BEGIN;

-- Catalog names were seeded inconsistently ("twist", "vodka" next to
-- "Classic", "Gibson"). Display uses these verbatim, so capitalize the
-- first letter everywhere ("50/50" is naturally untouched). App-side
-- matching (reviewOptions, martini-index search) is case-insensitive.
UPDATE public.types
SET name = upper(left(name, 1)) || right(name, -1)
WHERE name IS NOT NULL
  AND name <> upper(left(name, 1)) || right(name, -1);

UPDATE public.spirits
SET name = upper(left(name, 1)) || right(name, -1)
WHERE name IS NOT NULL
  AND name <> upper(left(name, 1)) || right(name, -1);

-- Type-milestone Passport definitions embed the type name in their title
-- and hint at seed time; rebuild both from the corrected names.
UPDATE public.passport_definitions d
SET title = t.name || ' milestones',
    hint = 'Publish ' || d.threshold || ' ' || t.name ||
      ' reviews. Every active review counts.'
FROM public.types t
WHERE d.metric = 'type_reviews'
  AND d.subject_a = t.id;

COMMIT;
