import { NextRequest, NextResponse } from "next/server";
import { fetchMapPlaces } from "@/lib/placeData";

export const dynamic = "force-dynamic";

// Lives under /admin so proxy.ts gates it behind the admin session — the
// top-level /api tree is public.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const minLat = Number(params.get("minLat"));
  const maxLat = Number(params.get("maxLat"));
  const minLon = Number(params.get("minLon"));
  const maxLon = Number(params.get("maxLon"));

  if (
    ![minLat, maxLat, minLon, maxLon].every(Number.isFinite) ||
    minLat > maxLat ||
    minLon > maxLon
  ) {
    return NextResponse.json({ error: "Invalid bounds" }, { status: 400 });
  }

  const places = await fetchMapPlaces({ minLat, maxLat, minLon, maxLon });
  return NextResponse.json({ places });
}
