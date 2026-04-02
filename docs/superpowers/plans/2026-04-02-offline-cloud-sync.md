# Offline + Cloud Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Paint Tracker work fully offline and sync data to Supabase so it survives device wipes.

**Architecture:** Keep Dexie as primary read/write DB for instant offline-first performance. Add Supabase as cloud mirror with background push/pull sync. Replace stub service worker with next-pwa auto-generated worker that caches all app assets.

**Tech Stack:** Next.js 16, Dexie 4, @supabase/supabase-js, @ducanh2912/next-pwa, Workbox

**Spec:** `docs/superpowers/specs/2026-04-02-offline-cloud-sync-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `next.config.ts` | Modify | Wrap config with next-pwa |
| `.gitignore` | Modify | Ignore generated SW files |
| `public/sw.js` | Delete | Replaced by next-pwa |
| `src/lib/supabase.ts` | Create | Supabase client singleton |
| `src/lib/sync.ts` | Create | Push/pull sync logic |
| `src/lib/db.ts` | Modify | v2 schema with updatedAt indexes |
| `src/lib/types.ts` | Modify | Add updatedAt to Room, Actuals, MessageTemplate, PaintPreset |
| `src/hooks/useSyncStatus.ts` | Create | Sync state management |
| `src/hooks/useCustomers.ts` | Modify | Trigger sync after writes |
| `src/hooks/useJobs.ts` | Modify | Trigger sync after writes |
| `src/hooks/useQuotes.ts` | Modify | Trigger sync after writes |
| `src/hooks/useSettings.ts` | Modify | Trigger sync after writes |
| `src/components/Providers.tsx` | Modify | Remove manual SW, add sync triggers |
| `src/components/AppShell.tsx` | Modify | Add sync indicator |
| `src/app/settings/page.tsx` | Modify | Show last synced time |
| `supabase-schema.sql` | Create | SQL for Supabase tables |
| `public/icons/icon-192.png` | Create | PWA icon |
| `public/icons/icon-512.png` | Create | PWA icon |
| `.env.local.example` | Create | Document required env vars |

---

### Task 1: Configure next-pwa for Offline Asset Caching

**Files:**
- Modify: `next.config.ts`
- Delete: `public/sw.js`
- Modify: `.gitignore`
- Modify: `src/components/Providers.tsx`

- [ ] **Step 1: Delete the stub service worker**

```bash
rm public/sw.js
```

- [ ] **Step 2: Add generated SW files to .gitignore**

Append to `.gitignore`:

```
# next-pwa generated files
public/sw.js
public/sw.js.map
public/workbox-*.js
public/workbox-*.js.map
public/swe-worker-*.js
```

- [ ] **Step 3: Configure next-pwa in next.config.ts**

Replace the entire file with:

```typescript
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  images: { unoptimized: true },
};

export default withPWA(nextConfig);
```

Note: `disable: process.env.NODE_ENV === "development"` prevents SW from interfering during dev. In production builds, the SW will be generated and registered automatically.

- [ ] **Step 4: Remove manual SW registration from Providers.tsx**

Replace the entire file with:

```tsx
"use client";

import { useEffect } from "react";
import { seedDatabase } from "@/lib/seed-data";
import { useCalendarSync } from "@/hooks/useCalendarSync";

export function Providers({ children }: { children: React.ReactNode }) {
  useCalendarSync();

  useEffect(() => {
    seedDatabase();
  }, []);

  return <>{children}</>;
}
```

The `navigator.serviceWorker.register('/sw.js')` call is removed — next-pwa handles registration automatically via its `register: true` option.

- [ ] **Step 5: Build to verify next-pwa generates the SW**

```bash
npx next build
```

Expected: Build succeeds. Check that `public/sw.js` was generated (it will exist but is gitignored).

```bash
ls -la public/sw.js public/workbox-*.js
```

Expected: Both files exist.

- [ ] **Step 6: Commit**

```bash
git add next.config.ts .gitignore src/components/Providers.tsx
git rm --cached public/sw.js 2>/dev/null || true
git commit -m "feat: configure next-pwa for full offline asset caching"
```

---

### Task 2: Generate PWA Icons

**Files:**
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`

- [ ] **Step 1: Create icons directory**

```bash
mkdir -p public/icons
```

- [ ] **Step 2: Generate icon-192.png**

