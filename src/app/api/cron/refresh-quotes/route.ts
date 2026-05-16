import { NextResponse, type NextRequest } from "next/server"

import { refreshQuotes } from "@/features/quotes/refresh"
import { checkCronAuth } from "@/lib/cron-auth"

/**
 * POST /api/cron/refresh-quotes
 *
 * Refreshes the stored quotes for every held symbol. Invoked on a schedule by
 * pg_cron and protected by the shared CRON_SECRET bearer token.
 */
export async function POST(request: NextRequest) {
  const denied = checkCronAuth(request)
  if (denied) return denied

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
