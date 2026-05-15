"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createAlert } from "@/features/alerts/actions"
import { alertTypes } from "@/features/alerts/schema"
import { ALERT_TYPE_LABELS } from "@/lib/alert-labels"
import type { AlertType } from "@/lib/types"

interface AlertFormFields {
  symbol: string
  threshold: string
}

/** Dialog hosting the create alert form. */
export function CreateAlertDialog() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<AlertType>("price_above")
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AlertFormFields>({
    defaultValues: { symbol: "", threshold: "" },
  })

  function onSubmit(values: AlertFormFields) {
    const formData = new FormData()
    formData.set("symbol", values.symbol)
    formData.set("threshold", values.threshold)
    formData.set("type", type)

    startTransition(async () => {
      const result = await createAlert({}, formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Alerte créée")
      setOpen(false)
      reset()
      setType("price_above")
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nouvelle alerte</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle alerte</DialogTitle>
          <DialogDescription>
            Recevez un email dès que le seuil est atteint.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="symbol">Symbole (ticker)</Label>
            <Input
              id="symbol"
              placeholder="AAPL"
              {...register("symbol", { required: "Le symbole est requis" })}
            />
            {errors.symbol ? (
              <p className="text-destructive text-sm">
                {errors.symbol.message}
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label>Condition</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as AlertType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {alertTypes.map((alertType) => (
                  <SelectItem key={alertType} value={alertType}>
                    {ALERT_TYPE_LABELS[alertType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="threshold">Seuil</Label>
            <Input
              id="threshold"
              type="number"
              step="any"
              {...register("threshold", { required: "Le seuil est requis" })}
            />
            {errors.threshold ? (
              <p className="text-destructive text-sm">
                {errors.threshold.message}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Création…" : "Créer l'alerte"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
