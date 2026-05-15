"use client"

import { useTransition } from "react"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { generateReportNow } from "@/features/ai-monitoring/actions"

/** Triggers an on-demand AI analysis of the portfolio. */
export function GenerateReportButton() {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await generateReportNow()
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Analyse générée")
    })
  }

  return (
    <Button onClick={handleClick} disabled={isPending}>
      <Sparkles size={16} />
      {isPending ? "Analyse en cours…" : "Générer une analyse"}
    </Button>
  )
}
