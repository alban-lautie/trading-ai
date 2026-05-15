import { NextResponse, type NextRequest } from "next/server"

import { getQuotes, MarketDataError } from "@/lib/market-data"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/quotes?symbols=AAPL,MSFT
 *
 * Returns live quotes for the requested symbols. Restricted to authenticated
 * users so the upstream provider is not exposed to anonymous traffic.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const symbolsParam = request.nextUrl.searchParams.get("symbols")
  const symbols = (symbolsParam ?? "")
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean)

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: {} })
  }

  try {
    const quotes = await getQuotes(symbols)
    return NextResponse.json({ quotes: Object.fromEntries(quotes) })
  } catch (cause) {
    const message =
      cause instanceof MarketDataError
        ? cause.message
        : "Market data is temporarily unavailable."
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
