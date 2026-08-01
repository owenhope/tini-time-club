import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  // Public review/share pages live at the root. Only the operator dashboard
  // requires the admin session.
  matcher: [
    "/admin",
    "/admin/((?!login|_next/static|_next/image|favicon.ico|icon.png).*)",
  ],
};
