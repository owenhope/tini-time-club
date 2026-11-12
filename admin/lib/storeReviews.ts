import "server-only";
import { ANDROID_PACKAGE, APP_STORE_ID } from "@/lib/appStoreLink.mjs";
import { JWT } from "google-auth-library";
import { importPKCS8, SignJWT } from "jose";

type Review = {
  id: string;
  author?: string;
  title?: string;
  text: string;
  rating: number;
  date: string;
};

type Feed = { reviews: Review[]; next?: string | null } | { message: string };

async function getReviews<T>(url: URL, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Store request failed");
  return response.json();
}

type ApplePage = {
  data: {
    id: string;
    attributes: {
      reviewerNickname: string;
      title: string;
      body: string;
      createdDate: string;
      rating: number;
    };
  }[];
  links: { next?: string };
};

export async function appleReviews(cursor?: string): Promise<Feed> {
  const { APP_STORE_KEY_ID, APP_STORE_ISSUER_ID, APP_STORE_PRIVATE_KEY } =
    process.env;
  if (!APP_STORE_KEY_ID || !APP_STORE_ISSUER_ID || !APP_STORE_PRIVATE_KEY)
    return {
      message: "App Store Connect credentials haven’t been configured.",
    };

  try {
    const key = await importPKCS8(
      APP_STORE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      "ES256"
    );
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: APP_STORE_KEY_ID, typ: "JWT" })
      .setIssuer(APP_STORE_ISSUER_ID)
      .setAudience("appstoreconnect-v1")
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(key);
    const url = new URL(
      `https://api.appstoreconnect.apple.com/v1/apps/${APP_STORE_ID}/customerReviews`
    );
    url.searchParams.set("sort", "-createdDate");
    url.searchParams.set("limit", "50");
    if (cursor) url.searchParams.set("cursor", cursor);
    const page = await getReviews<ApplePage>(url, token);
    return {
      reviews: page.data.map(({ id, attributes: a }) => ({
        id,
        author: a.reviewerNickname,
        title: a.title,
        text: a.body,
        rating: a.rating,
        date: a.createdDate,
      })),
      next:
        page.links.next && new URL(page.links.next).searchParams.get("cursor"),
    };
  } catch {
    return {
      message:
        "Couldn’t load App Store reviews. Refresh to retry or check the App Store Connect credentials.",
    };
  }
}

type PlayPage = {
  reviews?: {
    reviewId: string;
    authorName?: string;
    comments: {
      userComment?: {
        text: string;
        starRating: number;
        lastModified: { seconds: string };
      };
    }[];
  }[];
  tokenPagination?: { nextPageToken?: string };
};

export async function playReviews(cursor?: string): Promise<Feed> {
  const { GOOGLE_PLAY_CLIENT_EMAIL, GOOGLE_PLAY_PRIVATE_KEY } = process.env;
  if (!GOOGLE_PLAY_CLIENT_EMAIL || !GOOGLE_PLAY_PRIVATE_KEY)
    return {
      message:
        "Google Play service account credentials haven’t been configured.",
    };

  try {
    const client = new JWT({
      email: GOOGLE_PLAY_CLIENT_EMAIL,
      key: GOOGLE_PLAY_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });
    const { token } = await client.getAccessToken();
    if (!token) throw new Error("Missing access token");
    const url = new URL(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${ANDROID_PACKAGE}/reviews`
    );
    url.searchParams.set("maxResults", "50");
    if (cursor) url.searchParams.set("token", cursor);
    const page = await getReviews<PlayPage>(url, token);
    return {
      reviews: (page.reviews ?? []).flatMap(
        ({ reviewId, authorName, comments }) => {
          const comment = comments.find(
            (entry) => entry.userComment
          )?.userComment;
          if (!comment?.text.trim()) return [];
          return [
            {
              id: reviewId,
              author: authorName,
              text: comment.text,
              rating: comment.starRating,
              date: new Date(
                Number(comment.lastModified.seconds) * 1000
              ).toISOString(),
            },
          ];
        }
      ),
      next: page.tokenPagination?.nextPageToken,
    };
  } catch {
    return {
      message:
        "Couldn’t load Google Play reviews. Refresh to retry or check the service account’s Play Console access.",
    };
  }
}
