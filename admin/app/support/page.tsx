import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import { siteAuthor, siteShareImage } from "@/lib/seo";

const description =
  "Support for Tini Time Club covering iPhone setup, reviews, profiles, locations, notifications, account deletion, and reporting.";

const gettingStarted = [
  "Download Tini Time Club from the App Store.",
  "Create an account, finish onboarding, and choose your Martini preferences.",
  "Tap + to add a review with a photo, location, spirit, type, Taste and Presentation ratings, and notes.",
  "Use Explore's map, Golden Glass, Members, profiles, regulars, and favorite locations to find new places.",
];

const appFeatures = [
  {
    question: "What can I rate?",
    answer: "Track Taste and Presentation for every Martini.",
  },
  {
    question: "Can I add photos and notes?",
    answer:
      "Yes. Attach a photo, add a caption, and edit the caption later from your profile.",
  },
  {
    question: "How does discovery work?",
    answer:
      "Explore recent reviews, nearby venues, top locations, profiles, regulars, and favorite locations.",
  },
  {
    question: "What social features are available?",
    answer:
      "Follow people, like reviews, comment, share recommendations, and invite friends.",
  },
  {
    question: "What can I update on my profile?",
    answer:
      "You can update your avatar, bio, favorite spirits, Martini types, and favorite location.",
  },
  {
    question: "How do notifications work?",
    answer:
      "Use Settings to manage the weekly Tini Time Reminder at 4pm on Fridays.",
  },
];

const faqs = [
  {
    question: "Which devices are supported?",
    answer:
      "Tini Time Club is currently listed for iPhone. See the App Store listing for the minimum iOS version.",
  },
  {
    question: "How do I reset my password?",
    answer:
      "On the sign-in screen, tap Forgot password? and follow the email link. If the message does not arrive, check spam or email support@hopemediahouse.com.",
  },
  {
    question: "How do I edit or delete a review?",
    answer:
      "From your profile, open the review options to edit its caption or delete the review. You can also discard an in-progress review with the trash icon before posting.",
  },
  {
    question: "How do I report inappropriate content?",
    answer:
      "Use the Report Review or flag option in the app. You can also email support@hopemediahouse.com.",
  },
  {
    question: "How do I change my favorite location or preferences?",
    answer:
      "Go to Settings, then Edit Profile. From there you can update favorite spirits, favorite Martini types, and your favorite location.",
  },
  {
    question: "How do I turn off reminders?",
    answer:
      "Go to Settings, then Notifications, and turn off the Tini Time Reminder.",
  },
];

export const metadata: Metadata = {
  title: "iPhone App Support | Tini Time Club",
  description,
  alternates: {
    canonical: "https://tinitimeclub.com/support",
  },
  openGraph: {
    siteName: "Tini Time Club",
    type: "website",
    url: "https://tinitimeclub.com/support",
    title: "iPhone App Support | Tini Time Club",
    description,
    images: [siteShareImage],
  },
};

const supportJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  name: "iPhone App Support | Tini Time Club",
  url: "https://tinitimeclub.com/support",
  description,
  datePublished: "2026-08-11",
  dateModified: "2026-08-11",
  author: siteAuthor,
  publisher: siteAuthor,
  mainEntity: [...appFeatures, ...faqs].map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

