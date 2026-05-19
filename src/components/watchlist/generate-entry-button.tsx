"use client"

import { useTransition } from "react"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { generateEntryRecommendationNow } from "@/features/watchlist/recommendation-actions"

interface GenerateEntryButtonProps {
  itemId: string
  hasRecommendation: boolean
}

/** Triggers an on-demand AI entry-point recommendation for a watched stock. */
export function GenerateEntryButton({
  itemId,
  hasRecommendation,
}: GenerateEntryButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateEntryRecommendationNow(itemId)
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
