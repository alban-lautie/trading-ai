import type { Metadata } from "next"
import Link from "next/link"
import { Bell, LineChart, Sparkles, Wallet } from "lucide-react"

import { FeatureCard } from "@/components/marketing/feature-card"
import { LandingHeader } from "@/components/marketing/landing-header"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Suivi de portefeuille d'actions en temps réel",
  alternates: { canonical: "/" },
}

const features = [
  {
    icon: Wallet,
    title: "Saisissez vos positions",
    description:
      "Renseignez une action, la quantité achetée et le prix d'achat. Trading AI fait le reste.",
  },
  {
    icon: LineChart,
    title: "Performance en temps réel",
    description:
      "Cours actuel, pourcentage de performance et plus/moins-value latente, mis à jour en continu.",
  },
  {
    icon: Bell,
    title: "Alertes de prix",
    description:
      "Définissez des seuils de prix ou de variation et recevez un email dès qu'ils sont atteints.",
  },
  {
    icon: Sparkles,
    title: "Suivi IA paramétrable",
    description:
      "Une analyse de votre portefeuille par l'IA, selon la fréquence, le ton et les axes que vous choisissez.",
  },
]

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Trading AI",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description:
    "Application de suivi de portefeuille d'actions en temps réel avec alertes et suivi IA paramétrable.",
}

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Suivez votre portefeuille d&apos;actions en temps réel
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg">
            Saisissez vos positions et visualisez instantanément votre
            performance, votre plus/moins-value latente, vos alertes et un
            suivi IA personnalisé.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/login">Se connecter</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-24">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Tout ce qu&apos;il faut pour piloter vos investissements
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto max-w-5xl px-4 py-8 text-sm">
          © {new Date().getFullYear()} Trading AI — Suivi de portefeuille
          d&apos;actions.
        </div>
      </footer>
    </>
  )
}
