# Trim/Doors, Calendar UX, Dashboard Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add trim/door painting calculations with per-component paint sections, improve calendar scheduling UX with a floating action button, replace the dashboard with an actionable pipeline view, and wire Google Calendar settings UI.

**Architecture:** Each feature is independent and can be implemented sequentially. Feature 1 (Trim/Doors) is the largest — it extends the Room type, paint calculator, RoomForm, and shopping list. Features 2-4 are self-contained UI changes. All data stays local-first via Dexie with Supabase sync.

**Tech Stack:** Next.js, React, TypeScript, Dexie (IndexedDB), Tailwind CSS, Vitest

---

## File Structure

### New Files
- `src/lib/component-calculator.ts` — Per-component (walls/ceiling/trim/doors) area + gallon + labor calculations
- `src/lib/__tests__/component-calculator.test.ts` — Tests for component calculator
- `src/components/ScheduleSheet.tsx` — Bottom sheet for scheduling unscheduled jobs from calendar

### Modified Files
- `src/lib/types.ts` — Add trim/door/ceiling fields to Room interface
- `src/lib/db.ts` — Dexie schema version 3 with new Room fields
- `src/lib/paint-calculator.ts` — Export constants (DOOR_SQ_FT, WASTE_FACTOR, PREP_TIME_FACTOR)
- `src/lib/shopping-list.ts` — Support multi-component rooms in aggregation
- `src/lib/__tests__/shopping-list.test.ts` — Update tests for multi-component rooms
- `src/components/RoomForm.tsx` — 4-toggle buttons, per-component paint sections, auto-fill
- `src/components/QuoteSummary.tsx` — Per-component breakdown in room rows
- `src/app/schedule/page.tsx` — showBack prop, floating "+" button, ScheduleSheet
- `src/app/jobs/[id]/JobDetailClient.tsx` — Prominent "Schedule Job" button
- `src/app/page.tsx` — Pipeline cards + today's schedule
- `src/app/settings/page.tsx` — Google Calendar connect/disconnect UI
- `src/components/Providers.tsx` — Init Google Calendar with env var
- `supabase-schema.sql` — New columns on rooms table

---

## Feature 1: Trim & Door Calculations

### Task 1: Extend Room Interface with Trim/Door/Ceiling Fields

**Files:**
- Modify: `src/lib/types.ts:102-129`

- [ ] **Step 1: Add new fields to the Room interface**

Add the following fields after `pricePerGallon` (line 117) in the Room interface:

```typescript
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
  // Trim/door toggles
  includeTrim: boolean;
  includeDoors: boolean;
  // Ceiling paint details
  ceilingColor: string;
  ceilingBrand: string;
  ceilingFinish: FinishType | null;
  ceilingPricePerGallon: number | null;
  // Trim/door paint details
  trimColor: string;
  trimBrand: string;
  trimFinish: FinishType | null;
  trimPricePerGallon: number | null;
  // Calculated fields
  paintableSqFt: number;
  gallonsNeeded: number;
  estimatedLaborHours: number;
  materialCost: number;
  laborCost: number;
  description: string;
  manualHours: number | null;
  manualCost: number | null;
  sortOrder: number;
  updatedAt: string;
}
```

