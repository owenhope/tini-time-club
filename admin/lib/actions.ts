"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE, createSessionToken } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function login(formData: FormData) {
  const password = formData.get("password");
  if (
    typeof password !== "string" ||
    !process.env.ADMIN_PASSWORD ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    // Blunt but effective brute-force damper for a single-operator tool.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    redirect("/login?error=1");
  }

  const { token, expiresAt } = await createSessionToken();
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function setVerified(profileId: string, verified: boolean) {
  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({ is_verified: verified })
    .eq("id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath(`/users/${profileId}`);
  revalidatePath("/users");
}

export async function setDeleted(profileId: string, deleted: boolean) {
  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({
      deleted,
      deleted_at: deleted ? new Date().toISOString() : null,
    })
    .eq("id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath(`/users/${profileId}`);
  revalidatePath("/users");
}
