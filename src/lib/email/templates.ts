import type { AlertType } from "@/lib/types"

/** Minimal, inline-styled HTML wrapper shared by every email. */
function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <h1 style="font-size:18px;color:#18181b;margin:0 0 16px;">${title}</h1>
      <div style="background:#ffffff;border-radius:12px;padding:24px;color:#3f3f46;font-size:14px;line-height:1.6;">
        ${body}
      </div>
      <p style="color:#a1a1aa;font-size:12px;margin-top:24px;">
        Trading AI — portfolio tracking &amp; AI monitoring.
      </p>
    </div>
  </body>
</html>`
}

const ALERT_LABELS: Record<AlertType, string> = {
  price_above: "price rose above",
  price_below: "price fell below",
  change_percent_above: "daily change rose above",
  change_percent_below: "daily change fell below",
}

interface AlertEmailParams {
  symbol: string
  type: AlertType
  threshold: number
  currentValue: number
}

/** Builds the HTML for a triggered price/variation alert. */
export function renderAlertEmail({
  symbol,
  type,
  threshold,
  currentValue,
}: AlertEmailParams): { subject: string; html: string } {
  const subject = `Alert triggered: ${symbol}`
  const html = layout(
    subject,
    `<p>Your alert on <strong>${symbol}</strong> has triggered.</p>
     <p>The ${ALERT_LABELS[type]} <strong>${threshold}</strong>.</p>
     <p>Current value: <strong>${currentValue}</strong>.</p>`
  )
  return { subject, html }
}

/** Builds the HTML for an AI monitoring report. */
export function renderAiReportEmail(analysis: string): {
  subject: string
  html: string
} {
  const subject = "Your portfolio analysis is ready"
  const paragraphs = analysis
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => `<p>${line}</p>`)
    .join("")
  const html = layout(subject, paragraphs)
  return { subject, html }
}
