import { listConversations } from "@/features/chat/queries"
import { listPositions } from "@/features/positions/queries"

import { ChatConversationList } from "@/components/chat/chat-conversation-list"
import { NewChatButton } from "@/components/chat/new-chat-button"

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [conversations, positions] = await Promise.all([
    listConversations(),
    listPositions(),
  ])

  return (
    <div className="grid h-[calc(100vh-8rem)] gap-4 md:grid-cols-[18rem_1fr]">
      <aside className="bg-card flex h-full flex-col rounded-lg border">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight">
            Conversations
          </h2>
          <NewChatButton positions={positions} variant="outline" label="Nouveau" />
        </div>
        <div className="flex-1 overflow-y-auto">
          <ChatConversationList conversations={conversations} />
        </div>
      </aside>
      <section className="bg-card h-full overflow-hidden rounded-lg border">
        {children}
      </section>
    </div>
  )
}
