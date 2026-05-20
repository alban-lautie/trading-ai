import "server-only"

import { requireUser } from "@/features/auth"
import type { ChatConversation, ChatMessage, Position } from "@/lib/types"

export interface ConversationSummary {
  conversation: ChatConversation
  position: Pick<Position, "id" | "symbol" | "name" | "currency">
  /** Last message of the conversation (any role), or `null` when empty. */
  lastMessage: Pick<ChatMessage, "role" | "content" | "created_at"> | null
}

/** Lists every conversation owned by the current user, newest first. */
export async function listConversations(): Promise<ConversationSummary[]> {
  const { user, supabase } = await requireUser()

  const { data, error } = await supabase
    .from("chat_conversations")
    .select(
      `
      *,
      position:positions ( id, symbol, name, currency ),
      messages:chat_messages ( role, content, created_at )
    `
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to load chat conversations: ${error.message}`)
  }

  return (data ?? [])
    .filter((row) => row.position !== null)
    .map((row) => {
      const messages = row.messages ?? []
      const lastMessage =
        messages.length > 0
          ? messages.reduce((acc, current) =>
              new Date(current.created_at).getTime() >
              new Date(acc.created_at).getTime()
                ? current
                : acc
            )
          : null
      const { messages: _omitted, position, ...conversation } = row
      void _omitted
      return {
        conversation: conversation as ChatConversation,
        position: position as ConversationSummary["position"],
        lastMessage,
      }
    })
}

/** Lists the conversations attached to a given position, newest first. */
export async function listConversationsForPosition(
  positionId: string
): Promise<ConversationSummary[]> {
  const all = await listConversations()
  return all.filter((entry) => entry.conversation.position_id === positionId)
}

export interface ConversationDetail {
  conversation: ChatConversation
  position: Position
  messages: ChatMessage[]
}

/**
 * Loads a conversation with its full message history. Returns `null` when the
 * conversation does not exist or does not belong to the current user.
 */
export async function getConversation(
  conversationId: string
): Promise<ConversationDetail | null> {
  const { user, supabase } = await requireUser()

  const { data: conversation, error } = await supabase
    .from("chat_conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load conversation: ${error.message}`)
  }
  if (!conversation) {
    return null
  }

  const [{ data: position, error: positionError }, { data: messages, error: messagesError }] =
    await Promise.all([
      supabase
        .from("positions")
        .select("*")
        .eq("id", conversation.position_id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }),
    ])

  if (positionError) {
    throw new Error(`Failed to load position: ${positionError.message}`)
  }
  if (!position) {
    return null
  }
  if (messagesError) {
    throw new Error(`Failed to load messages: ${messagesError.message}`)
  }

  return {
    conversation,
    position,
    messages: messages ?? [],
  }
}
