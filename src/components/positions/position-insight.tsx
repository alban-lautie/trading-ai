"use client"

import { useState, useTransition } from "react"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { analyzePosition } from "@/features/positions/insight"

interface PositionInsightProps {
  positionId: string
}

/** On-demand AI reading of the position to support a decision. */
export function PositionInsight({ positionId }: PositionInsightProps) {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAnalyze() {
    startTransition(async () => {
      const result = await analyzePosition(positionId)
      if (result.error || !result.analysis) {
        toast.error(result.error ?? "Analyse indisponible.")
        return
      }
      setAnalysis(result.analysis)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Analyse IA</CardTitle>
        <CardDescription>
          Une lecture de cette position par l&apos;IA — ce n&apos;est pas un
          conseil en investissement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {analysis ? (
          <p className="text-sm leading-relaxed whitespace-pre-line">
            {analysis}
          </p>
        ) : null}
        <Button
          onClick={handleAnalyze}
          disabled={isPending}
          variant={analysis ? "outline" : "default"}
        >
          <Sparkles className="size-4" />
          {isPending
            ? "Analyse en cours…"
            : analysis
              ? "Régénérer l'analyse"
              : "Demander une analyse IA"}
        </Button>
      </CardContent>
    </Card>
  )
}
