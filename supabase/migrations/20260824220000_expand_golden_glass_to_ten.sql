-- Golden Glass recognizes the top ten qualifying locations per region.

BEGIN;

ALTER TABLE public.golden_glass_snapshot
  DROP CONSTRAINT IF EXISTS golden_glass_snapshot_rank_check;

ALTER TABLE public.golden_glass_snapshot
  ADD CONSTRAINT golden_glass_snapshot_rank_check
  CHECK (rank BETWEEN 1 AND 10);

DO $$
DECLARE
  function_definition text;
BEGIN
  SELECT pg_get_functiondef(
    'public.refresh_golden_glass_v1()'::regprocedure
  )
  INTO function_definition;

  EXECUTE replace(
    function_definition,
    'calculated_rank <= 5',
    'calculated_rank <= 10'
  );

  SELECT pg_get_functiondef(
    'public.get_golden_glass_inspection_v1(bigint)'::regprocedure
  )
  INTO function_definition;

  EXECUTE replace(
    function_definition,
    'calculated_rank <= 5',
    'calculated_rank <= 10'
  );
END;
$$;

COMMIT;
