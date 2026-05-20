"use client"

import { useEffect, useRef, useState } from "react"

import { ChatInput } from "@/components/chat/chat-input"
import { ChatMessage } from "@/components/chat/chat-message"
import type { ChatMessage as ChatMessageType, Position } from "@/lib/types"

interface ChatThreadProps {
  conversationId: string
  position: Pick<Position, "symbol" | "name" | "currency">
  initialMessages: ChatMessageType[]
}

/**
 * Stateful chat thread: keeps the messages in local state so a new exchange
 * appears immediately without waiting on a server refetch.
 */
export function ChatThread({
  conversationId,
  position,
  initialMessages,
}: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>(initialMessages)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function appendMessages(incoming: ChatMessageType[]) {
    setMessages((current) => {
      const known = new Set(current.map((message) => message.id))
      const fresh = incoming.filter((message) => !known.has(message.id))
      return [...current, ...fresh]
    })
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b px-4 py-3">
        <h2 className="text-base font-semibold tracking-tight">
          {position.symbol}
          {position.name ? (
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              {position.name}
            </span>
          ) : null}
        </h2>
        <p className="text-muted-foreground text-xs">
          Claude voit l&apos;état de la position, la courbe, les actus et les
          fondamentaux à la demande. Ce n&apos;est pas un conseil en
          investissement.
        </p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Pose ta première question sur {position.symbol}.
          </p>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t bg-background px-4 py-3">
        <ChatInput
          conversationId={conversationId}
          onMessagesSent={appendMessages}
        />
      </div>
    </div>
  )
}
