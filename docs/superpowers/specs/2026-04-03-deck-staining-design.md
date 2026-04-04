# Deck Staining/Painting Feature

**Date:** 2026-04-03
**Status:** Approved

---

## Overview

Add a new service type for deck staining and painting jobs. Deck jobs have unique calculation requirements — floor area, railing with spindles, and stairs — each using industry-standard multipliers. Product types (transparent/semi-transparent/solid stain & paint) affect coverage rates, and wood condition (smooth vs rough) further adjusts the estimate.

---

## Data Model Changes

### New ServiceType enum value

Add `DeckStaining = "deck_staining"` to the `ServiceType` enum in `src/lib/types.ts`.

### New StainType enum

```typescript
export enum StainType {
  Transparent = "transparent",
  SemiTransparent = "semi_transparent",
  SolidPaint = "solid_paint",
}
```

### New WoodCondition enum

```typescript
export enum WoodCondition {
  Smooth = "smooth",
  Rough = "rough",
}
```

### New fields on Room interface

Add to the `Room` interface:

- `railingLinearFeet: number` — linear feet of railing (default 0)
- `stairCount: number` — number of steps (default 0)
- `stainType: StainType | null` — product type selection
- `woodCondition: WoodCondition | null` — affects coverage rate

These fields are only used when `serviceType === DeckStaining`. All other service types ignore them.

### Supabase schema

Add to the `rooms` table:

```sql
railing_linear_feet REAL DEFAULT 0,
stair_count INTEGER DEFAULT 0,
stain_type TEXT,
wood_condition TEXT,
```

### Dexie migration

Version 4: backfill new Room fields with defaults for existing records.

---

## Calculation Logic

### Area calculation

- **Floor area** = `length * width`
- **Railing area** = `railingLinearFeet * 6` (industry standard: 6 sq ft per linear foot covers both sides, spindles, posts, top/bottom rails for standard 36" railing)
- **Stair area** = `stairCount * 5.5` (covers tread + riser + stringer share)
- **Total paintable sq ft** = floor + railing + stairs

### Coverage rates (sq ft per gallon)

| StainType | Smooth Wood | Rough/Weathered Wood |
|---|---|---|
| Transparent | 300 | 200 |
| Semi-Transparent | 250 | 175 |
| Solid Stain & Paint | 200 | 150 |

### Gallons calculation

```
rawGallons = (totalSqFt * coats) / coverageRate * WASTE_FACTOR
```

Where `coverageRate` is determined by `stainType` + `woodCondition`.

### Labor calculation

Uses the existing `WoodDeck` surface type preset for labor production rate (default: 120 sq ft/hr).

```
laborHours = (totalSqFt * coats) / laborProductionRate * PREP_TIME_FACTOR
```

### Cost calculation

- Material cost = `rawGallons * pricePerGallon`
- Labor cost = `laborHours * laborRate`

---

## UI: Quote Creation Flow

### Service Type Picker

Add "Deck Staining" as a new option in the service type grid on the new quote page (`src/app/quotes/new/page.tsx`). Needs an icon and color treatment consistent with the existing tiles.

---

## UI: Deck Room Form

When `serviceType === DeckStaining`, the RoomForm shows a deck-specific layout instead of the interior/exterior paint layout.

### Form fields

1. **Room Name** — text input (e.g., "Back Deck", "Front Porch")

2. **Deck Dimensions** — Length (ft) + Width (ft) inputs

3. **Railing** — Linear feet input (default 0), with helper text: "Total railing length, both sides counted separately"

4. **Stairs** — Number of steps input (default 0)

5. **Product Type** — Toggle buttons or segmented control:
   - Transparent Stain
   - Semi-Transparent Stain
   - Solid Stain & Paint

6. **Wood Condition** — Two-option toggle:
   - New/Smooth
   - Weathered/Rough

7. **Stain/Paint Details** — Color, Brand, Price per gallon (same pattern as wall paint)

8. **Coats** — Selector, default 1

### Live Estimate Preview

Shows per-component breakdown:

- Floor: X sq ft
- Railings: X sq ft
- Stairs: X sq ft
- **Total: X sq ft, Y gal, Z hrs**
- Material Cost / Labor Cost / Total

---

## Shopping List Integration

Deck stain/paint entries aggregate into the shopping list using the same `color + brand + stainType` grouping key. They appear as separate line items from interior/exterior paint since the product type differs.

The `extractPaintEntries` function in `shopping-list.ts` needs a new branch for `DeckStaining` rooms that reads `paintColor`, `paintBrand`, `stainType` (as the finish identifier), and the room's `gallonsNeeded`.

---

## Format Helpers

Add to `src/lib/format.ts`:

- `formatStainType(stainType: StainType): string` — "Transparent", "Semi-Transparent", "Solid / Paint"
- `formatWoodCondition(condition: WoodCondition): string` — "New/Smooth", "Weathered/Rough"
- `formatServiceType` — add case for `DeckStaining` → "Deck Staining"

---

## Files Affected

- `src/lib/types.ts` — ServiceType enum, StainType enum, WoodCondition enum, Room interface
- `src/lib/db.ts` — Dexie version 4 migration
- `supabase-schema.sql` — new columns on rooms table
- `src/lib/format.ts` — formatStainType, formatWoodCondition, formatServiceType update
- `src/lib/deck-calculator.ts` — new module: deck area calculations, coverage rate lookup
- `src/lib/__tests__/deck-calculator.test.ts` — tests for deck calculations
- `src/lib/shopping-list.ts` — handle DeckStaining rooms in extractPaintEntries
- `src/components/RoomForm.tsx` — deck-specific form layout when serviceType is DeckStaining
- `src/app/quotes/new/page.tsx` — add DeckStaining to service type picker
- `src/lib/seed-data.ts` — ensure WoodDeck preset exists (already does)
