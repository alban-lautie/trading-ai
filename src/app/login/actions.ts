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
    return { error: "Identifiants invalides." }
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

/** Creates a new account with email and password. */
export async function signUp(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password } = readCredentials(formData)
  if (!email || !password) {
    return { error: "Email et mot de passe requis." }
  }
  if (password.length < 6) {
    return { error: "Le mot de passe doit contenir au moins 6 caractères." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { error: error.message }
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
