import { NextResponse, type NextRequest } from "next/server"

import {
  getPriceHistory,
  MarketDataError,
  type ChartRange,
} from "@/lib/market-data"
import { createClient } from "@/lib/supabase/server"

const VALID_RANGES: ChartRange[] = ["1mo", "6mo", "1y"]

/**
 * GET /api/history?symbol=AAPL&range=6mo
 *
 * Returns the price history of a symbol. Used by the position detail chart
 * when the user switches range. Restricted to authenticated users.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const symbol = request.nextUrl.searchParams.get("symbol")
  const range = request.nextUrl.searchParams.get("range") as ChartRange | null

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 })
  }
  if (!range || !VALID_RANGES.includes(range)) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 })
  }

  try {
    const history = await getPriceHistory(symbol, range)
    return NextResponse.json(history)
  } catch (cause) {
    const message =
      cause instanceof MarketDataError
        ? cause.message
        : "Price history is temporarily unavailable."
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
