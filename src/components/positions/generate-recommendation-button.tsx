"use client"

import { useTransition } from "react"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { generateRecommendationNow } from "@/features/positions/recommendation-actions"

interface GenerateRecommendationButtonProps {
  positionId: string
  hasRecommendation: boolean
}

/** Triggers an on-demand AI recommendation for the position. */
export function GenerateRecommendationButton({
  positionId,
  hasRecommendation,
}: GenerateRecommendationButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateRecommendationNow(positionId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Recommandation mise à jour")
    })
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleGenerate}
      disabled={isPending}
    >
      <Sparkles className="size-4" />
      {isPending
        ? "Génération…"
        : hasRecommendation
          ? "Régénérer"
          : "Générer la recommandation"}
    </Button>
  )
}
