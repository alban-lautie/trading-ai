"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export interface AuthState {
  error?: string
}

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  }
}

/** Signs the user in with email and password. */
export async function signIn(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password } = readCredentials(formData)
  if (!email || !password) {
    return { error: "Email et mot de passe requis." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Log the full error server-side (Vercel logs) so genuine failures can be
    // diagnosed instead of being hidden behind a generic message.
    console.error("[auth] signIn failed", {
      code: error.code,
      status: error.status,
      message: error.message,
    })

    if (error.code === "email_not_confirmed") {
      return { error: "Adresse email non confirmée." }
    }
    if (error.status === 429) {
      return { error: "Trop de tentatives. Réessayez dans quelques minutes." }
    }
    if (error.code === "invalid_credentials") {
      return { error: "Identifiants invalides." }
    }
    return { error: `Connexion impossible (${error.code ?? error.status}).` }
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

/** Signs the current user out and returns to the login page. */
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}
