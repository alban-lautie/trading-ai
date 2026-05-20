import type { Metadata } from "next"
import { MessageSquare } from "lucide-react"

import { NewChatButton } from "@/components/chat/new-chat-button"
import { listConversations } from "@/features/chat/queries"
import { listPositions } from "@/features/positions/queries"

export const metadata: Metadata = { title: "Chat IA" }

export default async function ChatIndexPage() {
  const [conversations, positions] = await Promise.all([
    listConversations(),
    listPositions(),
  ])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <MessageSquare className="size-6" />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">
          {conversations.length === 0
            ? "Démarre une discussion avec l'IA"
            : "Sélectionne une conversation"}
        </h1>
        <p className="text-muted-foreground max-w-md text-sm">
          Pose des questions à Claude sur une position : il va chercher la
          courbe, les actus, les indicateurs et les fondamentaux à la demande.
        </p>
      </div>
      <NewChatButton positions={positions} />
    </div>
  )
}
