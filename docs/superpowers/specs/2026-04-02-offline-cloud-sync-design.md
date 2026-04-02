# Offline-First App with Supabase Cloud Sync

**Date:** 2026-04-02
**Status:** Approved

## Goal

Make Paint Tracker fully offline-capable and back data to the cloud so it survives device wipes, browser clears, and phone upgrades. Single user (no auth required).

## Architecture

### Offline: Service Worker Asset Caching

Replace the stub `public/sw.js` with **next-pwa** auto-generated service worker. The `@ducanh2912/next-pwa` package is already installed but not configured.

**Changes:**
- Configure `next-pwa` in `next.config.ts` with `dest: "public"`, runtime caching for pages/assets
- Remove the hand-written `public/sw.js` (next-pwa generates its own)
- Remove manual `navigator.serviceWorker.register('/sw.js')` from `Providers.tsx` (next-pwa handles registration)
- Add generated SW files to `.gitignore`: `public/sw.js`, `public/sw.js.map`, `public/workbox-*.js`, `public/workbox-*.js.map`, `public/swe-worker-*.js`

**Result:** All HTML, JS, CSS, and static assets cached on first visit. App loads fully offline.

### Cloud: Supabase as Sync Target

#### Tables

Mirror the Dexie schema in Supabase Postgres. Each table gets the same columns as the TypeScript interfaces plus:
- `updated_at` (timestamptz) — used for sync conflict resolution

Tables to sync:
1. `customers`
2. `jobs`
3. `quotes`
4. `rooms`
5. `actuals`
6. `message_templates`
7. `paint_presets`
8. `app_settings`

Not synced:
- `calendar_sync_queue` — local-only operational queue

#### Security

Since this is a single-user app with no auth:
- Use Supabase anon key with Row Level Security (RLS) **disabled** on these tables
- The anon key is safe to expose client-side since there's no sensitive multi-tenant data
- If auth is added later, RLS policies can be layered on

### Sync Logic

#### New file: `src/lib/sync.ts`

**Core sync function: `syncWithCloud()`**

1. **Push local changes:** Query Dexie for records where `updatedAt > lastSyncTimestamp`. Upsert each to Supabase using `upsert()` (insert or update based on `id`).
2. **Pull remote changes:** Query Supabase for records where `updated_at > lastSyncTimestamp`. Upsert each into Dexie using `put()`.
3. **Update sync timestamp:** Store `lastSyncTimestamp` in `localStorage`.

**Conflict resolution:** Last-write-wins based on `updatedAt`/`updated_at`. Since single user, conflicts only happen if the same record was edited on two devices before syncing — the most recent edit wins.

**Sync triggers:**
- On app startup (in `Providers.tsx`)
- On coming back online (`useOnlineStatus` fires)
- After any local write (debounced, 2-second delay to batch rapid edits)

**Offline behavior:** If Supabase is unreachable, sync silently fails. Local Dexie continues working. Next sync attempt catches up.

#### New file: `src/hooks/useSyncStatus.ts`

Exposes sync state to the UI:
- `syncing: boolean` — currently pushing/pulling
- `lastSynced: Date | null` — last successful sync
- `error: string | null` — last sync error (cleared on success)

#### UI indicator

Add a small sync icon to `AppShell.tsx` header next to the online/offline dot:
- Spinning when syncing
- Checkmark when synced
- No error state shown to user (silent retry) — but `lastSynced` visible in Settings

### Dexie Schema Changes

Add `updatedAt` to tables that don't have it indexed:
- `rooms` — add `updatedAt` field and index
- `actuals` — add `updatedAt` field and index
- `messageTemplates` — add `updatedAt` field and index
- `paintPresets` — add `updatedAt` field and index

Bump Dexie version from 1 to 2 with upgrade migration that backfills `updatedAt` on existing records using `new Date().toISOString()`.

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

Set in:
- `.env.local` for local dev
- Vercel environment variables for production

### Dependencies

Add:
- `@supabase/supabase-js` — Supabase client library

Already installed (just needs configuration):
- `@ducanh2912/next-pwa` — service worker generation

### File Changes Summary

| File | Action | Purpose |
|------|--------|---------|
| `next.config.ts` | Modify | Add next-pwa wrapper |
| `public/sw.js` | Delete | Replaced by next-pwa generated SW |
| `.gitignore` | Modify | Ignore generated SW files |
| `src/components/Providers.tsx` | Modify | Remove manual SW registration, add sync on startup |
| `src/components/AppShell.tsx` | Modify | Add sync status indicator |
| `src/lib/db.ts` | Modify | Bump version, add indexes/fields |
| `src/lib/sync.ts` | Create | Core sync logic (push/pull with Supabase) |
| `src/lib/supabase.ts` | Create | Supabase client initialization |
| `src/hooks/useSyncStatus.ts` | Create | Sync state hook |
| `src/hooks/useCustomers.ts` | Modify | Trigger sync after writes |
| `src/hooks/useJobs.ts` | Modify | Trigger sync after writes |
| `src/hooks/useQuotes.ts` | Modify | Trigger sync after writes |
| `src/hooks/useSettings.ts` | Modify | Trigger sync after writes |
| `src/app/settings/page.tsx` | Modify | Show last synced time |
| `supabase-schema.sql` | Create | SQL to create all tables in Supabase |

### Setup Steps for User

1. Go to supabase.com, create free account, create new project
2. Run the provided SQL in the Supabase SQL editor
3. Copy project URL and anon key
4. Add as Vercel environment variables
5. Redeploy

### What Stays the Same

- All page components, routes, navigation
- All existing Dexie read hooks (`useLiveQuery`) — still read from local DB
- All UI components (RoomForm, QuoteSummary, etc.)
- All business logic (paint calculator, shopping list, etc.)

### PWA Icons

Generate and add the missing icons referenced in `manifest.json`:
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`

Simple paint roller icon on solid background, matching the app's orange gradient theme.
