import { NextRequest, NextResponse } from "next/server";
import { fetchNotificationAudienceMembers } from "@/lib/profileData";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ members: [] });

  const members = await fetchNotificationAudienceMembers(query);
  return NextResponse.json({ members });
}
