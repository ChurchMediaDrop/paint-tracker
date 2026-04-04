# Deck Staining/Painting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new Deck Staining service type with deck-specific calculations (floor, railings, stairs), stain type selection, and wood condition adjustment.

**Architecture:** New `DeckStaining` service type with a dedicated `DeckForm` component (separated from the already-large RoomForm) and a `deck-calculator` module for area/gallon calculations. Integrates into the existing quote flow, shopping list, and format helpers.

**Tech Stack:** Next.js, React, TypeScript, Dexie (IndexedDB), Tailwind CSS, Vitest

---

## File Structure

### New Files
- `src/lib/deck-calculator.ts` — Deck area calculations (floor, railing, stairs) and coverage rate lookup by stain type + wood condition
- `src/lib/__tests__/deck-calculator.test.ts` — Tests for deck calculator
- `src/components/DeckForm.tsx` — Deck-specific room form (dimensions, railings, stairs, stain type, wood condition, color/brand/price)

### Modified Files
- `src/lib/types.ts` — Add `DeckStaining` to ServiceType, new `StainType` and `WoodCondition` enums, new Room fields
- `src/lib/db.ts` — Dexie version 4 migration for new Room fields
- `supabase-schema.sql` — New columns on rooms table
- `src/lib/format.ts` — Add formatStainType, formatWoodCondition, update SERVICE_TYPE_LABELS
- `src/lib/shopping-list.ts` — Handle DeckStaining rooms in extractPaintEntries
- `src/lib/__tests__/shopping-list.test.ts` — Tests for deck entries in shopping list
- `src/components/RoomForm.tsx` — Delegate to DeckForm when serviceType is DeckStaining
- `src/app/quotes/new/page.tsx` — Add DeckStaining to service type picker with icon

---

## Task 1: Add Types — ServiceType, StainType, WoodCondition, Room Fields

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add DeckStaining to ServiceType enum**

After `Handyman = "handyman"` (line 6), add:

```typescript
  DeckStaining = "deck_staining",
```

- [ ] **Step 2: Add StainType enum**

After the `CalendarOperation` enum (line 63), add:

```typescript
export enum StainType {
  Transparent = "transparent",
  SemiTransparent = "semi_transparent",
  SolidPaint = "solid_paint",
}

export enum WoodCondition {
  Smooth = "smooth",
  Rough = "rough",
}
```

- [ ] **Step 3: Add new fields to Room interface**

After `trimPricePerGallon: number | null;` (line 131), add:

```typescript
  // Deck fields
  railingLinearFeet: number;
  stairCount: number;
  stainType: StainType | null;
  woodCondition: WoodCondition | null;
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add DeckStaining service type, StainType, WoodCondition enums, Room fields"
```

---

## Task 2: Dexie Migration and Supabase Schema

**Files:**
- Modify: `src/lib/db.ts`
- Modify: `supabase-schema.sql`

- [ ] **Step 1: Add Dexie version 4 migration**

After the version(3) block (ends around line 93), add:

```typescript
this.version(4).stores({
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
    if (record.railingLinearFeet === undefined) record.railingLinearFeet = 0;
    if (record.stairCount === undefined) record.stairCount = 0;
    if (record.stainType === undefined) record.stainType = null;
    if (record.woodCondition === undefined) record.woodCondition = null;
  });
});
```

- [ ] **Step 2: Add columns to supabase-schema.sql**

Add after the `trim_gallons_needed` column in the rooms CREATE TABLE:

```sql
  railing_linear_feet REAL DEFAULT 0,
  stair_count INTEGER DEFAULT 0,
  stain_type TEXT,
  wood_condition TEXT,
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/db.ts supabase-schema.sql
git commit -m "feat: Dexie v4 migration and Supabase schema for deck fields"
```

---

## Task 3: Format Helpers

**Files:**
- Modify: `src/lib/format.ts`

- [ ] **Step 1: Add imports for new types**

Update the import line to include the new types:

```typescript
import { ServiceType, JobStatus, FinishType, SurfaceType, StainType, WoodCondition } from "@/lib/types";
```

- [ ] **Step 2: Add DeckStaining to SERVICE_TYPE_LABELS**

Add to the `SERVICE_TYPE_LABELS` record:

```typescript
  [ServiceType.DeckStaining]: "Deck Staining",
```

- [ ] **Step 3: Add formatStainType and formatWoodCondition**

Add at the end of the file:

