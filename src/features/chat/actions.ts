"use server"

import { revalidatePath } from "next/cache"
import type Anthropic from "@anthropic-ai/sdk"

import { requireUser } from "@/features/auth"
import type { ActionResult } from "@/features/positions/actions"
import {
  createConversationSchema,
  sendMessageSchema,
} from "@/features/chat/schema"
import { buildChatToolRunner } from "@/features/chat/tools"
import { chatAboutPosition } from "@/lib/ai/claude"
import type { ChatMessage } from "@/lib/types"

const TITLE_MAX_LENGTH = 60

function deriveTitle(content: string): string {
  const compact = content.replace(/\s+/g, " ").trim()
  if (compact.length <= TITLE_MAX_LENGTH) return compact
  return `${compact.slice(0, TITLE_MAX_LENGTH - 1).trim()}…`
}

export interface CreateConversationResult extends ActionResult {
  conversationId?: string
}

/** Creates a new empty conversation for a given position. */
export async function createConversation(
  values: unknown
): Promise<CreateConversationResult> {
  const parsed = createConversationSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { user, supabase } = await requireUser()

  const { data: position, error: positionError } = await supabase
    .from("positions")
    .select("id")
    .eq("id", parsed.data.positionId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (positionError) {
    return { error: positionError.message }
  }
  if (!position) {
    return { error: "Position introuvable." }
  }

  const { data, error } = await supabase
    .from("chat_conversations")
    .insert({
      user_id: user.id,
      position_id: parsed.data.positionId,
    })
    .select("id")
    .single()

  if (error || !data) {
    return { error: error?.message ?? "Échec de la création de la conversation." }
  }

  revalidatePath("/chat")
  revalidatePath(`/positions/${parsed.data.positionId}`)
  return { success: true, conversationId: data.id }
}

export interface SendMessageResult extends ActionResult {
  userMessage?: ChatMessage
  assistantMessage?: ChatMessage
}

/**
 * Sends a chat message in a conversation and returns the user message plus
 * Claude's reply. The reply is generated through the tool-use loop so Claude
 * fetches market data on demand.
 */
export async function sendChatMessage(
  values: unknown
): Promise<SendMessageResult> {
  const parsed = sendMessageSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { user, supabase } = await requireUser()
  const { conversationId, content } = parsed.data

  const { data: conversation, error: convError } = await supabase
    .from("chat_conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (convError) {
    return { error: convError.message }
  }
  if (!conversation) {
    return { error: "Conversation introuvable." }
  }

  const { data: position, error: positionError } = await supabase
    .from("positions")
    .select("*")
    .eq("id", conversation.position_id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (positionError) {
    return { error: positionError.message }
  }
  if (!position) {
    return { error: "Position introuvable pour cette conversation." }
  }

  const { data: history, error: historyError } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  if (historyError) {
    return { error: historyError.message }
  }

  const { data: insertedUserMessage, error: insertError } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      role: "user",
      content,
    })
    .select("*")
    .single()

  if (insertError || !insertedUserMessage) {
    return { error: insertError?.message ?? "Échec de l'enregistrement du message." }
  }

  const priorMessages: Anthropic.MessageParam[] = (history ?? []).map(
    (message) => ({
      role: message.role,
      content: message.content,
    })
  )
  const claudeMessages: Anthropic.MessageParam[] = [
    ...priorMessages,
    { role: "user", content },
  ]

  let reply: string
  try {
    const result = await chatAboutPosition(
      claudeMessages,
      buildChatToolRunner({ position })
    )
    reply = result.reply
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Échec de l'appel à l'IA."
    return { error: message, userMessage: insertedUserMessage }
  }

  if (!reply) {
    return {
      error: "L'IA n'a pas renvoyé de réponse.",
      userMessage: insertedUserMessage,
    }
  }

  const { data: insertedAssistantMessage, error: assistantError } =
    await supabase
      .from("chat_messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: reply,
      })
      .select("*")
      .single()

  if (assistantError || !insertedAssistantMessage) {
    return {
      error: assistantError?.message ?? "Échec de l'enregistrement de la réponse.",
      userMessage: insertedUserMessage,
    }
  }

  // Set the title from the first user message of the conversation.
  if (!conversation.title) {
    await supabase
      .from("chat_conversations")
      .update({ title: deriveTitle(content) })
      .eq("id", conversationId)
  } else {
    // Bump updated_at so the conversation rises to the top of the list.
    await supabase
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId)
  }

  revalidatePath("/chat")
  revalidatePath(`/chat/${conversationId}`)
  revalidatePath(`/positions/${conversation.position_id}`)

  return {
    success: true,
    userMessage: insertedUserMessage,
    assistantMessage: insertedAssistantMessage,
  }
}

/** Deletes a conversation owned by the current user. */
export async function deleteConversation(
  conversationId: string
): Promise<ActionResult> {
  const { supabase } = await requireUser()

  const { data: conversation, error: fetchError } = await supabase
    .from("chat_conversations")
    .select("position_id")
    .eq("id", conversationId)
    .maybeSingle()

  if (fetchError) {
    return { error: fetchError.message }
  }

  const { error } = await supabase
    .from("chat_conversations")
    .delete()
    .eq("id", conversationId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/chat")
  if (conversation?.position_id) {
    revalidatePath(`/positions/${conversation.position_id}`)
  }
  return { success: true }
}
