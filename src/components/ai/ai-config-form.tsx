"use client"

import { useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { updateAiConfig } from "@/features/ai-monitoring/actions"
import {
  aiDeliveries,
  aiFocusAreas,
  aiFrequencies,
  type AiConfigFormValues,
} from "@/features/ai-monitoring/schema"
import type { AiMonitoringConfig } from "@/lib/types"

const FREQUENCY_LABELS: Record<(typeof aiFrequencies)[number], string> = {
  daily: "Quotidien",
  weekly: "Hebdomadaire",
  monthly: "Mensuel",
}

const DELIVERY_LABELS: Record<(typeof aiDeliveries)[number], string> = {
  telegram: "Telegram",
  in_app: "Dans l'application",
  both: "Telegram + application",
}

const FOCUS_LABELS: Record<(typeof aiFocusAreas)[number], string> = {
  risk: "Risque",
  diversification: "Diversification",
  opportunities: "Opportunités",
  performance: "Performance",
}

interface AiConfigFormProps {
  config: AiMonitoringConfig
}

/** Form to configure the parametrable AI monitoring of the portfolio. */
export function AiConfigForm({ config }: AiConfigFormProps) {
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, control, setValue } =
    useForm<AiConfigFormValues>({
      defaultValues: {
        isEnabled: config.is_enabled,
        frequency: config.frequency,
        tone: config.tone,
        focusAreas: config.focus_areas.filter(
          (area): area is (typeof aiFocusAreas)[number] =>
            (aiFocusAreas as readonly string[]).includes(area)
        ),
        delivery: config.delivery,
      },
    })

  const isEnabled = useWatch({ control, name: "isEnabled" })
  const frequency = useWatch({ control, name: "frequency" })
  const delivery = useWatch({ control, name: "delivery" })
  const focusAreas = useWatch({ control, name: "focusAreas" })

  function toggleFocus(area: (typeof aiFocusAreas)[number]) {
    const next = focusAreas.includes(area)
      ? focusAreas.filter((value) => value !== area)
      : [...focusAreas, area]
    setValue("focusAreas", next)
  }

  function onSubmit(values: AiConfigFormValues) {
    startTransition(async () => {
      const result = await updateAiConfig(values)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Configuration enregistrée")
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration du suivi IA</CardTitle>
        <CardDescription>
          Paramétrez l&apos;analyse automatique de votre portefeuille.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Suivi IA actif</Label>
              <p className="text-muted-foreground text-sm">
                Active l&apos;analyse périodique de votre portefeuille.
              </p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={(value) => setValue("isEnabled", value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Fréquence</Label>
            <Select
              value={frequency}
              onValueChange={(value) =>
                setValue("frequency", value as AiConfigFormValues["frequency"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {aiFrequencies.map((value) => (
                  <SelectItem key={value} value={value}>
                    {FREQUENCY_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tone">Ton de l&apos;analyse</Label>
            <Input
              id="tone"
              placeholder="neutre, pédagogue, direct…"
              {...register("tone", { required: true })}
            />
          </div>

          <div className="grid gap-2">
            <Label>Axes d&apos;analyse</Label>
            <div className="grid grid-cols-2 gap-2">
              {aiFocusAreas.map((area) => (
                <label
                  key={area}
                  className="flex items-center gap-2 rounded-md border p-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={focusAreas.includes(area)}
                    onChange={() => toggleFocus(area)}
                  />
                  {FOCUS_LABELS[area]}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Mode de restitution</Label>
            <Select
              value={delivery}
              onValueChange={(value) =>
                setValue("delivery", value as AiConfigFormValues["delivery"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {aiDeliveries.map((value) => (
                  <SelectItem key={value} value={value}>
                    {DELIVERY_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={isPending} className="justify-self-start">
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
