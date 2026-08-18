import { NextResponse } from "next/server";

const NO_STORE = "no-store, no-cache, must-revalidate, private";

/** Heartbeat responses are installation-specific and must never be CDN-cached. */
export function heartbeatJsonResponse(
  body: Record<string, unknown>,
  status = 200,
  extraHeaders?: Record<string, string>,
) {
  return NextResponse.json(
    { success: status < 400, ...body },
    {
      status,
      headers: {
        "Cache-Control": NO_STORE,
        Pragma: "no-cache",
        ...extraHeaders,
      },
    },
  );
}

export const HEARTBEAT_CACHE_CONTROL = NO_STORE;
