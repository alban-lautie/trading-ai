# Trading AI

Application web de suivi de portefeuille d'actions. Saisissez vos positions
(action, quantité, prix d'achat) et visualisez en temps réel le cours actuel,
la performance et la plus/moins-value latente. Alertes de prix et suivi IA
paramétrable de votre portefeuille.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **shadcn/ui** + Tailwind CSS v4
- **Supabase** (Postgres, Auth, Row Level Security) — en local
- **Resend** — emails d'alertes et de suivi IA
- **Yahoo Finance** — cours des actions (API non officielle)
- **Anthropic Claude** — analyse IA du portefeuille

## Prérequis

- Node.js 20+
- Docker (pour Supabase en local)
- Supabase CLI

## Installation

```bash
# 1. Dépendances
npm install

# 2. Démarrer Supabase en local (applique les migrations)
npx supabase start

# 3. Variables d'environnement
cp .env.example .env.local
# Renseignez les clés affichées par `npx supabase start`,
# ainsi que RESEND_API_KEY et ANTHROPIC_API_KEY.

# 4. (Optionnel) Régénérer les types de la base
npx supabase gen types typescript --local > src/lib/database.types.ts

# 5. Lancer l'application
npm run dev
```

L'application est disponible sur http://localhost:3000.

## Supabase local

Supabase tourne en local via Docker. **Les ports sont décalés de +200** par
rapport aux ports par défaut pour éviter les conflits avec d'autres projets :

| Service   | Port  |
| --------- | ----- |
| API       | 54521 |
| Database  | 54522 |
| Studio    | 54523 |
| Inbucket  | 54524 |
| Analytics | 54527 |

Commandes utiles : `npx supabase start`, `npx supabase stop`,
`npx supabase db reset` (réapplique les migrations).

## Scripts

| Script          | Description                       |
| --------------- | --------------------------------- |
| `npm run dev`   | Serveur de développement          |
| `npm run build` | Build de production               |
| `npm run start` | Sert le build de production       |
| `npm run lint`  | Analyse statique (ESLint)         |

## Structure

```
src/
  app/              routes (App Router) — landing, login, espace applicatif, API
  components/       composants UI (dont shadcn/ui)
  features/         logique métier (positions, alerts, ai-monitoring)
  lib/              clients Supabase, market-data, email, ai, helpers
supabase/
  config.toml       configuration locale (ports +200)
  migrations/        schéma SQL
```

Voir `CLAUDE.md` pour les conventions de code du projet.
