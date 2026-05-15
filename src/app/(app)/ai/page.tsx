import type { Metadata } from "next"

import { AiConfigForm } from "@/components/ai/ai-config-form"
import { GenerateReportButton } from "@/components/ai/generate-report-button"
import { ReportList } from "@/components/ai/report-list"
import { getAiConfig, getAiReports } from "@/features/ai-monitoring/queries"

export const metadata: Metadata = { title: "Suivi IA" }

export default async function AiPage() {
  const [config, reports] = await Promise.all([getAiConfig(), getAiReports()])

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suivi IA</h1>
          <p className="text-muted-foreground text-sm">
            Une analyse de votre portefeuille générée par l&apos;IA.
          </p>
        </div>
        <GenerateReportButton />
      </header>

      <AiConfigForm config={config} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Analyses</h2>
        <ReportList reports={reports} />
      </section>
    </div>
  )
}