Use a simple SVG-to-PNG approach. Create a minimal paint roller icon with orange gradient on black background:

```bash
cat > /tmp/icon.svg << 'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="108" fill="#000000"/>
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f97316"/>
      <stop offset="100%" style="stop-color:#e11d48"/>
    </linearGradient>
  </defs>
  <rect x="96" y="128" width="240" height="112" rx="24" fill="url(#g)"/>
  <rect x="336" y="160" width="80" height="16" rx="8" fill="url(#g)"/>
  <rect x="200" y="240" width="16" height="80" rx="8" fill="url(#g)"/>
  <rect x="176" y="320" width="64" height="64" rx="12" fill="url(#g)"/>
</svg>
SVG
```

Convert to PNGs using `sips` (built into macOS):

```bash
# Create a temporary HTML file and use it to render the SVG
# Since sips doesn't handle SVG, we'll use a simpler approach with base64
python3 -c "
import subprocess, base64, os
svg = open('/tmp/icon.svg').read()
# Use rsvg-convert if available, otherwise fall back to sips with a workaround
for size, name in [(192, 'icon-192.png'), (512, 'icon-512.png')]:
    # Write SVG at correct size
    sized = svg.replace('width=\"512\"', f'width=\"{size}\"').replace('height=\"512\"', f'height=\"{size}\"')
    with open(f'/tmp/icon-{size}.svg', 'w') as f:
        f.write(sized)
    # Try qlmanage (macOS built-in)
    os.system(f'qlmanage -t -s {size} -o /tmp /tmp/icon-{size}.svg 2>/dev/null')
    src = f'/tmp/icon-{size}.svg.png'
    if os.path.exists(src):
        os.rename(src, f'public/icons/{name}')
        print(f'Created {name}')
    else:
        print(f'Fallback: creating placeholder {name}')
        # Create a simple colored PNG as fallback using Python
        import struct, zlib
        def create_png(w, h, r, g, b):
            raw = b''
            for y in range(h):
                raw += b'\\x00' + bytes([r, g, b, 255]) * w
            def chunk(ctype, data):
                c = ctype + data
                return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
            return (b'\\x89PNG\\r\\n\\x1a\\n' +
                    chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) +
                    chunk(b'IDAT', zlib.compress(raw)) +
                    chunk(b'IEND', b''))
        with open(f'public/icons/{name}', 'wb') as f:
            f.write(create_png(size, size, 249, 115, 22))
        print(f'Created placeholder {name}')
"
```

Verify icons exist:

```bash
ls -la public/icons/
```

- [ ] **Step 3: Commit**

```bash
git add public/icons/
git commit -m "feat: add PWA icons for home screen install"
```

---

### Task 3: Add updatedAt to Types and Dexie Schema

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/db.ts`

- [ ] **Step 1: Add updatedAt to types that are missing it**

In `src/lib/types.ts`, add `updatedAt: string;` to these interfaces:

`Room` — add after `sortOrder: number;`:
```typescript
  updatedAt: string;
```

`Actuals` — add after `completedAt: string;`:
```typescript
  updatedAt: string;
```

`MessageTemplate` — add after `isDefault: boolean;`:
```typescript
  updatedAt: string;
```

`PaintPreset` — add after `isDefault: boolean;`:
```typescript
  updatedAt: string;
```

Note: `Customer`, `Job`, `Quote`, `AppSettings` already have `updatedAt` or don't need it (AppSettings uses a fixed `id`).

- [ ] **Step 2: Update Dexie schema to version 2 with new indexes**

Replace `src/lib/db.ts` with:

```typescript
import Dexie, { type EntityTable } from "dexie";
import type {
  Customer,
  Job,
  Quote,
  Room,
  Actuals,
  MessageTemplate,
  PaintPreset,
  CalendarSyncQueue,
  AppSettings,
} from "@/lib/types";

export class PaintTrackerDB extends Dexie {
  customers!: EntityTable<Customer, "id">;
  jobs!: EntityTable<Job, "id">;
  quotes!: EntityTable<Quote, "id">;
  rooms!: EntityTable<Room, "id">;
  actuals!: EntityTable<Actuals, "id">;
  messageTemplates!: EntityTable<MessageTemplate, "id">;
  paintPresets!: EntityTable<PaintPreset, "id">;
  calendarSyncQueue!: EntityTable<CalendarSyncQueue, "id">;
  appSettings!: EntityTable<AppSettings, "id">;

