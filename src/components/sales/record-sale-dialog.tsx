"use client"

import { useEffect, useState, useTransition } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { recordSale } from "@/features/sales/actions"

interface RecordSaleDialogProps {
  positionId: string
  symbol: string
  currency: string
  /** Quantity currently held on the position; caps the input. */
  availableQuantity: number
  /** Optional prefill values from an AI sell tier. */
  prefill?: {
    quantity?: number
    sellPrice?: number
  }
  trigger: React.ReactNode
}

interface FormFields {
  quantity: string
  sellPrice: string
  soldAt: string
  notes: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Form dialog to record a sale (partial or full) on a position. */
export function RecordSaleDialog({
  positionId,
  symbol,
  currency,
  availableQuantity,
  prefill,
  trigger,
}: RecordSaleDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const defaults: FormFields = {
    quantity:
      prefill?.quantity !== undefined
        ? String(Math.min(prefill.quantity, availableQuantity))
        : String(availableQuantity),
    sellPrice: prefill?.sellPrice !== undefined ? String(prefill.sellPrice) : "",
    soldAt: todayIso(),
    notes: "",
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormFields>({
    defaultValues: defaults,
  })

  // Re-sync defaults when the dialog opens so an updated prefill is honored.
  useEffect(() => {
    if (open) {
      reset(defaults)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function onSubmit(values: FormFields) {
    startTransition(async () => {
      const result = await recordSale({
        positionId,
        quantity: values.quantity,
        sellPrice: values.sellPrice,
        soldAt: values.soldAt,
        notes: values.notes,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success("Vente enregistrée")
      setOpen(false)
      reset()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enregistrer une vente — {symbol}</DialogTitle>
          <DialogDescription>
            Indique combien d&apos;actions tu as vendues et à quel prix. La
            quantité restante sur la position sera ajustée automatiquement.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="quantity">
                Quantité (max {availableQuantity})
              </Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                min="0"
                max={availableQuantity}
                {...register("quantity", { required: "Quantité requise" })}
              />
              {errors.quantity ? (
                <p className="text-destructive text-sm">
                  {errors.quantity.message}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sellPrice">Prix de vente ({currency})</Label>
              <Input
                id="sellPrice"
                type="number"
                step="any"
                min="0"
                {...register("sellPrice", { required: "Prix requis" })}
              />
              {errors.sellPrice ? (
                <p className="text-destructive text-sm">
                  {errors.sellPrice.message}
                </p>
              ) : null}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="soldAt">Date de vente</Label>
            <Input
              id="soldAt"
              type="date"
              {...register("soldAt", { required: "Date requise" })}
            />
            {errors.soldAt ? (
              <p className="text-destructive text-sm">
                {errors.soldAt.message}
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea id="notes" rows={2} {...register("notes")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement…" : "Enregistrer la vente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
