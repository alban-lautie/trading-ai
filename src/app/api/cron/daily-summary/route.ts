import { NextResponse, type NextRequest } from "next/server"

import { runDailySummaries } from "@/features/dashboard/cron"
import { checkCronAuth } from "@/lib/cron-auth"

/**
 * GET /api/cron/daily-summary
 *
 * Generates the daily AI summary for every user. Invoked on a schedule by
 * Vercel Cron (weekdays, after the US market opens) and protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const denied = checkCronAuth(request)
  if (denied) return denied

  try {
    const result = await runDailySummaries()
    return NextResponse.json({ ok: true, ...result })
  } catch (cause) {
    return NextResponse.json(
      {
        error:
          cause instanceof Error ? cause.message : "Daily summary failed",
      },
      { status: 500 }
    )
  }
}
