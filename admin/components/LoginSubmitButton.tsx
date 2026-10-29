import AdminSubmitButton from "@/components/AdminSubmitButton";

export default function LoginSubmitButton() {
  return (
    <AdminSubmitButton
      pendingLabel="Signing in…"
      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-900 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-800"
    >
      Sign in
    </AdminSubmitButton>
  );
}
