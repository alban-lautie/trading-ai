import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ChatThread } from "@/components/chat/chat-thread"
import { getConversation } from "@/features/chat/queries"

interface ChatConversationPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: ChatConversationPageProps): Promise<Metadata> {
  const { id } = await params
  const detail = await getConversation(id)
  if (!detail) return { title: "Chat IA" }
  const title = detail.conversation.title ?? detail.position.symbol
  return { title: `Chat — ${title}` }
}

export default async function ChatConversationPage({
  params,
}: ChatConversationPageProps) {
  const { id } = await params
  const detail = await getConversation(id)
  if (!detail) {
    notFound()
  }

  return (
    <ChatThread
      conversationId={detail.conversation.id}
      position={{
        symbol: detail.position.symbol,
        name: detail.position.name,
        currency: detail.position.currency,
      }}
      initialMessages={detail.messages}
    />
  )
}
