import type { Metadata } from "next";
import Link from "next/link";
import PublicShareHeader from "@/components/PublicShareHeader";
import { fetchPublicLocation, nativeLocationUrl } from "@/lib/publicLocation";
import { submitPublicLocationClaim } from "@/lib/publicClaimAction";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  name: "Enter your name.",
  role: "Enter your role at the business.",
  email: "Enter a valid business email.",
  phone: "That phone number is too long.",
  explanation: "Tell us briefly how you're connected to this place.",
  submit: "Something went wrong sending your claim. Please try again.",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ place: string }>;
}): Promise<Metadata> {
  const { place: locationId } = await params;
  const location = await fetchPublicLocation(locationId);
  return {
    title: `Claim ${location.name} on Tini Time Club`,
    description: `Own or manage ${location.name}? Ask Tini Time Club to verify your place.`,
    robots: { index: false },
  };
}

const inputClass =
  "w-full rounded-[10px] border border-[#CFD1D4] bg-white px-3 py-2.5 text-[15px] text-[#1C3A2E] placeholder:text-[#8A918D] focus:border-[#336654] focus:outline-none focus:ring-2 focus:ring-[#336654]/25";
const labelClass = "block pb-1.5 text-[13px] font-semibold text-[#1C3A2E]";

export default async function ClaimLocationPage({
  params,
  searchParams,
}: {
  params: Promise<{ place: string }>;
  searchParams: Promise<{ submitted?: string; error?: string }>;
}) {
  const { place: locationId } = await params;
  const query = await searchParams;
  const location = await fetchPublicLocation(locationId);
  const appUrl = nativeLocationUrl(location.id);
  const submitted = query.submitted === "1";
  const errorMessage = query.error ? ERROR_MESSAGES[query.error] : null;

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#1C3A2E]">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col sm:px-4 sm:py-5">
        <PublicShareHeader appUrl={appUrl} />

        <div className="px-[10px] pb-10 pt-3 sm:px-0 sm:pt-0">
          <div className="rounded-[22px] bg-white p-5 shadow-sm">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4B8570]">
              Business verification
            </p>
            <h1 className="pt-1 text-[22px] font-bold leading-tight">
              Claim {location.name}
            </h1>
            {location.address ? (
              <p className="pt-1 text-[13px] text-[#6E7472]">
                {location.address}
              </p>
            ) : null}

            {submitted ? (
              <div className="mt-5 rounded-[16px] bg-[#DCE9E3] p-4">
                <p className="text-[15px] font-semibold text-[#1C3A2E]">
                  Claim received
                </p>
                <p className="pt-1 text-[14px] leading-snug text-[#2A5445]">
                  Thanks — the club reviews every claim by hand. We&rsquo;ll
                  reach out at the business email you provided.
                </p>
                <Link
                  href={`/p/${encodeURIComponent(location.id)}`}
                  className="mt-3 inline-block text-[14px] font-semibold text-[#336654] underline"
                >
                  Back to {location.name}
                </Link>
              </div>
            ) : (
              <>
                <p className="pt-3 text-[14px] leading-snug text-[#545B57]">
                  Own or manage this place? Tell us how you&rsquo;re connected
                  and we&rsquo;ll verify it. Verification adds the Verified
                  Business mark
                  {location.is_location_verified
                    ? " — this place is already verified, but you can still submit a claim if ownership has changed."
                    : "."}
                </p>

                {errorMessage ? (
                  <p
                    role="alert"
                    className="mt-4 rounded-[10px] border border-[#F0BCB9] bg-[#FBEAE9] px-3 py-2 text-[14px] text-[#A5322E]"
                  >
                    {errorMessage}
                  </p>
                ) : null}

                <form
                  action={submitPublicLocationClaim}
                  className="mt-5 flex flex-col gap-4"
                >
                  <input type="hidden" name="location_id" value={location.id} />
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
                    <label htmlFor="business_role" className={labelClass}>
                      Your role at the business
                    </label>
                    <input
                      id="business_role"
                      name="business_role"
                      type="text"
                      required
                      maxLength={80}
                      placeholder="Owner, general manager…"
                      autoComplete="organization-title"
                      className={inputClass}
                    />
                  </div>

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

                  <div>
                    <label htmlFor="explanation" className={labelClass}>
                      How are you connected to this place?
                    </label>
                    <textarea
                      id="explanation"
                      name="explanation"
                      required
                      maxLength={1000}
                      rows={4}
                      className={inputClass}
                    />
                  </div>

                  <button
                    type="submit"
                    className="rounded-full bg-[#336654] px-5 py-3 text-[15px] font-bold text-white transition-opacity hover:opacity-90"
                  >
                    Submit claim
                  </button>
                  <p className="text-[12px] leading-snug text-[#8A918D]">
                    Verification means Tini Time Club manually reviewed a
                    business claim. It is not an endorsement. We only use these
                    details to review your claim.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
