import Link from "next/link";

const links = [
  { href: "/about", label: "About", rel: "author" },
  { href: "/support", label: "Support" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
];

export default function PublicFooter() {
  return (
    <footer className="border-t border-emerald-950/10 bg-[#f8f5ef] px-5 py-8 text-sm text-emerald-950/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold text-emerald-950">
          Tini Time Club<span className="text-violet-600">.</span>
        </p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              rel={link.rel}
              className="font-semibold transition hover:text-emerald-950"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p>&copy; 2026 Hope Media House Inc.</p>
      </div>
    </footer>
  );
}
