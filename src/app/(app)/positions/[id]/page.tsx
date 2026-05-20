import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { AlertsList } from "@/components/alerts/alerts-list"
import { PositionChatsSection } from "@/components/chat/position-chats-section"
import { PositionBenchmarks } from "@/components/positions/position-benchmarks"
import { PositionDetailActions } from "@/components/positions/position-detail-actions"
import { PositionEntryCard } from "@/components/positions/position-entry-card"
import { PositionInfoCard } from "@/components/positions/position-info-card"
import { PositionMonitoringSwitch } from "@/components/positions/position-monitoring-switch"
import { PositionInsight } from "@/components/positions/position-insight"
import { PositionMetricCards } from "@/components/positions/position-metric-cards"
import { PositionNews } from "@/components/positions/position-news"
import { PositionProposals } from "@/components/positions/position-proposals"
import { PositionPriceChart } from "@/components/positions/position-price-chart"
import { listConversationsForPosition } from "@/features/chat/queries"
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
  const [detail, conversations] = await Promise.all([
    getPositionDetail(id),
    listConversationsForPosition(id),
  ])
  if (!detail) {
    notFound()
  }

  const { metrics, alerts, history, news, portfolioWeight, recommendation } =
    detail
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
        <div className="flex items-center gap-3">
          <PositionMonitoringSwitch
            positionId={position.id}
            initialEnabled={position.monitoring_enabled}
          />
          <PositionDetailActions position={position} />
        </div>
      </header>

      <PositionMetricCards metrics={metrics} />

      <PositionEntryCard metrics={metrics} />

      <PositionProposals
        metrics={metrics}
        alerts={alerts}
        recommendation={recommendation}
      />

      <PositionPriceChart symbol={position.symbol} initialHistory={history} />

      <div className="grid gap-6 lg:grid-cols-2">
        <PositionBenchmarks
          metrics={metrics}
          history={history}
          portfolioWeight={portfolioWeight}
        />
        <PositionInfoCard position={position} />
      </div>

      <PositionInsight positionId={position.id} />

      <PositionChatsSection
        positionId={position.id}
        conversations={conversations}
      />

      <PositionNews news={news} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Alertes sur cette position
        </h2>
        <AlertsList alerts={alerts} />
      </section>
    </div>
  )
}
