import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { AlertsList } from "@/components/alerts/alerts-list"
import { PositionDetailActions } from "@/components/positions/position-detail-actions"
import { PositionInfoCard } from "@/components/positions/position-info-card"
import { PositionMetricCards } from "@/components/positions/position-metric-cards"
import { getPositionDetail } from "@/features/positions/queries"

interface PositionDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: PositionDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const detail = await getPositionDetail(id)
  return { title: detail ? detail.metrics.position.symbol : "Position" }
}

export default async function PositionDetailPage({
  params,
}: PositionDetailPageProps) {
  const { id } = await params
  const detail = await getPositionDetail(id)
  if (!detail) {
    notFound()
  }

  const { metrics, alerts } = detail
  const { position } = metrics

  return (
    <div className="space-y-6">
      <Link
        href="/positions"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Positions
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {position.symbol}
          </h1>
          {position.name ? (
            <p className="text-muted-foreground text-sm">{position.name}</p>
          ) : null}
        </div>
        <PositionDetailActions position={position} />
      </header>

      <PositionMetricCards metrics={metrics} />
      <PositionInfoCard position={position} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Alertes sur cette position
        </h2>
        <AlertsList alerts={alerts} />
      </section>
    </div>
  )
}
