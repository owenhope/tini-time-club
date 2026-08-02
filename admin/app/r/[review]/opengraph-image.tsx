import { ImageResponse } from "next/og";
import { fetchPublicReview, reviewOverall } from "@/lib/publicReview";

export const runtime = "nodejs";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const formatRating = (rating?: number | null) =>
  rating == null ? "—" : Number(rating).toFixed(1);

const reviewCountLabel = (count?: number | null) => {
  const n = count ?? 0;
  return n === 1 ? "1 review" : `${n} reviews`;
};

export default async function ReviewOpenGraphImage({
  params,
}: {
  params: Promise<{ review: string }>;
}) {
  const { review: reviewId } = await params;
  const review = await fetchPublicReview(reviewId);
  const overall = reviewOverall(review);
  const venueRating =
    review.location?.rating != null && (review.location.total_ratings ?? 0) > 0
      ? Number(review.location.rating)
      : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f8f5ef",
          color: "#08261f",
          padding: 42,
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            gap: 34,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 520,
              height: 520,
              borderRadius: 16,
              overflow: "hidden",
              position: "relative",
              background: "#d9d1fb",
              boxShadow: "0 24px 60px rgba(8, 38, 31, 0.18)",
            }}
          >
            {review.image_public_url ? (
              <img
                src={review.image_public_url}
                width={520}
                height={520}
                alt=""
                style={{ objectFit: "cover" }}
              />
            ) : null}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                gap: 24,
                padding: 36,
                background: "rgba(0,0,0,0.42)",
                color: "white",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 32, fontWeight: 900 }}>
                  {review.location?.name ?? "Martini review"}
                </div>
                {venueRating != null ? (
                  <div
                    style={{
                      marginTop: 16,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      alignSelf: "flex-start",
                      background: "rgba(8,38,31,0.78)",
                      borderRadius: 999,
                      padding: "8px 14px",
                      fontSize: 18,
                      fontWeight: 800,
                    }}
                  >
                    <span style={{ color: "#d9d1fb" }}>★</span>
                    <span>{formatRating(venueRating)} venue rating</span>
                    <span style={{ color: "rgba(255,255,255,0.72)" }}>
                      {reviewCountLabel(review.location?.total_ratings)}
                    </span>
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  gap: 24,
                }}
              >
                <div style={{ display: "flex", gap: 44 }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 16, color: "rgba(255,255,255,0.8)" }}>
                      Spirit
                    </span>
                    <span style={{ fontSize: 24, fontWeight: 800 }}>
                      {review.spirit?.name ?? "N/A"}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 16, color: "rgba(255,255,255,0.8)" }}>
                      Type
                    </span>
                    <span style={{ fontSize: 24, fontWeight: 800 }}>
                      {review.type?.name ?? "N/A"}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ fontSize: 16, color: "rgba(255,255,255,0.8)" }}>
                    Overall
                  </span>
                  <span style={{ fontSize: 54, fontWeight: 900 }}>
                    {formatRating(overall)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 24,
            }}
          >
            <div style={{ fontSize: 34, fontWeight: 900 }}>
              tini time club<span style={{ color: "#8e7ce8" }}>.</span>
            </div>
            <div style={{ fontSize: 58, lineHeight: 1.02, fontWeight: 900 }}>
              @{review.profile?.username ?? "tini-time"} reviewed a Martini.
            </div>
            {review.comment ? (
              <div
                style={{
                  fontSize: 28,
                  lineHeight: 1.25,
                  color: "rgba(8,38,31,0.72)",
                  maxHeight: 142,
                  overflow: "hidden",
                }}
              >
                {review.comment}
              </div>
            ) : null}
            <div
              style={{
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 22,
                color: "rgba(8,38,31,0.62)",
              }}
            >
              <span>♡</span>
              <span>💬</span>
              <span>✈</span>
              <span style={{ marginLeft: 12 }}>Open on TTC</span>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
