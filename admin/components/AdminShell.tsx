import Link from "next/link";
import { logout } from "@/lib/actions";

type ActiveSection =
  | "dashboard"
  | "users"
  | "reviews"
  | "locations"
  | "analytics"
  | "notifications"
  | "share-preview";

const CORE_NAV = [
  { href: "/admin", key: "dashboard", label: "Dashboard" },
  { href: "/admin/users", key: "users", label: "Members" },
  { href: "/admin/reviews", key: "reviews", label: "Reviews" },
  {
    href: "/admin/locations",
    key: "locations",
    label: "Locations",
  },
  { href: "/admin/analytics", key: "analytics", label: "Analytics" },
  {
    href: "/admin/notifications",
    key: "notifications",
    label: "Notifications",
  },
] as const;

const SECONDARY_NAV = [
  {
    href: "/admin/share-preview",
    key: "share-preview",
    label: "Share preview",
  },
] as const;

const navLink = (
  item: { href: string; key: string; label: string; meta?: string },
  active: ActiveSection
) => {
  const isActive = active === item.key;
  return (
    <Link
      key={item.key}
      href={item.href}
      className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
        isActive
          ? "bg-emerald-900 text-white shadow-sm"
          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
      }`}
    >
      <span className="font-bold">{item.label}</span>
      {item.meta ? (
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.12em] ${
            isActive ? "text-chartreuse" : "text-stone-400"
          }`}
        >
          {item.meta}
        </span>
      ) : null}
    </Link>
  );
};

export default function AdminShell({
  active,
  children,
}: {
  active: ActiveSection;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-stone-200 bg-white px-4 py-5 xl:block">
        <div className="flex h-full flex-col">
          <Link href="/admin" className="block rounded-lg px-2">
            <span className="block text-lg font-black tracking-tight text-emerald-950">
              tini time club<span className="text-violet-500">.</span>
            </span>
            <span className="mt-0.5 block font-mono text-xs uppercase tracking-[0.18em] text-stone-400">
              operator console
            </span>
          </Link>

          <nav className="mt-8 space-y-6" aria-label="Admin">
            <div>
              <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">
                Core
              </p>
              <div className="space-y-1">
                {CORE_NAV.map((item) => navLink(item, active))}
              </div>
            </div>

            <div>
              <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">
                Tools
              </p>
              <div className="space-y-1">
                {SECONDARY_NAV.map((item) => navLink(item, active))}
              </div>
            </div>

            <div>
              <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">
                Account
              </p>
              <form action={logout}>
                <button
                  type="submit"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
                >
                  Sign out
                </button>
              </form>
            </div>
          </nav>
        </div>
      </aside>

      <header className="border-b border-stone-200 bg-white px-5 py-3 xl:hidden">
        <div className="flex items-center justify-between gap-4">
          <Link href="/admin" className="font-black text-emerald-950">
            tini time club<span className="text-violet-500">.</span> admin
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm font-bold text-stone-500 hover:text-stone-900"
            >
              Sign out
            </button>
          </form>
        </div>
        <nav
          className="mt-3 flex gap-1 overflow-x-auto pb-1"
          aria-label="Admin"
        >
          {[...CORE_NAV, ...SECONDARY_NAV].map((item) => navLink(item, active))}
        </nav>
      </header>

      <main className="min-h-screen xl:pl-64">
        <div className="mx-auto max-w-[1480px]">{children}</div>
      </main>
    </div>
  );
}
