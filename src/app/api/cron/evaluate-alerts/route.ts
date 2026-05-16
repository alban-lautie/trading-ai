import { NextResponse, type NextRequest } from "next/server"

import { evaluateAlerts } from "@/features/alerts/evaluate"
import { checkCronAuth } from "@/lib/cron-auth"

/**
 * POST /api/cron/evaluate-alerts
 *
 * Evaluates every active alert against the latest stored quotes and notifies
 * users on Telegram. Invoked on a schedule by pg_cron and protected by the
 * shared CRON_SECRET bearer token.
 */
export async function POST(request: NextRequest) {
  const denied = checkCronAuth(request)
  if (denied) return denied

  try {
    const result = await evaluateAlerts()
    return NextResponse.json({ ok: true, ...result })
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Evaluation failed" },
      { status: 500 }
    )
  }
}
