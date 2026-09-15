import { optOutEmail } from "@/lib/emailService";
import { UUID } from "@/lib/emailModel.mjs";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Email preferences | Tini Time Club",
  robots: { index: false, follow: false },
};

async function unsubscribe(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  if (!UUID.test(token)) redirect("/email/unsubscribe?error=1");
  try {
    await optOutEmail(token);
  } catch {
    redirect(`/email/unsubscribe?token=${encodeURIComponent(token)}&error=1`);
  }
  redirect("/email/unsubscribe?done=1");
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-stone-900">
      <p className="font-bold text-emerald-900">tini time club.</p>
      <h1 className="mt-6 text-3xl font-bold">
        {params.done ? "You’re unsubscribed" : "Email preferences"}
      </h1>
      <p className="mt-4">
        {params.done
          ? "You won’t receive further member emails. Account sign-in and security emails are unaffected."
          : "Unsubscribe from member messages sent by Tini Time Club."}
      </p>
      {params.error && (
        <p role="alert" className="mt-4 text-red-700">
          We couldn’t update your preference. Please try again or contact
          hello@tinitimeclub.com.
        </p>
      )}
      {!params.done && params.token && UUID.test(params.token) ? (
        <form action={unsubscribe} className="mt-6">
          <input type="hidden" name="token" value={params.token} />
          <button className="rounded-md bg-emerald-900 px-5 py-3 font-bold text-white">
            Unsubscribe
          </button>
        </form>
      ) : (
        !params.done && (
          <p className="mt-4">Open the unsubscribe link from your email.</p>
        )
      )}
    </main>
  );
}
