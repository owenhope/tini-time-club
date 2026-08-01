import { login } from "@/lib/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-emerald-950 p-6">
      <form
        action={login}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl"
      >
        <h1 className="text-2xl font-bold tracking-tight text-emerald-950">
          tini time club<span className="text-violet-500">.</span>
        </h1>
        <p className="mt-1 text-sm text-stone-500">Admin sign-in</p>

        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Wrong password.
          </p>
        ) : null}

        <label className="mt-6 block text-sm font-medium text-stone-700">
          Password
          <input
            type="password"
            name="password"
            autoFocus
            required
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-violet-500 focus:outline-none"
          />
        </label>

        <button
          type="submit"
          className="mt-6 w-full rounded-lg bg-emerald-900 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-800"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
