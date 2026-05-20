"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import type { ConversationSummary } from "@/features/chat/queries"

interface ChatConversationListProps {
  conversations: ConversationSummary[]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  })
}

/** Sidebar list of the user's chat conversations, highlighting the active one. */
export function ChatConversationList({
  conversations,
}: ChatConversationListProps) {
  const pathname = usePathname()

  if (conversations.length === 0) {
    return (
      <p className="text-muted-foreground px-3 py-4 text-sm">
        Aucune conversation pour l&apos;instant.
      </p>
    )
  }

  return (
    <nav className="flex flex-col gap-1 py-2">
      {conversations.map(({ conversation, position, lastMessage }) => {
        const href = `/chat/${conversation.id}`
        const isActive = pathname === href
        const subtitle =
          conversation.title ?? lastMessage?.content ?? "Nouvelle conversation"
        return (
          <Link
            key={conversation.id}
            href={href}
            className={cn(
              "block rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/60"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{position.symbol}</span>
              <span className="text-muted-foreground shrink-0 text-xs">
                {formatDate(conversation.updated_at)}
              </span>
            </div>
            <p className="text-muted-foreground line-clamp-2 text-xs">
              {subtitle}
            </p>
          </Link>
        )
      })}
    </nav>
  )
}
