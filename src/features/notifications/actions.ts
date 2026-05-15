"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/features/auth"
import {
  getTelegramBotUsername,
  getTelegramUpdates,
  sendTelegramMessage,
  TelegramError,
} from "@/lib/telegram/client"

export interface NotificationActionResult {
  error?: string
  success?: boolean
}

/** Result of starting the Telegram linking flow. */
export interface TelegramLinkResult {
  error?: string
  code?: string
  botUsername?: string
}

function telegramErrorMessage(cause: unknown): string {
  return cause instanceof TelegramError
    ? cause.message
    : "Telegram est injoignable. Réessayez plus tard."
}

function generateLinkCode(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()
}

/**
 * Starts linking the user's Telegram account: stores a one-time code and
 * returns it along with the bot username so the UI can build a deep link.
 */
export async function startTelegramLink(): Promise<TelegramLinkResult> {
  const { user, supabase } = await requireUser()

  let botUsername: string
  try {
    botUsername = await getTelegramBotUsername()
  } catch (cause) {
    return { error: telegramErrorMessage(cause) }
  }

  const code = generateLinkCode()
  const { error } = await supabase
    .from("notification_settings")
    .upsert(
      { user_id: user.id, telegram_link_code: code },
      { onConflict: "user_id" }
    )

  if (error) {
    return { error: error.message }
  }

  return { code, botUsername }
}

/**
 * Completes the linking flow: looks for the one-time code among the messages
 * the bot received and stores the matching chat as the user's Telegram chat.
 */
export async function completeTelegramLink(): Promise<NotificationActionResult> {
  const { user, supabase } = await requireUser()

  const { data: settings } = await supabase
    .from("notification_settings")
    .select("telegram_link_code")
    .eq("user_id", user.id)
    .maybeSingle()

  const code = settings?.telegram_link_code
  if (!code) {
    return { error: "Démarrez d'abord la connexion." }
  }

  let messages
  try {
    messages = await getTelegramUpdates()
  } catch (cause) {
    return { error: telegramErrorMessage(cause) }
  }

  const match = [...messages]
    .reverse()
    .find((message) => message.text?.includes(code))

  if (!match) {
    return {
      error: "Code non reçu. Envoyez le code au bot puis réessayez.",
    }
  }

  const chatId = String(match.chat.id)
  const { error } = await supabase
    .from("notification_settings")
    .update({
      telegram_chat_id: chatId,
      telegram_username: match.chat.username ?? match.chat.first_name ?? null,
      telegram_linked_at: new Date().toISOString(),
      telegram_link_code: null,
    })
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  try {
    await sendTelegramMessage(
      chatId,
      "✅ *Trading AI* — votre compte est connecté. Vos alertes arriveront ici."
    )
  } catch {
    // The chat is linked; the confirmation message is best-effort.
  }

  revalidatePath("/alerts")
  return { success: true }
}

/** Sends a test notification to the linked Telegram chat. */
export async function sendTestNotification(): Promise<NotificationActionResult> {
  const { user, supabase } = await requireUser()

  const { data: settings } = await supabase
    .from("notification_settings")
    .select("telegram_chat_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!settings?.telegram_chat_id) {
    return { error: "Aucun compte Telegram connecté." }
  }

  try {
    await sendTelegramMessage(
      settings.telegram_chat_id,
      "🔔 *Trading AI* — ceci est une notification de test."
    )
  } catch (cause) {
    return { error: telegramErrorMessage(cause) }
  }

  return { success: true }
}

/** Unlinks the user's Telegram account. */
export async function disconnectTelegram(): Promise<NotificationActionResult> {
  const { user, supabase } = await requireUser()

  const { error } = await supabase
    .from("notification_settings")
    .update({
      telegram_chat_id: null,
      telegram_username: null,
      telegram_linked_at: null,
      telegram_link_code: null,
    })
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/alerts")
  return { success: true }
}