```typescript
const STAIN_TYPE_LABELS: Record<StainType, string> = {
  [StainType.Transparent]: "Transparent",
  [StainType.SemiTransparent]: "Semi-Transparent",
  [StainType.SolidPaint]: "Solid / Paint",
};
export function formatStainType(type: StainType): string { return STAIN_TYPE_LABELS[type] ?? type; }

const WOOD_CONDITION_LABELS: Record<WoodCondition, string> = {
  [WoodCondition.Smooth]: "New / Smooth",
  [WoodCondition.Rough]: "Weathered / Rough",
};
export function formatWoodCondition(condition: WoodCondition): string { return WOOD_CONDITION_LABELS[condition] ?? condition; }
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/format.ts
git commit -m "feat: add format helpers for StainType, WoodCondition, DeckStaining"
```

---

## Task 4: Deck Calculator — Tests First

**Files:**
- Create: `src/lib/deck-calculator.ts`
- Create: `src/lib/__tests__/deck-calculator.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/deck-calculator.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  calculateDeckFloorArea,
  calculateRailingArea,
  calculateStairArea,
  getDeckCoverageRate,
  calculateDeckEstimate,
} from "@/lib/deck-calculator";
import { StainType, WoodCondition } from "@/lib/types";

describe("calculateDeckFloorArea", () => {
  it("calculates floor area as length * width", () => {
    expect(calculateDeckFloorArea(20, 12)).toBe(240);
  });

  it("handles null dimensions as 0", () => {
    expect(calculateDeckFloorArea(null, 12)).toBe(0);
    expect(calculateDeckFloorArea(20, null)).toBe(0);
  });
});

describe("calculateRailingArea", () => {
  it("multiplies linear feet by 6", () => {
    expect(calculateRailingArea(30)).toBe(180);
  });

  it("returns 0 for 0 linear feet", () => {
    expect(calculateRailingArea(0)).toBe(0);
  });
});

describe("calculateStairArea", () => {
  it("multiplies step count by 5.5", () => {
    expect(calculateStairArea(8)).toBe(44);
  });

  it("returns 0 for 0 steps", () => {
    expect(calculateStairArea(0)).toBe(0);
  });
});

describe("getDeckCoverageRate", () => {
  it("returns correct rate for transparent + smooth", () => {
    expect(getDeckCoverageRate(StainType.Transparent, WoodCondition.Smooth)).toBe(300);
  });

  it("returns correct rate for semi-transparent + rough", () => {
    expect(getDeckCoverageRate(StainType.SemiTransparent, WoodCondition.Rough)).toBe(175);
  });

  it("returns correct rate for solid/paint + smooth", () => {
    expect(getDeckCoverageRate(StainType.SolidPaint, WoodCondition.Smooth)).toBe(200);
  });

  it("returns correct rate for solid/paint + rough", () => {
    expect(getDeckCoverageRate(StainType.SolidPaint, WoodCondition.Rough)).toBe(150);
  });

  it("returns correct rate for transparent + rough", () => {
    expect(getDeckCoverageRate(StainType.Transparent, WoodCondition.Rough)).toBe(200);
  });

  it("returns correct rate for semi-transparent + smooth", () => {
    expect(getDeckCoverageRate(StainType.SemiTransparent, WoodCondition.Smooth)).toBe(250);
  });
});

describe("calculateDeckEstimate", () => {
  const baseInput = {
    length: 20 as number | null,
    width: 12 as number | null,
    railingLinearFeet: 30,
    stairCount: 6,
    coats: 1,
    stainType: StainType.SemiTransparent,
    woodCondition: WoodCondition.Smooth,
    pricePerGallon: 40,
    laborProductionRate: 120,
  };

  it("calculates total area from floor + railing + stairs", () => {
    const result = calculateDeckEstimate(baseInput);
    // Floor: 20*12=240, Railing: 30*6=180, Stairs: 6*5.5=33
    expect(result.floorSqFt).toBe(240);
    expect(result.railingSqFt).toBe(180);
    expect(result.stairSqFt).toBe(33);
    expect(result.totalSqFt).toBe(453);
  });

  it("calculates gallons with waste factor", () => {
    const result = calculateDeckEstimate(baseInput);
    // 453 sq ft * 1 coat / 250 coverage * 1.10 waste = 1.9932
    expect(result.rawGallons).toBeCloseTo(1.9932, 3);
  });

  it("calculates labor hours with prep factor", () => {
    const result = calculateDeckEstimate(baseInput);
    // 453 sq ft * 1 coat / 120 labor * 1.15 prep = 4.34125
    expect(result.laborHours).toBeCloseTo(4.341, 2);
  });

  it("calculates material cost from raw gallons", () => {
    const result = calculateDeckEstimate(baseInput);
    // 1.9932 * 40 = ~79.73
    expect(result.materialCost).toBeCloseTo(79.73, 0);
  });

  it("handles 2 coats", () => {
    const input = { ...baseInput, coats: 2 };
    const result = calculateDeckEstimate(input);
    // 453 * 2 / 250 * 1.10 = 3.9864
    expect(result.rawGallons).toBeCloseTo(3.9864, 3);
  });

  it("handles rough wood with lower coverage", () => {
    const input = { ...baseInput, woodCondition: WoodCondition.Rough };
    const result = calculateDeckEstimate(input);
    // 453 * 1 / 175 * 1.10 = 2.847
    expect(result.rawGallons).toBeCloseTo(2.847, 2);
  });

  it("returns zeros when no dimensions", () => {
    const input = { ...baseInput, length: null, width: null, railingLinearFeet: 0, stairCount: 0 };
    const result = calculateDeckEstimate(input);
    expect(result.totalSqFt).toBe(0);
    expect(result.rawGallons).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/deck-calculator.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the deck calculator**

Create `src/lib/deck-calculator.ts`:

```typescript
import { StainType, WoodCondition } from "@/lib/types";
import {
  WASTE_FACTOR,
  PREP_TIME_FACTOR,
} from "@/lib/paint-calculator";

