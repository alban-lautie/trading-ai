import Link from "next/link"
import { MessageSquare } from "lucide-react"

import { NewChatButton } from "@/components/chat/new-chat-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ConversationSummary } from "@/features/chat/queries"

interface PositionChatsSectionProps {
  positionId: string
  conversations: ConversationSummary[]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** "Chats avec l'IA" section embedded on the position detail page. */
export function PositionChatsSection({
  positionId,
  conversations,
}: PositionChatsSectionProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-base">Chats avec l&apos;IA</CardTitle>
          <CardDescription>
            Discute avec Claude sur cette position. Il récupère la courbe, les
            actus et les fondamentaux à la demande.
          </CardDescription>
        </div>
        <NewChatButton
          positions={[]}
          presetPositionId={positionId}
          label="Nouvelle conversation"
        />
      </CardHeader>
      <CardContent>
        {conversations.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            Aucune conversation pour le moment.
          </p>
        ) : (
          <ul className="divide-y">
            {conversations.map(({ conversation, lastMessage }) => {
              const subtitle =
                conversation.title ??
                lastMessage?.content ??
                "Nouvelle conversation"
              return (
                <li key={conversation.id}>
                  <Link
                    href={`/chat/${conversation.id}`}
                    className="hover:bg-accent/50 flex items-center gap-3 px-2 py-3 transition-colors"
                  >
                    <MessageSquare className="text-muted-foreground size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">
                        {subtitle}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatDate(conversation.updated_at)}
                      </p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
