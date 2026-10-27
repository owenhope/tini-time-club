import type { Metadata } from "next";
import Link from "next/link";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import { siteShareImage } from "@/lib/seo";

const supportEmail = "owen@hopemediahouse.com";
const deleteSubject = "Tini Time Club - Delete My Account";

const description =
  "How to delete your Tini Time Club account and what data is deleted or kept.";

// Mirrors what the delete-account Edge Function and delete_account_data RPC
// remove. Update this list when either changes.
const deletedData = [
  "Your account, email address, and sign-in details",
  "Your profile, username, bio, avatar, and preferences",
  "Your reviews and review photos",
  "Your comments, likes, follows, and favorite locations",
  "Your Passport stamps, rings, and regulars status",
  "Your notifications and push notification tokens",
  "Reports you submitted",
  "In-app usage and analytics events linked to your account",
];

const retainedData = [
  "Bar listings you claimed or managed stay in the app, but your name is removed from them.",
  "Crash reports, which contain no review content, expire automatically within 90 days.",
  "Encrypted database backups are overwritten within 30 days.",
];

export const metadata: Metadata = {
  title: "Delete Your Account | Tini Time Club",
  description,
  alternates: {
    canonical: "https://tinitimeclub.com/delete-account",
  },
  openGraph: {
    siteName: "Tini Time Club",
    type: "website",
    url: "https://tinitimeclub.com/delete-account",
    title: "Delete Your Account | Tini Time Club",
    description,
    images: [siteShareImage],
  },
};

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-[#f8f5ef] text-emerald-950">
      <section className="bg-violet-600 text-white">
        <PublicHeader tone="purple" />
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">
          <p className="inline-flex rounded-[6px] bg-chartreuse px-3 py-2 font-mono text-xs font-black uppercase tracking-[0.18em] text-emerald-950 shadow-sm shadow-emerald-950/15">
            Account and data
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-black tracking-tight text-white sm:text-6xl">
            Delete your Tini Time Club account
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/76">
            Tini Time Club is developed by Hope Media House. You can delete your
            account and its data at any time, from the app or by email.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-18 lg:px-8">
        <section className="grid gap-4 border-t border-emerald-950/12 pt-6 md:grid-cols-[0.45fr_1fr]">
          <h2 className="text-sm font-bold uppercase text-violet-700">
            Delete in the app
          </h2>
          <div className="leading-7 text-emerald-950/72">
            <ol className="list-decimal space-y-2 pl-5">
              <li>Open Tini Time Club and sign in.</li>
              <li>Go to your Profile, then open Settings.</li>
              <li>Tap Delete Account and confirm.</li>
            </ol>
            <p className="mt-3">
              Your account and data are deleted immediately.
            </p>
          </div>
        </section>

        <section className="mt-10 grid gap-4 border-t border-emerald-950/12 pt-6 md:grid-cols-[0.45fr_1fr]">
          <h2 className="text-sm font-bold uppercase text-violet-700">
            Request deletion by email
          </h2>
          <div className="leading-7 text-emerald-950/72">
            <p>
              If you can&apos;t access the app, email{" "}
              <a
                className="font-bold underline"
                href={`mailto:${supportEmail}?subject=${encodeURIComponent(deleteSubject)}`}
              >
                {supportEmail}
              </a>{" "}
              from the email address on your account with the subject{" "}
              <span className="font-bold">{deleteSubject}</span>.
            </p>
            <p className="mt-3">
              We will confirm your request and complete the deletion within 30
              days.
            </p>
          </div>
        </section>

        <section className="mt-10 grid gap-4 border-t border-emerald-950/12 pt-6 md:grid-cols-[0.45fr_1fr]">
          <h2 className="text-sm font-bold uppercase text-violet-700">
            Data that is deleted
          </h2>
          <ul className="list-disc space-y-2 pl-5 leading-7 text-emerald-950/72">
            {deletedData.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10 grid gap-4 border-t border-emerald-950/12 pt-6 md:grid-cols-[0.45fr_1fr]">
          <h2 className="text-sm font-bold uppercase text-violet-700">
            Data that is kept
          </h2>
          <ul className="list-disc space-y-2 pl-5 leading-7 text-emerald-950/72">
            {retainedData.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10 grid gap-4 border-t border-emerald-950/12 pt-6 md:grid-cols-[0.45fr_1fr]">
          <h2 className="text-sm font-bold uppercase text-violet-700">
            More information
          </h2>
          <p className="leading-7 text-emerald-950/72">
            Read our{" "}
            <Link className="font-bold underline" href="/privacy">
              Privacy Policy
            </Link>{" "}
            or visit{" "}
            <Link className="font-bold underline" href="/support">
              Support
            </Link>
            .
          </p>
        </section>
      </div>

      <PublicFooter />
    </main>
  );
}
