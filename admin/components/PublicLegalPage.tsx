import Link from "next/link";
import PublicFooter from "@/components/PublicFooter";

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
    <main className="min-h-screen bg-stone-50 text-emerald-950">
      <section className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <Link
          href="/support"
          className="text-sm font-bold text-emerald-800 transition hover:text-emerald-950"
        >
          Tini Time Club
        </Link>
        <p className="mt-8 text-sm font-bold uppercase text-violet-700">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          {title}
        </h1>
        <div className="mt-5 space-y-1 text-sm font-semibold text-emerald-950/65">
          <p>Effective Date: {effectiveDate}</p>
          <p>
            Contact:{" "}
            <a className="underline" href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
          </p>
        </div>
        <p className="mt-8 text-lg leading-8 text-emerald-950/75">{intro}</p>

        <div className="mt-10 space-y-9">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-black">{section.title}</h2>
              {section.body ? (
                <p className="mt-3 leading-7 text-emerald-950/75">
                  {section.body}
                </p>
              ) : null}
              {section.items ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-emerald-950/75">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