const RAILING_SQ_FT_PER_LINEAR_FT = 6;
const STAIR_SQ_FT_PER_STEP = 5.5;

const COVERAGE_RATES: Record<StainType, Record<WoodCondition, number>> = {
  [StainType.Transparent]: { [WoodCondition.Smooth]: 300, [WoodCondition.Rough]: 200 },
  [StainType.SemiTransparent]: { [WoodCondition.Smooth]: 250, [WoodCondition.Rough]: 175 },
  [StainType.SolidPaint]: { [WoodCondition.Smooth]: 200, [WoodCondition.Rough]: 150 },
};

export function calculateDeckFloorArea(
  length: number | null,
  width: number | null
): number {
  return (length ?? 0) * (width ?? 0);
}

export function calculateRailingArea(linearFeet: number): number {
  return linearFeet * RAILING_SQ_FT_PER_LINEAR_FT;
}

export function calculateStairArea(stepCount: number): number {
  return stepCount * STAIR_SQ_FT_PER_STEP;
}

export function getDeckCoverageRate(
  stainType: StainType,
  woodCondition: WoodCondition
): number {
  return COVERAGE_RATES[stainType]?.[woodCondition] ?? 250;
}

export interface DeckEstimate {
  floorSqFt: number;
  railingSqFt: number;
  stairSqFt: number;
  totalSqFt: number;
  rawGallons: number;
  laborHours: number;
  materialCost: number;
}

interface DeckEstimateInput {
  length: number | null;
  width: number | null;
  railingLinearFeet: number;
  stairCount: number;
  coats: number;
  stainType: StainType;
  woodCondition: WoodCondition;
  pricePerGallon: number;
  laborProductionRate: number;
}

