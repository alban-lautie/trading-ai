"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { SelectField } from "@/components/positions/select-field"
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
import { CURRENCY_OPTIONS } from "@/features/positions/currencies"
import { TRADING_STYLE_OPTIONS } from "@/features/positions/intentions"
import {
  createWatchlistItem,
  updateWatchlistItem,
} from "@/features/watchlist/actions"
import type { Watchlist } from "@/lib/types"

interface WatchlistFormFields {
  symbol: string
  name: string
  currency: string
  tradingStyle: string
  targetGainPercent: string
  notes: string
}

interface WatchlistDialogProps {
  item?: Watchlist
  trigger: React.ReactNode
}

/** Dialog hosting the create / edit watchlist form. */
export function WatchlistDialog({ item, trigger }: WatchlistDialogProps) {
  const isEdit = Boolean(item)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WatchlistFormFields>({
    defaultValues: {
      symbol: item?.symbol ?? "",
      name: item?.name ?? "",
      currency: item?.currency ?? "USD",
      tradingStyle: item?.trading_style ?? "swing",
      targetGainPercent:
        item?.target_gain_percent != null
          ? String(item.target_gain_percent)
          : "",
      notes: item?.notes ?? "",
    },
  })

  function onSubmit(values: WatchlistFormFields) {
    const formData = new FormData()
    Object.entries(values).forEach(([key, value]) => formData.set(key, value))

    startTransition(async () => {
      const result = isEdit
        ? await updateWatchlistItem(item!.id, {}, formData)
        : await createWatchlistItem({}, formData)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(
        isEdit ? "Action mise à jour" : "Action ajoutée à la watchlist"
      )
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
            {isEdit ? "Modifier l'action surveillée" : "Surveiller une action"}
          </DialogTitle>
          <DialogDescription>
            Renseignez le ticker de l&apos;action à surveiller. L&apos;IA
            proposera ensuite un point d&apos;entrée.
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
            <SelectField
              control={control}
              name="currency"
              label="Devise"
              options={CURRENCY_OPTIONS}
            />
            <SelectField
              control={control}
              name="tradingStyle"
              label="Style de trading"
              options={TRADING_STYLE_OPTIONS}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="targetGainPercent">Gain cible % (optionnel)</Label>
            <Input
              id="targetGainPercent"
              type="number"
              step="any"
              min="0"
              placeholder="20"
              {...register("targetGainPercent")}
            />
            {errors.targetGainPercent ? (
              <p className="text-destructive text-sm">
                {errors.targetGainPercent.message}
              </p>
            ) : null}
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
