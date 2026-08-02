import Link from "next/link";
import { logout } from "@/lib/actions";

const TOOLS = [
  { href: "/admin/notifications", key: "notifications", label: "Notifications" },
  { href: "/admin/share-preview", key: "share-preview", label: "Share preview" },
] as const;

export default function AdminShell({
  active,
  children,
}: {
  active:
    | "dashboard"
    | "users"
    | "reviews"
    | "locations"
    | "analytics"
    | "notifications"
    | "share-preview";
  children: React.ReactNode;
}) {
  const tab = (href: string, key: string, label: string) => (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active === key
          ? "bg-emerald-900 text-white"
          : "text-stone-600 hover:bg-stone-200"
      }`}
    >
      {label}
    </Link>
  );

  const toolsActive = TOOLS.some((tool) => tool.key === active);

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold tracking-tight text-emerald-950">
              tini time club<span className="text-violet-500">.</span>{" "}
              <span className="font-normal text-stone-400">admin</span>
            </span>
            <nav className="flex gap-1">
              {tab("/admin", "dashboard", "Dashboard")}
              {tab("/admin/analytics", "analytics", "Analytics")}
              {tab("/admin/users", "users", "Users")}
              {tab("/admin/reviews", "reviews", "Reviews")}
              {tab("/admin/locations", "locations", "Locations")}
              {/* Hover/focus dropdown — server-rendered, no client JS. */}
              <div className="group relative">
                <button
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    toolsActive
                      ? "bg-emerald-900 text-white"
                      : "text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  Tools <span aria-hidden>▾</span>
                </button>
                <div className="invisible absolute left-0 top-full z-10 pt-1 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  <div className="flex min-w-40 flex-col rounded-xl border border-stone-200 bg-white p-1 shadow-lg">
                    {TOOLS.map((tool) => (
                      <Link
                        key={tool.key}
                        href={tool.href}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                          active === tool.key
                            ? "bg-emerald-900 text-white"
                            : "text-stone-600 hover:bg-stone-100"
                        }`}
                      >
                        {tool.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </nav>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-stone-500 transition hover:text-stone-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
