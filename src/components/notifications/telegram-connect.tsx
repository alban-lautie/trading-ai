"use client"

import { useState, useTransition } from "react"
import { Check, ExternalLink, Send } from "lucide-react"
import { toast } from "sonner"

import {
  completeTelegramLink,
  disconnectTelegram,
  sendTestNotification,
  startTelegramLink,
} from "@/features/notifications/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { NotificationSettings } from "@/lib/types"

interface TelegramConnectProps {
  settings: NotificationSettings | null
}

interface PendingLink {
  code: string
  botUsername: string
}

/** Card to connect, test and disconnect the Telegram alert channel. */
export function TelegramConnect({ settings }: TelegramConnectProps) {
  const isConnected = Boolean(settings?.telegram_chat_id)
  const [pending, setPending] = useState<PendingLink | null>(null)
  const [isBusy, startTransition] = useTransition()

  function handleStart() {
    startTransition(async () => {
      const result = await startTelegramLink()
      if (result.error || !result.code || !result.botUsername) {
        toast.error(result.error ?? "Connexion impossible.")
        return
      }
      setPending({ code: result.code, botUsername: result.botUsername })
    })
  }

  function handleComplete() {
    startTransition(async () => {
      const result = await completeTelegramLink()
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Compte Telegram connecté")
      setPending(null)
    })
  }

  function handleTest() {
    startTransition(async () => {
      const result = await sendTestNotification()
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Notification de test envoyée")
    })
  }

  function handleDisconnect() {
    startTransition(async () => {
      const result = await disconnectTelegram()
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Compte Telegram déconnecté")
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Notifications Telegram</CardTitle>
            <CardDescription>
              Les alertes déclenchées sont envoyées sur votre Telegram.
            </CardDescription>
          </div>
          {isConnected ? (
            <Badge className="bg-emerald-600">
              <Check className="size-3.5" />
              Connecté
            </Badge>
          ) : (
            <Badge variant="secondary">Non connecté</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-muted-foreground text-sm">
              Compte&nbsp;:{" "}
              <span className="text-foreground font-medium">
                {settings?.telegram_username ?? settings?.telegram_chat_id}
              </span>
            </p>
            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isBusy}
                onClick={handleTest}
              >
                <Send className="size-4" />
                Tester
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={isBusy}
                onClick={handleDisconnect}
              >
                Déconnecter
              </Button>
            </div>
          </div>
        ) : pending ? (
          <ol className="space-y-3 text-sm">
            <li>
              <span className="font-medium">1.</span> Ouvrez votre bot Telegram
              et démarrez la conversation&nbsp;:
              <div className="mt-2">
                <Button asChild size="sm">
                  <a
                    href={`https://t.me/${pending.botUsername}?start=${pending.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="size-4" />
                    Ouvrir @{pending.botUsername}
                  </a>
                </Button>
              </div>
            </li>
            <li>
              <span className="font-medium">2.</span> Dans Telegram, appuyez sur{" "}
              <strong>Démarrer</strong>. Si rien ne s&apos;envoie, collez ce
              code dans la conversation&nbsp;:
              <code className="bg-muted ml-1 rounded px-1.5 py-0.5 font-mono">
                {pending.code}
              </code>
            </li>
            <li>
              <span className="font-medium">3.</span> Revenez ici et validez la
              connexion&nbsp;:
              <div className="mt-2">
                <Button size="sm" disabled={isBusy} onClick={handleComplete}>
                  J&apos;ai démarré le bot
                </Button>
              </div>
            </li>
          </ol>
        ) : (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Connectez votre compte Telegram pour recevoir les alertes sur
              votre téléphone.
            </p>
            <Button disabled={isBusy} onClick={handleStart}>
              <Send className="size-4" />
              Connecter Telegram
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
