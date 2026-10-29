import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { validPageUsage } from "@/lib/featureUsageCatalog.mjs";
import { recordAdminUsage } from "@/lib/adminUsage";

export async function POST(request: NextRequest) {
  if (!(await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)))
    return new NextResponse(null, { status: 401 });
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return new NextResponse(null, { status: 403 });
  let body;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!validPageUsage(body)) return new NextResponse(null, { status: 400 });
  const recorded = await recordAdminUsage(body.event, body.id);
  return new NextResponse(null, { status: recorded ? 204 : 503 });
}
