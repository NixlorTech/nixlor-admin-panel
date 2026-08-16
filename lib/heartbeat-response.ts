import { NextResponse } from "next/server";

const HEARTBEAT_CACHE_CONTROL = "s-maxage=3600, stale-while-revalidate";

export function heartbeatJsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": HEARTBEAT_CACHE_CONTROL,
    },
  });
}