  constructor() {
    super("PaintTrackerDB");

    this.version(1).stores({
      customers: "id, name, updatedAt",
      jobs: "id, customerId, status, scheduledDate, updatedAt",
      quotes: "id, jobId",
      rooms: "id, quoteId, sortOrder",
      actuals: "id, jobId",
      messageTemplates: "id, isDefault",
      paintPresets: "id, surfaceType, isDefault",
      calendarSyncQueue: "id, createdAt",
      appSettings: "id",
    });

    this.version(2).stores({
      customers: "id, name, updatedAt",
      jobs: "id, customerId, status, scheduledDate, updatedAt",
      quotes: "id, jobId, updatedAt",
      rooms: "id, quoteId, sortOrder, updatedAt",
      actuals: "id, jobId, updatedAt",
      messageTemplates: "id, isDefault, updatedAt",
      paintPresets: "id, surfaceType, isDefault, updatedAt",
      calendarSyncQueue: "id, createdAt",
      appSettings: "id",
    }).upgrade(tx => {
      const now = new Date().toISOString();
      return Promise.all([
        tx.table("rooms").toCollection().modify(record => {
          if (!record.updatedAt) record.updatedAt = now;
        }),
        tx.table("actuals").toCollection().modify(record => {
          if (!record.updatedAt) record.updatedAt = now;
        }),
        tx.table("messageTemplates").toCollection().modify(record => {
          if (!record.updatedAt) record.updatedAt = now;
        }),
        tx.table("paintPresets").toCollection().modify(record => {
          if (!record.updatedAt) record.updatedAt = now;
        }),
        tx.table("quotes").toCollection().modify(record => {
          if (!record.updatedAt) record.updatedAt = now;
        }),
      ]);
    });
  }
}

export const db = new PaintTrackerDB();
```

- [ ] **Step 3: Update hooks to set updatedAt on room/actuals/template/preset writes**

In `src/hooks/useQuotes.ts`, update `addRoom` to include `updatedAt`:

Find the `addRoom` function and add `updatedAt` to the data:

```typescript
export async function addRoom(
  data: Omit<Room, "id">
): Promise<string> {
  const id = uuid();
  await db.rooms.add({ ...data, id, updatedAt: new Date().toISOString() });
  return id;
}
```

Update `updateRoom` to set `updatedAt`:

```typescript
export async function updateRoom(
  id: string,
  data: Partial<Room>
): Promise<void> {
  await db.rooms.update(id, { ...data, updatedAt: new Date().toISOString() });
}
```

In `src/hooks/useSettings.ts`, update `updatePaintPreset`:

```typescript
export async function updatePaintPreset(
  id: string,
  data: Partial<PaintPreset>
): Promise<void> {
  await db.paintPresets.update(id, { ...data, updatedAt: new Date().toISOString() });
}
```

Update `updateMessageTemplate`:

```typescript
export async function updateMessageTemplate(
  id: string,
  data: Partial<MessageTemplate>
): Promise<void> {
  await db.messageTemplates.update(id, { ...data, updatedAt: new Date().toISOString() });
}
```

Update `createMessageTemplate`:

```typescript
export async function createMessageTemplate(
  data: Omit<MessageTemplate, "id">
): Promise<string> {
  const id = crypto.randomUUID();
  await db.messageTemplates.add({ ...data, id, updatedAt: new Date().toISOString() });
  return id;
}
```

- [ ] **Step 4: Update seed-data.ts to include updatedAt on seeded records**

In `src/lib/seed-data.ts`, update the `seedDatabase` function to add `updatedAt` when creating presets and templates:

Change the bulkPut for presets:
```typescript
await db.paintPresets.bulkPut(
  DEFAULT_PRESETS.map((p) => ({ ...p, id: uuid(), updatedAt: new Date().toISOString() }))
);
```

Change the bulkPut for templates:
```typescript
await db.messageTemplates.bulkPut(
  DEFAULT_TEMPLATES.map((t) => ({ ...t, id: uuid(), updatedAt: new Date().toISOString() }))
);
```

- [ ] **Step 5: Build to verify no type errors**

```bash
npx next build
```

Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/db.ts src/hooks/useQuotes.ts src/hooks/useSettings.ts src/lib/seed-data.ts
git commit -m "feat: add updatedAt to all tables for sync tracking"
```

