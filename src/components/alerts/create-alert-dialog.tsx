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
import { ALERT_TYPE_LABELS, isPercentAlertType } from "@/lib/alert-labels"
import type { AlertType, Position } from "@/lib/types"

interface AlertFormFields {
  threshold: string
}

interface CreateAlertDialogProps {
  positions: Position[]
}

/** Dialog hosting the create alert form. */
export function CreateAlertDialog({ positions }: CreateAlertDialogProps) {
  const [open, setOpen] = useState(false)
  const [positionId, setPositionId] = useState("")
  const [type, setType] = useState<AlertType>("price_above")
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AlertFormFields>({ defaultValues: { threshold: "" } })

  const hasPositions = positions.length > 0
  const isPercent = isPercentAlertType(type)

  function onSubmit(values: AlertFormFields) {
    if (!positionId) {
      toast.error("Choisissez une action")
      return
    }

    const formData = new FormData()
    formData.set("positionId", positionId)
    formData.set("type", type)
    formData.set("threshold", values.threshold)

    startTransition(async () => {
      const result = await createAlert({}, formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Alerte créée")
      setOpen(false)
      reset()
      setPositionId("")
      setType("price_above")
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={!hasPositions}
          title={
            hasPositions ? undefined : "Ajoutez d'abord une position"
          }
        >
          Nouvelle alerte
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle alerte</DialogTitle>
          <DialogDescription>
            Recevez une notification Telegram dès que la condition est
            remplie.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Action</Label>
            <Select value={positionId} onValueChange={setPositionId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une action" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((position) => (
                  <SelectItem key={position.id} value={position.id}>
                    {position.symbol}
                    {position.name ? ` — ${position.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label htmlFor="threshold">
              {isPercent ? "Seuil (%)" : "Seuil de cours"}
            </Label>
            <Input
              id="threshold"
              type="number"
              step="any"
              min="0"
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
