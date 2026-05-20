import { cn } from "@/lib/utils"
import type { ChatMessage as ChatMessageType } from "@/lib/types"

interface ChatMessageProps {
  message: Pick<ChatMessageType, "role" | "content" | "created_at">
}

/** Renders a single chat bubble, styled differently for user vs assistant. */
export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {message.content}
      </div>
    </div>
  )
}
