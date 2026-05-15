import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Trading AI — Suivi de portefeuille d'actions en temps réel",
    template: "%s — Trading AI",
  },
  description:
    "Suivez vos actions en temps réel : cours actuel, performance et plus/moins-value latente. Alertes de prix et suivi IA paramétrable de votre portefeuille.",
  keywords: [
    "suivi portefeuille",
    "actions",
    "bourse",
    "plus-value latente",
    "alertes de prix",
  ],
  openGraph: {
    type: "website",
    title: "Trading AI — Suivi de portefeuille d'actions",
    description:
      "Suivez vos actions en temps réel et recevez un suivi IA paramétrable de votre portefeuille.",
    url: siteUrl,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
