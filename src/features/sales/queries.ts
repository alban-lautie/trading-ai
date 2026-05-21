import "server-only"

import { requireUser } from "@/features/auth"
import type { PositionSale } from "@/lib/types"

export interface SaleWithPosition {
  sale: PositionSale
  /** Snapshot of the parent position (still queryable even at quantity = 0). */
  position: {
    id: string
    symbol: string
    name: string | null
  }
  /** Realized P/L in the position currency: (sell - avg buy) × quantity. */
  realizedPnl: number
  /** Realized P/L as a ratio of the cost basis snapshot. */
  realizedPnlPercent: number
  /** Amount invested for the shares sold (avg buy × quantity). */
  costBasis: number
  /** Amount received for the shares sold (sell × quantity). */
  proceeds: number
}

export interface SalesOverview {
  sales: SaleWithPosition[]
  totalCostBasis: number
  totalProceeds: number
  totalRealizedPnl: number
  /** Realized P/L as a ratio of the total cost basis. */
  totalRealizedPnlPercent: number
}

function computeRow(
  sale: PositionSale,
  position: SaleWithPosition["position"]
): SaleWithPosition {
  const quantity = Number(sale.quantity)
  const avgBuy = Number(sale.average_buy_price)
  const sellPrice = Number(sale.sell_price)
  const costBasis = quantity * avgBuy
  const proceeds = quantity * sellPrice
  const realizedPnl = proceeds - costBasis
  const realizedPnlPercent = costBasis > 0 ? realizedPnl / costBasis : 0
  return {
    sale,
    position,
    realizedPnl,
    realizedPnlPercent,
    costBasis,
    proceeds,
  }
}

/** Lists every sale of the current user, with the parent position joined in. */
export async function getSalesOverview(): Promise<SalesOverview> {
  const { user, supabase } = await requireUser()

  const { data, error } = await supabase
    .from("position_sales")
    .select(
      `
      *,
      position:positions ( id, symbol, name )
    `
    )
    .eq("user_id", user.id)
    .order("sold_at", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to load sales: ${error.message}`)
  }

  const sales = (data ?? [])
    .filter((row) => row.position !== null)
    .map((row) => {
      const { position, ...sale } = row
      return computeRow(sale as PositionSale, position as SaleWithPosition["position"])
    })

  const totals = sales.reduce(
    (acc, entry) => {
      acc.totalCostBasis += entry.costBasis
      acc.totalProceeds += entry.proceeds
      acc.totalRealizedPnl += entry.realizedPnl
      return acc
    },
    { totalCostBasis: 0, totalProceeds: 0, totalRealizedPnl: 0 }
  )

  return {
    sales,
    ...totals,
    totalRealizedPnlPercent:
      totals.totalCostBasis > 0
        ? totals.totalRealizedPnl / totals.totalCostBasis
        : 0,
  }
}
