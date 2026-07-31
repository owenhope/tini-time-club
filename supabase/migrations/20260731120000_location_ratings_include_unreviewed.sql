-- Relax location_ratings so locations with no reviews are visible through
-- the view. The HAVING count > 0 filter forced the place screen to bypass
-- the view entirely and download every review row to average client-side.
-- Callers that only want reviewed locations (locations_in_view, discover)
-- already filter on total_ratings themselves.

CREATE OR REPLACE VIEW "public"."location_ratings" AS
 SELECT "l"."id",
    "l"."name",
    "l"."address",
    "gis"."st_y"(("l"."location")::"gis"."geometry") AS "lat",
    "gis"."st_x"(("l"."location")::"gis"."geometry") AS "lon",
    COALESCE("round"("avg"(((("r"."taste" + "r"."presentation"))::numeric / 2.0)), 1), (0)::numeric) AS "rating",
    COALESCE("round"("avg"("r"."taste"), 1), (0)::numeric) AS "taste_avg",
    COALESCE("round"("avg"("r"."presentation"), 1), (0)::numeric) AS "presentation_avg",
    "count"("r"."id") AS "total_ratings"
   FROM ("public"."locations" "l"
     LEFT JOIN "public"."reviews" "r" ON ((("l"."id" = "r"."location") AND ("r"."state" = 1))))
  GROUP BY "l"."id", "l"."name", "l"."address", "l"."location";
