import type { Metadata } from "next";
import Link from "next/link";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import { submitBusinessInquiry } from "@/lib/publicClaimAction";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "For businesses | Tini Time Club",
  description:
    "Own or manage a bar or restaurant on Tini Time Club? Get in touch about verification.",
  alternates: { canonical: "https://tinitimeclub.com/business" },
};

const ERROR_MESSAGES: Record<string, string> = {
  name: "Enter your name.",
  business: "Enter the business name.",
  email: "Enter a valid business email.",
  phone: "That phone number is too long.",
  message: "Tell us a little about your place.",
  submit: "Something went wrong sending your message. Please try again.",
};

const inputClass =
  "w-full rounded-[8px] border border-stone-300 bg-white px-3 py-2.5 text-[15px] text-emerald-950 placeholder:text-stone-400 focus:border-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-900/25";
const labelClass = "block pb-1.5 text-sm font-bold text-emerald-950";

export default async function BusinessInquiryPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; error?: string }>;
}) {
  const query = await searchParams;
  const submitted = query.submitted === "1";
  const errorMessage = query.error ? ERROR_MESSAGES[query.error] : null;

  return (
    <main className="min-h-screen bg-paper text-emerald-950">
      <PublicHeader tone="cream" />
      <section className="px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto w-full max-w-2xl">
          <p className="font-mono text-xs font-bold uppercase text-violet-700">
            For businesses
          </p>
          <h1 className="mt-3 text-4xl font-black leading-none sm:text-5xl">
            Put your bar on the club&apos;s map.
          </h1>
          <p className="mt-6 text-lg leading-8 text-emerald-950/72">
            Own or manage a place that pours a serious Martini? Tell us about
            it. The club reviews every inquiry by hand — verification,
            corrections, or just a conversation.
          </p>

          {submitted ? (
            <div className="mt-10 rounded-[8px] border border-emerald-900/15 bg-emerald-50 p-6">
              <p className="text-xl font-black">Message received</p>
              <p className="mt-2 text-base leading-7 text-emerald-950/75">
                Thanks — we read every note and will reach out at the business
                email you provided.
              </p>
              <Link
                href="/"
                className="mt-4 inline-block text-sm font-bold text-emerald-900 underline"
              >
                Back to the homepage
              </Link>
            </div>
          ) : (
            <>
              {errorMessage ? (
                <p
                  role="alert"
                  className="mt-8 rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                >
                  {errorMessage}
                </p>
              ) : null}

              <form
                action={submitBusinessInquiry}
                className="mt-10 flex flex-col gap-5"
              >
                {/* Honeypot: humans never see it, bots fill it. */}
                <div className="hidden" aria-hidden="true">
                  <label>
                    Website
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact_name" className={labelClass}>
                      Your name
                    </label>
                    <input
                      id="contact_name"
                      name="contact_name"
                      type="text"
                      required
                      maxLength={120}
                      autoComplete="name"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="business_name" className={labelClass}>
                      Business name
                    </label>
                    <input
                      id="business_name"
                      name="business_name"
                      type="text"
                      required
                      maxLength={160}
                      autoComplete="organization"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="business_email" className={labelClass}>
                      Business email
                    </label>
                    <input
                      id="business_email"
                      name="business_email"
                      type="email"
                      required
                      maxLength={320}
                      autoComplete="email"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className={labelClass}>
                      Phone <span className="font-normal">(optional)</span>
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      maxLength={40}
                      autoComplete="tel"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className={labelClass}>
                    What can we help with?
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    maxLength={1000}
                    rows={5}
                    placeholder="Your place, your Martini program, what you'd like from the club…"
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex min-h-12 items-center justify-center self-start rounded-md bg-emerald-900 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
                >
                  Send it to the club
                </button>
                <p className="max-w-xl text-xs leading-5 text-stone-500">
                  We only use these details to respond to your inquiry.
                  Verification means Tini Time Club manually reviewed a business
                  claim; it is never an endorsement and cannot be bought.
                </p>
              </form>
            </>
          )}
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
