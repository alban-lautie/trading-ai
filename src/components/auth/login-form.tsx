"use client"

import { useActionState, useState } from "react"

import { signIn, signUp, type AuthState } from "@/app/login/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Mode = "signin" | "signup"

interface LoginFormProps {
  defaultMode: Mode
}

/** Email / password sign-in and sign-up form. */
export function LoginForm({ defaultMode }: LoginFormProps) {
  const [mode, setMode] = useState<Mode>(defaultMode)
  const action = mode === "signup" ? signUp : signIn
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    {}
  )

  const isSignup = mode === "signup"

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{isSignup ? "Créer un compte" : "Se connecter"}</CardTitle>
        <CardDescription>
          {isSignup
            ? "Commencez à suivre votre portefeuille."
            : "Accédez à votre portefeuille."}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
            />
          </div>
          {state.error ? (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="mt-4 flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending
              ? "Veuillez patienter…"
              : isSignup
                ? "Créer le compte"
                : "Se connecter"}
          </Button>
          <button
            type="button"
            className="text-muted-foreground text-sm hover:underline"
            onClick={() => setMode(isSignup ? "signin" : "signup")}
          >
            {isSignup
              ? "J'ai déjà un compte"
              : "Je n'ai pas encore de compte"}
          </button>
        </CardFooter>
      </form>
    </Card>
  )
}
