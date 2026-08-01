import Link from "next/link";
import { logout } from "@/lib/actions";

export default function AdminShell({
  active,
  children,
}: {
  active: "dashboard" | "users" | "analytics" | "notifications";
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
              {tab("/", "dashboard", "Dashboard")}
              {tab("/analytics", "analytics", "Analytics")}
              {tab("/users", "users", "Users")}
              {tab("/notifications", "notifications", "Notifications")}
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
