-- The review scale begins at 1.0. Half steps remain available through 5.0.

ALTER TABLE public.reviews
  DROP CONSTRAINT reviews_taste_half_step_check,
  DROP CONSTRAINT reviews_presentation_half_step_check;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_taste_half_step_check
    CHECK (
      taste BETWEEN 1.0 AND 5.0
      AND mod(taste * 2, 1) = 0
    ),
  ADD CONSTRAINT reviews_presentation_half_step_check
    CHECK (
      presentation BETWEEN 1.0 AND 5.0
      AND mod(presentation * 2, 1) = 0
    );
