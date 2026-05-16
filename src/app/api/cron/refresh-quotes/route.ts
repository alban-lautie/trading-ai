import { NextResponse, type NextRequest } from "next/server"

import { refreshQuotes } from "@/features/quotes/refresh"

/**
 * POST /api/cron/refresh-quotes
 *
 * Refreshes the stored quotes for every held symbol. Invoked on a schedule by
 * pg_cron and protected by the shared CRON_SECRET bearer token.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
    )
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await refreshQuotes()
    return NextResponse.json({ ok: true, ...result })
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Refresh failed" },
      { status: 500 }
    )
  }
}
