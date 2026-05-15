import "server-only"

import { Resend } from "resend"

/**
 * Resend email client. Used to deliver alert notifications and AI monitoring
 * reports. All sending goes through {@link sendEmail} so the sender address
 * and error handling stay in one place.
 */

let client: Resend | null = null

function getClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured")
    }
    client = new Resend(apiKey)
  }
  return client
}

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

/** Sends a transactional email. Returns the Resend message id on success. */
export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailParams): Promise<string> {
  const from = process.env.RESEND_FROM_EMAIL
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not configured")
  }

  const { data, error } = await getClient().emails.send({
    from,
    to,
    subject,
    html,
  })

  if (error) {
    throw new Error(`Resend failed to send email: ${error.message}`)
  }

  return data?.id ?? ""
}
