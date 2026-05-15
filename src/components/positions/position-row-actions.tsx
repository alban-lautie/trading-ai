"use client"

import { useTransition } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { PositionDialog } from "@/components/positions/position-dialog"
import { Button } from "@/components/ui/button"
import { deletePosition } from "@/features/positions/actions"
import type { Position } from "@/lib/types"

interface PositionRowActionsProps {
  position: Position
}

/** Edit and delete controls for a single position row. */
export function PositionRowActions({ position }: PositionRowActionsProps) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePosition(position.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Position supprimée")
    })
  }

  return (
    <div className="flex justify-end gap-1">
      <PositionDialog
        position={position}
        trigger={
          <Button variant="ghost" size="icon" aria-label="Modifier">
            <Pencil size={16} />
          </Button>
        }
      />
      <Button
        variant="ghost"
        size="icon"
        aria-label="Supprimer"
        disabled={isPending}
        onClick={handleDelete}
      >
        <Trash2 size={16} />
      </Button>
    </div>
  )
}
