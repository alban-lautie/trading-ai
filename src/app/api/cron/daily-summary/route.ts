import { NextResponse, type NextRequest } from "next/server"

import { runDailySummaries } from "@/features/dashboard/cron"
import { checkCronAuth } from "@/lib/cron-auth"

/**
 * POST /api/cron/daily-summary
 *
 * Generates the daily AI summary for every user. Invoked on a schedule by
 * pg_cron (weekdays, after the US market opens) and protected by CRON_SECRET.
 */
export async function POST(request: NextRequest) {
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
