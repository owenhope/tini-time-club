import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { PageHeader, Panel } from "@/components/AdminPrimitives";
import { appleReviews, playReviews } from "@/lib/storeReviews";

export const dynamic = "force-dynamic";

export default async function StoreReviewsPage({
  searchParams,
}: { searchParams: Promise<{ apple?: string; play?: string }> }) {
  const { apple, play } = await searchParams;
  const [ios, android] = await Promise.all([appleReviews(apple), playReviews(play)]);
  const sources = [
    { title: "App Store", feed: ios, key: "apple", description: "Written reviews across all territories, newest first." },
    { title: "Google Play", feed: android, key: "play", description: "Written reviews created or updated in the past seven days." },
  ];
  return (
    <AdminShell active="store-reviews">
      <PageHeader title="App store reviews" description="Feedback from people who reviewed Tini Time Club. Star-only ratings have no review to display." />
      <div className="grid items-start gap-4 px-5 py-6 lg:grid-cols-2 lg:px-8">
        {sources.map(({ title, key, description, feed }) => {
          const params = new URLSearchParams();
          if (apple) params.set("apple", apple);
          if (play) params.set("play", play);
          if ("next" in feed && feed.next) params.set(key, feed.next);
          return (
            <Panel key={key} title={title}>
              <p className="px-4 pt-3 text-sm text-stone-500">{description}</p>
              {"message" in feed || !feed.reviews.length ? (
                <p className="p-4 text-sm">{"message" in feed ? feed.message : "No written reviews in this feed."}</p>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {feed.reviews.map((review) => (
                    <li key={review.id} className="space-y-1 p-4 text-sm">
                      <p className="font-bold">{review.rating}/5 · {review.author || "Anonymous"}</p>
                      <time className="text-xs text-stone-500" dateTime={review.date}>{new Date(review.date).toLocaleDateString("en-CA", { timeZone: "UTC" })}</time>
                      {review.title && <h3 className="font-bold">{review.title}</h3>}
                      <p className="whitespace-pre-wrap break-words">{review.text}</p>
                    </li>
                  ))}
                </ul>
              )}
              {"next" in feed && feed.next && (
                <Link className="block p-4 text-sm font-bold text-violet-700" href={`/admin/store-reviews?${params}`}>Older {title} reviews →</Link>
              )}
            </Panel>
          );
        })}
      </div>
    </AdminShell>
  );
}