function QuestionAnswer({
  question,
  answer,
}: {
  question: string;
  answer: React.ReactNode;
}) {
  return (
    <div className="border-t border-emerald-950/12 py-5">
      <h3 className="text-base font-black text-emerald-950">{question}</h3>
      <p className="mt-2 leading-7 text-emerald-950/72">{answer}</p>
    </div>
  );
}

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[#f8f5ef] text-emerald-950">
      <JsonLd data={supportJsonLd} />
      <section className="bg-violet-600 text-white">
        <PublicHeader tone="purple" />
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">
          <p className="inline-flex rounded-[6px] bg-chartreuse px-3 py-2 font-mono text-xs font-black uppercase tracking-[0.18em] text-emerald-950 shadow-sm shadow-emerald-950/15">
            Help center
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-black tracking-tight text-white sm:text-6xl">
            Support
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/76">
            Tini Time Club helps you review and discover great martinis. Log
            your sips, rate Taste and Presentation, add photos, and find new
            spots.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-18 lg:px-8">
        <section className="grid gap-4 border-t border-emerald-950/12 pt-6 md:grid-cols-[0.45fr_1fr]">
          <h2 className="text-sm font-bold uppercase text-violet-700">
            Contact and response time
          </h2>
          <p className="leading-7 text-emerald-950/72">
            Email{" "}
            <a
              className="font-bold underline"
              href="mailto:support@hopemediahouse.com"
            >
              support@hopemediahouse.com
            </a>
            . We typically reply within 1-2 business days.
          </p>
        </section>

        <section className="mt-10 grid gap-4 border-t border-emerald-950/12 pt-6 md:grid-cols-[0.45fr_1fr]">
          <h2 className="text-sm font-bold uppercase text-violet-700">
            Getting started
          </h2>
          <ol className="list-decimal space-y-2 pl-5 leading-7 text-emerald-950/72">
            {gettingStarted.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <section className="mt-10 grid gap-4 border-t border-emerald-950/12 pt-6 md:grid-cols-[0.45fr_1fr]">
          <h2 className="text-sm font-bold uppercase text-violet-700">
            Using the app
          </h2>
          <div>
            {appFeatures.map((item) => (
              <QuestionAnswer
                key={item.question}
                question={item.question}
                answer={item.answer}
              />
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 border-t border-emerald-950/12 pt-6 md:grid-cols-[0.45fr_1fr]">
          <h2 className="text-sm font-bold uppercase text-violet-700">FAQs</h2>
          <div>
            {faqs.map((item) => (
              <QuestionAnswer
                key={item.question}
                question={item.question}
                answer={item.answer}
              />
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 border-t border-emerald-950/12 pt-6 md:grid-cols-[0.45fr_1fr]">
          <h2 className="text-sm font-bold uppercase text-violet-700">
            Account and data
          </h2>
          <div>
            <QuestionAnswer
              question="How do I request a copy of my data?"
              answer="Email support@hopemediahouse.com with the subject: Tini Time Club - Data Export."
            />
            <QuestionAnswer
              question="How do I delete my account?"
              answer="You can delete your account in Settings, then Delete Account. You can also email support@hopemediahouse.com from the address on your account with the subject: Tini Time Club - Delete My Account. We will confirm and complete deletion within 30 days."
            />
          </div>
        </section>

        <section className="mt-10 grid gap-4 border-t border-emerald-950/12 pt-6 md:grid-cols-[0.45fr_1fr]">
          <h2 className="text-sm font-bold uppercase text-violet-700">
            Privacy, safety, and legal
          </h2>
          <div>
            <QuestionAnswer
              question="Where can I read the Privacy Policy?"
              answer={
                <>
                  Read our{" "}
                  <Link className="font-bold underline" href="/privacy">
                    Privacy Policy
                  </Link>
                  .
                </>
              }
            />
            <QuestionAnswer
              question="How is content moderated?"
              answer="We remove content that is abusive, hateful, spammy, or illegal. Report issues via the in-app report option or by emailing support@hopemediahouse.com."
            />
            <QuestionAnswer
              question="How do I report an accessibility issue?"
              answer="If you encounter any accessibility barriers, tell us at support@hopemediahouse.com. We will work with you on a fix or workaround."
            />
            <QuestionAnswer
              question="Where can I read the Terms of Use?"
              answer={
                <>
                  Read our{" "}
                  <Link className="font-bold underline" href="/terms">
                    Terms of Service
                  </Link>
                  .
                </>
              }
            />
            <p className="border-t border-emerald-950/12 pt-5 text-sm leading-6 text-emerald-950/65">
              Tini Time Club is a trademark of Hope Media House. &copy; Hope
              Media House.
            </p>
          </div>
        </section>
      </div>

      <PublicFooter />
    </main>
  );
}
