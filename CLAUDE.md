@AGENTS.md

# Trading AI

Application web de suivi de portefeuille d'actions. L'utilisateur saisit ses positions (action, quantité, prix d'achat) et l'application affiche en temps réel le cours actuel, le pourcentage de performance et la plus/moins-value latente. Système d'alertes et de suivi IA paramétrable.

## Stack technique

- **Next.js 16** — App Router, TypeScript strict (pas de `any` implicite). ⚠️ Voir `AGENTS.md` : cette version a des breaking changes, consulter `node_modules/next/dist/docs/` avant d'écrire du code Next.js.
- **shadcn/ui** — bibliothèque de composants UI (Radix + Tailwind v4).
- **Supabase** — base de données Postgres, authentification, Row Level Security. **En local** (Supabase CLI / Docker), pas d'instance cloud en développement.
- **Telegram Bot API** — notifications d'alertes poussées sur le téléphone.
- **Resend** — envoi des emails du suivi IA.
- **Yahoo Finance** (API non officielle) — cours des actions en temps réel.
- **Anthropic Claude** — moteur du suivi IA paramétrable.

## Périmètre fonctionnel

### Positions
- Une **position** = une action (ticker), une quantité achetée, un prix d'achat moyen, une date.
- Calculs affichés en temps réel :
  - **Cours actuel** récupéré via Yahoo Finance.
  - **Valeur latente** = cours actuel × quantité.
  - **Plus/moins-value latente** = (cours actuel − prix d'achat) × quantité.
  - **Performance %** = (cours actuel − prix d'achat) / prix d'achat.
- Actions cotées uniquement (US + Europe), multi-devises.

### Alertes
- L'utilisateur définit des alertes par position : seuil de cours, variation
  du jour, ou plus/moins-value latente par rapport au prix d'achat.
- Un **cron** (Vercel Cron, toutes les 5 min) appelle `GET /api/cron/evaluate-alerts`
  qui évalue chaque alerte active contre le dernier cours stocké.
- Déclenchement → notification **Telegram** (l'utilisateur connecte son compte
  Telegram via un bot dédié, configuré avec `TELEGRAM_BOT_TOKEN`). Une alerte
  déclenchée est désactivée pour ne pas se répéter.

### Suivi IA paramétrable
- Analyse du portefeuille par Claude (API Anthropic).
- Paramétrable : fréquence, ton, axes d'analyse (risque, diversification, opportunités).
- Restitution par email (Resend) et/ou dans l'interface.

## Conventions de code

- **Tout le code en anglais** : variables, fonctions, types, composants, commentaires, logs, noms de fichiers. Seuls la documentation et les communications utilisateur sont en français.
- **1 fichier = 1 composant React.** Jamais deux composants dans un même fichier. Découper en sous-composants dès qu'un composant grossit.
- **TypeScript strict** : typage explicite, pas de `any` implicite.
- **react-hook-form** pour tous les formulaires (saisie de position, configuration d'alerte).
- **shadcn/ui** pour les composants d'interface : ajouter les composants via la CLI shadcn, ne pas réécrire de composants UI de base à la main.
- **next/image**, **next/font**, lazy loading — pas de layout shift.

## Supabase local

- Supabase tourne **en local** via la CLI Supabase (Docker). Aucune instance cloud en développement.
- **Ports décalés de +200** par rapport aux ports par défaut, pour éviter toute interférence avec d'autres projets Supabase locaux. Configuré dans `supabase/config.toml` :
  - API : `54321` → `54521`
  - DB : `54322` → `54522`
  - Studio : `54323` → `54523`
  - Inbucket / mailpit : `54324` → `54524`
  - Analytics : `54327` → `54527`
- Appliquer le même décalage de +200 à tout nouveau port Supabase ajouté.
- Commandes : `npx supabase start`, `npx supabase stop`.
- **Appliquer une migration** : utiliser `npx supabase migration up` (non destructif, conserve les données locales).
- ⚠️ **Ne jamais lancer `npx supabase db reset`** : cette commande efface toutes les données locales. Ne l'utiliser qu'en dernier recours, lorsqu'il n'y a vraiment pas d'alternative, et **uniquement après avoir demandé et obtenu l'autorisation explicite de l'utilisateur**.

## Cours de bourse (Yahoo Finance)

- L'API Yahoo Finance est **non officielle** : tous les appels sont isolés dans `src/lib/market-data/` pour pouvoir changer de fournisseur sans impacter le reste du code.
- Les cours sont **rafraîchis par un cron** (Vercel Cron, toutes les 5 min) qui
  appelle `GET /api/cron/refresh-quotes` et stocke les cours dans la table
  `quotes`. Le dashboard lit cette table ; un symbole absent (position juste
  ajoutée) est récupéré en direct en complément.
- Les tâches planifiées sont déclarées dans `vercel.json` (clé `crons`) et
  invoquées par **Vercel Cron**. L'endpoint cron est protégé par `CRON_SECRET` ;
  Vercel attache automatiquement l'en-tête `Authorization: Bearer ${CRON_SECRET}`
  lorsque la variable d'environnement est définie sur le projet.
- Gestion d'erreur explicite : si le cours est indisponible, l'afficher clairement plutôt que d'afficher une valeur fausse.

## Sécurité

- **Row Level Security** activée sur toutes les tables Supabase : un utilisateur n'accède qu'à ses propres positions et alertes.
- Ne jamais exposer la clé de service Supabase, la clé Resend ni la clé Anthropic côté client — variables d'environnement serveur uniquement.
- Pour supprimer un fichier en local, utiliser `trash` (jamais `rm`).

## SEO

- Optimiser le SEO sur les pages publiques (landing, pricing) : `metadata` Next.js, `<title>`, `meta description`, h1 unique et hiérarchie hn cohérente, `alt` sur les images, JSON-LD si pertinent.
- Les pages applicatives (dashboard, portefeuille) sont privées : `noindex`.
- Maintenir `sitemap.xml` et `robots.txt`.

## Structure du projet

```
src/
  app/
    (marketing)/      pages publiques (landing) — SEO
    (app)/            pages applicatives privées — noindex
    login/            authentification
    api/              route handlers (proxy cotations)
  components/
    ui/               composants shadcn/ui
  features/           logique par domaine (positions, alerts, ai-monitoring,
                      notifications)
  lib/
    supabase/         clients Supabase (browser, server, middleware)
    market-data/      couche d'abstraction cotations (Yahoo Finance)
    telegram/         client Telegram Bot API
    email/            wrapper Resend
    ai/               wrapper Anthropic Claude
supabase/
  config.toml         config locale (ports +200)
  migrations/         schéma SQL
```

## Variables d'environnement

Voir `.env.example`. Les variables `NEXT_PUBLIC_*` sont exposées au client ; toutes les autres restent côté serveur.
