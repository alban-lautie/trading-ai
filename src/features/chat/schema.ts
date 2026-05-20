import { z } from "zod"

/** Maximum number of characters allowed in a single chat message. */
export const CHAT_MESSAGE_MAX_LENGTH = 4000

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid("Conversation invalide."),
  content: z
    .string()
    .trim()
    .min(1, "Le message ne peut pas être vide.")
    .max(
      CHAT_MESSAGE_MAX_LENGTH,
      `Le message dépasse ${CHAT_MESSAGE_MAX_LENGTH} caractères.`
    ),
})

export const createConversationSchema = z.object({
  positionId: z.string().uuid("Position invalide."),
})