export function calculateDeckEstimate(input: DeckEstimateInput): DeckEstimate {
  const floorSqFt = calculateDeckFloorArea(input.length, input.width);
  const railingSqFt = calculateRailingArea(input.railingLinearFeet);
  const stairSqFt = calculateStairArea(input.stairCount);
  const totalSqFt = floorSqFt + railingSqFt + stairSqFt;

  const coverageRate = getDeckCoverageRate(input.stainType, input.woodCondition);

  const rawGallons =
    totalSqFt === 0 || coverageRate === 0
      ? 0
      : ((totalSqFt * input.coats) / coverageRate) * WASTE_FACTOR;

  const laborHours =
    totalSqFt === 0 || input.laborProductionRate === 0
      ? 0
      : ((totalSqFt * input.coats) / input.laborProductionRate) * PREP_TIME_FACTOR;

  return {
    floorSqFt,
    railingSqFt,
    stairSqFt,
    totalSqFt,
    rawGallons,
    laborHours,
    materialCost: rawGallons * input.pricePerGallon,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/deck-calculator.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/deck-calculator.ts src/lib/__tests__/deck-calculator.test.ts
git commit -m "feat: add deck calculator with TDD"
```

---

## Task 5: Update Shopping List for Deck Entries

**Files:**
- Modify: `src/lib/shopping-list.ts`
- Modify: `src/lib/__tests__/shopping-list.test.ts`

- [ ] **Step 1: Add test for deck staining entries**

Add to `src/lib/__tests__/shopping-list.test.ts`:

```typescript
import { StainType, WoodCondition } from "@/lib/types";

it("includes deck staining rooms in shopping list", () => {
  const rooms: Room[] = [
    {
      ...makeRoom(),
      serviceType: ServiceType.DeckStaining,
      paintColor: "Cedar",
      paintBrand: "Cabot",
      finishType: null,
      gallonsNeeded: 3.5,
      pricePerGallon: 40,
      stainType: StainType.SemiTransparent,
      woodCondition: WoodCondition.Smooth,
      railingLinearFeet: 20,
      stairCount: 4,
    } as Room,
  ];
  const result = aggregateShoppingList(rooms);
  expect(result.length).toBe(1);
  expect(result[0].paintColor).toBe("Cedar");
  expect(result[0].totalGallons).toBe(3.5);
});
```

Note: Update the `makeRoom` helper to include defaults for `railingLinearFeet: 0`, `stairCount: 0`, `stainType: null`, `woodCondition: null`.

- [ ] **Step 2: Run tests to verify it fails**

Run: `npx vitest run src/lib/__tests__/shopping-list.test.ts`
Expected: FAIL — DeckStaining rooms are filtered out because `extractPaintEntries` doesn't handle them, and the filter requires `InteriorPaint` or `ExteriorPaint`.

- [ ] **Step 3: Update extractPaintEntries and the room filter**

In `src/lib/shopping-list.ts`, update the `ServiceType` import to include `DeckStaining`:

```typescript
import { ServiceType, FinishType, type Room } from "@/lib/types";
```

Update the filter in `aggregateShoppingList` to include DeckStaining:

```typescript
const paintRooms = rooms.filter(
  (r) =>
    r.serviceType === ServiceType.InteriorPaint ||
    r.serviceType === ServiceType.ExteriorPaint ||
    r.serviceType === ServiceType.DeckStaining
);
```

Add a deck staining branch to `extractPaintEntries`, after the trim/door section:

```typescript
  // Deck stain/paint
  if (room.serviceType === ServiceType.DeckStaining && room.paintColor && room.gallonsNeeded > 0) {
    entries.push({
      paintColor: room.paintColor,
      paintBrand: room.paintBrand,
      finishType: room.finishType ?? FinishType.Satin, // fallback for grouping key
      rawGallons: room.gallonsNeeded,
      pricePerGallon: room.pricePerGallon ?? 0,
    });
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/shopping-list.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shopping-list.ts src/lib/__tests__/shopping-list.test.ts
git commit -m "feat: include deck staining rooms in shopping list"
```

---

## Task 6: Create DeckForm Component

**Files:**
- Create: `src/components/DeckForm.tsx`

- [ ] **Step 1: Build the deck-specific form**

```tsx
"use client";

import { useState } from "react";
import {
  ServiceType,
  RoomType,
  SurfaceType,
  StainType,
  WoodCondition,
  type Room,
} from "@/lib/types";
import {
  calculateDeckEstimate,
  type DeckEstimate,
} from "@/lib/deck-calculator";
import { roundToNearestQuarterGallon } from "@/lib/paint-calculator";
import { formatCurrency, formatStainType, formatWoodCondition } from "@/lib/format";
import { usePaintPresets } from "@/hooks/useSettings";

interface DeckFormProps {
  laborRate: number;
  quoteId: string;
  onSave: (room: Omit<Room, "id" | "updatedAt">) => void;
  onCancel: () => void;
  editRoom?: Room;
  previousRoom?: Room;
}

const inputClass =
  "w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-4 py-3 text-white placeholder-white/30 text-[15px] focus:outline-none focus:border-orange-500/60 focus:bg-white/10";
const labelClass = "block text-white/50 text-[12px] font-medium mb-1.5";

const STAIN_TYPES: StainType[] = [
  StainType.Transparent,
  StainType.SemiTransparent,
  StainType.SolidPaint,
];

export default function DeckForm({
  laborRate,
  quoteId,
  onSave,
  onCancel,
  editRoom,
  previousRoom,
}: DeckFormProps) {
  const paintPresets = usePaintPresets();
  const prev = editRoom ?? previousRoom;

  const [name, setName] = useState(editRoom?.name ?? "");
  const [length, setLength] = useState(editRoom?.length?.toString() ?? "");
  const [width, setWidth] = useState(editRoom?.width?.toString() ?? "");
  const [railingFeet, setRailingFeet] = useState(editRoom?.railingLinearFeet?.toString() ?? "0");
  const [stairCount, setStairCount] = useState(editRoom?.stairCount?.toString() ?? "0");
  const [stainType, setStainType] = useState<StainType>(editRoom?.stainType ?? prev?.stainType ?? StainType.SemiTransparent);
  const [woodCondition, setWoodCondition] = useState<WoodCondition>(editRoom?.woodCondition ?? prev?.woodCondition ?? WoodCondition.Smooth);
  const [paintColor, setPaintColor] = useState(prev?.paintColor ?? "");
  const [paintBrand, setPaintBrand] = useState(prev?.paintBrand ?? "");
  const [pricePerGallon, setPricePerGallon] = useState(prev?.pricePerGallon?.toString() ?? "40");
  const [coats, setCoats] = useState(editRoom?.coats?.toString() ?? "1");
  const [error, setError] = useState("");

  // Get labor rate from WoodDeck preset
  const deckPreset = paintPresets.find((p) => p.surfaceType === SurfaceType.WoodDeck);
  const deckLaborRate = deckPreset?.laborRate ?? 120;

  // Parse inputs
  const parsedLength = parseFloat(length) || null;
  const parsedWidth = parseFloat(width) || null;
  const parsedRailing = parseFloat(railingFeet) || 0;
  const parsedStairs = parseInt(stairCount, 10) || 0;
  const parsedCoats = parseInt(coats, 10) || 1;
  const parsedPPG = parseFloat(pricePerGallon) || 0;

  // Live calculation
  const estimate: DeckEstimate = calculateDeckEstimate({
    length: parsedLength,
    width: parsedWidth,
    railingLinearFeet: parsedRailing,
    stairCount: parsedStairs,
    coats: parsedCoats,
    stainType,
    woodCondition,
    pricePerGallon: parsedPPG,
    laborProductionRate: deckLaborRate,
  });

  const gallonsNeeded = roundToNearestQuarterGallon(estimate.rawGallons);
  const laborCost = estimate.laborHours * laborRate;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    const room: Omit<Room, "id" | "updatedAt"> = {
      quoteId,
      name: name.trim(),
      serviceType: ServiceType.DeckStaining,
      roomType: RoomType.Other,
      length: parsedLength,
      width: parsedWidth,
      height: null,
      doorCount: 0,
      windowCount: 0,
      surfaceType: SurfaceType.WoodDeck,
      paintColor: paintColor.trim(),
      paintBrand: paintBrand.trim(),
      finishType: null,
      coats: parsedCoats,
      pricePerGallon: parsedPPG,
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
      paintableSqFt: estimate.totalSqFt,
      gallonsNeeded,
      ceilingGallonsNeeded: 0,
      trimGallonsNeeded: 0,
      estimatedLaborHours: estimate.laborHours,
      materialCost: estimate.materialCost,
      laborCost,
      description: "",
      manualHours: null,
      manualCost: null,
      railingLinearFeet: parsedRailing,
      stairCount: parsedStairs,
      stainType,
      woodCondition,
      sortOrder: editRoom?.sortOrder ?? Date.now(),
    };
    onSave(room);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Name */}
      <div>
        <label className={labelClass} htmlFor="df-name">
          Deck Name <span className="text-rose-400">*</span>
        </label>
        <input
          id="df-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Back Deck"
          className={inputClass}
          autoComplete="off"
        />
      </div>

      {/* Deck Dimensions */}
      <div>
        <label className={labelClass}>Deck Dimensions (ft)</label>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="number"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="Length"
              inputMode="decimal"
              className={inputClass}
            />
            <p className="text-white/30 text-[11px] mt-1 text-center">Length</p>
          </div>
          <div className="flex-1">
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="Width"
              inputMode="decimal"
              className={inputClass}
            />
            <p className="text-white/30 text-[11px] mt-1 text-center">Width</p>
          </div>
        </div>
      </div>

      {/* Railing & Stairs */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelClass} htmlFor="df-railing">
            Railing (linear ft)
          </label>
          <input
            id="df-railing"
            type="number"
            value={railingFeet}
            onChange={(e) => setRailingFeet(e.target.value)}
            min="0"
            inputMode="decimal"
            className={inputClass}
          />
          <p className="text-white/25 text-[10px] mt-1">Each side counted separately</p>
        </div>
        <div className="flex-1">
          <label className={labelClass} htmlFor="df-stairs">
            Steps
          </label>
          <input
            id="df-stairs"
            type="number"
            value={stairCount}
            onChange={(e) => setStairCount(e.target.value)}
            min="0"
            inputMode="numeric"
            className={inputClass}
          />
        </div>
      </div>

      {/* Product Type */}
      <div>
        <label className={labelClass}>Product Type</label>
        <div className="flex gap-2">
          {STAIN_TYPES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStainType(st)}
              className={`flex-1 py-3 rounded-xl text-[13px] font-medium transition-colors ${
                stainType === st
                  ? "bg-orange-500 text-white"
                  : "bg-white/[0.08] text-white/60 border border-white/[0.12]"
              }`}
            >
              {formatStainType(st)}
            </button>
          ))}
        </div>
      </div>

      {/* Wood Condition */}
      <div>
        <label className={labelClass}>Wood Condition</label>
        <div className="flex gap-2">
          {([WoodCondition.Smooth, WoodCondition.Rough] as const).map((wc) => (
            <button
              key={wc}
              type="button"
              onClick={() => setWoodCondition(wc)}
              className={`flex-1 py-3 rounded-xl text-[14px] font-medium transition-colors ${
                woodCondition === wc
                  ? "bg-orange-500 text-white"
                  : "bg-white/[0.08] text-white/60 border border-white/[0.12]"
              }`}
            >
              {formatWoodCondition(wc)}
            </button>
          ))}
        </div>
      </div>

      {/* Color, Brand, Price */}
      <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 flex flex-col gap-3">
        <p className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">Stain / Paint Details</p>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className={labelClass} htmlFor="df-color">Color</label>
            <input id="df-color" type="text" value={paintColor} onChange={(e) => setPaintColor(e.target.value)} placeholder="e.g. Cedar" className={inputClass} autoComplete="off" />
          </div>
          <div className="flex-1">
            <label className={labelClass} htmlFor="df-brand">Brand</label>
            <input id="df-brand" type="text" value={paintBrand} onChange={(e) => setPaintBrand(e.target.value)} placeholder="e.g. Cabot" className={inputClass} autoComplete="off" />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className={labelClass} htmlFor="df-coats">Coats</label>
            <div className="relative">
              <select
                id="df-coats"
                value={coats}
                onChange={(e) => setCoats(e.target.value)}
                className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-4 py-3 text-white text-[15px] focus:outline-none focus:border-orange-500/60 focus:bg-white/10 appearance-none"
              >
                {[1, 2, 3].map((n) => (<option key={n} value={n}>{n}</option>))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/40">
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <label className={labelClass} htmlFor="df-ppg">$/gal</label>
            <input id="df-ppg" type="number" value={pricePerGallon} onChange={(e) => setPricePerGallon(e.target.value)} placeholder="40" inputMode="decimal" className={inputClass} />
          </div>
        </div>
      </div>

      {/* Live Estimate */}
      {estimate.totalSqFt > 0 && (
        <div className="rounded-2xl bg-orange-500/10 border border-orange-500/20 px-4 py-4">
          <p className="text-orange-400 text-[11px] font-semibold uppercase tracking-widest mb-3">Live Estimate</p>
          <div className="flex flex-col gap-2 mb-3">
            {estimate.floorSqFt > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-white/50">Deck Floor</span>
                <span className="text-white">{Math.round(estimate.floorSqFt)} sq ft</span>
              </div>
            )}
            {estimate.railingSqFt > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-white/50">Railings</span>
                <span className="text-white">{Math.round(estimate.railingSqFt)} sq ft</span>
              </div>
            )}
            {estimate.stairSqFt > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-white/50">Stairs</span>
                <span className="text-white">{Math.round(estimate.stairSqFt)} sq ft</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 pt-2 border-t border-orange-500/15">
            <div>
              <p className="text-white/40 text-[11px]">Total Sq Ft</p>
              <p className="text-white text-[15px] font-semibold">{Math.round(estimate.totalSqFt)} sq ft</p>
            </div>
            <div>
              <p className="text-white/40 text-[11px]">Gallons Needed</p>
              <p className="text-white text-[15px] font-semibold">{gallonsNeeded} gal</p>
            </div>
            <div>
              <p className="text-white/40 text-[11px]">Labor Hours</p>
              <p className="text-white text-[15px] font-semibold">{estimate.laborHours.toFixed(1)} hrs</p>
            </div>
            <div>
              <p className="text-white/40 text-[11px]">Material Cost</p>
              <p className="text-white text-[15px] font-semibold">{formatCurrency(estimate.materialCost)}</p>
            </div>
            <div>
              <p className="text-white/40 text-[11px]">Labor Cost</p>
              <p className="text-white text-[15px] font-semibold">{formatCurrency(laborCost)}</p>
            </div>
            <div>
              <p className="text-white/40 text-[11px]">Total</p>
              <p className="text-orange-400 text-[15px] font-bold">{formatCurrency(estimate.materialCost + laborCost)}</p>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-rose-400 text-[13px] font-medium">{error}</p>}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3.5 rounded-2xl bg-white/[0.08] text-white/70 font-medium text-[15px] active:bg-white/15 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 py-3.5 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform shadow-lg shadow-orange-900/30"
        >
          {editRoom ? "Update" : "Add Deck"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/DeckForm.tsx
git commit -m "feat: add DeckForm component for deck staining jobs"
```

---

## Task 7: Wire DeckForm into RoomForm

**Files:**
- Modify: `src/components/RoomForm.tsx`

- [ ] **Step 1: Import DeckForm and add delegation**

At the top of RoomForm.tsx, add:

```typescript
import DeckForm from "@/components/DeckForm";
```

Inside the `RoomForm` component, right after the destructuring (around line 89), before any state declarations, add an early return:

```typescript
  if (serviceType === ServiceType.DeckStaining) {
    return (
      <DeckForm
        laborRate={laborRate}
        quoteId={quoteId}
        onSave={onSave}
        onCancel={onCancel}
        editRoom={editRoom}
        previousRoom={previousRoom}
      />
    );
  }
```

Also update the `PAINT_SERVICES` array to NOT include DeckStaining (it shouldn't — DeckStaining is handled by DeckForm). No change needed since `PAINT_SERVICES` only contains `InteriorPaint` and `ExteriorPaint`.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/RoomForm.tsx
git commit -m "feat: delegate to DeckForm when serviceType is DeckStaining"
```

---

## Task 8: Add DeckStaining to Quote Creation Flow

**Files:**
- Modify: `src/app/quotes/new/page.tsx`

- [ ] **Step 1: Add DeckStaining to SERVICE_TYPES array**

Change the `SERVICE_TYPES` array (line 54) to include DeckStaining:

```typescript
const SERVICE_TYPES: ServiceType[] = [
  ServiceType.InteriorPaint,
  ServiceType.ExteriorPaint,
  ServiceType.DeckStaining,
  ServiceType.PowerWashing,
  ServiceType.Handyman,
];
```

- [ ] **Step 2: Add icon for DeckStaining**

Add to the `SERVICE_TYPE_ICONS` record:

```typescript
  [ServiceType.DeckStaining]: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 20h20M4 16h16M4 16V10l8-6 8 6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M4 20v-4M20 20v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M8 16v4M12 16v4M16 16v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="1 2"/>
    </svg>
  ),
```

- [ ] **Step 3: Verify it compiles and test in browser**

Run: `npx tsc --noEmit 2>&1 | head -20`
Navigate to `/quotes/new`, select a customer, and verify "Deck Staining" appears in the service type list.

- [ ] **Step 4: Commit**

```bash
git add src/app/quotes/new/page.tsx
git commit -m "feat: add Deck Staining to quote creation service type picker"
```

---

## Task 9: Run Full Test Suite and Verify

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 2: Run TypeScript type checking**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Smoke test in browser**

Run: `npx next dev -p 3001`
Verify:
1. "Deck Staining" appears in the service type picker on new quote page
2. Selecting it shows the DeckForm with deck dimensions, railing, stairs, product type, wood condition
3. Live estimate shows floor/railing/stairs breakdown
4. Saving a deck room works and appears in the quote summary
5. Shopping list includes deck stain entries

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during deck staining smoke test"
```
