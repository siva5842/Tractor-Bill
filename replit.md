# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Tiller Bill (Mobile App — Expo)

- **Location**: `artifacts/tiller-bill/`
- **Preview**: `/tiller-bill/`
- **Purpose**: Mobile app for farmers to track equipment rental time, calculate live bills, and manage customer debts.

#### Features

- **Equipment Management**: Add equipment with photo, name, and hourly rate. Delete with confirmation dialog.
- **Live Timer & Billing**: Start/Pause/Stop timer per equipment with real-time earnings display.
- **Session End Options**: Generate UPI QR code, Save to Pending list, or Finish.
- **UPI QR Code**: Generates a universal UPI QR using `upi://pay?pa=...&pn=...&am=...&cu=INR` format compatible with all UPI apps.
- **Pending Debt Tracking**: Track customers with unpaid balances. Add manually or from timer session. Push notification reminders on scheduled dates.
- **My QR Tab**: Upload/scan personal UPI QR once, displayed at max brightness for customer scanning.
- **Manual Calculator FAB**: Quick hourly rate × duration calculator, always accessible above the bottom nav.
- **Multi-language**: English + Tamil (switchable in settings).
- **Offline-first**: All data persisted locally via AsyncStorage.
- **Profile**: Admin name defaults to "Sivaprakasham". UPI ID configurable.

#### Architecture

- React Native + Expo (SDK 54)
- Expo Router (file-based navigation)
- AsyncStorage for offline-first persistence
- React Context (AppContext + DataContext)
- Material Design 3 inspired UI: deep green (#2E7D32) primary, golden yellow (#F9A825) accent
- i18n: `i18n/translations.ts` with `en` and `ta` keys

#### Key Files

- `constants/colors.ts` — Design tokens (M3 green theme)
- `context/AppContext.tsx` — Language, profile, UPI, QR settings
- `context/DataContext.tsx` — Equipment, timers, pending debts (AsyncStorage)
- `i18n/translations.ts` — English + Tamil strings
- `app/(tabs)/_layout.tsx` — 3-tab layout + calculator FAB
- `app/(tabs)/index.tsx` — Home: Equipment cards with live timers
- `app/(tabs)/pending.tsx` — Pending debts list
- `app/(tabs)/myqr.tsx` — Personal QR display (max brightness)
- `components/EquipmentCard.tsx` — Equipment card with animated timer
- `components/StopSessionModal.tsx` — Post-session action picker
- `components/QRCodeModal.tsx` — UPI QR code generator
- `components/SaveToPendingModal.tsx` — Save debt with contacts + reminder
- `components/ManualCalculatorModal.tsx` — Quick calculator

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