---

### Task 4: Create Supabase Client and Schema SQL

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `supabase-schema.sql`
- Create: `.env.local.example`

- [ ] **Step 1: Install @supabase/supabase-js**

```bash
npm install @supabase/supabase-js
```

- [ ] **Step 2: Create Supabase client**

Create `src/lib/supabase.ts`:

```typescript
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabase;
}
```

Returning `null` when env vars are missing lets the app work without Supabase configured (local dev, offline-only mode).

- [ ] **Step 3: Create Supabase schema SQL**

Create `supabase-schema.sql` in the project root:

```sql
-- Paint Tracker Supabase Schema
-- Run this in the Supabase SQL Editor after creating your project.

create table customers (
  id text primary key,
  name text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table jobs (
  id text primary key,
  customer_id text not null default '',
  service_type text not null default '',
  status text not null default '',
  scheduled_date text not null default '',
  estimated_duration numeric not null default 0,
  address text not null default '',
  notes text not null default '',
  google_calendar_event_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table quotes (
  id text primary key,
  job_id text not null default '',
  labor_rate numeric not null default 0,
  markup_percent numeric not null default 0,
  total_materials numeric not null default 0,
  total_labor numeric not null default 0,
  total_price numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table rooms (
  id text primary key,
  quote_id text not null default '',
  name text not null default '',
  service_type text not null default '',
  room_type text not null default '',
  length numeric,
  width numeric,
  height numeric,
  door_count integer not null default 0,
  window_count integer not null default 0,
  surface_type text,
  paint_color text not null default '',
  paint_brand text not null default '',
  finish_type text,
  coats integer not null default 1,
  price_per_gallon numeric,
  paintable_sq_ft numeric not null default 0,
  gallons_needed numeric not null default 0,
  estimated_labor_hours numeric not null default 0,
  material_cost numeric not null default 0,
  labor_cost numeric not null default 0,
  description text not null default '',
  manual_hours numeric,
  manual_cost numeric,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table actuals (
  id text primary key,
  job_id text not null default '',
  actual_hours numeric not null default 0,
  actual_materials_cost numeric not null default 0,
  actual_gallons_used numeric not null default 0,
  notes text not null default '',
  completed_at text not null default '',
  updated_at timestamptz not null default now()
);

create table message_templates (
  id text primary key,
  name text not null default '',
  channel text not null default '',
  subject text not null default '',
  body text not null default '',
  is_default boolean not null default false,
  updated_at timestamptz not null default now()
);

create table paint_presets (
  id text primary key,
  surface_type text not null default '',
  coverage_rate numeric not null default 0,
  labor_rate numeric not null default 0,
  is_default boolean not null default false,
  updated_at timestamptz not null default now()
);

create table app_settings (
  id text primary key,
  default_labor_rate numeric not null default 50,
  default_markup_percent numeric not null default 20,
  backup_reminder_days integer not null default 30,
  last_backup_date text not null default '',
  google_calendar_connected boolean not null default false,
  google_calendar_token text not null default ''
);

-- Create indexes for sync queries (filter by updated_at)
create index idx_customers_updated_at on customers (updated_at);
create index idx_jobs_updated_at on jobs (updated_at);
create index idx_quotes_updated_at on quotes (updated_at);
create index idx_rooms_updated_at on rooms (updated_at);
create index idx_actuals_updated_at on actuals (updated_at);
create index idx_message_templates_updated_at on message_templates (updated_at);
create index idx_paint_presets_updated_at on paint_presets (updated_at);
```

- [ ] **Step 4: Create .env.local.example**

Create `.env.local.example`:

```
# Supabase — get these from your Supabase project settings
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase.ts supabase-schema.sql .env.local.example package.json package-lock.json
git commit -m "feat: add Supabase client and database schema"
```

---

### Task 5: Build Sync Engine

**Files:**
- Create: `src/lib/sync.ts`

- [ ] **Step 1: Create the sync module**

Create `src/lib/sync.ts`:

