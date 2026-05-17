"use client"

import { useTransition } from "react"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { generateAllRecommendations } from "@/features/positions/recommendation-actions"

/** Generates AI sell recommendations for every position of the portfolio. */
export function GenerateAllRecommendationsButton() {
  const [isPending, startTransition] = useTransition()

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateAllRecommendations()
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Recommandations générées pour vos positions")
    })
  }

  return (
    <Button variant="outline" onClick={handleGenerate} disabled={isPending}>
      <Sparkles className="size-4" />
      {isPending ? "Génération…" : "Générer les recommandations"}
    </Button>
  )
}
