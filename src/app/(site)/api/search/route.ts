import { NextResponse } from "next/server";
import { globalSearch } from "@/lib/services/search-service";
import { enforceRateLimit } from "@/core/rate-limit";
import { clientKey } from "@/lib/auth/request-context";

export async function GET(request: Request): Promise<NextResponse> {
  await enforceRateLimit("search", await clientKey());
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const hits = await globalSearch(q);
  return NextResponse.json(
    { hits },
    { headers: { "Cache-Control": "no-store" } },
  );
}
