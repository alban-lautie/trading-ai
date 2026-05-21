"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Banknote, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { PositionDialog } from "@/components/positions/position-dialog"
import { RecordSaleDialog } from "@/components/sales/record-sale-dialog"
import { Button } from "@/components/ui/button"
import { deletePosition } from "@/features/positions/actions"
import type { Position } from "@/lib/types"

interface PositionDetailActionsProps {
  position: Position
}

/** Edit and delete controls on the position detail page. */
export function PositionDetailActions({ position }: PositionDetailActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePosition(position.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Position supprimée")
      router.push("/positions")
    })
  }

  const quantity = Number(position.quantity)

  return (
    <div className="flex gap-2">
      {quantity > 0 ? (
        <RecordSaleDialog
          positionId={position.id}
          symbol={position.symbol}
          currency={position.currency}
          availableQuantity={quantity}
          trigger={
            <Button>
              <Banknote className="size-4" />
              J&apos;ai vendu
            </Button>
          }
        />
      ) : null}
      <PositionDialog
        position={position}
        trigger={
          <Button variant="outline">
            <Pencil className="size-4" />
            Modifier
          </Button>
        }
      />
      <Button variant="outline" disabled={isPending} onClick={handleDelete}>
        <Trash2 className="size-4" />
        Supprimer
      </Button>
    </div>
  )
}