```typescript
import { db } from "@/lib/db";
import { getSupabase } from "@/lib/supabase";

const SYNC_TIMESTAMP_KEY = "paint-tracker-last-sync";
const SYNC_DEBOUNCE_MS = 2000;

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncInProgress = false;

type SyncListener = (state: { syncing: boolean; lastSynced: Date | null; error: string | null }) => void;
const listeners = new Set<SyncListener>();

let currentState = {
  syncing: false,
  lastSynced: null as Date | null,
  error: null as string | null,
};

function notify(update: Partial<typeof currentState>) {
  currentState = { ...currentState, ...update };
  listeners.forEach((fn) => fn(currentState));
}

export function subscribeSyncStatus(fn: SyncListener): () => void {
  listeners.add(fn);
  fn(currentState);
  return () => listeners.delete(fn);
}

// Table mapping: Dexie table name → Supabase table name → field mappings
// Supabase uses snake_case, Dexie uses camelCase
interface TableConfig {
  dexieTable: string;
  supabaseTable: string;
  toSupabase: (record: Record<string, unknown>) => Record<string, unknown>;
  fromSupabase: (record: Record<string, unknown>) => Record<string, unknown>;
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function mapKeys(obj: Record<string, unknown>, mapper: (key: string) => string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[mapper(key)] = value;
  }
  return result;
}

const SYNCED_TABLES: TableConfig[] = [
  "customers", "jobs", "quotes", "rooms", "actuals",
  "messageTemplates", "paintPresets", "appSettings",
].map((dexieTable) => ({
  dexieTable,
  supabaseTable: camelToSnake(dexieTable),
  toSupabase: (record) => mapKeys(record, camelToSnake),
  fromSupabase: (record) => mapKeys(record, snakeToCamel),
}));

function getLastSyncTimestamp(): string {
  return localStorage.getItem(SYNC_TIMESTAMP_KEY) || "1970-01-01T00:00:00.000Z";
}

function setLastSyncTimestamp(ts: string) {
  localStorage.setItem(SYNC_TIMESTAMP_KEY, ts);
}

async function pushTable(config: TableConfig, since: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const table = (db as Record<string, unknown>)[config.dexieTable] as import("dexie").Table;
  if (!table) return;

  let records: Record<string, unknown>[];

  // appSettings doesn't have updatedAt index — always push it
  if (config.dexieTable === "appSettings") {
    records = await table.toArray();
  } else {
    records = await table
      .where("updatedAt")
      .above(since)
      .toArray();
  }

  if (records.length === 0) return;

  const mapped = records.map(config.toSupabase);
  const { error } = await supabase
    .from(config.supabaseTable)
    .upsert(mapped, { onConflict: "id" });

  if (error) throw new Error(`Push ${config.supabaseTable}: ${error.message}`);
}

async function pullTable(config: TableConfig, since: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const table = (db as Record<string, unknown>)[config.dexieTable] as import("dexie").Table;
  if (!table) return;

  let query = supabase.from(config.supabaseTable).select("*");

  // appSettings doesn't have updated_at — always pull it
  if (config.dexieTable !== "appSettings") {
    query = query.gt("updated_at", since);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Pull ${config.supabaseTable}: ${error.message}`);
  if (!data || data.length === 0) return;

  const mapped = data.map(config.fromSupabase);
  await table.bulkPut(mapped);
}

export async function syncWithCloud(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || syncInProgress) return;

  syncInProgress = true;
  notify({ syncing: true, error: null });

  try {
    const since = getLastSyncTimestamp();
    const syncStartTime = new Date().toISOString();

    // Push all local changes
    for (const config of SYNCED_TABLES) {
      await pushTable(config, since);
    }

    // Pull all remote changes
    for (const config of SYNCED_TABLES) {
      await pullTable(config, since);
    }

    setLastSyncTimestamp(syncStartTime);
    notify({ syncing: false, lastSynced: new Date(), error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error("Sync error:", message);
    notify({ syncing: false, error: message });
  } finally {
    syncInProgress = false;
  }
}

export function scheduleSyncDebounced(): void {
  if (!getSupabase()) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    syncWithCloud();
  }, SYNC_DEBOUNCE_MS);
}
```

- [ ] **Step 2: Build to verify no type errors**

```bash
npx next build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/sync.ts
git commit -m "feat: add sync engine with push/pull to Supabase"
```

---

### Task 6: Create Sync Status Hook

**Files:**
- Create: `src/hooks/useSyncStatus.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useSyncStatus.ts`:

```typescript
import { useState, useEffect } from "react";
import { subscribeSyncStatus } from "@/lib/sync";

