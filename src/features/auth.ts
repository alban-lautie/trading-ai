import "server-only"

import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"

/**
 * Returns the authenticated user, or redirects to the login page when there
 * is no active session. Use this at the top of every protected Server
 * Component, Server Action and Route Handler.
 */
export async function requireUser(): Promise<{
  user: User
  supabase: Awaited<ReturnType<typeof createClient>>
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return { user, supabase }
}
