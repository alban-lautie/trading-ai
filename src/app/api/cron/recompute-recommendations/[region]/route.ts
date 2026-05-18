import { NextResponse, type NextRequest } from "next/server"

import { recomputeRegionRecommendations } from "@/features/positions/recompute-recommendations"
import { checkCronAuth } from "@/lib/cron-auth"
import type { MarketRegion } from "@/lib/market-hours"

/** Maps the URL segment to a market region. */
const REGIONS: Record<string, MarketRegion> = { us: "US", eu: "EU" }

/**
 * GET /api/cron/recompute-recommendations/[region]
 *
 * Recomputes the AI sell recommendations for every position of the given
 * region (`us` or `eu`), then refreshes the affected daily summaries. Invoked
 * once per weekday by Vercel Cron, scheduled at that market's open. Protected
 * by the shared CRON_SECRET bearer token.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ region: string }> }
) {
  const denied = checkCronAuth(request)
  if (denied) return denied

  const { region } = await params
  const marketRegion = REGIONS[region.toLowerCase()]
  if (!marketRegion) {
    return NextResponse.json(
      { error: `Unknown region: ${region}` },
      { status: 400 }
    )
  }

  try {
    const result = await recomputeRegionRecommendations(marketRegion)
    return NextResponse.json({ ok: true, ...result })
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Recompute failed" },
      { status: 500 }
    )
  }
}
