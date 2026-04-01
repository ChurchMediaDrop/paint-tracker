# Paint Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully offline PWA for a solo painting contractor to manage customers, jobs, quotes, and scheduling from his iPhone.

**Architecture:** Purely client-side Next.js static export. All data in IndexedDB via Dexie.js. No backend. Google Calendar API called from browser. Hosted free on GitHub Pages or Cloudflare Pages.

**Tech Stack:** Next.js 15 (app router, static export), TypeScript, Tailwind CSS, Dexie.js (IndexedDB), Vitest + React Testing Library, next-pwa

**Design Requirement:** All UI must be built using the `frontend-design` skill for professional, polished mobile-first design. No generic/default styling.

**Spec:** `docs/superpowers/specs/2026-04-01-paint-tracker-design.md`

---

## File Structure

```
src/
  app/
    layout.tsx                      # Root layout, PWA meta, global providers
    page.tsx                        # Home screen (hub & spoke tiles + stats)
    customers/
      page.tsx                      # Customer list with search
      [id]/page.tsx                 # Customer detail + job history
    jobs/
      [id]/page.tsx                 # Job detail + status management + actuals
    quotes/
      new/page.tsx                  # New quote wizard (multi-step)
      [id]/page.tsx                 # Quote review + shopping list
    schedule/
      page.tsx                      # Schedule view (day/week toggle)
    calculator/
      page.tsx                      # Standalone paint calculator
    settings/
      page.tsx                      # Settings, presets, templates, backup
  lib/
    db.ts                           # Dexie database schema + instance
    types.ts                        # All TypeScript types and enums
    paint-calculator.ts             # Pure paint calculation functions
    shopping-list.ts                # Shopping list aggregation logic
    message-templates.ts            # Template rendering with placeholders
    seed-data.ts                    # Default presets, templates, settings
    backup.ts                       # Export/import database as JSON
    google-calendar.ts              # Google Calendar API client
    format.ts                       # Currency, date, number formatting helpers
  hooks/
    useCustomers.ts                 # Customer CRUD operations
    useJobs.ts                      # Job CRUD + status transitions
    useQuotes.ts                    # Quote + Room CRUD + calculations
    useSettings.ts                  # App settings read/write
    useOnlineStatus.ts              # Online/offline detection
    useCalendarSync.ts              # Calendar sync queue processor
    useBackupReminder.ts            # Monthly backup reminder logic
  components/
    AppShell.tsx                    # Back button header, online indicator
    StatusBadge.tsx                 # Job status pill component
    RoomForm.tsx                    # Room/area entry form (paint + non-paint)
    ShoppingList.tsx                # Aggregated paint shopping list
    QuoteSummary.tsx                # Quote total breakdown
    TemplatePicker.tsx              # Message template selection + send
    CustomerPicker.tsx              # Select or create customer
    ConfirmDialog.tsx               # Reusable confirmation modal
public/
  manifest.json                     # PWA manifest
  icons/                            # App icons (192x192, 512x512)
next.config.ts                      # Static export + PWA config
tailwind.config.ts                  # Tailwind configuration
vitest.config.ts                    # Vitest setup
```

---

## Phase 1: Foundation

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd "/Users/bradzimmerman/Documents/Paint Tracker"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Accept defaults. This creates the full Next.js scaffolding.

- [ ] **Step 2: Install dependencies**

```bash
npm install dexie dexie-react-hooks uuid
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom @types/uuid
```

- [ ] **Step 3: Configure static export in next.config.ts**

Replace `next.config.ts` contents:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: [],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 5: Add test script to package.json**

Add to the `"scripts"` section:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Verify project builds**

```bash
npm run build
```

Expected: Build succeeds with static export to `out/` directory.

- [ ] **Step 7: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js project with Tailwind, Vitest, Dexie"
```

---

### Task 2: TypeScript Types & Enums

**Files:**
- Create: `src/lib/types.ts`
- Test: `src/lib/__tests__/types.test.ts`

- [ ] **Step 1: Write type validation tests**

Create `src/lib/__tests__/types.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  ServiceType,
  JobStatus,
  RoomType,
  FinishType,
  SurfaceType,
  JOB_STATUS_ORDER,
} from "@/lib/types";

