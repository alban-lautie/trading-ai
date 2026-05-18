"use client"

import { useActionState } from "react"

import { signIn, type AuthState } from "@/app/login/actions"
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

/** Email / password sign-in form. Sign-up is disabled. */
export function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signIn,
    {}
  )

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Se connecter</CardTitle>
        <CardDescription>Accédez à votre portefeuille.</CardDescription>
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
              autoComplete="current-password"
              required
            />
          </div>
          {state.error ? (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="mt-4">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Veuillez patienter…" : "Se connecter"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