- [ ] **Step 2: Verify the app still compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Errors about missing properties in RoomForm and other places that construct Room objects — this is expected and will be fixed in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add trim/door/ceiling fields to Room interface"
```

---

### Task 2: Bump Dexie Schema to Version 3

**Files:**
- Modify: `src/lib/db.ts:38-67`

- [ ] **Step 1: Add version 3 with new Room fields and upgrade migration**

Add after the existing `version(2)` block:

```typescript
this.version(3).stores({
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
  return tx.table("rooms").toCollection().modify(record => {
    if (record.includeTrim === undefined) record.includeTrim = false;
    if (record.includeDoors === undefined) record.includeDoors = false;
    if (record.ceilingColor === undefined) record.ceilingColor = "";
    if (record.ceilingBrand === undefined) record.ceilingBrand = "";
    if (record.ceilingFinish === undefined) record.ceilingFinish = null;
    if (record.ceilingPricePerGallon === undefined) record.ceilingPricePerGallon = null;
    if (record.trimColor === undefined) record.trimColor = "";
    if (record.trimBrand === undefined) record.trimBrand = "";
    if (record.trimFinish === undefined) record.trimFinish = null;
    if (record.trimPricePerGallon === undefined) record.trimPricePerGallon = null;
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: bump Dexie schema to v3 with trim/door/ceiling fields"
```

---

### Task 3: Update Supabase Schema

**Files:**
- Modify: `supabase-schema.sql`

- [ ] **Step 1: Add new columns to rooms table**

Add after the existing `price_per_gallon` column in the CREATE TABLE statement:

```sql
  include_trim BOOLEAN DEFAULT false,
  include_doors BOOLEAN DEFAULT false,
  ceiling_color TEXT DEFAULT '',
  ceiling_brand TEXT DEFAULT '',
  ceiling_finish TEXT,
  ceiling_price_per_gallon REAL,
  trim_color TEXT DEFAULT '',
  trim_brand TEXT DEFAULT '',
  trim_finish TEXT,
  trim_price_per_gallon REAL,
```

- [ ] **Step 2: Commit**

```bash
git add supabase-schema.sql
git commit -m "feat: add trim/door/ceiling columns to rooms table"
```

---

### Task 4: Export Constants from Paint Calculator

**Files:**
- Modify: `src/lib/paint-calculator.ts:3-6`

- [ ] **Step 1: Export the constants**

Change the constant declarations from:

```typescript
const DOOR_SQ_FT = 20;
const WINDOW_SQ_FT = 15;
const WASTE_FACTOR = 1.10;
const PREP_TIME_FACTOR = 1.15;
```

To:

```typescript
export const DOOR_SQ_FT = 20;
export const WINDOW_SQ_FT = 15;
export const WASTE_FACTOR = 1.10;
export const PREP_TIME_FACTOR = 1.15;
```

- [ ] **Step 2: Run existing tests to confirm nothing breaks**

Run: `npx vitest run src/lib/__tests__/paint-calculator.test.ts`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/paint-calculator.ts
git commit -m "refactor: export paint calculator constants"
```

---

### Task 5: Build Component Calculator — Tests First

**Files:**
- Create: `src/lib/component-calculator.ts`
- Create: `src/lib/__tests__/component-calculator.test.ts`

- [ ] **Step 1: Write failing tests for component calculations**

```typescript
import { describe, it, expect } from "vitest";
import {
  calculateTrimArea,
  calculateDoorArea,
  calculateComponentEstimates,
  type ComponentEstimate,
} from "@/lib/component-calculator";

describe("calculateTrimArea", () => {
  it("calculates baseboard area from room perimeter", () => {
    // Perimeter = 2 * (12 + 10) = 44 ft, baseboard height = 0.5 ft
    const result = calculateTrimArea(12, 10);
    expect(result).toBe(22);
  });

  it("handles null dimensions as 0", () => {
    const result = calculateTrimArea(null, null);
    expect(result).toBe(0);
  });
});

describe("calculateDoorArea", () => {
  it("calculates door area from count", () => {
    const result = calculateDoorArea(3);
    expect(result).toBe(60); // 3 * 20
  });

  it("returns 0 for 0 doors", () => {
    expect(calculateDoorArea(0)).toBe(0);
  });
});

describe("calculateComponentEstimates", () => {
  const baseInput = {
    length: 12 as number | null,
    width: 10 as number | null,
    height: 8 as number | null,
    doorCount: 2,
    windowCount: 1,
    coats: 2,
    includeWalls: true,
    includeCeiling: false,
    includeTrim: false,
    includeDoors: false,
    wallCoverageRate: 350,
    wallLaborRate: 200,
    wallPricePerGallon: 45,
    ceilingCoverageRate: 400,
    ceilingLaborRate: 250,
    ceilingPricePerGallon: 40,
    trimCoverageRate: 300,
    trimLaborRate: 150,
    trimPricePerGallon: 50,
  };

  it("calculates walls-only estimate with door deduction when doors not painted", () => {
    const result = calculateComponentEstimates(baseInput);
    expect(result.walls).not.toBeNull();
    // Wall area: 2*(12+10)*8 = 352, minus doors: 2*20=40, minus windows: 1*15=15 => 297 sq ft
    expect(result.walls!.paintableSqFt).toBe(297);
    expect(result.ceiling).toBeNull();
    expect(result.trim).toBeNull();
    expect(result.doors).toBeNull();
  });

  it("does not deduct doors from wall area when doors are being painted", () => {
    const input = { ...baseInput, includeDoors: true };
    const result = calculateComponentEstimates(input);
    // Wall area: 352, minus windows only: 15 => 337 sq ft
    expect(result.walls!.paintableSqFt).toBe(337);
    // Doors: 2 * 20 = 40 sq ft
    expect(result.doors).not.toBeNull();
    expect(result.doors!.paintableSqFt).toBe(40);
  });

  it("calculates ceiling estimate", () => {
    const input = { ...baseInput, includeCeiling: true };
    const result = calculateComponentEstimates(input);
    // Ceiling area: 12 * 10 = 120 sq ft
    expect(result.ceiling).not.toBeNull();
    expect(result.ceiling!.paintableSqFt).toBe(120);
  });

  it("calculates trim estimate", () => {
    const input = { ...baseInput, includeTrim: true };
    const result = calculateComponentEstimates(input);
    // Trim area: 2 * (12 + 10) * 0.5 = 22 sq ft
    expect(result.trim).not.toBeNull();
    expect(result.trim!.paintableSqFt).toBe(22);
  });

  it("calculates raw gallons for material cost (not rounded)", () => {
    const input = { ...baseInput, includeTrim: true };
    const result = calculateComponentEstimates(input);
    // Trim: 22 sqft * 2 coats / 300 coverage * 1.10 waste = 0.1613 gal
    // Material cost = 0.1613 * 50 = ~8.07
    expect(result.trim!.rawGallons).toBeCloseTo(0.1613, 3);
    expect(result.trim!.materialCost).toBeCloseTo(8.07, 0);
  });

  it("sums totals across all active components", () => {
    const input = {
      ...baseInput,
      includeCeiling: true,
      includeTrim: true,
      includeDoors: true,
    };
    const result = calculateComponentEstimates(input);
    const totalSqFt =
      (result.walls?.paintableSqFt ?? 0) +
      (result.ceiling?.paintableSqFt ?? 0) +
      (result.trim?.paintableSqFt ?? 0) +
      (result.doors?.paintableSqFt ?? 0);
    expect(result.totalPaintableSqFt).toBe(totalSqFt);
    expect(result.totalRawGallons).toBeCloseTo(
      (result.walls?.rawGallons ?? 0) +
      (result.ceiling?.rawGallons ?? 0) +
      (result.trim?.rawGallons ?? 0) +
      (result.doors?.rawGallons ?? 0),
      4
    );
  });

  it("returns all nulls when nothing is selected", () => {
    const input = { ...baseInput, includeWalls: false };
    const result = calculateComponentEstimates(input);
    expect(result.walls).toBeNull();
    expect(result.ceiling).toBeNull();
    expect(result.trim).toBeNull();
    expect(result.doors).toBeNull();
    expect(result.totalPaintableSqFt).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/component-calculator.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component calculator**

```typescript
import {
  DOOR_SQ_FT,
  WINDOW_SQ_FT,
  WASTE_FACTOR,
  PREP_TIME_FACTOR,
  calculateGallonsNeeded,
  calculateLaborHours,
} from "@/lib/paint-calculator";

export interface ComponentEstimate {
  paintableSqFt: number;
  rawGallons: number;
  laborHours: number;
  materialCost: number;
}

export interface ComponentEstimatesResult {
  walls: ComponentEstimate | null;
  ceiling: ComponentEstimate | null;
  trim: ComponentEstimate | null;
  doors: ComponentEstimate | null;
  totalPaintableSqFt: number;
  totalRawGallons: number;
  totalLaborHours: number;
  totalMaterialCost: number;
}

interface ComponentInput {
  length: number | null;
  width: number | null;
  height: number | null;
  doorCount: number;
  windowCount: number;
  coats: number;
  includeWalls: boolean;
  includeCeiling: boolean;
  includeTrim: boolean;
  includeDoors: boolean;
  wallCoverageRate: number;
  wallLaborRate: number;
  wallPricePerGallon: number;
  ceilingCoverageRate: number;
  ceilingLaborRate: number;
  ceilingPricePerGallon: number;
  trimCoverageRate: number;
  trimLaborRate: number;
  trimPricePerGallon: number;
}

export function calculateTrimArea(
  length: number | null,
  width: number | null
): number {
  const l = length ?? 0;
  const w = width ?? 0;
  return 2 * (l + w) * 0.5;
}

export function calculateDoorArea(doorCount: number): number {
  return doorCount * DOOR_SQ_FT;
}

function estimateComponent(
  paintableSqFt: number,
  coats: number,
  coverageRate: number,
  laborRate: number,
  pricePerGallon: number
): ComponentEstimate {
  const rawGallons = calculateGallonsNeeded(paintableSqFt, coats, coverageRate);
  const laborHours = calculateLaborHours(paintableSqFt, coats, laborRate);
  return {
    paintableSqFt,
    rawGallons,
    laborHours,
    materialCost: rawGallons * pricePerGallon,
  };
}

export function calculateComponentEstimates(
  input: ComponentInput
): ComponentEstimatesResult {
  const l = input.length ?? 0;
  const w = input.width ?? 0;
  const h = input.height ?? 0;

  let walls: ComponentEstimate | null = null;
  let ceiling: ComponentEstimate | null = null;
  let trim: ComponentEstimate | null = null;
  let doors: ComponentEstimate | null = null;

  if (input.includeWalls) {
    const rawWallArea = 2 * (l + w) * h;
    const windowDeduction = input.windowCount * WINDOW_SQ_FT;
    // Doors only deducted from walls if NOT being painted
    const doorDeduction = input.includeDoors ? 0 : input.doorCount * DOOR_SQ_FT;
    const wallSqFt = Math.max(0, rawWallArea - doorDeduction - windowDeduction);
    walls = estimateComponent(
      wallSqFt,
      input.coats,
      input.wallCoverageRate,
      input.wallLaborRate,
      input.wallPricePerGallon
    );
  }

  if (input.includeCeiling) {
    const ceilingSqFt = l * w;
    ceiling = estimateComponent(
      ceilingSqFt,
      input.coats,
      input.ceilingCoverageRate,
      input.ceilingLaborRate,
      input.ceilingPricePerGallon
    );
  }

  if (input.includeTrim) {
    const trimSqFt = calculateTrimArea(input.length, input.width);
    trim = estimateComponent(
      trimSqFt,
      input.coats,
      input.trimCoverageRate,
      input.trimLaborRate,
      input.trimPricePerGallon
    );
  }

  if (input.includeDoors) {
    const doorSqFt = calculateDoorArea(input.doorCount);
    doors = estimateComponent(
      doorSqFt,
      input.coats,
      input.trimCoverageRate,
      input.trimLaborRate,
      input.trimPricePerGallon
    );
  }

  const components = [walls, ceiling, trim, doors].filter(
    (c): c is ComponentEstimate => c !== null
  );

  return {
    walls,
    ceiling,
    trim,
    doors,
    totalPaintableSqFt: components.reduce((s, c) => s + c.paintableSqFt, 0),
    totalRawGallons: components.reduce((s, c) => s + c.rawGallons, 0),
    totalLaborHours: components.reduce((s, c) => s + c.laborHours, 0),
    totalMaterialCost: components.reduce((s, c) => s + c.materialCost, 0),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/component-calculator.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/component-calculator.ts src/lib/__tests__/component-calculator.test.ts
git commit -m "feat: add per-component paint calculator with TDD"
```

---

### Task 6: Update Shopping List for Multi-Component Rooms

**Files:**
- Modify: `src/lib/shopping-list.ts`
- Modify: `src/lib/__tests__/shopping-list.test.ts`

- [ ] **Step 1: Write failing test for multi-component shopping list aggregation**

Add to the existing test file `src/lib/__tests__/shopping-list.test.ts`:

```typescript
it("aggregates ceiling paint separately from wall paint", () => {
  const rooms: Room[] = [
    {
      ...makeRoom(),
      paintColor: "Swiss Coffee",
      paintBrand: "Sherwin-Williams",
      finishType: FinishType.Eggshell,
      gallonsNeeded: 2.5,
      pricePerGallon: 45,
      ceilingColor: "White",
      ceilingBrand: "Sherwin-Williams",
      ceilingFinish: FinishType.Flat,
      ceilingPricePerGallon: 40,
      // Simulate a room that has both wall and ceiling gallons
    } as Room,
  ];
  const result = aggregateShoppingList(rooms);
  // Should have at least the wall paint entry
  const wallItem = result.find(
    (i) => i.paintColor === "Swiss Coffee" && i.finishType === FinishType.Eggshell
  );
  expect(wallItem).toBeDefined();
});

it("aggregates trim/door paint into separate line items", () => {
  const rooms: Room[] = [
    {
      ...makeRoom(),
      paintColor: "Swiss Coffee",
      finishType: FinishType.Eggshell,
      gallonsNeeded: 2.0,
      pricePerGallon: 45,
      includeTrim: true,
      trimColor: "Swiss Coffee",
      trimBrand: "Sherwin-Williams",
      trimFinish: FinishType.SemiGloss,
      trimPricePerGallon: 50,
    } as Room,
  ];
  const result = aggregateShoppingList(rooms);
  const trimItem = result.find(
    (i) => i.paintColor === "Swiss Coffee" && i.finishType === FinishType.SemiGloss
  );
  expect(trimItem).toBeDefined();
});
```

Note: You need to check the existing test file for the `makeRoom` helper pattern. If it doesn't exist, create a minimal Room factory at the top of the test file.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/shopping-list.test.ts`
Expected: FAIL — new fields not handled.

- [ ] **Step 3: Update aggregateShoppingList to extract per-component paint entries**

Modify `src/lib/shopping-list.ts` to expand each room into multiple paint entries before grouping. Replace the `aggregateShoppingList` function:

```typescript
interface PaintEntry {
  paintColor: string;
  paintBrand: string;
  finishType: FinishType;
  rawGallons: number;
  pricePerGallon: number;
}

function extractPaintEntries(room: Room): PaintEntry[] {
  const entries: PaintEntry[] = [];

  // Wall paint (existing behavior)
  if (room.paintColor && room.gallonsNeeded > 0 && room.finishType) {
    entries.push({
      paintColor: room.paintColor,
      paintBrand: room.paintBrand,
      finishType: room.finishType,
      rawGallons: room.gallonsNeeded,
      pricePerGallon: room.pricePerGallon ?? 0,
    });
  }

  // Ceiling paint
  const ceilingColor = (room as any).ceilingColor;
  const ceilingFinish = (room as any).ceilingFinish;
  const ceilingGallons = (room as any).ceilingGallonsNeeded;
  if (ceilingColor && ceilingFinish && ceilingGallons > 0) {
    entries.push({
      paintColor: ceilingColor,
      paintBrand: (room as any).ceilingBrand ?? "",
      finishType: ceilingFinish,
      rawGallons: ceilingGallons,
      pricePerGallon: (room as any).ceilingPricePerGallon ?? 0,
    });
  }

  // Trim/door paint
  const trimColor = (room as any).trimColor;
  const trimFinish = (room as any).trimFinish;
  const trimGallons = (room as any).trimGallonsNeeded;
  if (trimColor && trimFinish && trimGallons > 0) {
    entries.push({
      paintColor: trimColor,
      paintBrand: (room as any).trimBrand ?? "",
      finishType: trimFinish,
      rawGallons: trimGallons,
      pricePerGallon: (room as any).trimPricePerGallon ?? 0,
    });
  }

  return entries;
}

export function aggregateShoppingList(rooms: Room[]): ShoppingListItem[] {
  const paintRooms = rooms.filter(
    (r) =>
      (r.serviceType === ServiceType.InteriorPaint ||
        r.serviceType === ServiceType.ExteriorPaint)
  );

  const allEntries: PaintEntry[] = paintRooms.flatMap(extractPaintEntries);

  const groups = new Map<string, PaintEntry[]>();
  for (const entry of allEntries) {
    const key = `${entry.paintColor}|${entry.finishType}|${entry.paintBrand}`;
    const existing = groups.get(key) ?? [];
    existing.push(entry);
    groups.set(key, existing);
  }

  return Array.from(groups.entries()).map(([, groupEntries]) => {
    const first = groupEntries[0];
    const totalGallons = groupEntries.reduce((sum, e) => sum + e.rawGallons, 0);
    const purchaseGallons = roundToNearestQuarterGallon(totalGallons);
    const pricePerGallon = first.pricePerGallon;

    return {
      paintColor: first.paintColor,
      paintBrand: first.paintBrand,
      finishType: first.finishType,
      totalGallons,
      purchaseGallons,
      purchaseRecommendation: recommendPurchaseSize(purchaseGallons),
      pricePerGallon,
      totalCost: purchaseGallons * pricePerGallon,
    };
  });
}
```

**Important:** The Room type will eventually store `ceilingGallonsNeeded` and `trimGallonsNeeded` as computed values passed in from the form. For now, use `(room as any)` casts since these computed fields will be added to the Room save in the RoomForm task. This is intentional — the shopping list reads whatever fields are on the stored room.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/shopping-list.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shopping-list.ts src/lib/__tests__/shopping-list.test.ts
git commit -m "feat: shopping list aggregates ceiling and trim paint separately"
```

---

### Task 7: Rewrite RoomForm with 4 Toggle Buttons and Per-Component Paint Sections

**Files:**
- Modify: `src/components/RoomForm.tsx`

This is the largest single task. The RoomForm needs:
1. Four toggle buttons: Walls | Ceiling | Trim | Doors
2. Per-component paint detail sections
3. Component-level live estimate preview
4. Auto-fill from previous room

- [ ] **Step 1: Add new state variables and imports**

At the top of RoomForm, add these imports:

```typescript
import {
  calculateComponentEstimates,
  type ComponentEstimatesResult,
} from "@/lib/component-calculator";
import { roundToNearestQuarterGallon } from "@/lib/paint-calculator";
```

Add new state variables after the existing ones (around line 92):

```typescript
// Trim/door toggle state
const [includeTrim, setIncludeTrim] = useState(editRoom?.includeTrim ?? false);
const [includeDoors, setIncludeDoors] = useState(editRoom?.includeDoors ?? false);

// Ceiling paint state
const [ceilingColor, setCeilingColor] = useState(editRoom?.ceilingColor ?? "White");
const [ceilingBrand, setCeilingBrand] = useState(editRoom?.ceilingBrand ?? "");
const [ceilingFinish, setCeilingFinish] = useState<FinishType>(editRoom?.ceilingFinish ?? FinishType.Flat);
const [ceilingPricePerGallon, setCeilingPricePerGallon] = useState(editRoom?.ceilingPricePerGallon?.toString() ?? "45");

// Trim/door paint state
const [trimColor, setTrimColor] = useState(editRoom?.trimColor ?? "");
const [trimBrand, setTrimBrand] = useState(editRoom?.trimBrand ?? "");
const [trimFinish, setTrimFinish] = useState<FinishType>(editRoom?.trimFinish ?? FinishType.SemiGloss);
const [trimPricePerGallon, setTrimPricePerGallon] = useState(editRoom?.trimPricePerGallon?.toString() ?? "50");
```

- [ ] **Step 2: Add ceiling and trim preset lookups**

After the existing `surfacePreset` lookup (around line 117), add:

```typescript
const ceilingPreset = paintPresets.find((p) => p.surfaceType === SurfaceType.Ceiling);
const ceilingCoverageRate = ceilingPreset?.coverageRate ?? 400;
const ceilingLaborRate = ceilingPreset?.laborRate ?? 250;

const trimPreset = paintPresets.find((p) => p.surfaceType === SurfaceType.TrimBaseboard);
const trimCoverageRate = trimPreset?.coverageRate ?? 300;
const trimLaborRate = trimPreset?.laborRate ?? 150;
```

- [ ] **Step 3: Replace live calculation logic with component calculator**

Replace the existing calculation block (lines 130-157) with:

```typescript
const parsedCeilingPPG = parseFloat(ceilingPricePerGallon) || 0;
const parsedTrimPPG = parseFloat(trimPricePerGallon) || 0;

const estimates = isPaint && !isExterior
  ? calculateComponentEstimates({
      length: parsedLength,
      width: parsedWidth,
      height: parsedHeight,
      doorCount: parsedDoors,
      windowCount: parsedWindows,
      coats: parsedCoats,
      includeWalls,
      includeCeiling,
      includeTrim,
      includeDoors,
      wallCoverageRate: coverageRate,
      wallLaborRate: presetLaborRate,
      wallPricePerGallon: parsedPricePerGallon,
      ceilingCoverageRate,
      ceilingLaborRate,
      ceilingPricePerGallon: parsedCeilingPPG,
      trimCoverageRate,
      trimLaborRate,
      trimPricePerGallon: parsedTrimPPG,
    })
  : null;

// For exterior rooms, keep existing single-surface calculation
const exteriorSqFt = isPaint && isExterior
  ? calculatePaintableArea({
      roomType: RoomType.Exterior,
      length: parsedLength,
      width: parsedWidth,
      height: parsedHeight,
      doorCount: parsedDoors,
      windowCount: parsedWindows,
    })
  : 0;
const exteriorGallonsRaw = isExterior
  ? calculateGallonsNeeded(exteriorSqFt, parsedCoats, coverageRate)
  : 0;
const exteriorLaborHours = isExterior
  ? calculateLaborHours(exteriorSqFt, parsedCoats, presetLaborRate)
  : 0;
const exteriorCost = isExterior
  ? calculateRoomCost({
      gallonsNeeded: exteriorGallonsRaw,
      pricePerGallon: parsedPricePerGallon,
      laborHours: exteriorLaborHours,
      laborRate,
    })
  : { materialCost: 0, laborCost: 0 };

// Unified totals for save
const paintableSqFt = estimates?.totalPaintableSqFt ?? exteriorSqFt;
const totalRawGallons = estimates?.totalRawGallons ?? exteriorGallonsRaw;
const gallonsNeeded = roundToNearestQuarterGallon(totalRawGallons);
const estimatedLaborHours = estimates?.totalLaborHours ?? exteriorLaborHours;
const materialCost = estimates?.totalMaterialCost ?? exteriorCost.materialCost;
const laborCost = estimatedLaborHours * laborRate;
```

- [ ] **Step 4: Expand the toggle buttons section to 4 buttons**

Replace the existing "What to Paint" toggle section (lines 257-288) with:

```tsx
{/* Paint Area — 4 toggle buttons for interior */}
{!isExterior && (
  <div>
    <label className={labelClass}>What to Paint</label>
    <div className="flex gap-2">
      {([
        { label: "Walls", value: includeWalls, toggle: () => setIncludeWalls((v) => !v) },
        { label: "Ceiling", value: includeCeiling, toggle: () => setIncludeCeiling((v) => !v) },
        { label: "Trim", value: includeTrim, toggle: () => setIncludeTrim((v) => !v) },
        { label: "Doors", value: includeDoors, toggle: () => setIncludeDoors((v) => !v) },
      ] as const).map((btn) => (
        <button
          key={btn.label}
          type="button"
          onClick={btn.toggle}
          className={`flex-1 py-3 rounded-xl text-[14px] font-medium transition-colors ${
            btn.value
              ? "bg-orange-500 text-white"
              : "bg-white/[0.08] text-white/60 border border-white/[0.12]"
          }`}
        >
          {btn.label}
        </button>
      ))}
    </div>
    {!includeWalls && !includeCeiling && !includeTrim && !includeDoors && (
      <p className="text-amber-400/70 text-[12px] mt-1.5">Select at least one</p>
    )}
  </div>
)}
```

- [ ] **Step 5: Add per-component paint detail sections**

After the existing Paint Details section (color/brand around line 389), restructure to show per-component sections. Replace the single paint details block with:

```tsx
{/* ── Wall Paint Details ── */}
{includeWalls && (
  <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 flex flex-col gap-3">
    <p className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">Wall Paint</p>
    <div className="flex gap-3">
      <div className="flex-1">
        <label className={labelClass} htmlFor="rf-color">Color</label>
        <input id="rf-color" type="text" value={paintColor} onChange={(e) => setPaintColor(e.target.value)} placeholder="e.g. Swiss Coffee" className={inputClass} autoComplete="off" />
      </div>
      <div className="flex-1">
        <label className={labelClass} htmlFor="rf-brand">Brand</label>
        <input id="rf-brand" type="text" value={paintBrand} onChange={(e) => setPaintBrand(e.target.value)} placeholder="e.g. Sherwin-Williams" className={inputClass} autoComplete="off" />
      </div>
    </div>
    <div className="flex gap-3">
      <div className="flex-1">
        <label className={labelClass} htmlFor="rf-finish">Finish</label>
        <div className="relative">
          <select id="rf-finish" value={finishType} onChange={(e) => setFinishType(e.target.value as FinishType)} className={selectClass}>
            {FINISH_TYPES.map((ft) => (<option key={ft} value={ft}>{formatFinishType(ft)}</option>))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/40">
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
      </div>
      <div className="w-24">
        <label className={labelClass} htmlFor="rf-ppg">$/gal</label>
        <input id="rf-ppg" type="number" value={pricePerGallon} onChange={(e) => setPricePerGallon(e.target.value)} placeholder="45" inputMode="decimal" className={inputClass} />
      </div>
    </div>
  </div>
)}

{/* ── Ceiling Paint Details ── */}
{includeCeiling && (
  <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 flex flex-col gap-3">
    <p className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">Ceiling Paint</p>
    <div className="flex gap-3">
      <div className="flex-1">
        <label className={labelClass} htmlFor="rf-ceil-color">Color</label>
        <input id="rf-ceil-color" type="text" value={ceilingColor} onChange={(e) => setCeilingColor(e.target.value)} placeholder="White" className={inputClass} autoComplete="off" />
      </div>
      <div className="flex-1">
        <label className={labelClass} htmlFor="rf-ceil-brand">Brand</label>
        <input id="rf-ceil-brand" type="text" value={ceilingBrand} onChange={(e) => setCeilingBrand(e.target.value)} placeholder="e.g. Sherwin-Williams" className={inputClass} autoComplete="off" />
      </div>
    </div>
    <div className="flex gap-3">
      <div className="flex-1">
        <label className={labelClass} htmlFor="rf-ceil-finish">Finish</label>
        <div className="relative">
          <select id="rf-ceil-finish" value={ceilingFinish} onChange={(e) => setCeilingFinish(e.target.value as FinishType)} className={selectClass}>
            {FINISH_TYPES.map((ft) => (<option key={ft} value={ft}>{formatFinishType(ft)}</option>))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/40">
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
      </div>
      <div className="w-24">
        <label className={labelClass} htmlFor="rf-ceil-ppg">$/gal</label>
        <input id="rf-ceil-ppg" type="number" value={ceilingPricePerGallon} onChange={(e) => setCeilingPricePerGallon(e.target.value)} placeholder="40" inputMode="decimal" className={inputClass} />
      </div>
    </div>
  </div>
)}

{/* ── Trim/Door Paint Details ── */}
{(includeTrim || includeDoors) && (
  <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 flex flex-col gap-3">
    <p className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">
      {includeTrim && includeDoors ? "Trim & Door Paint" : includeTrim ? "Trim Paint" : "Door Paint"}
    </p>
    <div className="flex gap-3">
      <div className="flex-1">
        <label className={labelClass} htmlFor="rf-trim-color">Color</label>
        <input id="rf-trim-color" type="text" value={trimColor} onChange={(e) => setTrimColor(e.target.value)} placeholder="e.g. Swiss Coffee" className={inputClass} autoComplete="off" />
      </div>
      <div className="flex-1">
        <label className={labelClass} htmlFor="rf-trim-brand">Brand</label>
        <input id="rf-trim-brand" type="text" value={trimBrand} onChange={(e) => setTrimBrand(e.target.value)} placeholder="e.g. Sherwin-Williams" className={inputClass} autoComplete="off" />
      </div>
    </div>
    <div className="flex gap-3">
      <div className="flex-1">
        <label className={labelClass} htmlFor="rf-trim-finish">Finish</label>
        <div className="relative">
          <select id="rf-trim-finish" value={trimFinish} onChange={(e) => setTrimFinish(e.target.value as FinishType)} className={selectClass}>
            {FINISH_TYPES.map((ft) => (<option key={ft} value={ft}>{formatFinishType(ft)}</option>))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/40">
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
      </div>
      <div className="w-24">
        <label className={labelClass} htmlFor="rf-trim-ppg">$/gal</label>
        <input id="rf-trim-ppg" type="number" value={trimPricePerGallon} onChange={(e) => setTrimPricePerGallon(e.target.value)} placeholder="50" inputMode="decimal" className={inputClass} />
      </div>
    </div>
  </div>
)}
```

For exterior rooms, keep the existing single paint details section unchanged.

- [ ] **Step 6: Update the Live Estimate Preview for per-component breakdown**

Replace the existing Live Estimate section (lines 489-521) with:

```tsx
{/* Live Calculation Preview — per-component */}
{paintableSqFt > 0 && (
  <div className="rounded-2xl bg-orange-500/10 border border-orange-500/20 px-4 py-4">
    <p className="text-orange-400 text-[11px] font-semibold uppercase tracking-widest mb-3">
      Live Estimate
    </p>
    <div className="flex flex-col gap-2 mb-3">
      {estimates?.walls && (
        <div className="flex justify-between text-[13px]">
          <span className="text-white/50">Walls</span>
          <span className="text-white">{Math.round(estimates.walls.paintableSqFt)} sq ft · {roundToNearestQuarterGallon(estimates.walls.rawGallons)} gal</span>
        </div>
      )}
      {estimates?.ceiling && (
        <div className="flex justify-between text-[13px]">
          <span className="text-white/50">Ceiling</span>
          <span className="text-white">{Math.round(estimates.ceiling.paintableSqFt)} sq ft · {roundToNearestQuarterGallon(estimates.ceiling.rawGallons)} gal</span>
        </div>
      )}
      {estimates?.trim && (
        <div className="flex justify-between text-[13px]">
          <span className="text-white/50">Trim</span>
          <span className="text-white">{Math.round(estimates.trim.paintableSqFt)} sq ft · {roundToNearestQuarterGallon(estimates.trim.rawGallons)} gal</span>
        </div>
      )}
      {estimates?.doors && (
        <div className="flex justify-between text-[13px]">
          <span className="text-white/50">Doors</span>
          <span className="text-white">{Math.round(estimates.doors.paintableSqFt)} sq ft · {roundToNearestQuarterGallon(estimates.doors.rawGallons)} gal</span>
        </div>
      )}
    </div>
    <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 pt-2 border-t border-orange-500/15">
      <div>
        <p className="text-white/40 text-[11px]">Total Sq Ft</p>
        <p className="text-white text-[15px] font-semibold">{Math.round(paintableSqFt)} sq ft</p>
      </div>
      <div>
        <p className="text-white/40 text-[11px]">Gallons Needed</p>
        <p className="text-white text-[15px] font-semibold">{gallonsNeeded} gal</p>
      </div>
      <div>
        <p className="text-white/40 text-[11px]">Labor Hours</p>
        <p className="text-white text-[15px] font-semibold">{estimatedLaborHours.toFixed(1)} hrs</p>
      </div>
      <div>
        <p className="text-white/40 text-[11px]">Material Cost</p>
        <p className="text-white text-[15px] font-semibold">{formatCurrency(materialCost)}</p>
      </div>
      <div>
        <p className="text-white/40 text-[11px]">Labor Cost</p>
        <p className="text-white text-[15px] font-semibold">{formatCurrency(laborCost)}</p>
      </div>
      <div>
        <p className="text-white/40 text-[11px]">Room Total</p>
        <p className="text-orange-400 text-[15px] font-bold">{formatCurrency(materialCost + laborCost)}</p>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 7: Update handleSubmit to include new fields**

In the `handleSubmit` paint mode branch, update the room object to include the new fields:

```typescript
if (!includeWalls && !includeCeiling && !includeTrim && !includeDoors && !isExterior) {
  setError("Select at least one surface to paint.");
  return;
}
const room: Omit<Room, "id" | "updatedAt"> = {
  quoteId,
  name: name.trim(),
  serviceType,
  roomType: isExterior ? RoomType.Exterior : deriveRoomType(includeWalls, includeCeiling),
  length: parsedLength,
  width: parsedWidth,
  height: parsedHeight,
  doorCount: parsedDoors,
  windowCount: parsedWindows,
  surfaceType,
  paintColor: paintColor.trim(),
  paintBrand: paintBrand.trim(),
  finishType,
  coats: parsedCoats,
  pricePerGallon: parsedPricePerGallon,
  includeTrim,
  includeDoors,
  ceilingColor: ceilingColor.trim(),
  ceilingBrand: ceilingBrand.trim(),
  ceilingFinish,
  ceilingPricePerGallon: parsedCeilingPPG,
  trimColor: trimColor.trim(),
  trimBrand: trimBrand.trim(),
  trimFinish,
  trimPricePerGallon: parsedTrimPPG,
  paintableSqFt,
  gallonsNeeded,
  estimatedLaborHours,
  materialCost,
  laborCost,
  description: "",
  manualHours: null,
  manualCost: null,
  sortOrder: editRoom?.sortOrder ?? Date.now(),
};
onSave(room);
```

Also update the non-paint branch to include the new fields with defaults:

```typescript
includeTrim: false,
includeDoors: false,
ceilingColor: "",
ceilingBrand: "",
ceilingFinish: null,
ceilingPricePerGallon: null,
trimColor: "",
trimBrand: "",
trimFinish: null,
trimPricePerGallon: null,
```

- [ ] **Step 8: Verify the app compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No type errors (or only unrelated ones).

- [ ] **Step 9: Commit**

```bash
git add src/components/RoomForm.tsx
git commit -m "feat: RoomForm with 4 toggle buttons and per-component paint sections"
```

---

### Task 8: Add Auto-Fill From Previous Room

**Files:**
- Modify: `src/components/RoomForm.tsx`

- [ ] **Step 1: Add previousRoom prop to RoomFormProps**

```typescript
interface RoomFormProps {
  serviceType: ServiceType;
  laborRate: number;
  quoteId: string;
  onSave: (room: Omit<Room, "id" | "updatedAt">) => void;
  onCancel: () => void;
  editRoom?: Room;
  previousRoom?: Room; // Most recently added room in the same quote
}
```

- [ ] **Step 2: Use previousRoom for default values when not editing**

Update the state initializers to fall back to `previousRoom` when `editRoom` is not provided:

```typescript
const prev = editRoom ?? previousRoom;

const [name, setName] = useState(editRoom?.name ?? "");
const [includeWalls, setIncludeWalls] = useState(isExterior ? true : (prev ? deriveChecks(prev.roomType).walls : true));
const [includeCeiling, setIncludeCeiling] = useState(isExterior ? false : (prev ? deriveChecks(prev.roomType).ceiling : false));
const [includeTrim, setIncludeTrim] = useState(prev?.includeTrim ?? false);
const [includeDoors, setIncludeDoors] = useState(prev?.includeDoors ?? false);
// ... dimensions NOT pre-filled (each room has different dimensions)
const [surfaceType, setSurfaceType] = useState<SurfaceType>(prev?.surfaceType ?? SurfaceType.SmoothDrywall);
const [paintColor, setPaintColor] = useState(prev?.paintColor ?? "");
const [paintBrand, setPaintBrand] = useState(prev?.paintBrand ?? "");
const [finishType, setFinishType] = useState<FinishType>(prev?.finishType ?? FinishType.Eggshell);
const [pricePerGallon, setPricePerGallon] = useState(prev?.pricePerGallon?.toString() ?? "45");
const [ceilingColor, setCeilingColor] = useState(prev?.ceilingColor ?? "White");
const [ceilingBrand, setCeilingBrand] = useState(prev?.ceilingBrand ?? "");
const [ceilingFinish, setCeilingFinish] = useState<FinishType>(prev?.ceilingFinish ?? FinishType.Flat);
const [ceilingPricePerGallon, setCeilingPricePerGallon] = useState(prev?.ceilingPricePerGallon?.toString() ?? "45");
const [trimColor, setTrimColor] = useState(prev?.trimColor ?? "");
const [trimBrand, setTrimBrand] = useState(prev?.trimBrand ?? "");
const [trimFinish, setTrimFinish] = useState<FinishType>(prev?.trimFinish ?? FinishType.SemiGloss);
const [trimPricePerGallon, setTrimPricePerGallon] = useState(prev?.trimPricePerGallon?.toString() ?? "50");
const [coats, setCoats] = useState(prev?.coats?.toString() ?? "2");
```

- [ ] **Step 3: Pass previousRoom from the quote page**

Find the parent component that renders RoomForm (likely the quote detail page). Pass the last room in the rooms array as `previousRoom` when adding a new room (not editing). You'll need to check `src/app/quotes/[id]/page.tsx` or similar for where RoomForm is rendered and add:

```typescript
previousRoom={!editingRoom && rooms.length > 0 ? rooms[rooms.length - 1] : undefined}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/RoomForm.tsx src/app/quotes/*/page.tsx
git commit -m "feat: auto-fill new rooms from previous room's paint details"
```

---

## Feature 2: Calendar & Scheduling UX

### Task 9: Add Back Button to Schedule Page

**Files:**
- Modify: `src/app/schedule/page.tsx:179`

- [ ] **Step 1: Add showBack prop to AppShell**

Change line 179 from:

```tsx
<AppShell title="Schedule">
```

To:

```tsx
<AppShell showBack title="Schedule">
```

- [ ] **Step 2: Verify in browser**

Navigate to `/schedule` and confirm the back arrow appears in the header.

- [ ] **Step 3: Commit**

```bash
git add src/app/schedule/page.tsx
git commit -m "fix: add back button to schedule page"
```

---

### Task 10: Create ScheduleSheet Component

**Files:**
- Create: `src/components/ScheduleSheet.tsx`

- [ ] **Step 1: Build the bottom sheet component**

```tsx
"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { updateJob } from "@/hooks/useJobs";
import { formatServiceType } from "@/lib/format";
import type { Job } from "@/lib/types";

interface ScheduleSheetProps {
  open: boolean;
  onClose: () => void;
  prefilledDate: string; // YYYY-MM-DD from selected calendar day
}

function CustomerName({ customerId }: { customerId: string }) {
  const customer = useLiveQuery(
    () => db.customers.get(customerId),
    [customerId]
  );
  return <>{customer?.name ?? "..."}</>;
}

export default function ScheduleSheet({
  open,
  onClose,
  prefilledDate,
}: ScheduleSheetProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [dateTimeValue, setDateTimeValue] = useState(`${prefilledDate}T09:00`);
  const [saving, setSaving] = useState(false);

  // Unscheduled jobs: any active job with empty scheduledDate
  const unscheduledJobs = useLiveQuery(async () => {
    const allJobs = await db.jobs.toArray();
    return allJobs.filter((j) => !j.scheduledDate);
  }, []);

  async function handleSchedule() {
    if (!selectedJob || !dateTimeValue) return;
    setSaving(true);
    try {
      await updateJob(selectedJob.id, {
        scheduledDate: new Date(dateTimeValue).toISOString(),
      });
      setSelectedJob(null);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          setSelectedJob(null);
          onClose();
        }}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-[#1a1a2e] border-t border-white/[0.10] rounded-t-3xl px-5 pt-5 pb-8 max-h-[70vh] flex flex-col">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
        <h2 className="text-white font-semibold text-[17px] mb-4">Schedule a Job</h2>

        {!selectedJob ? (
          // Step 1: Pick unscheduled job
          <div className="flex-1 overflow-y-auto">
            {(!unscheduledJobs || unscheduledJobs.length === 0) ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <p className="text-white/40 text-[15px]">No unscheduled jobs</p>
                <a
                  href="/quotes/new"
                  className="text-orange-400 text-[14px] font-medium"
                >
                  Create a new job
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {unscheduledJobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => {
                      setSelectedJob(job);
                      setDateTimeValue(`${prefilledDate}T09:00`);
                    }}
                    className="w-full text-left flex items-center justify-between px-4 py-3.5 rounded-xl active:bg-white/[0.06] transition-colors"
                  >
                    <div>
                      <p className="text-white text-[14px] font-medium">
                        <CustomerName customerId={job.customerId} />
                      </p>
                      <p className="text-white/40 text-[12px] mt-0.5">
                        {formatServiceType(job.serviceType)}
                      </p>
                    </div>
                    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="text-white/30" aria-hidden="true">
                      <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Step 2: Pick date/time
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-white/[0.06] px-4 py-3">
              <p className="text-white text-[14px] font-medium">
                <CustomerName customerId={selectedJob.customerId} />
              </p>
              <p className="text-white/40 text-[12px]">
                {formatServiceType(selectedJob.serviceType)}
              </p>
            </div>
            <div>
              <label className="block text-white/50 text-[12px] font-medium mb-1.5">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={dateTimeValue}
                onChange={(e) => setDateTimeValue(e.target.value)}
                className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-4 py-3 text-white text-[15px] focus:outline-none focus:border-orange-500/60"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="flex-1 py-3.5 rounded-2xl bg-white/[0.08] text-white/70 font-medium text-[15px] active:bg-white/15 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSchedule}
                disabled={saving || !dateTimeValue}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform disabled:opacity-40 shadow-lg shadow-orange-900/30"
              >
                {saving ? "Scheduling..." : "Schedule"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ScheduleSheet.tsx
git commit -m "feat: add ScheduleSheet bottom sheet component"
```

---

### Task 11: Add Floating "+" Button to Schedule Page

**Files:**
- Modify: `src/app/schedule/page.tsx`

- [ ] **Step 1: Import ScheduleSheet and add state**

Add at the top:

```typescript
import ScheduleSheet from "@/components/ScheduleSheet";
```

Add state inside the component:

```typescript
const [showScheduleSheet, setShowScheduleSheet] = useState(false);
```

- [ ] **Step 2: Add floating action button and sheet before the closing `</AppShell>`**

Add right before `</AppShell>`:

```tsx
{/* Floating Action Button */}
<button
  onClick={() => setShowScheduleSheet(true)}
  className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-rose-600 text-white shadow-xl shadow-orange-900/40 flex items-center justify-center active:scale-95 transition-transform z-40"
  aria-label="Schedule a job"
>
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
</button>

{/* Schedule Sheet */}
<ScheduleSheet
  open={showScheduleSheet}
  onClose={() => setShowScheduleSheet(false)}
  prefilledDate={selectedDate.toISOString().slice(0, 10)}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/schedule/page.tsx
git commit -m "feat: add floating + button and schedule sheet to calendar"
```

---

### Task 12: Prominent "Schedule Job" Button on Job Detail

**Files:**
- Modify: `src/app/jobs/[id]/JobDetailClient.tsx:248-294`

- [ ] **Step 1: Replace the Scheduled section with a conditional layout**

Replace the existing Scheduled section with:

```tsx
{/* ── Scheduled Date ── */}
<div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4">
  <div className="flex items-center justify-between mb-1">
    <h2 className="text-white/60 text-[12px] font-semibold uppercase tracking-widest">
      Scheduled
    </h2>
    {!editingDate && job.scheduledDate && (
      <button
        onClick={startEditDate}
        className="text-emerald-400 text-[14px] font-medium active:opacity-60 transition-opacity py-1 px-2 -mr-2 min-h-[44px] flex items-center"
      >
        Edit
      </button>
    )}
  </div>
  {editingDate ? (
    <div className="flex flex-col gap-2 mt-2">
      <input
        type="datetime-local"
        value={dateValue}
        onChange={(e) => setDateValue(e.target.value)}
        className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white text-[15px] focus:outline-none focus:border-emerald-500/60"
        autoFocus
      />
      <div className="flex gap-2">
        <button
          onClick={() => setEditingDate(false)}
          className="flex-1 py-3 rounded-xl bg-white/[0.08] text-white/70 font-medium text-[15px] active:bg-white/15 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={saveDateEdit}
          className="flex-1 py-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform"
        >
          Save
        </button>
      </div>
    </div>
  ) : job.scheduledDate ? (
    <p className="text-white text-[15px] mt-1">
      {formatDateTime(job.scheduledDate)}
    </p>
  ) : (
    <button
      onClick={startEditDate}
      className="w-full mt-2 flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform shadow-lg shadow-violet-900/30"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="2" y="3" width="14" height="13" rx="2" stroke="white" strokeWidth="1.6" fill="none"/>
        <path d="M6 1.5V4.5M12 1.5V4.5" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M2 7.5H16" stroke="white" strokeWidth="1.6"/>
      </svg>
      Schedule Job
    </button>
  )}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/jobs/[id]/JobDetailClient.tsx
git commit -m "feat: prominent Schedule Job button when unscheduled"
```

---

## Feature 3: Dashboard Pipeline

### Task 13: Replace Dashboard with Pipeline Cards + Today's Schedule

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add new queries for pipeline data**

Add these queries inside the `HomePage` component, after the existing ones:

```typescript
// Pipeline queries
const leadCount = useLiveQuery(
  () => db.jobs.where("status").equals(JobStatus.Lead).count(),
  [],
  0
);

const quotedCount = openQuotesCount; // Already exists

const needsSchedulingCount = useLiveQuery(async () => {
  const activeStatuses = [JobStatus.Lead, JobStatus.Quoted, JobStatus.Scheduled, JobStatus.InProgress];
  const jobs = await db.jobs.where("status").anyOf(activeStatuses).toArray();
  return jobs.filter((j) => !j.scheduledDate).length;
}, [], 0);

// Preview names for pipeline cards
const leadPreviews = useLiveQuery(async () => {
  const jobs = await db.jobs.where("status").equals(JobStatus.Lead).limit(3).toArray();
  const names: string[] = [];
  for (const job of jobs) {
    const c = await db.customers.get(job.customerId);
    if (c) names.push(c.name);
  }
  return names;
}, [], []);

const quotedPreviews = useLiveQuery(async () => {
  const jobs = await db.jobs.where("status").equals(JobStatus.Quoted).limit(3).toArray();
  const names: string[] = [];
  for (const job of jobs) {
    const c = await db.customers.get(job.customerId);
    if (c) names.push(c.name);
  }
  return names;
}, [], []);

const needsSchedulingPreviews = useLiveQuery(async () => {
  const activeStatuses = [JobStatus.Lead, JobStatus.Quoted, JobStatus.Scheduled, JobStatus.InProgress];
  const jobs = await db.jobs.where("status").anyOf(activeStatuses).toArray();
  const unscheduled = jobs.filter((j) => !j.scheduledDate).slice(0, 3);
  const names: string[] = [];
  for (const job of unscheduled) {
    const c = await db.customers.get(job.customerId);
    if (c) names.push(c.name);
  }
  return names;
}, [], []);

// Today's schedule
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

const todayJobs = useLiveQuery(async () => {
  const jobs = await db.jobs
    .where("scheduledDate")
    .between(todayStart, todayEnd, true, false)
    .toArray();
  const withCustomer = await Promise.all(
    jobs.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)).map(async (job) => {
      const customer = await db.customers.get(job.customerId);
      return { job, customerName: customer?.name ?? "Unknown" };
    })
  );
  return withCustomer;
}, [todayStart, todayEnd], []);
```

- [ ] **Step 2: Add pipeline cards section after the app header, before the navigation tiles**

Insert this between the header `</div>` and `{/* Navigation tiles */}`:

```tsx
{/* Pipeline Cards */}
<div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 mb-4">
  {[
    {
      label: "Leads",
      count: leadCount ?? 0,
      previews: leadPreviews ?? [],
      gradient: "from-amber-500/15 to-amber-600/5",
      border: "border-amber-500/20",
      badge: "bg-amber-500/20 text-amber-300",
      filterStatus: JobStatus.Lead,
    },
    {
      label: "Quoted",
      count: quotedCount ?? 0,
      previews: quotedPreviews ?? [],
      gradient: "from-blue-500/15 to-blue-600/5",
      border: "border-blue-500/20",
      badge: "bg-blue-500/20 text-blue-300",
      filterStatus: JobStatus.Quoted,
    },
    {
      label: "Needs Scheduling",
      count: needsSchedulingCount ?? 0,
      previews: needsSchedulingPreviews ?? [],
      gradient: "from-rose-500/15 to-rose-600/5",
      border: "border-rose-500/20",
      badge: "bg-rose-500/20 text-rose-300",
      filterStatus: null,
    },
  ].map((card) => (
    <Link
      key={card.label}
      href={card.filterStatus ? `/jobs?status=${card.filterStatus}` : `/jobs?unscheduled=true`}
      className={`flex-shrink-0 w-[160px] rounded-2xl bg-gradient-to-br ${card.gradient} border ${card.border} p-4 active:scale-[0.97] transition-transform`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/60 text-[12px] font-semibold">{card.label}</span>
        <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${card.badge}`}>
          {card.count}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        {(card.previews).slice(0, 3).map((name, i) => (
          <p key={i} className="text-white/50 text-[12px] truncate">{name}</p>
        ))}
        {card.count === 0 && (
          <p className="text-white/25 text-[12px]">None</p>
        )}
      </div>
    </Link>
  ))}
</div>
```

- [ ] **Step 3: Add Today's Schedule section after the navigation tiles and before the quick stats bar**

```tsx
{/* Today's Schedule */}
<div className="mt-4 rounded-3xl bg-white/[0.06] border border-white/[0.08] overflow-hidden">
  <div className="px-4 pt-4 pb-2 flex items-center justify-between">
    <h2 className="text-white/60 text-[12px] font-semibold uppercase tracking-widest">
      Today
    </h2>
    <Link
      href="/schedule"
      className="text-blue-400 text-[13px] font-medium active:opacity-60 transition-opacity"
    >
      Full schedule
    </Link>
  </div>
  {(!todayJobs || todayJobs.length === 0) ? (
    <div className="px-4 py-6 text-center">
      <p className="text-white/30 text-[14px]">Nothing scheduled for today</p>
    </div>
  ) : (
    <div className="flex flex-col divide-y divide-white/[0.06]">
      {todayJobs.map(({ job, customerName }) => (
        <Link
          key={job.id}
          href={`/jobs/${job.id}`}
          className="flex items-center gap-3 px-4 py-3.5 active:bg-white/[0.04] transition-colors"
        >
          <div className="flex-shrink-0 w-14">
            <span className="text-white/50 text-[12px] font-medium">
              {job.scheduledDate
                ? new Date(job.scheduledDate).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "—"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[14px] font-medium truncate">
              {customerName}
            </p>
            <p className="text-white/40 text-[12px]">
              {formatServiceType(job.serviceType)}
            </p>
          </div>
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="text-white/20 flex-shrink-0" aria-hidden="true">
            <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: dashboard pipeline cards and today's schedule"
```

---

## Feature 4: Google Calendar Settings UI

### Task 14: Wire Google Calendar Connect/Disconnect in Settings

**Files:**
- Modify: `src/app/settings/page.tsx`
- Modify: `src/components/Providers.tsx`

- [ ] **Step 1: Update Providers to init Google Calendar with env var**

In `src/components/Providers.tsx`, import and call `initGoogleCalendar` on mount:

```typescript
import { initGoogleCalendar } from "@/lib/google-calendar";
```

Add inside the `useEffect` that runs on mount, after `seedDatabase()` and `syncWithCloud()`:

```typescript
const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
if (clientId) {
  initGoogleCalendar(clientId).catch((err) =>
    console.warn("Google Calendar init failed:", err)
  );
}
```

- [ ] **Step 2: Update the Google Calendar section in Settings**

Replace the existing Google Calendar section (the "Coming soon" placeholder) with a functional connect/disconnect UI:

```tsx
{/* Google Calendar */}
<div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4">
  <h2 className="text-white/60 text-[12px] font-semibold uppercase tracking-widest mb-3">
    Google Calendar
  </h2>
  {settings?.googleCalendarConnected ? (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-white text-[14px]">Connected</span>
      </div>
      <button
        onClick={async () => {
          await db.appSettings.update("default", {
            googleCalendarConnected: false,
            googleCalendarToken: "",
          });
        }}
        className="text-rose-400 text-[14px] font-medium active:opacity-60 transition-opacity py-1 px-2 min-h-[44px] flex items-center"
      >
        Disconnect
      </button>
    </div>
  ) : (
    <button
      onClick={async () => {
        try {
          const { requestAccessToken } = await import("@/lib/google-calendar");
          const tokenResponse = await requestAccessToken();
          await db.appSettings.update("default", {
            googleCalendarConnected: true,
            googleCalendarToken: JSON.stringify(tokenResponse),
          });
        } catch (err) {
          console.error("Google Calendar auth failed:", err);
        }
      }}
      disabled={!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
      className="w-full py-4 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform disabled:opacity-40 shadow-lg shadow-blue-900/30"
    >
      Connect Google Calendar
    </button>
  )}
  {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
    <p className="text-white/30 text-[12px] mt-2">
      Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local to enable
    </p>
  )}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/settings/page.tsx src/components/Providers.tsx
git commit -m "feat: Google Calendar connect/disconnect UI in settings"
```

---

### Task 15: Run Full Test Suite and Verify

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 2: Run TypeScript type checking**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Run the dev server and smoke test**

Run: `npx next dev`
Manually verify:
1. RoomForm shows 4 toggle buttons for interior rooms
2. Per-component paint sections appear/disappear with toggles
3. Live estimate shows per-component breakdown
4. Schedule page has back button and floating "+" button
5. Dashboard shows pipeline cards and today's schedule
6. Settings shows Google Calendar section

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address any issues found during smoke testing"
```
