import "server-only"

/**
 * Telegram Bot API client.
 *
 * A single bot (identified by TELEGRAM_BOT_TOKEN) delivers every user's alert
 * notifications. This module is the only place that talks to Telegram.
 */

/** Thrown when a Telegram Bot API call fails. */
export class TelegramError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "TelegramError"
  }
}

interface TelegramResponse<T> {
  ok: boolean
  result?: T
  description?: string
}

/** A message as returned by the getUpdates endpoint. */
export interface TelegramUpdateMessage {
  chat: { id: number; username?: string; first_name?: string }
  text?: string
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramUpdateMessage
}

interface TelegramBotInfo {
  id: number
  username: string
}

function getApiBase(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    throw new TelegramError("TELEGRAM_BOT_TOKEN is not configured")
  }
  return `https://api.telegram.org/bot${token}`
}

async function call<T>(
  method: string,
  params?: Record<string, unknown>
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${getApiBase()}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params ?? {}),
      cache: "no-store",
    })
  } catch (cause) {
    throw new TelegramError(`Unable to reach Telegram: ${String(cause)}`)
  }

  const payload = (await response.json()) as TelegramResponse<T>
  if (!payload.ok || payload.result === undefined) {
    throw new TelegramError(
      payload.description ?? `Telegram API error on ${method}`
    )
  }
  return payload.result
}

/** Sends a Markdown-formatted message to a chat. */
export async function sendTelegramMessage(
  chatId: string,
  text: string
): Promise<void> {
  await call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  })
}

/** Returns recent updates received by the bot (messages sent to it). */
export async function getTelegramUpdates(): Promise<TelegramUpdateMessage[]> {
  const updates = await call<TelegramUpdate[]>("getUpdates")
  return updates
    .map((update) => update.message)
    .filter((message): message is TelegramUpdateMessage => Boolean(message))
}

/** Returns the bot's @username, used to build the connection deep link. */
export async function getTelegramBotUsername(): Promise<string> {
  const info = await call<TelegramBotInfo>("getMe")
  return info.username
}