interface SyncStatus {
  syncing: boolean;
  lastSynced: Date | null;
  error: string | null;
}

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({
    syncing: false,
    lastSynced: null,
    error: null,
  });

  useEffect(() => {
    return subscribeSyncStatus(setStatus);
  }, []);

  return status;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useSyncStatus.ts
git commit -m "feat: add useSyncStatus hook for UI sync indicator"
```

---

### Task 7: Wire Sync into Providers and Hooks

**Files:**
- Modify: `src/components/Providers.tsx`
- Modify: `src/hooks/useCustomers.ts`
- Modify: `src/hooks/useJobs.ts`
- Modify: `src/hooks/useQuotes.ts`
- Modify: `src/hooks/useSettings.ts`

- [ ] **Step 1: Add sync triggers to Providers.tsx**

Replace `src/components/Providers.tsx` with:

```tsx
"use client";

import { useEffect } from "react";
import { seedDatabase } from "@/lib/seed-data";
import { useCalendarSync } from "@/hooks/useCalendarSync";
import { syncWithCloud } from "@/lib/sync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function Providers({ children }: { children: React.ReactNode }) {
  useCalendarSync();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    seedDatabase().then(() => {
      syncWithCloud();
    });
  }, []);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncWithCloud();
    }
  }, [isOnline]);

  return <>{children}</>;
}
```

- [ ] **Step 2: Add scheduleSyncDebounced to useCustomers.ts write functions**

In `src/hooks/useCustomers.ts`, add the import and calls:

```typescript
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import { scheduleSyncDebounced } from "@/lib/sync";
import type { Customer } from "@/lib/types";

export function useCustomers(searchQuery?: string) {
  const customers = useLiveQuery(async () => {
    let collection = db.customers.orderBy("name");
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (await collection.toArray()).filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.email.toLowerCase().includes(q)
      );
    }
    return collection.toArray();
  }, [searchQuery]);

  return customers ?? [];
}

export function useCustomer(id: string) {
  return useLiveQuery(() => db.customers.get(id), [id]);
}

export async function createCustomer(
  data: Omit<Customer, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = new Date().toISOString();
  const id = uuid();
  await db.customers.add({ ...data, id, createdAt: now, updatedAt: now });
  scheduleSyncDebounced();
  return id;
}

export async function updateCustomer(
  id: string,
  data: Partial<Customer>
): Promise<void> {
  await db.customers.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
  scheduleSyncDebounced();
}

export async function deleteCustomer(id: string): Promise<void> {
  await db.customers.delete(id);
  scheduleSyncDebounced();
}
```

- [ ] **Step 3: Add scheduleSyncDebounced to useJobs.ts write functions**

In `src/hooks/useJobs.ts`, add import at top:

```typescript
import { scheduleSyncDebounced } from "@/lib/sync";
```

Add `scheduleSyncDebounced();` as the last line of `createJob`, `updateJob`, and `deleteJob` (before the final `return` in createJob).

Specifically, in `createJob`, add before `return id;`:
```typescript
  scheduleSyncDebounced();
  return id;
```

In `updateJob`, add at the end:
```typescript
  scheduleSyncDebounced();
```

In `deleteJob`, add at the end:
```typescript
  scheduleSyncDebounced();
```

- [ ] **Step 4: Add scheduleSyncDebounced to useQuotes.ts write functions**

In `src/hooks/useQuotes.ts`, add import at top:

```typescript
import { scheduleSyncDebounced } from "@/lib/sync";
```

Add `scheduleSyncDebounced();` as the last line of: `createQuote`, `updateQuote`, `addRoom`, `updateRoom`, `deleteRoom`, `recalculateQuoteTotals`.

- [ ] **Step 5: Add scheduleSyncDebounced to useSettings.ts write functions**

In `src/hooks/useSettings.ts`, add import at top:

```typescript
import { scheduleSyncDebounced } from "@/lib/sync";
```

Add `scheduleSyncDebounced();` as the last line of: `updateSettings`, `updatePaintPreset`, `updateMessageTemplate`, `createMessageTemplate`, `deleteMessageTemplate`.

- [ ] **Step 6: Build to verify**

```bash
npx next build
```

Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/components/Providers.tsx src/hooks/useCustomers.ts src/hooks/useJobs.ts src/hooks/useQuotes.ts src/hooks/useSettings.ts
git commit -m "feat: wire sync triggers into all data write hooks"
```

