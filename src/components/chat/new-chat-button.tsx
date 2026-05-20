"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Plus } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createConversation } from "@/features/chat/actions"
import type { Position } from "@/lib/types"

interface NewChatButtonProps {
  positions: Pick<Position, "id" | "symbol" | "name">[]
  /** Pre-selects a position and skips the dialog when set. */
  presetPositionId?: string
  variant?: "default" | "outline" | "secondary"
  label?: string
}

/**
 * Creates a new chat conversation. When `presetPositionId` is set, the button
 * fires the action immediately; otherwise it opens a dialog to pick the
 * position first.
 */
export function NewChatButton({
  positions,
  presetPositionId,
  variant = "default",
  label = "Nouveau chat",
}: NewChatButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string>(
    presetPositionId ?? positions[0]?.id ?? ""
  )
  const [isPending, startTransition] = useTransition()

  function startChat(positionId: string) {
    startTransition(async () => {
      const result = await createConversation({ positionId })
      if (result.error || !result.conversationId) {
        toast.error(result.error ?? "Échec de la création de la conversation.")
        return
      }
      setOpen(false)
      router.push(`/chat/${result.conversationId}`)
    })
  }

  if (presetPositionId) {
    return (
      <Button
        variant={variant}
        size="sm"
        onClick={() => startChat(presetPositionId)}
        disabled={isPending}
      >
        <Plus className="size-4" />
        {label}
      </Button>
    )
  }

  if (positions.length === 0) {
    return (
      <Button variant={variant} size="sm" disabled>
        <Plus className="size-4" />
        {label}
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          <Plus className="size-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle conversation</DialogTitle>
          <DialogDescription>
            Choisis la position dont tu veux discuter avec l&apos;IA.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="position">Position</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger id="position" className="w-full">
              <SelectValue />
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
        <DialogFooter>
          <Button
            onClick={() => startChat(selected)}
            disabled={isPending || !selected}
          >
            {isPending ? "Création…" : "Démarrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
