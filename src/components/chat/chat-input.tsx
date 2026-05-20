"use client"

import { useState, useTransition, type KeyboardEvent } from "react"
import { Send } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { sendChatMessage } from "@/features/chat/actions"
import { CHAT_MESSAGE_MAX_LENGTH } from "@/features/chat/schema"
import type { ChatMessage } from "@/lib/types"

interface ChatInputProps {
  conversationId: string
  onMessagesSent: (messages: ChatMessage[]) => void
}

/** Multi-line textarea + send button. Ctrl/Cmd+Enter submits. */
export function ChatInput({ conversationId, onMessagesSent }: ChatInputProps) {
  const [value, setValue] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    const content = value.trim()
    if (!content || isPending) return

    startTransition(async () => {
      const result = await sendChatMessage({ conversationId, content })

      if (result.error) {
        toast.error(result.error)
        if (result.userMessage) {
          onMessagesSent([result.userMessage])
          setValue("")
        }
        return
      }

      if (result.userMessage && result.assistantMessage) {
        onMessagesSent([result.userMessage, result.assistantMessage])
        setValue("")
      }
    })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Pose une question sur cette position…"
        rows={2}
        maxLength={CHAT_MESSAGE_MAX_LENGTH}
        disabled={isPending}
      />
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          {isPending
            ? "L'IA réfléchit…"
            : "⌘/Ctrl + ↵ pour envoyer"}
        </p>
        <Button
          onClick={handleSubmit}
          disabled={isPending || value.trim().length === 0}
          size="sm"
        >
          <Send className="size-4" />
          Envoyer
        </Button>
      </div>
    </div>
  )
}
