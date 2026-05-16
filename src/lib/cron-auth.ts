import { NextResponse, type NextRequest } from "next/server"

/**
 * Validates the bearer token on a cron endpoint against CRON_SECRET.
 * Returns an error response when the request is not authorized, or `null`
 * when the caller may proceed.
 */
export function checkCronAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
    )
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return null
}
