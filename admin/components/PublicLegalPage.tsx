import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";

export interface LegalSection {
  title: string;
  body?: string;
  items?: string[];
}

interface PublicLegalPageProps {
  eyebrow: string;
  title: string;
  effectiveDate: string;
  contactEmail: string;
  intro: string;
  sections: LegalSection[];
}

export default function PublicLegalPage({
  eyebrow,
  title,
  effectiveDate,
  contactEmail,
  intro,
  sections,
}: PublicLegalPageProps) {
  return (
    <main className="min-h-screen bg-[#f8f5ef] text-emerald-950">
      <section className="bg-violet-600 text-white">
        <PublicHeader tone="purple" />
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">
          <p className="inline-flex rounded-[6px] bg-chartreuse px-3 py-2 font-mono text-xs font-black uppercase tracking-[0.18em] text-emerald-950 shadow-sm shadow-emerald-950/15">
            {eyebrow}
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-black tracking-tight text-white sm:text-6xl">
            {title}
          </h1>
          <div className="mt-5 space-y-1 text-sm font-semibold text-white/70">
            <p>Effective Date: {effectiveDate}</p>
            <p>
              Contact:{" "}
              <a
                className="font-bold text-white underline"
                href={`mailto:${contactEmail}`}
              >
                {contactEmail}
              </a>
            </p>
          </div>
          <p className="mt-8 max-w-3xl text-lg leading-8 text-white/76">
            {intro}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-18 lg:px-8">
        <div className="space-y-9">
          {sections.map((section) => (
            <section
              key={section.title}
              className="grid gap-4 border-t border-emerald-950/12 pt-6 md:grid-cols-[0.45fr_1fr]"
            >
              <h2 className="text-xl font-black text-emerald-950 md:max-w-xs">
                {section.title}
              </h2>
              <div>
                {section.body ? (
                  <p className="leading-7 text-emerald-950/75">
                    {section.body}
                  </p>
                ) : null}
                {section.items ? (
                  <ul className="list-disc space-y-2 pl-5 leading-7 text-emerald-950/75">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
