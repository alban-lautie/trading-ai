import { NextResponse, type NextRequest } from "next/server"

import { refreshQuotes } from "@/features/quotes/refresh"
import { checkCronAuth } from "@/lib/cron-auth"

/**
 * GET /api/cron/refresh-quotes
 *
 * Refreshes the stored quotes for every held symbol. Invoked on a schedule by
 * Vercel Cron and protected by the shared CRON_SECRET bearer token.
 */
export async function GET(request: NextRequest) {
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