describe("types", () => {
  it("ServiceType has all four service types", () => {
    expect(Object.values(ServiceType)).toEqual([
      "interior_paint",
      "exterior_paint",
      "power_washing",
      "handyman",
    ]);
  });

  it("JobStatus has correct progression order", () => {
    expect(JOB_STATUS_ORDER).toEqual([
      JobStatus.Lead,
      JobStatus.Quoted,
      JobStatus.Scheduled,
      JobStatus.InProgress,
      JobStatus.Complete,
      JobStatus.Paid,
    ]);
  });

  it("RoomType has walls, ceiling, exterior, other", () => {
    expect(Object.values(RoomType)).toEqual([
      "walls",
      "ceiling",
      "exterior",
      "other",
    ]);
  });

  it("FinishType has all finish options", () => {
    expect(Object.values(FinishType)).toEqual([
      "flat",
      "eggshell",
      "satin",
      "semi_gloss",
      "gloss",
    ]);
  });

  it("SurfaceType has all surface options", () => {
    expect(Object.values(SurfaceType)).toHaveLength(9);
    expect(Object.values(SurfaceType)).toContain("smooth_drywall");
    expect(Object.values(SurfaceType)).toContain("stucco");
    expect(Object.values(SurfaceType)).toContain("wood_deck");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/types.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement types**

Create `src/lib/types.ts`:

```typescript
export enum ServiceType {
  InteriorPaint = "interior_paint",
  ExteriorPaint = "exterior_paint",
  PowerWashing = "power_washing",
  Handyman = "handyman",
}

export enum JobStatus {
  Lead = "lead",
  Quoted = "quoted",
  Scheduled = "scheduled",
  InProgress = "in_progress",
  Complete = "complete",
  Paid = "paid",
}

export const JOB_STATUS_ORDER: JobStatus[] = [
  JobStatus.Lead,
  JobStatus.Quoted,
  JobStatus.Scheduled,
  JobStatus.InProgress,
  JobStatus.Complete,
  JobStatus.Paid,
];

export enum RoomType {
  Walls = "walls",
  Ceiling = "ceiling",
  Exterior = "exterior",
  Other = "other",
}

export enum FinishType {
  Flat = "flat",
  Eggshell = "eggshell",
  Satin = "satin",
  SemiGloss = "semi_gloss",
  Gloss = "gloss",
}

export enum SurfaceType {
  SmoothDrywall = "smooth_drywall",
  TexturedWalls = "textured_walls",
  Ceiling = "ceiling",
  TrimBaseboard = "trim_baseboard",
  Cabinets = "cabinets",
  ExteriorSiding = "exterior_siding",
  Stucco = "stucco",
  Brick = "brick",
  WoodDeck = "wood_deck",
}

export enum MessageChannel {
  SMS = "sms",
  Email = "email",
}

export enum CalendarOperation {
  Create = "create",
  Update = "update",
  Delete = "delete",
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  customerId: string;
  serviceType: ServiceType;
  status: JobStatus;
  scheduledDate: string;
  estimatedDuration: number;
  address: string;
  notes: string;
  googleCalendarEventId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: string;
  jobId: string;
  laborRate: number;
  markupPercent: number;
  totalMaterials: number;
  totalLabor: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  quoteId: string;
  name: string;
  serviceType: ServiceType;
  roomType: RoomType;
  length: number | null;
  width: number | null;
  height: number | null;
  doorCount: number;
  windowCount: number;
  surfaceType: SurfaceType | null;
  paintColor: string;
  paintBrand: string;
  finishType: FinishType | null;
  coats: number;
  pricePerGallon: number | null;
  paintableSqFt: number;
  gallonsNeeded: number;
  estimatedLaborHours: number;
  materialCost: number;
  laborCost: number;
  description: string;
  manualHours: number | null;
  manualCost: number | null;
  sortOrder: number;
}

export interface Actuals {
  id: string;
  jobId: string;
  actualHours: number;
  actualMaterialsCost: number;
  actualGallonsUsed: number;
  notes: string;
  completedAt: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  channel: MessageChannel;
  subject: string;
  body: string;
  isDefault: boolean;
}

export interface PaintPreset {
  id: string;
  surfaceType: SurfaceType;
  coverageRate: number;
  laborRate: number;
  isDefault: boolean;
}

export interface CalendarSyncQueue {
  id: string;
  jobId: string;
  operation: CalendarOperation;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AppSettings {
  id: string;
  defaultLaborRate: number;
  defaultMarkupPercent: number;
  backupReminderDays: number;
  lastBackupDate: string;
  googleCalendarConnected: boolean;
  googleCalendarToken: string;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/__tests__/types.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/__tests__/types.test.ts
git commit -m "feat: add TypeScript types and enums for all data models"
```

---

### Task 3: Database Layer (Dexie.js)

**Files:**
- Create: `src/lib/db.ts`
- Create: `src/lib/seed-data.ts`
- Test: `src/lib/__tests__/db.test.ts`

- [ ] **Step 1: Write database tests**

Create `src/lib/__tests__/db.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import Dexie from "dexie";
import { db, PaintTrackerDB } from "@/lib/db";
import { seedDatabase } from "@/lib/seed-data";
import { SurfaceType, MessageChannel } from "@/lib/types";

// Use in-memory database for tests
beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("database schema", () => {
  it("has all expected tables", () => {
    const tableNames = db.tables.map((t) => t.name).sort();
    expect(tableNames).toEqual([
      "actuals",
      "appSettings",
      "calendarSyncQueue",
      "customers",
      "jobs",
      "messageTemplates",
      "paintPresets",
      "quotes",
      "rooms",
    ]);
  });

  it("can CRUD a customer", async () => {
    const id = "test-customer-1";
    await db.customers.add({
      id,
      name: "John Smith",
      phone: "555-1234",
      email: "john@example.com",
      address: "123 Main St",
      notes: "Has a dog",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const customer = await db.customers.get(id);
    expect(customer?.name).toBe("John Smith");
    expect(customer?.phone).toBe("555-1234");

    await db.customers.update(id, { name: "John D. Smith" });
    const updated = await db.customers.get(id);
    expect(updated?.name).toBe("John D. Smith");

    await db.customers.delete(id);
    const deleted = await db.customers.get(id);
    expect(deleted).toBeUndefined();
  });
});

describe("seed data", () => {
  it("seeds default paint presets", async () => {
    await seedDatabase();
    const presets = await db.paintPresets.toArray();
    expect(presets.length).toBe(9);

    const drywall = presets.find(
      (p) => p.surfaceType === SurfaceType.SmoothDrywall
    );
    expect(drywall?.coverageRate).toBe(375);
    expect(drywall?.laborRate).toBe(175);
    expect(drywall?.isDefault).toBe(true);
  });

  it("seeds default message templates", async () => {
    await seedDatabase();
    const templates = await db.messageTemplates.toArray();
    expect(templates.length).toBe(4);

    const quoteSent = templates.find((t) => t.name === "Quote Sent");
    expect(quoteSent?.channel).toBe(MessageChannel.SMS);
    expect(quoteSent?.body).toContain("{customer_name}");
    expect(quoteSent?.isDefault).toBe(true);
  });

  it("seeds default app settings", async () => {
    await seedDatabase();
    const settings = await db.appSettings.get("default");
    expect(settings?.defaultLaborRate).toBe(50);
    expect(settings?.defaultMarkupPercent).toBe(20);
    expect(settings?.backupReminderDays).toBe(30);
  });

  it("does not duplicate seed data on multiple calls", async () => {
    await seedDatabase();
    await seedDatabase();
    const presets = await db.paintPresets.toArray();
    expect(presets.length).toBe(9);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/db.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement database schema**

Create `src/lib/db.ts`:

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
  }
}

export const db = new PaintTrackerDB();
```

- [ ] **Step 4: Implement seed data**

Create `src/lib/seed-data.ts`:

```typescript
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import {
  SurfaceType,
  MessageChannel,
  type PaintPreset,
  type MessageTemplate,
  type AppSettings,
} from "@/lib/types";

const DEFAULT_PRESETS: Omit<PaintPreset, "id">[] = [
  { surfaceType: SurfaceType.SmoothDrywall, coverageRate: 375, laborRate: 175, isDefault: true },
  { surfaceType: SurfaceType.TexturedWalls, coverageRate: 275, laborRate: 120, isDefault: true },
  { surfaceType: SurfaceType.Ceiling, coverageRate: 375, laborRate: 150, isDefault: true },
  { surfaceType: SurfaceType.TrimBaseboard, coverageRate: 400, laborRate: 80, isDefault: true },
  { surfaceType: SurfaceType.Cabinets, coverageRate: 375, laborRate: 60, isDefault: true },
  { surfaceType: SurfaceType.ExteriorSiding, coverageRate: 350, laborRate: 150, isDefault: true },
  { surfaceType: SurfaceType.Stucco, coverageRate: 200, laborRate: 100, isDefault: true },
  { surfaceType: SurfaceType.Brick, coverageRate: 250, laborRate: 90, isDefault: true },
  { surfaceType: SurfaceType.WoodDeck, coverageRate: 300, laborRate: 120, isDefault: true },
];

const DEFAULT_TEMPLATES: Omit<MessageTemplate, "id">[] = [
  {
    name: "Quote Sent",
    channel: MessageChannel.SMS,
    subject: "",
    body: "Hi {customer_name}, here's your quote for {service_type} at {job_address}: ${job_total}. Let me know if you have any questions!",
    isDefault: true,
  },
  {
    name: "Quote Follow-up",
    channel: MessageChannel.SMS,
    subject: "",
    body: "Hi {customer_name}, just following up on the quote I sent for {service_type}. Happy to answer any questions.",
    isDefault: true,
  },
  {
    name: "Appointment Reminder",
    channel: MessageChannel.SMS,
    subject: "",
    body: "Hi {customer_name}, just a reminder I'll be at {job_address} on {scheduled_date}. See you then!",
    isDefault: true,
  },
  {
    name: "Job Complete",
    channel: MessageChannel.SMS,
    subject: "",
    body: "Hi {customer_name}, the {service_type} at {job_address} is all done. Let me know if you'd like to do a walk-through!",
    isDefault: true,
  },
];

const DEFAULT_SETTINGS: AppSettings = {
  id: "default",
  defaultLaborRate: 50,
  defaultMarkupPercent: 20,
  backupReminderDays: 30,
  lastBackupDate: "",
  googleCalendarConnected: false,
  googleCalendarToken: "",
};

export async function seedDatabase(): Promise<void> {
  const existingPresets = await db.paintPresets.count();
  if (existingPresets === 0) {
    await db.paintPresets.bulkAdd(
      DEFAULT_PRESETS.map((p) => ({ ...p, id: uuid() }))
    );
  }

  const existingTemplates = await db.messageTemplates.count();
  if (existingTemplates === 0) {
    await db.messageTemplates.bulkAdd(
      DEFAULT_TEMPLATES.map((t) => ({ ...t, id: uuid() }))
    );
  }

  const existingSettings = await db.appSettings.get("default");
  if (!existingSettings) {
    await db.appSettings.add(DEFAULT_SETTINGS);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/db.test.ts
```

Expected: PASS (note: Dexie uses fake-indexeddb automatically in Node/jsdom environments. If tests fail due to missing IndexedDB, install `fake-indexeddb` and import it in a vitest setup file.)

If IndexedDB is missing, run:

```bash
npm install -D fake-indexeddb
```

And add to `vitest.config.ts` setupFiles:

```typescript
setupFiles: ["fake-indexeddb/auto"],
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/db.ts src/lib/seed-data.ts src/lib/__tests__/db.test.ts vitest.config.ts
git commit -m "feat: add Dexie database schema and seed data"
```

---

## Phase 2: Business Logic (Pure Functions)

### Task 4: Paint Calculator

**Files:**
- Create: `src/lib/paint-calculator.ts`
- Test: `src/lib/__tests__/paint-calculator.test.ts`

- [ ] **Step 1: Write paint calculator tests**

Create `src/lib/__tests__/paint-calculator.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  calculatePaintableArea,
  calculateGallonsNeeded,
  calculateLaborHours,
  calculateRoomCost,
  roundToNearestQuarterGallon,
} from "@/lib/paint-calculator";
import { RoomType, SurfaceType } from "@/lib/types";

describe("calculatePaintableArea", () => {
  it("calculates wall area with door and window deductions", () => {
    // 12x10 room, 8ft ceiling, 1 door, 2 windows
    // Wall area = 2 * (12 + 10) * 8 = 352
    // Deductions = 1*20 + 2*15 = 50
    // Paintable = 302
    const result = calculatePaintableArea({
      roomType: RoomType.Walls,
      length: 12,
      width: 10,
      height: 8,
      doorCount: 1,
      windowCount: 2,
    });
    expect(result).toBe(302);
  });

  it("calculates ceiling area as length * width", () => {
    const result = calculatePaintableArea({
      roomType: RoomType.Ceiling,
      length: 12,
      width: 10,
      height: 8,
      doorCount: 0,
      windowCount: 0,
    });
    expect(result).toBe(120);
  });

  it("calculates exterior area as length * height", () => {
    const result = calculatePaintableArea({
      roomType: RoomType.Exterior,
      length: 40,
      width: null,
      height: 10,
      doorCount: 1,
      windowCount: 4,
    });
    // 40 * 10 = 400, minus 1*20 + 4*15 = 80
    expect(result).toBe(320);
  });

  it("never returns negative area", () => {
    const result = calculatePaintableArea({
      roomType: RoomType.Walls,
      length: 5,
      width: 5,
      height: 8,
      doorCount: 10,
      windowCount: 10,
    });
    expect(result).toBe(0);
  });
});

describe("calculateGallonsNeeded", () => {
  it("calculates gallons with waste factor", () => {
    // 300 sq ft, 2 coats, 375 coverage
    // raw = (300 * 2) / 375 = 1.6
    // with 10% waste = 1.76
    const result = calculateGallonsNeeded(300, 2, 375);
    expect(result).toBeCloseTo(1.76, 2);
  });

  it("returns 0 for 0 sq ft", () => {
    const result = calculateGallonsNeeded(0, 2, 375);
    expect(result).toBe(0);
  });
});

describe("roundToNearestQuarterGallon", () => {
  it("rounds up to nearest quarter gallon", () => {
    expect(roundToNearestQuarterGallon(1.76)).toBe(2.0);
    expect(roundToNearestQuarterGallon(1.1)).toBe(1.25);
    expect(roundToNearestQuarterGallon(1.0)).toBe(1.0);
    expect(roundToNearestQuarterGallon(0.3)).toBe(0.5);
  });
});

describe("calculateLaborHours", () => {
  it("calculates labor hours with 15% prep time", () => {
    // 300 sq ft, 2 coats, 175 sq ft/hr production rate
    // raw = (300 * 2) / 175 = 3.43
    // with 15% prep = 3.94
    const result = calculateLaborHours(300, 2, 175);
    expect(result).toBeCloseTo(3.94, 1);
  });
});

describe("calculateRoomCost", () => {
  it("calculates total room cost from gallons and hours", () => {
    // 2 gallons at $45/gal = $90 materials
    // 4 hours at $50/hr = $200 labor
    const result = calculateRoomCost({
      gallonsNeeded: 2,
      pricePerGallon: 45,
      laborHours: 4,
      laborRate: 50,
    });
    expect(result.materialCost).toBe(90);
    expect(result.laborCost).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/__tests__/paint-calculator.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement paint calculator**

Create `src/lib/paint-calculator.ts`:

```typescript
import { RoomType } from "@/lib/types";

const DOOR_SQ_FT = 20;
const WINDOW_SQ_FT = 15;
const WASTE_FACTOR = 1.10;
const PREP_TIME_FACTOR = 1.15;

interface AreaInput {
  roomType: RoomType;
  length: number | null;
  width: number | null;
  height: number | null;
  doorCount: number;
  windowCount: number;
}

export function calculatePaintableArea(input: AreaInput): number {
  const { roomType, length, width, height, doorCount, windowCount } = input;
  const l = length ?? 0;
  const w = width ?? 0;
  const h = height ?? 0;

  let rawArea: number;

  switch (roomType) {
    case RoomType.Ceiling:
      rawArea = l * w;
      break;
    case RoomType.Exterior:
      rawArea = l * h;
      break;
    case RoomType.Walls:
      rawArea = 2 * (l + w) * h;
      break;
    default:
      rawArea = l * w || l * h || 0;
      break;
  }

  const deductions = doorCount * DOOR_SQ_FT + windowCount * WINDOW_SQ_FT;
  return Math.max(0, rawArea - deductions);
}

export function calculateGallonsNeeded(
  paintableSqFt: number,
  coats: number,
  coverageRate: number
): number {
  if (paintableSqFt === 0 || coverageRate === 0) return 0;
  return ((paintableSqFt * coats) / coverageRate) * WASTE_FACTOR;
}

export function roundToNearestQuarterGallon(gallons: number): number {
  return Math.ceil(gallons * 4) / 4;
}

export function calculateLaborHours(
  paintableSqFt: number,
  coats: number,
  laborProductionRate: number
): number {
  if (paintableSqFt === 0 || laborProductionRate === 0) return 0;
  return ((paintableSqFt * coats) / laborProductionRate) * PREP_TIME_FACTOR;
}

interface CostInput {
  gallonsNeeded: number;
  pricePerGallon: number;
  laborHours: number;
  laborRate: number;
}

interface CostResult {
  materialCost: number;
  laborCost: number;
}

export function calculateRoomCost(input: CostInput): CostResult {
  return {
    materialCost: input.gallonsNeeded * input.pricePerGallon,
    laborCost: input.laborHours * input.laborRate,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/paint-calculator.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/paint-calculator.ts src/lib/__tests__/paint-calculator.test.ts
git commit -m "feat: add paint calculator with area, gallons, labor, cost functions"
```

---

### Task 5: Shopping List Aggregation

**Files:**
- Create: `src/lib/shopping-list.ts`
- Test: `src/lib/__tests__/shopping-list.test.ts`

- [ ] **Step 1: Write shopping list tests**

Create `src/lib/__tests__/shopping-list.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { aggregateShoppingList, recommendPurchaseSize } from "@/lib/shopping-list";
import {
  ServiceType,
  RoomType,
  SurfaceType,
  FinishType,
  type Room,
} from "@/lib/types";

function makeRoom(overrides: Partial<Room>): Room {
  return {
    id: "r1",
    quoteId: "q1",
    name: "Test Room",
    serviceType: ServiceType.InteriorPaint,
    roomType: RoomType.Walls,
    length: 12,
    width: 10,
    height: 8,
    doorCount: 1,
    windowCount: 2,
    surfaceType: SurfaceType.SmoothDrywall,
    paintColor: "Revere Pewter",
    paintBrand: "Benjamin Moore",
    finishType: FinishType.Eggshell,
    coats: 2,
    pricePerGallon: 45,
    paintableSqFt: 302,
    gallonsNeeded: 1.76,
    estimatedLaborHours: 4,
    materialCost: 79.2,
    laborCost: 200,
    description: "",
    manualHours: null,
    manualCost: null,
    sortOrder: 0,
    ...overrides,
  };
}

describe("aggregateShoppingList", () => {
  it("groups rooms by color + finish + brand", () => {
    const rooms = [
      makeRoom({ id: "r1", gallonsNeeded: 1.5 }),
      makeRoom({ id: "r2", gallonsNeeded: 2.0 }),
    ];
    const list = aggregateShoppingList(rooms);
    expect(list).toHaveLength(1);
    expect(list[0].totalGallons).toBeCloseTo(3.5);
    expect(list[0].paintColor).toBe("Revere Pewter");
    expect(list[0].finishType).toBe(FinishType.Eggshell);
    expect(list[0].paintBrand).toBe("Benjamin Moore");
  });

  it("separates different colors into different groups", () => {
    const rooms = [
      makeRoom({ id: "r1", paintColor: "Revere Pewter", gallonsNeeded: 1.5 }),
      makeRoom({ id: "r2", paintColor: "Simply White", gallonsNeeded: 1.0 }),
    ];
    const list = aggregateShoppingList(rooms);
    expect(list).toHaveLength(2);
  });

  it("excludes non-paint service types", () => {
    const rooms = [
      makeRoom({ id: "r1", gallonsNeeded: 1.5 }),
      makeRoom({
        id: "r2",
        serviceType: ServiceType.PowerWashing,
        gallonsNeeded: 0,
        paintColor: "",
      }),
    ];
    const list = aggregateShoppingList(rooms);
    expect(list).toHaveLength(1);
  });
});

describe("recommendPurchaseSize", () => {
  it("recommends quarts for small amounts", () => {
    expect(recommendPurchaseSize(0.5)).toBe("2 quarts");
  });

  it("recommends gallons for medium amounts", () => {
    expect(recommendPurchaseSize(2.5)).toBe("3 gallons");
  });

  it("recommends 5-gallon buckets for large amounts", () => {
    expect(recommendPurchaseSize(8)).toBe("1 five-gallon + 3 gallons");
  });

  it("handles exact gallon amounts", () => {
    expect(recommendPurchaseSize(1.0)).toBe("1 gallon");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/__tests__/shopping-list.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement shopping list**

Create `src/lib/shopping-list.ts`:

```typescript
import { ServiceType, FinishType, type Room } from "@/lib/types";
import { roundToNearestQuarterGallon } from "@/lib/paint-calculator";

export interface ShoppingListItem {
  paintColor: string;
  paintBrand: string;
  finishType: FinishType;
  totalGallons: number;
  purchaseGallons: number;
  purchaseRecommendation: string;
  pricePerGallon: number;
  totalCost: number;
}

export function aggregateShoppingList(rooms: Room[]): ShoppingListItem[] {
  const paintRooms = rooms.filter(
    (r) =>
      (r.serviceType === ServiceType.InteriorPaint ||
        r.serviceType === ServiceType.ExteriorPaint) &&
      r.paintColor &&
      r.gallonsNeeded > 0
  );

  const groups = new Map<string, Room[]>();
  for (const room of paintRooms) {
    const key = `${room.paintColor}|${room.finishType}|${room.paintBrand}`;
    const existing = groups.get(key) ?? [];
    existing.push(room);
    groups.set(key, existing);
  }

  return Array.from(groups.entries()).map(([, groupRooms]) => {
    const first = groupRooms[0];
    const totalGallons = groupRooms.reduce((sum, r) => sum + r.gallonsNeeded, 0);
    const purchaseGallons = roundToNearestQuarterGallon(totalGallons);
    const pricePerGallon = first.pricePerGallon ?? 0;

    return {
      paintColor: first.paintColor,
      paintBrand: first.paintBrand,
      finishType: first.finishType!,
      totalGallons,
      purchaseGallons,
      purchaseRecommendation: recommendPurchaseSize(purchaseGallons),
      pricePerGallon,
      totalCost: purchaseGallons * pricePerGallon,
    };
  });
}

export function recommendPurchaseSize(gallons: number): string {
  if (gallons <= 0) return "0 gallons";

  const roundedUp = Math.ceil(gallons);

  if (roundedUp < 1) {
    const quarts = Math.ceil(gallons * 4);
    return `${quarts} quart${quarts !== 1 ? "s" : ""}`;
  }

  if (roundedUp < 5) {
    return `${roundedUp} gallon${roundedUp !== 1 ? "s" : ""}`;
  }

  const fiveGallons = Math.floor(roundedUp / 5);
  const remainingGallons = roundedUp % 5;

  if (remainingGallons === 0) {
    return `${fiveGallons} five-gallon${fiveGallons !== 1 ? "s" : ""}`;
  }

  return `${fiveGallons} five-gallon + ${remainingGallons} gallon${remainingGallons !== 1 ? "s" : ""}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/shopping-list.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/shopping-list.ts src/lib/__tests__/shopping-list.test.ts
git commit -m "feat: add shopping list aggregation with purchase size recommendations"
```

---

### Task 6: Message Template Rendering

**Files:**
- Create: `src/lib/message-templates.ts`
- Test: `src/lib/__tests__/message-templates.test.ts`

- [ ] **Step 1: Write template rendering tests**

Create `src/lib/__tests__/message-templates.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { renderTemplate, buildSmsUrl, buildMailtoUrl } from "@/lib/message-templates";

describe("renderTemplate", () => {
  it("replaces all placeholders", () => {
    const template = "Hi {customer_name}, your {service_type} quote is ${job_total}.";
    const result = renderTemplate(template, {
      customer_name: "John",
      service_type: "Interior Paint",
      job_total: "2,400",
    });
    expect(result).toBe("Hi John, your Interior Paint quote is $2,400.");
  });

  it("leaves unknown placeholders as-is", () => {
    const result = renderTemplate("Hi {customer_name}, {unknown_field}", {
      customer_name: "John",
    });
    expect(result).toBe("Hi John, {unknown_field}");
  });

  it("handles empty values", () => {
    const result = renderTemplate("At {job_address}", { job_address: "" });
    expect(result).toBe("At ");
  });
});

describe("buildSmsUrl", () => {
  it("builds sms: URL with phone and body", () => {
    const url = buildSmsUrl("555-1234", "Hello there");
    expect(url).toBe("sms:555-1234&body=Hello%20there");
  });
});

describe("buildMailtoUrl", () => {
  it("builds mailto: URL with email, subject, and body", () => {
    const url = buildMailtoUrl("john@example.com", "Your Quote", "Hi John");
    expect(url).toBe("mailto:john@example.com?subject=Your%20Quote&body=Hi%20John");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/__tests__/message-templates.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement message templates**

Create `src/lib/message-templates.ts`:

```typescript
export function renderTemplate(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return key in values ? values[key] : match;
  });
}

export function buildSmsUrl(phone: string, body: string): string {
  return `sms:${phone}&body=${encodeURIComponent(body)}`;
}

export function buildMailtoUrl(
  email: string,
  subject: string,
  body: string
): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/message-templates.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/message-templates.ts src/lib/__tests__/message-templates.test.ts
git commit -m "feat: add message template rendering and SMS/email URL builders"
```

---

### Task 7: Backup & Restore

**Files:**
- Create: `src/lib/backup.ts`
- Test: `src/lib/__tests__/backup.test.ts`

- [ ] **Step 1: Write backup/restore tests**

Create `src/lib/__tests__/backup.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { seedDatabase } from "@/lib/seed-data";
import { exportDatabase, importDatabase } from "@/lib/backup";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("exportDatabase", () => {
  it("exports all tables as JSON with version", async () => {
    await seedDatabase();
    await db.customers.add({
      id: "c1",
      name: "Test Customer",
      phone: "555-1234",
      email: "",
      address: "",
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const exported = await exportDatabase();
    const data = JSON.parse(exported);

    expect(data.version).toBe(1);
    expect(data.exportedAt).toBeDefined();
    expect(data.customers).toHaveLength(1);
    expect(data.customers[0].name).toBe("Test Customer");
    expect(data.paintPresets).toHaveLength(9);
    expect(data.messageTemplates).toHaveLength(4);
  });
});

describe("importDatabase", () => {
  it("restores data from exported JSON", async () => {
    await seedDatabase();
    await db.customers.add({
      id: "c1",
      name: "Test Customer",
      phone: "",
      email: "",
      address: "",
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const exported = await exportDatabase();

    // Clear and reimport
    await db.delete();
    await db.open();
    await importDatabase(exported);

    const customers = await db.customers.toArray();
    expect(customers).toHaveLength(1);
    expect(customers[0].name).toBe("Test Customer");

    const presets = await db.paintPresets.toArray();
    expect(presets).toHaveLength(9);
  });

  it("throws on invalid JSON", async () => {
    await expect(importDatabase("not json")).rejects.toThrow();
  });

  it("throws on missing version", async () => {
    await expect(importDatabase(JSON.stringify({}))).rejects.toThrow(
      "Invalid backup file"
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/__tests__/backup.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement backup/restore**

Create `src/lib/backup.ts`:

```typescript
import { db } from "@/lib/db";

const CURRENT_VERSION = 1;

interface BackupData {
  version: number;
  exportedAt: string;
  customers: unknown[];
  jobs: unknown[];
  quotes: unknown[];
  rooms: unknown[];
  actuals: unknown[];
  messageTemplates: unknown[];
  paintPresets: unknown[];
  appSettings: unknown[];
}

export async function exportDatabase(): Promise<string> {
  const data: BackupData = {
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    customers: await db.customers.toArray(),
    jobs: await db.jobs.toArray(),
    quotes: await db.quotes.toArray(),
    rooms: await db.rooms.toArray(),
    actuals: await db.actuals.toArray(),
    messageTemplates: await db.messageTemplates.toArray(),
    paintPresets: await db.paintPresets.toArray(),
    appSettings: await db.appSettings.toArray(),
  };

  return JSON.stringify(data, null, 2);
}

export async function importDatabase(jsonString: string): Promise<void> {
  let data: BackupData;

  try {
    data = JSON.parse(jsonString);
  } catch {
    throw new Error("Invalid JSON in backup file");
  }

  if (!data.version) {
    throw new Error("Invalid backup file: missing version");
  }

  // Clear all tables
  await db.customers.clear();
  await db.jobs.clear();
  await db.quotes.clear();
  await db.rooms.clear();
  await db.actuals.clear();
  await db.messageTemplates.clear();
  await db.paintPresets.clear();
  await db.appSettings.clear();

  // Import all data
  if (data.customers?.length) await db.customers.bulkAdd(data.customers as never[]);
  if (data.jobs?.length) await db.jobs.bulkAdd(data.jobs as never[]);
  if (data.quotes?.length) await db.quotes.bulkAdd(data.quotes as never[]);
  if (data.rooms?.length) await db.rooms.bulkAdd(data.rooms as never[]);
  if (data.actuals?.length) await db.actuals.bulkAdd(data.actuals as never[]);
  if (data.messageTemplates?.length) await db.messageTemplates.bulkAdd(data.messageTemplates as never[]);
  if (data.paintPresets?.length) await db.paintPresets.bulkAdd(data.paintPresets as never[]);
  if (data.appSettings?.length) await db.appSettings.bulkAdd(data.appSettings as never[]);
}

export function downloadJson(jsonString: string, filename: string): void {
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/backup.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/backup.ts src/lib/__tests__/backup.test.ts
git commit -m "feat: add database export/import for backup and restore"
```

---

### Task 8: Formatting Helpers

**Files:**
- Create: `src/lib/format.ts`
- Test: `src/lib/__tests__/format.test.ts`

- [ ] **Step 1: Write formatting tests**

Create `src/lib/__tests__/format.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatServiceType,
  formatJobStatus,
  formatFinishType,
  formatSurfaceType,
} from "@/lib/format";
import { ServiceType, JobStatus, FinishType, SurfaceType } from "@/lib/types";

describe("formatCurrency", () => {
  it("formats dollars with commas", () => {
    expect(formatCurrency(2400)).toBe("$2,400.00");
    expect(formatCurrency(50)).toBe("$50.00");
    expect(formatCurrency(0)).toBe("$0.00");
  });
});

describe("formatServiceType", () => {
  it("formats enum to display string", () => {
    expect(formatServiceType(ServiceType.InteriorPaint)).toBe("Interior Paint");
    expect(formatServiceType(ServiceType.PowerWashing)).toBe("Power Washing");
    expect(formatServiceType(ServiceType.Handyman)).toBe("Handyman");
  });
});

describe("formatJobStatus", () => {
  it("formats status enum to display string", () => {
    expect(formatJobStatus(JobStatus.InProgress)).toBe("In Progress");
    expect(formatJobStatus(JobStatus.Lead)).toBe("Lead");
  });
});

describe("formatFinishType", () => {
  it("formats finish enum to display string", () => {
    expect(formatFinishType(FinishType.SemiGloss)).toBe("Semi-Gloss");
    expect(formatFinishType(FinishType.Eggshell)).toBe("Eggshell");
  });
});

describe("formatSurfaceType", () => {
  it("formats surface enum to display string", () => {
    expect(formatSurfaceType(SurfaceType.SmoothDrywall)).toBe("Smooth Drywall");
    expect(formatSurfaceType(SurfaceType.WoodDeck)).toBe("Wood/Deck");
    expect(formatSurfaceType(SurfaceType.TrimBaseboard)).toBe("Trim/Baseboard");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/__tests__/format.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement formatters**

Create `src/lib/format.ts`:

```typescript
import { ServiceType, JobStatus, FinishType, SurfaceType } from "@/lib/types";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(isoString: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.InteriorPaint]: "Interior Paint",
  [ServiceType.ExteriorPaint]: "Exterior Paint",
  [ServiceType.PowerWashing]: "Power Washing",
  [ServiceType.Handyman]: "Handyman",
};

export function formatServiceType(type: ServiceType): string {
  return SERVICE_TYPE_LABELS[type] ?? type;
}

const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  [JobStatus.Lead]: "Lead",
  [JobStatus.Quoted]: "Quoted",
  [JobStatus.Scheduled]: "Scheduled",
  [JobStatus.InProgress]: "In Progress",
  [JobStatus.Complete]: "Complete",
  [JobStatus.Paid]: "Paid",
};

export function formatJobStatus(status: JobStatus): string {
  return JOB_STATUS_LABELS[status] ?? status;
}

const FINISH_TYPE_LABELS: Record<FinishType, string> = {
  [FinishType.Flat]: "Flat",
  [FinishType.Eggshell]: "Eggshell",
  [FinishType.Satin]: "Satin",
  [FinishType.SemiGloss]: "Semi-Gloss",
  [FinishType.Gloss]: "Gloss",
};

export function formatFinishType(type: FinishType): string {
  return FINISH_TYPE_LABELS[type] ?? type;
}

const SURFACE_TYPE_LABELS: Record<SurfaceType, string> = {
  [SurfaceType.SmoothDrywall]: "Smooth Drywall",
  [SurfaceType.TexturedWalls]: "Textured Walls",
  [SurfaceType.Ceiling]: "Ceiling",
  [SurfaceType.TrimBaseboard]: "Trim/Baseboard",
  [SurfaceType.Cabinets]: "Cabinets",
  [SurfaceType.ExteriorSiding]: "Exterior Siding",
  [SurfaceType.Stucco]: "Stucco",
  [SurfaceType.Brick]: "Brick",
  [SurfaceType.WoodDeck]: "Wood/Deck",
};

export function formatSurfaceType(type: SurfaceType): string {
  return SURFACE_TYPE_LABELS[type] ?? type;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/format.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/__tests__/format.test.ts
git commit -m "feat: add currency, date, and enum formatting helpers"
```

---

## Phase 3: Data Hooks

### Task 9: CRUD Hooks (Customers, Jobs, Quotes, Settings)

**Files:**
- Create: `src/hooks/useCustomers.ts`
- Create: `src/hooks/useJobs.ts`
- Create: `src/hooks/useQuotes.ts`
- Create: `src/hooks/useSettings.ts`
- Create: `src/hooks/useOnlineStatus.ts`
- Create: `src/hooks/useBackupReminder.ts`

These hooks wrap Dexie's `useLiveQuery` for reactive data access and provide mutation functions. Since they're thin wrappers around Dexie (which is already tested in Task 3), we test them via the UI components in Phase 4.

- [ ] **Step 1: Create useCustomers hook**

Create `src/hooks/useCustomers.ts`:

```typescript
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
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
}

export async function deleteCustomer(id: string): Promise<void> {
  await db.customers.delete(id);
}
```

- [ ] **Step 2: Create useJobs hook**

Create `src/hooks/useJobs.ts`:

```typescript
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import type { Job } from "@/lib/types";
import { JobStatus } from "@/lib/types";

export function useJobs(filters?: { customerId?: string; status?: JobStatus }) {
  const jobs = useLiveQuery(async () => {
    let results = await db.jobs.orderBy("scheduledDate").reverse().toArray();
    if (filters?.customerId) {
      results = results.filter((j) => j.customerId === filters.customerId);
    }
    if (filters?.status) {
      results = results.filter((j) => j.status === filters.status);
    }
    return results;
  }, [filters?.customerId, filters?.status]);

  return jobs ?? [];
}

export function useJob(id: string) {
  return useLiveQuery(() => db.jobs.get(id), [id]);
}

export function useJobsByDateRange(startDate: string, endDate: string) {
  const jobs = useLiveQuery(async () => {
    return db.jobs
      .where("scheduledDate")
      .between(startDate, endDate, true, true)
      .toArray();
  }, [startDate, endDate]);

  return jobs ?? [];
}

export async function createJob(
  data: Omit<Job, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = new Date().toISOString();
  const id = uuid();
  await db.jobs.add({ ...data, id, createdAt: now, updatedAt: now });
  return id;
}

export async function updateJob(
  id: string,
  data: Partial<Job>
): Promise<void> {
  await db.jobs.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteJob(id: string): Promise<void> {
  // Also delete related quote, rooms, and actuals
  const quote = await db.quotes.where("jobId").equals(id).first();
  if (quote) {
    await db.rooms.where("quoteId").equals(quote.id).delete();
    await db.quotes.delete(quote.id);
  }
  await db.actuals.where("jobId").equals(id).delete();
  await db.jobs.delete(id);
}
```

- [ ] **Step 3: Create useQuotes hook**

Create `src/hooks/useQuotes.ts`:

```typescript
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import type { Quote, Room } from "@/lib/types";

export function useQuote(jobId: string) {
  return useLiveQuery(
    () => db.quotes.where("jobId").equals(jobId).first(),
    [jobId]
  );
}

export function useQuoteById(id: string) {
  return useLiveQuery(() => db.quotes.get(id), [id]);
}

export function useRooms(quoteId: string) {
  const rooms = useLiveQuery(
    () => db.rooms.where("quoteId").equals(quoteId).sortBy("sortOrder"),
    [quoteId]
  );
  return rooms ?? [];
}

export async function createQuote(
  data: Omit<Quote, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = new Date().toISOString();
  const id = uuid();
  await db.quotes.add({ ...data, id, createdAt: now, updatedAt: now });
  return id;
}

export async function updateQuote(
  id: string,
  data: Partial<Quote>
): Promise<void> {
  await db.quotes.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function addRoom(
  data: Omit<Room, "id">
): Promise<string> {
  const id = uuid();
  await db.rooms.add({ ...data, id });
  return id;
}

export async function updateRoom(
  id: string,
  data: Partial<Room>
): Promise<void> {
  await db.rooms.update(id, data);
}

export async function deleteRoom(id: string): Promise<void> {
  await db.rooms.delete(id);
}

export async function recalculateQuoteTotals(quoteId: string): Promise<void> {
  const rooms = await db.rooms.where("quoteId").equals(quoteId).toArray();
  const quote = await db.quotes.get(quoteId);
  if (!quote) return;

  const totalMaterials = rooms.reduce(
    (sum, r) => sum + (r.materialCost || r.manualCost || 0),
    0
  );
  const totalLaborHours = rooms.reduce(
    (sum, r) => sum + (r.estimatedLaborHours || r.manualHours || 0),
    0
  );
  const totalLabor = totalLaborHours * quote.laborRate;
  const subtotal = totalMaterials + totalLabor;
  const totalPrice = subtotal * (1 + quote.markupPercent / 100);

  await updateQuote(quoteId, { totalMaterials, totalLabor, totalPrice });
}
```

- [ ] **Step 4: Create useSettings hook**

Create `src/hooks/useSettings.ts`:

```typescript
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { AppSettings, PaintPreset, MessageTemplate } from "@/lib/types";

export function useSettings() {
  return useLiveQuery(() => db.appSettings.get("default"));
}

export async function updateSettings(
  data: Partial<AppSettings>
): Promise<void> {
  await db.appSettings.update("default", data);
}

export function usePaintPresets() {
  const presets = useLiveQuery(() => db.paintPresets.toArray());
  return presets ?? [];
}

export async function updatePaintPreset(
  id: string,
  data: Partial<PaintPreset>
): Promise<void> {
  await db.paintPresets.update(id, data);
}

export function useMessageTemplates() {
  const templates = useLiveQuery(() => db.messageTemplates.toArray());
  return templates ?? [];
}

export async function updateMessageTemplate(
  id: string,
  data: Partial<MessageTemplate>
): Promise<void> {
  await db.messageTemplates.update(id, data);
}

export async function createMessageTemplate(
  data: Omit<MessageTemplate, "id">
): Promise<string> {
  const id = crypto.randomUUID();
  await db.messageTemplates.add({ ...data, id });
  return id;
}

export async function deleteMessageTemplate(id: string): Promise<void> {
  await db.messageTemplates.delete(id);
}
```

- [ ] **Step 5: Create useOnlineStatus hook**

Create `src/hooks/useOnlineStatus.ts`:

```typescript
import { useState, useEffect } from "react";

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
```

- [ ] **Step 6: Create useBackupReminder hook**

Create `src/hooks/useBackupReminder.ts`:

```typescript
import { useMemo } from "react";
import type { AppSettings } from "@/lib/types";

export function useBackupReminder(settings: AppSettings | undefined): boolean {
  return useMemo(() => {
    if (!settings) return false;
    if (!settings.lastBackupDate) return true;

    const lastBackup = new Date(settings.lastBackupDate);
    const now = new Date();
    const daysSince = Math.floor(
      (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSince >= settings.backupReminderDays;
  }, [settings]);
}
```

- [ ] **Step 7: Commit**

```bash
git add src/hooks/
git commit -m "feat: add data hooks for customers, jobs, quotes, settings, online status"
```

---

## Phase 4: UI Screens

> **IMPORTANT:** Every UI task below must use the `frontend-design` skill for implementation. The code snippets here define **structure and behavior only** — the actual styling, colors, spacing, and visual polish must come from the frontend-design skill. Do not copy these snippets' styling verbatim.

### Task 10: App Shell & Home Screen

**Files:**
- Create: `src/components/AppShell.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Create: `public/manifest.json`

- [ ] **Step 1: Create PWA manifest**

Create `public/manifest.json`:

```json
{
  "name": "Paint Tracker",
  "short_name": "PaintTracker",
  "description": "Job management for painting contractors",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 2: Create placeholder icons**

```bash
mkdir -p "/Users/bradzimmerman/Documents/Paint Tracker/public/icons"
```

Generate simple placeholder icons (these will be replaced with proper icons later). Use any online favicon generator or create simple SVG-based icons.

- [ ] **Step 3: Create AppShell component**

Create `src/components/AppShell.tsx` — a wrapper component providing:
- Back button header when not on home screen
- Online/offline status indicator (small dot in header)
- Backup reminder banner (when due)
- Page transition wrapper

Use `frontend-design` skill for the actual component implementation with proper mobile styling.

**Behavioral requirements:**
- `showBack` prop controls back arrow visibility
- `title` prop shows current section name
- Online indicator: green dot when online, red dot when offline
- Backup reminder: dismissible banner at top when `useBackupReminder` returns true
- Children rendered below header

- [ ] **Step 4: Build Home Screen with hub & spoke tiles**

Modify `src/app/page.tsx` — the home screen with:
- App title at top
- 4 large colorful tile buttons in a 2x2 grid: Schedule, Customers, New Quote, Calculator
- Quick stats bar at bottom: open quotes count, month's revenue, completed jobs count
- Stats are live-queried from Dexie

Use `frontend-design` skill for the actual implementation. The tiles should be large, tappable, visually distinct, and feel native on iPhone.

**Behavioral requirements:**
- Tiles link to `/schedule`, `/customers`, `/quotes/new`, `/calculator`
- Stats query: open quotes = jobs with status "quoted", month revenue = sum of totalPrice for jobs with status "paid" this month, completed = jobs with status "complete" or "paid" this month
- Seeds database on first load via `useEffect` calling `seedDatabase()`

- [ ] **Step 5: Update layout.tsx**

Modify `src/app/layout.tsx`:
- Add PWA meta tags (viewport, theme-color, apple-mobile-web-app-capable)
- Link to manifest.json
- Wrap children in a max-width container for mobile
- Import global Tailwind styles

- [ ] **Step 6: Verify build and test manually**

```bash
npm run build
npm run dev
```

Open http://localhost:3000 on your phone or Chrome DevTools mobile emulator. Verify:
- Home screen renders with 4 tiles
- Stats bar shows at bottom
- Online indicator visible
- Tapping tiles navigates to correct routes (404 for now is fine)

- [ ] **Step 7: Commit**

```bash
git add src/components/AppShell.tsx src/app/layout.tsx src/app/page.tsx public/manifest.json public/icons/
git commit -m "feat: add home screen with hub & spoke navigation tiles and app shell"
```

---

### Task 11: Customer Management Screens

**Files:**
- Create: `src/app/customers/page.tsx`
- Create: `src/app/customers/[id]/page.tsx`
- Create: `src/components/CustomerPicker.tsx`

- [ ] **Step 1: Build Customer List page**

Create `src/app/customers/page.tsx`:
- Search bar at top (filters as you type)
- List of customers showing: name, phone, last job date
- "Add Customer" button (floating or in header)
- Tapping a customer navigates to `/customers/[id]`
- Uses `useCustomers(searchQuery)` hook

Use `frontend-design` skill for implementation.

- [ ] **Step 2: Build Customer Detail page**

Create `src/app/customers/[id]/page.tsx`:
- Customer name, phone (tap-to-call via `tel:` link), email, address
- Editable fields (inline edit or edit mode)
- Notes section
- Job history list (most recent first) — uses `useJobs({ customerId })`
- Each job row shows: date, service type, status badge, total
- "Send Message" button → opens TemplatePicker (Task 14)
- "New Quote" button → navigates to `/quotes/new?customerId=[id]`

Use `frontend-design` skill for implementation.

- [ ] **Step 3: Build CustomerPicker component**

Create `src/components/CustomerPicker.tsx`:
- Used in the New Quote flow
- Search box to find existing customer
- "Add New" button to create customer inline (name, phone, address)
- Returns selected customer ID
- Props: `onSelect: (customerId: string) => void`

Use `frontend-design` skill for implementation.

- [ ] **Step 4: Verify manually**

```bash
npm run dev
```

Test: add a customer, see them in the list, search works, tap to see detail, edit works.

- [ ] **Step 5: Commit**

```bash
git add src/app/customers/ src/components/CustomerPicker.tsx
git commit -m "feat: add customer list, detail, and picker screens"
```

---

### Task 12: Quote & Room Entry Screens

**Files:**
- Create: `src/app/quotes/new/page.tsx`
- Create: `src/app/quotes/[id]/page.tsx`
- Create: `src/components/RoomForm.tsx`
- Create: `src/components/ShoppingList.tsx`
- Create: `src/components/QuoteSummary.tsx`

- [ ] **Step 1: Build RoomForm component**

Create `src/components/RoomForm.tsx`:
- Two modes based on service type:
  - **Paint mode** (Interior/Exterior Paint): room name, roomType selector (Walls/Ceiling/Exterior), dimensions (length/width/height based on roomType), door count, window count, surface type dropdown, paint color, brand, finish type, coats, price per gallon
  - **Non-paint mode** (Power Washing/Handyman): description, estimated hours, material cost
- Live calculation preview: as dimensions are entered, shows paintable sq ft, gallons needed, estimated hours, material cost, labor cost
- Uses `calculatePaintableArea`, `calculateGallonsNeeded`, `calculateLaborHours`, `calculateRoomCost` from paint-calculator
- Uses `usePaintPresets()` to get coverage/labor rates for selected surface type
- Uses `useSettings()` to get default labor rate
- Props: `onSave: (room: Omit<Room, "id">) => void`, `quoteId: string`, `laborRate: number`
- "Save Room" button commits the room

Use `frontend-design` skill for implementation. The form must be mobile-friendly with large inputs, clear labels, and the live calculation visible as they enter data.

- [ ] **Step 2: Build ShoppingList component**

Create `src/components/ShoppingList.tsx`:
- Takes rooms array as prop
- Calls `aggregateShoppingList(rooms)`
- Displays each group: "3.2 gal — Revere Pewter, Eggshell, Benjamin Moore" with purchase recommendation
- Shows total paint cost

Use `frontend-design` skill for implementation.

- [ ] **Step 3: Build QuoteSummary component**

Create `src/components/QuoteSummary.tsx`:
- Takes quote and rooms as props
- Shows: all rooms with individual costs, shopping list, total breakdown (materials, labor hours, labor cost, markup %, final price)
- Editable markup % and labor rate (changes recalculate totals via `recalculateQuoteTotals`)

Use `frontend-design` skill for implementation.

- [ ] **Step 4: Build New Quote wizard page**

Create `src/app/quotes/new/page.tsx`:
- Multi-step flow:
  1. **Customer selection** — CustomerPicker component. If `?customerId` query param, pre-select that customer.
  2. **Service type** — Pick primary service type for the job
  3. **Room entry** — Add rooms one at a time via RoomForm. List of added rooms shown below form. Can delete rooms. Can add more.
  4. **Review** — QuoteSummary + ShoppingList. "Send Quote" button → TemplatePicker. "Save" button.
- On save: creates Job (status "quoted"), Quote, and all Rooms in a Dexie transaction
- Uses `createJob`, `createQuote`, `addRoom`, `recalculateQuoteTotals`

Use `frontend-design` skill for implementation. Must feel smooth on mobile — large buttons, clear step progression.

- [ ] **Step 5: Build Quote Detail/Review page**

Create `src/app/quotes/[id]/page.tsx`:
- Shows QuoteSummary + ShoppingList for an existing quote
- Allows editing rooms (add/remove/edit)
- "Send Quote" button → TemplatePicker
- Links to parent Job

Use `frontend-design` skill for implementation.

- [ ] **Step 6: Verify manually**

```bash
npm run dev
```

Test: create a new quote, add multiple rooms with different colors, verify calculations match expected values from spec (e.g. 12x10 room, 8ft ceiling, 1 door, 2 windows should give 302 sq ft paintable area), verify shopping list groups correctly, save and verify data persists.

- [ ] **Step 7: Commit**

```bash
git add src/app/quotes/ src/components/RoomForm.tsx src/components/ShoppingList.tsx src/components/QuoteSummary.tsx
git commit -m "feat: add quote wizard with room entry, paint calculations, and shopping list"
```

---

### Task 13: Job Detail & Actuals Tracking

**Files:**
- Create: `src/app/jobs/[id]/page.tsx`

- [ ] **Step 1: Build Job Detail page**

Create `src/app/jobs/[id]/page.tsx`:
- Header: customer name, service type, address
- Status badge — tappable to advance to next status in order (Lead → Quoted → Scheduled → In Progress → Complete → Paid). Uses `JOB_STATUS_ORDER`. Confirm dialog before status change.
- Scheduled date/time — tappable to edit (date/time picker)
- Job notes — editable text area
- Quote summary section — links to `/quotes/[quoteId]`
- **Log Actuals section** (visible when status is Complete or Paid):
  - Form: actual hours worked, actual materials cost, actual gallons used, notes
  - Save button stores to `actuals` table
  - After saving, shows comparison: quoted vs actual for hours, cost, gallons, with % difference
- Uses `useJob(id)`, `useQuote(jobId)`, `useRooms(quoteId)`
- Uses `useLiveQuery` to check for existing actuals

Use `frontend-design` skill for implementation. Status badge should be colorful and prominent.

- [ ] **Step 2: Create ConfirmDialog component**

Create `src/components/ConfirmDialog.tsx`:
- Simple modal with title, message, confirm/cancel buttons
- Props: `open: boolean`, `title: string`, `message: string`, `onConfirm: () => void`, `onCancel: () => void`

Use `frontend-design` skill for implementation.

- [ ] **Step 3: Verify manually**

```bash
npm run dev
```

Test: navigate to a job, change status through the progression, log actuals, verify comparison display is correct.

- [ ] **Step 4: Commit**

```bash
git add src/app/jobs/ src/components/ConfirmDialog.tsx
git commit -m "feat: add job detail with status progression and actuals tracking"
```

---

### Task 14: Schedule View

**Files:**
- Create: `src/app/schedule/page.tsx`

- [ ] **Step 1: Build Schedule page**

Create `src/app/schedule/page.tsx`:
- Day/Week toggle at top
- **Day view:** shows today's jobs in time-ordered list. Each row: time, customer name, service type, status badge, address. Tap to go to job detail.
- **Week view:** shows 7 days, each day shows count of jobs and first job preview. Tap a day to switch to day view for that day.
- Navigation: prev/next arrows to move between days or weeks
- "Today" button to jump back to today
- Uses `useJobsByDateRange(startDate, endDate)`
- Empty state: "No jobs scheduled" with link to create new quote

Use `frontend-design` skill for implementation. Calendar should feel native and be easy to navigate with one thumb.

- [ ] **Step 2: Verify manually**

```bash
npm run dev
```

Test: create some jobs with different scheduled dates, verify they appear on the correct days, toggle between day/week view, navigate between weeks.

- [ ] **Step 3: Commit**

```bash
git add src/app/schedule/
git commit -m "feat: add schedule view with day/week toggle"
```

---

### Task 15: Standalone Calculator

**Files:**
- Create: `src/app/calculator/page.tsx`

- [ ] **Step 1: Build Calculator page**

Create `src/app/calculator/page.tsx`:
- Room type selector (Walls/Ceiling/Exterior)
- Dimension inputs (adapts based on room type)
- Door and window count (for walls/exterior)
- Surface type dropdown
- Coats selector (1-4, default 2)
- **Live results** (update as inputs change):
  - Paintable sq ft
  - Gallons needed (with purchase recommendation)
  - Estimated labor hours
- "Add to Quote" button — navigates to `/quotes/new` with calculator data pre-populated as the first room (pass via query params or a temporary Dexie table)
- All calculation uses existing `paint-calculator.ts` functions
- Surface type presets loaded from `usePaintPresets()`

Use `frontend-design` skill for implementation. Results should update in real-time as the user types — this is the "wow" moment of the app.

- [ ] **Step 2: Verify manually**

```bash
npm run dev
```

Test: enter dimensions, verify live calculation matches expected values, try different surface types, verify "Add to Quote" navigates correctly.

- [ ] **Step 3: Commit**

```bash
git add src/app/calculator/
git commit -m "feat: add standalone paint calculator with live results"
```

---

### Task 16: Templated Messaging

**Files:**
- Create: `src/components/TemplatePicker.tsx`
- Create: `src/components/StatusBadge.tsx`

- [ ] **Step 1: Build StatusBadge component**

Create `src/components/StatusBadge.tsx`:
- Small colored pill showing job status
- Different color per status: Lead (gray), Quoted (blue), Scheduled (yellow), In Progress (orange), Complete (green), Paid (emerald)
- Props: `status: JobStatus`

Use `frontend-design` skill for implementation.

- [ ] **Step 2: Build TemplatePicker component**

Create `src/components/TemplatePicker.tsx`:
- Modal/sheet that slides up from bottom
- Lists all message templates from `useMessageTemplates()`
- Selecting a template:
  1. Renders the template body with job/customer data via `renderTemplate()`
  2. Shows a preview of the rendered message
  3. "Send via SMS" button → calls `buildSmsUrl()` and opens via `window.location.href`
  4. "Send via Email" button → calls `buildMailtoUrl()` and opens via `window.location.href`
- Props: `open: boolean`, `onClose: () => void`, `customer: Customer`, `job: Job`, `quote: Quote`
- Template values map: `{ customer_name, service_type, job_total, scheduled_date, job_address }`

Use `frontend-design` skill for implementation. Should feel like a native iOS action sheet.

- [ ] **Step 3: Wire TemplatePicker into Customer Detail and Quote pages**

Add "Send Message" button to `src/app/customers/[id]/page.tsx` and `src/app/quotes/[id]/page.tsx` that opens the TemplatePicker.

- [ ] **Step 4: Verify manually**

```bash
npm run dev
```

Test: open template picker from a customer detail page, select a template, verify the message is correctly filled with customer/job data, tap SMS button and verify it opens the native SMS compose.

- [ ] **Step 5: Commit**

```bash
git add src/components/TemplatePicker.tsx src/components/StatusBadge.tsx src/app/customers/ src/app/quotes/
git commit -m "feat: add message template picker with SMS/email integration"
```

---

### Task 17: Settings Screen

**Files:**
- Create: `src/app/settings/page.tsx`

- [ ] **Step 1: Build Settings page**

Create `src/app/settings/page.tsx` with sections:

**Defaults:**
- Default labor rate ($/hour) — number input
- Default markup percentage — number input
- Save button

**Paint Presets:**
- List of all presets showing surface type, coverage rate, labor rate
- Each row is editable inline
- Save individual preset changes

**Message Templates:**
- List of all templates
- Tap to edit name, channel, subject, body
- "Add Template" button
- Delete button (only for non-default templates)

**Google Calendar:**
- Connection status
- "Connect" button (opens OAuth flow — this will be implemented in Task 18)
- "Disconnect" button

**Backup & Restore:**
- "Export Data" button — calls `exportDatabase()` then `downloadJson()` with filename `paint-tracker-backup-YYYY-MM-DD.json`
- "Import Data" file input — reads file, calls `importDatabase()`, shows success/error
- Last backup date display
- Backup reminder frequency selector (7/14/30/60 days)

**Accuracy Stats** (Quoted vs Actual):
- Average hours variance by service type (query all actuals, compare with their job's quote)
- Show as: "Interior Paint: you quote 5% under actual hours on average"
- Only shown if there are completed jobs with actuals logged

Use `frontend-design` skill for implementation.

- [ ] **Step 2: Verify manually**

```bash
npm run dev
```

Test: change labor rate and markup, verify they persist. Export data, delete the Dexie database from DevTools, import the backup, verify data is restored. Edit a paint preset, verify it persists.

- [ ] **Step 3: Commit**

```bash
git add src/app/settings/
git commit -m "feat: add settings screen with presets, templates, backup/restore"
```

---

## Phase 5: Integrations & Polish

### Task 18: Google Calendar Integration

**Files:**
- Create: `src/lib/google-calendar.ts`
- Create: `src/hooks/useCalendarSync.ts`

- [ ] **Step 1: Implement Google Calendar API client**

Create `src/lib/google-calendar.ts`:

```typescript
const SCOPES = "https://www.googleapis.com/auth/calendar.events";
const DISCOVERY_DOC = "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";

// Client ID will be configured in settings — user provides their own Google Cloud project
let tokenClient: google.accounts.oauth2.TokenClient | null = null;

export async function initGoogleCalendar(clientId: string): Promise<void> {
  await loadScript("https://apis.google.com/js/api.js");
  await loadScript("https://accounts.google.com/gsi/client");

  await new Promise<void>((resolve) => {
    gapi.load("client", async () => {
      await gapi.client.init({
        discoveryDocs: [DISCOVERY_DOC],
      });
      resolve();
    });
  });

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: () => {},
  });
}

export function requestAccessToken(): Promise<google.accounts.oauth2.TokenResponse> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error("Google Calendar not initialized"));
      return;
    }
    tokenClient.callback = (response) => {
      if (response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    };
    tokenClient.requestAccessToken();
  });
}

export async function createCalendarEvent(job: {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
}): Promise<string> {
  const response = await gapi.client.calendar.events.insert({
    calendarId: "primary",
    resource: {
      summary: job.title,
      description: job.description,
      location: job.location,
      start: { dateTime: job.startTime },
      end: { dateTime: job.endTime },
    },
  });
  return response.result.id!;
}

export async function updateCalendarEvent(
  eventId: string,
  job: {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    location: string;
  }
): Promise<void> {
  await gapi.client.calendar.events.update({
    calendarId: "primary",
    eventId,
    resource: {
      summary: job.title,
      description: job.description,
      location: job.location,
      start: { dateTime: job.startTime },
      end: { dateTime: job.endTime },
    },
  });
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  await gapi.client.calendar.events.delete({
    calendarId: "primary",
    eventId,
  });
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
```

Note: Google Calendar API types (`google.accounts.oauth2`, `gapi.client.calendar`) require the `@types/google.accounts` and `@types/gapi.client.calendar` packages:

```bash
npm install -D @types/google.accounts @types/gapi @types/gapi.client.calendar
```

- [ ] **Step 2: Implement calendar sync queue processor**

Create `src/hooks/useCalendarSync.ts`:

```typescript
import { useEffect, useRef } from "react";
import { db } from "@/lib/db";
import { CalendarOperation } from "@/lib/types";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/google-calendar";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function useCalendarSync() {
  const isOnline = useOnlineStatus();
  const processing = useRef(false);

  useEffect(() => {
    if (!isOnline || processing.current) return;

    async function processQueue() {
      processing.current = true;
      try {
        const pending = await db.calendarSyncQueue
          .orderBy("createdAt")
          .toArray();

        for (const item of pending) {
          try {
            const payload = item.payload as {
              title: string;
              description: string;
              startTime: string;
              endTime: string;
              location: string;
              eventId?: string;
            };

            switch (item.operation) {
              case CalendarOperation.Create: {
                const eventId = await createCalendarEvent(payload);
                await db.jobs.update(item.jobId, {
                  googleCalendarEventId: eventId,
                });
                break;
              }
              case CalendarOperation.Update:
                if (payload.eventId) {
                  await updateCalendarEvent(payload.eventId, payload);
                }
                break;
              case CalendarOperation.Delete:
                if (payload.eventId) {
                  await deleteCalendarEvent(payload.eventId);
                }
                break;
            }

            await db.calendarSyncQueue.delete(item.id);
          } catch (error) {
            console.error("Calendar sync failed for item:", item.id, error);
            break;
          }
        }
      } finally {
        processing.current = false;
      }
    }

    processQueue();
  }, [isOnline]);
}

export async function queueCalendarEvent(
  jobId: string,
  operation: CalendarOperation,
  payload: Record<string, unknown>
): Promise<void> {
  await db.calendarSyncQueue.add({
    id: crypto.randomUUID(),
    jobId,
    operation,
    payload,
    createdAt: new Date().toISOString(),
  });
}
```

- [ ] **Step 3: Wire calendar sync into Job creation and updates**

Update `src/hooks/useJobs.ts`:
- After `createJob()`, if Google Calendar is connected (check settings), call `queueCalendarEvent()` with CalendarOperation.Create
- After `updateJob()` that changes scheduledDate, queue an Update
- After `deleteJob()`, if the job had a googleCalendarEventId, queue a Delete

- [ ] **Step 4: Add `useCalendarSync()` to app layout**

Add the hook call to `src/app/layout.tsx` so the queue processor runs on every page.

- [ ] **Step 5: Verify manually**

This requires a Google Cloud project with Calendar API enabled and an OAuth client ID. For now, verify:
- Jobs are queued to calendarSyncQueue when created/updated/deleted
- Queue processing doesn't crash when offline
- Queue items are removed after successful sync (test with mock when possible)

- [ ] **Step 6: Commit**

```bash
git add src/lib/google-calendar.ts src/hooks/useCalendarSync.ts src/hooks/useJobs.ts src/app/layout.tsx
git commit -m "feat: add Google Calendar integration with offline queue"
```

---

### Task 19: PWA Service Worker & Offline

**Files:**
- Modify: `next.config.ts`
- Create: `public/sw.js` (or use next-pwa generated)

- [ ] **Step 1: Install and configure next-pwa**

```bash
npm install next-pwa
```

Update `next.config.ts`:

```typescript
import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
```

Note: Check if `next-pwa` supports Next.js 15. If not, use `@ducanh2912/next-pwa` which is the maintained fork:

```bash
npm install @ducanh2912/next-pwa
```

And adjust the import accordingly.

- [ ] **Step 2: Build and verify service worker is generated**

```bash
npm run build
```

Check that `out/sw.js` (or `public/sw.js`) exists and the manifest is properly linked.

- [ ] **Step 3: Test offline behavior**

1. Start dev server: `npm run dev`
2. Open in Chrome, install PWA (or use Application tab in DevTools)
3. Load the app, add some test data
4. Go offline (DevTools Network → Offline)
5. Verify: app still loads, can navigate between pages, can create/edit customers and jobs, data persists
6. Go back online, verify app still works

- [ ] **Step 4: Commit**

```bash
git add next.config.ts public/sw.js package.json package-lock.json
git commit -m "feat: add PWA service worker for full offline support"
```

---

### Task 20: Final Integration Testing & Polish

**Files:**
- Various — bug fixes and integration issues

- [ ] **Step 1: End-to-end manual test**

Walk through the complete user journey:

1. **Open app** → home screen shows tiles and zero stats
2. **Tap Calculator** → enter 12x10x8 room, 1 door, 2 windows, Smooth Drywall, 2 coats → verify: 302 sq ft, ~1.76 gal, ~3.96 hours
3. **Tap "Add to Quote"** → enters quote wizard with room pre-populated
4. **Select/create customer** → "John Smith", 555-1234, 123 Main St
5. **Add another room** → bedroom, different color → verify shopping list shows two paint groups
6. **Add power washing line item** → description, hours, cost → verify it appears in quote but not shopping list
7. **Review quote** → verify totals are correct with markup
8. **Send via SMS** → verify native SMS compose opens with correct message
9. **Save** → job created with "Quoted" status
10. **Home screen** → stats show 1 open quote
11. **Schedule** → job appears on scheduled date
12. **Customer detail** → John Smith shows the job in history
13. **Job detail** → advance status to "In Progress" → "Complete"
14. **Log actuals** → enter actual hours/materials → verify comparison display
15. **Settings** → export data → verify JSON file downloads
16. **Settings** → change labor rate → create new quote → verify new rate is used

- [ ] **Step 2: Fix any bugs found during testing**

Address issues found in step 1.

- [ ] **Step 3: Responsive design check**

Verify all screens work on:
- iPhone SE (375px wide)
- iPhone 14 (390px wide)
- iPhone 14 Pro Max (430px wide)

Use Chrome DevTools device emulator.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: integration testing fixes and responsive design polish"
```

- [ ] **Step 5: Deploy**

Deploy to GitHub Pages or Cloudflare Pages:

**GitHub Pages:**
```bash
# Add homepage to package.json if using a custom domain
npm run build
# Push out/ directory to gh-pages branch
```

**Cloudflare Pages:**
- Connect the repo to Cloudflare Pages
- Build command: `npm run build`
- Output directory: `out`

Verify the deployed app works, installs as PWA on iPhone, and functions offline.

- [ ] **Step 6: Final commit and tag**

```bash
git add -A
git commit -m "chore: deployment configuration"
git tag v1.0.0
```
