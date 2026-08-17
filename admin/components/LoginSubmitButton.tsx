"use client";

import { useFormStatus } from "react-dom";

export default function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-900 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-75"
    >
      {pending ? (
        <span
          className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
          aria-hidden="true"
        />
      ) : null}
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}
