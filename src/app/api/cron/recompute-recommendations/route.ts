import { NextResponse, type NextRequest } from "next/server"

import { recomputeAtMarketOpen } from "@/features/positions/market-open"
import { checkCronAuth } from "@/lib/cron-auth"

/**
 * POST /api/cron/recompute-recommendations
 *
 * Invoked every 5 minutes by pg_cron. Recomputes the AI sell recommendations
 * for positions whose market has just opened, then refreshes the affected
 * daily summaries. A no-op outside the US and EU market opening windows.
 * Protected by the shared CRON_SECRET bearer token.
 */
export async function POST(request: NextRequest) {
  const denied = checkCronAuth(request)
  if (denied) return denied

  try {
    const result = await recomputeAtMarketOpen()
    return NextResponse.json({ ok: true, ...result })
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Recompute failed" },
      { status: 500 }
    )
  }
}
