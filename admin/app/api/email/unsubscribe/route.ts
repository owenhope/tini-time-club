import { NextRequest, NextResponse } from "next/server";
import { UUID } from "@/lib/emailModel.mjs";
import { optOutEmail } from "@/lib/emailService";

// RFC 8058: mailbox providers POST here. GET never changes a preference.
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!UUID.test(token))
    return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  try {
    await optOutEmail(token);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to unsubscribe" },
      { status: 400 }
    );
  }
}
