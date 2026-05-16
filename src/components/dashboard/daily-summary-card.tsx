"use client"

import { useState, useTransition } from "react"
import { RefreshCw, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { generateDailySummary } from "@/features/dashboard/actions"
import type { DailySummary } from "@/features/dashboard/queries"

interface DailySummaryCardProps {
  initialSummary: DailySummary | null
}

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
})

/** Daily AI summary of the portfolio — what to sell and when. */
export function DailySummaryCard({ initialSummary }: DailySummaryCardProps) {
  const [summary, setSummary] = useState(initialSummary)
  const [isPending, startTransition] = useTransition()

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateDailySummary()
      if (result.error || !result.content) {
        toast.error(result.error ?? "Génération impossible.")
        return
      }
      setSummary({
        content: result.content,
        createdAt: new Date().toISOString(),
      })
      toast.success("Résumé généré")
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Résumé IA du jour</CardTitle>
          <Sparkles className="text-primary size-4" />
        </div>
        <CardDescription>
          Quoi vendre et quand —{" "}
          {summary
            ? `généré le ${timeFormatter.format(new Date(summary.createdAt))}`
            : "non généré aujourd'hui"}
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary ? (
          <p className="text-sm leading-relaxed whitespace-pre-line">
            {summary.content}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Générez le résumé du jour pour obtenir une lecture actionnable de
            votre portefeuille.
          </p>
        )}
        <Button
          onClick={handleGenerate}
          disabled={isPending}
          variant={summary ? "outline" : "default"}
        >
          <RefreshCw className="size-4" />
          {isPending
            ? "Génération…"
            : summary
              ? "Régénérer"
              : "Générer le résumé du jour"}
        </Button>
      </CardContent>
    </Card>
  )
}
