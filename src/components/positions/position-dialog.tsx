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
import { Textarea } from "@/components/ui/textarea"
import { createPosition, updatePosition } from "@/features/positions/actions"
import type { Position } from "@/lib/types"

interface PositionFormFields {
  symbol: string
  name: string
  quantity: string
  averagePrice: string
  currency: string
  openedAt: string
  notes: string
}

interface PositionDialogProps {
  position?: Position
  trigger: React.ReactNode
}

/** Dialog hosting the create / edit position form. */
export function PositionDialog({ position, trigger }: PositionDialogProps) {
  const isEdit = Boolean(position)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PositionFormFields>({
    defaultValues: {
      symbol: position?.symbol ?? "",
      name: position?.name ?? "",
      quantity: position ? String(position.quantity) : "",
      averagePrice: position ? String(position.average_price) : "",
      currency: position?.currency ?? "USD",
      openedAt: position?.opened_at ?? "",
      notes: position?.notes ?? "",
    },
  })

  function onSubmit(values: PositionFormFields) {
    const formData = new FormData()
    Object.entries(values).forEach(([key, value]) => formData.set(key, value))

    startTransition(async () => {
      const result = isEdit
        ? await updatePosition(position!.id, {}, formData)
        : await createPosition({}, formData)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(isEdit ? "Position mise à jour" : "Position ajoutée")
      setOpen(false)
      if (!isEdit) reset()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la position" : "Nouvelle position"}
          </DialogTitle>
          <DialogDescription>
            Renseignez l&apos;action, la quantité et le prix d&apos;achat.
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
            <Label htmlFor="name">Nom (optionnel)</Label>
            <Input id="name" placeholder="Apple Inc." {...register("name")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantité</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                min="0"
                {...register("quantity", { required: "Quantité requise" })}
              />
              {errors.quantity ? (
                <p className="text-destructive text-sm">
                  {errors.quantity.message}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="averagePrice">Prix d&apos;achat</Label>
              <Input
                id="averagePrice"
                type="number"
                step="any"
                min="0"
                {...register("averagePrice", { required: "Prix requis" })}
              />
              {errors.averagePrice ? (
                <p className="text-destructive text-sm">
                  {errors.averagePrice.message}
                </p>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="currency">Devise</Label>
              <Input id="currency" maxLength={3} {...register("currency")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="openedAt">Date d&apos;achat</Label>
              <Input id="openedAt" type="date" {...register("openedAt")} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea id="notes" rows={2} {...register("notes")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