---

### Task 8: Add Sync Indicator to AppShell and Settings

**Files:**
- Modify: `src/components/AppShell.tsx`
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Add sync indicator to AppShell header**

In `src/components/AppShell.tsx`, add the import:

```typescript
import { useSyncStatus } from "@/hooks/useSyncStatus";
```

Inside the `AppShell` component, add after the existing hooks:

```typescript
const syncStatus = useSyncStatus();
```

Replace the online/offline indicator `<div>` (the one with `className="flex items-center gap-2"`) with:

```tsx
<div className="flex items-center gap-2">
  {/* Sync indicator */}
  {syncStatus.syncing ? (
    <svg width="14" height="14" viewBox="0 0 14 14" className="text-blue-400 animate-spin" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="12 20" />
    </svg>
  ) : syncStatus.lastSynced ? (
    <svg width="14" height="14" viewBox="0 0 14 14" className="text-emerald-400/60" fill="none">
      <path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ) : null}
  <span
    className={`text-xs font-medium ${isOnline ? "text-emerald-400" : "text-amber-400"}`}
  >
    {isOnline ? "" : "Offline"}
  </span>
  <span
    className={`w-2.5 h-2.5 rounded-full ${
      isOnline
        ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
        : "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
    }`}
    title={isOnline ? "Online" : "Offline"}
  />
</div>
```

- [ ] **Step 2: Add last synced time to Settings page**

In `src/app/settings/page.tsx`, find the Backup & Restore section. Before it, add a Cloud Sync section. First add the import near the top of the file:

```typescript
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { syncWithCloud } from "@/lib/sync";
```

Then create a new section component inside the file (before the `export default`):

```tsx
function CloudSyncSection() {
  const syncStatus = useSyncStatus();
  const [syncing, setSyncing] = useState(false);

  async function handleSyncNow() {
    setSyncing(true);
    await syncWithCloud();
    setSyncing(false);
  }

  return (
    <>
      <SectionHeader title="Cloud Sync" />
      <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-[14px] font-medium">Last Synced</p>
            <p className="text-white/40 text-[13px] mt-0.5">
              {syncStatus.lastSynced
                ? syncStatus.lastSynced.toLocaleString()
                : "Never"}
            </p>
          </div>
          <button
            onClick={handleSyncNow}
            disabled={syncing || syncStatus.syncing}
            className="px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[14px] font-medium active:bg-blue-500/30 transition-colors disabled:opacity-50"
          >
            {syncing || syncStatus.syncing ? "Syncing…" : "Sync Now"}
          </button>
        </div>
        {syncStatus.error && (
          <p className="text-amber-400/80 text-[12px]">
            Sync issue: {syncStatus.error}. Will retry automatically.
          </p>
        )}
        {!process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <p className="text-white/30 text-[12px]">
            Cloud sync not configured. Add Supabase credentials to enable.
          </p>
        )}
      </div>
    </>
  );
}
```

Add `<CloudSyncSection />` in the settings page JSX, before the Backup & Restore section.

- [ ] **Step 3: Build to verify**

```bash
npx next build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/AppShell.tsx src/app/settings/page.tsx
git commit -m "feat: add sync status indicator to header and settings"
```

---

### Task 9: Final Build, Test, and Push

- [ ] **Step 1: Full build**

```bash
npx next build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Run existing tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Manual verification checklist**

Start dev server and verify:
```bash
npx next dev
```

1. Home page loads without errors
2. Customer creation works
3. Quote creation works
4. Calculator works
5. Settings page shows "Cloud Sync" section with "Cloud sync not configured" message
6. Sync indicator (checkmark or spinner) appears in header
7. No console errors

- [ ] **Step 4: Push to GitHub**

```bash
git push origin main
```

Vercel will auto-deploy. After deploy, add Supabase env vars in Vercel dashboard.

---

## Post-Implementation: Supabase Setup Guide

After the code is deployed, walk the user through:

1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy the project URL and anon key from Project Settings → API
3. Open SQL Editor → paste contents of `supabase-schema.sql` → Run
4. In Vercel dashboard → Settings → Environment Variables → add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Redeploy from Vercel dashboard
6. Open the app → Settings → Cloud Sync → tap "Sync Now" to verify
