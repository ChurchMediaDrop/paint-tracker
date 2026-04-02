# Paint Tracker: Trim/Door Calculations, Calendar UX, Dashboard Pipeline, Google Calendar

**Date:** 2026-04-02
**Status:** Approved

---

## Feature 1: Trim & Door Calculations

### Overview

Extend the room entry form to support painting trim (baseboards) and doors as toggleable options alongside walls and ceiling. Each component calculates its own paintable area, gallons, and labor independently, enabling accurate per-component estimates and a merged shopping list.

### Data Model Changes

Add to the `Room` interface and Dexie/Supabase schema:

- `includeTrim` (boolean, default false) — whether trim/baseboard is being painted
- `includeDoors` (boolean, default false) — whether doors are being painted
- `ceilingColor` (string, default "") — ceiling paint color
- `ceilingBrand` (string, default "") — ceiling paint brand
- `ceilingFinish` (FinishType | null, default Flat) — ceiling finish type
- `ceilingPricePerGallon` (number | null) — ceiling paint price
- `trimColor` (string, default "") — trim/door paint color
- `trimBrand` (string, default "") — trim/door paint brand
- `trimFinish` (FinishType | null, default SemiGloss) — trim/door finish type
- `trimPricePerGallon` (number | null) — trim/door paint price

The existing `paintColor`, `paintBrand`, `finishType`, and `pricePerGallon` fields become the **walls** paint fields.

### UI: RoomForm Toggle Buttons

The "What to Paint" row (interior only) expands from 2 to 4 toggle buttons:

**Walls | Ceiling | Trim | Doors**

- Any combination is valid as long as at least one is selected
- Exterior rooms keep the current single-surface behavior

### UI: Per-Component Paint Sections

Below the toggles, a paint details section appears for each active group:

1. **Walls section** (if Walls toggled): color, brand, finish (default Eggshell), price/gal
2. **Ceiling section** (if Ceiling toggled): color (default "White"), brand, finish (default Flat), price/gal
3. **Trim/Doors section** (if Trim or Doors toggled): color, brand, finish (default Semi-Gloss), price/gal

Trim and doors share paint fields because they almost always use the same paint.

### Calculation Logic

#### Trim area
- Perimeter = `2 * (length + width)` feet
- Baseboard paintable area = `perimeter * 0.5` sq ft (6-inch baseboard height)
- Coverage rate and labor rate from the `TrimBaseboard` surface type preset

#### Door area
- Paintable area = `doorCount * 20` sq ft (existing `DOOR_SQ_FT` constant)
- When doors are included for painting, they are **not deducted** from wall area
- Doors reuse the `TrimBaseboard` surface type preset for coverage rate and labor rate (trim and doors have similar painting characteristics). No new surface type needed.

#### Combined calculation
Each component (walls, ceiling, trim, doors) calculates independently:
- Its own paintable sq ft
- Its own raw gallons = `(area * coats) / coverageRate * WASTE_FACTOR`
- Its own labor hours = `(area * coats) / laborProductionRate * PREP_TIME_FACTOR`
- Its own material cost = `rawGallons * pricePerGallon` (note: raw, not rounded — rounding happens at shopping list level)

Room totals sum all components for the Live Estimate preview.

#### Door deduction rule
- If `includeDoors` is true: doors are **not deducted** from wall area (you're painting them)
- If `includeDoors` is false: doors **are deducted** from wall area (current behavior)

### Live Estimate Preview

When multiple components are active, the preview breaks down per component:

- Walls: X sq ft, Y gal
- Ceiling: X sq ft, Y gal
- Trim: X sq ft, Y gal
- Doors: X sq ft, Y gal
- **Total: X sq ft, Y gal, Z hrs**
- Material Cost / Labor Cost / Room Total

### Shopping List: Quote-Level Gallon Aggregation

Gallons are aggregated at the **quote level**, not per-room:

1. Each room stores **raw (unrounded) gallons** per paint group
2. Group across all rooms by **color + brand + finish** (the unique paint identity)
3. Sum raw gallons per group
4. Round **once** at the group level (nearest quarter gallon)
5. Display with purchase size recommendations

Example: Two rooms each need 0.4 gal of "Swiss Coffee, Eggshell" = 0.8 raw = **1.0 gal** total, not 2 separate gallons.

The shopping list shows separate lines per paint identity:
- "White, Sherwin-Williams, Flat — 2.75 gal" (ceilings)
- "Swiss Coffee, Sherwin-Williams, Eggshell — 6.5 gal" (walls)
- "Swiss Coffee, Sherwin-Williams, Semi-Gloss — 2.0 gal" (trim + doors)

### Auto-Fill From Previous Room

When adding a new room to a quote, the form pre-fills paint details from the **most recently added room** in the same quote:
- Wall color, brand, finish, price/gal
- Ceiling color, brand, finish, price/gal
- Trim/door color, brand, finish, price/gal
- Toggle states (which components are selected)

The user can change anything. This covers the common case where most rooms in a house use the same paint.

---

## Feature 2: Calendar & Scheduling UX

### Fix: Back Button on Schedule Page

Add `showBack` prop to the `AppShell` component on the schedule page. Currently missing.

### Schedule From Calendar: Floating "+" Button

A floating action button in the bottom-right corner of the schedule page. Tapping it opens a bottom sheet:

1. **Unscheduled jobs list** — jobs with empty `scheduledDate`, showing customer name + service type
2. Tap a job to select it
3. **Date/time picker** pre-filled with the currently selected calendar day
4. **"Schedule" button** to save the date and close the sheet

If no unscheduled jobs exist, show empty state: "No unscheduled jobs" with a link to create a new job.

After scheduling, the calendar updates automatically via Dexie live queries.

### Better Scheduling on Job Detail Page

When `scheduledDate` is empty, replace the quiet "Not scheduled" text with a prominent **"Schedule Job"** button (styled like the existing "Message Customer" button). Tapping opens the same datetime-local picker with save/cancel.

When already scheduled, show the current date/time with the existing "Edit" link.

---

## Feature 3: Dashboard Pipeline

### Overview

Replace the current dashboard with an actionable overview of jobs that need attention, plus today's schedule.

### Pipeline Cards

Three cards at the top of the dashboard, one per pre-work status:

1. **Leads** — jobs with status `Lead`. New inquiries, no quote yet.
2. **Quoted** — jobs with status `Quoted`. Quote sent, awaiting customer response.
3. **Needs Scheduling** — jobs with any active status (`Lead`, `Quoted`, `Scheduled`, `InProgress`) that have an empty `scheduledDate`. These are jobs that exist but haven't been put on the calendar yet.

Each card shows:
- Status label and job **count** as a badge
- Preview of the most recent 2-3 customer names
- Tap the card to see a filtered list of those jobs
- Tap a job to go to the job detail page

### Today's Schedule Section

Below the pipeline cards, a **"Today"** section showing a compact list of jobs scheduled for today:
- Customer name, service type, time
- Tap to go to job detail
- "View full schedule" link to the schedule page

If no jobs today, show "Nothing scheduled for today."

---

## Feature 4: Google Calendar Sync

### Priority

Lowest priority. Infrastructure code exists; needs credentials and UI wiring.

### Google Cloud Setup

1. Create project in Google Cloud Console (or reuse existing)
2. Enable Google Calendar API
3. Configure OAuth consent screen (external, testing mode)
4. Create OAuth 2.0 Client ID (web application)
5. Add authorized JavaScript origins (localhost + production domain)

### Environment Variable

Add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to `.env.local`. The existing `google-calendar.ts` client uses `initGoogleCalendar(clientId)`.

### Settings UI

Google Calendar section on the Settings page:
- **Not connected**: "Connect Google Calendar" button triggers OAuth via `requestAccessToken()`
- **Connected**: Shows "Connected" status with "Disconnect" button
- State stored in `AppSettings.googleCalendarConnected` and `AppSettings.googleCalendarToken` (already in schema)

### Sync Behavior

Already implemented in `useCalendarSync` hook. Processes the `calendarSyncQueue` table when online and connected. Jobs automatically create/update/delete Google Calendar events. No additional sync logic needed.

---

## Implementation Priority

1. **Trim & door calculations** — largest feature, most value
2. **Calendar & scheduling UX** — back button fix + scheduling flow
3. **Dashboard pipeline** — new dashboard layout
4. **Google Calendar** — wire existing code to credentials + settings UI

---

## Files Affected

### Feature 1 (Trim/Doors)
- `src/lib/types.ts` — Room interface, new fields
- `src/lib/paint-calculator.ts` — new calculation functions for trim/doors, component-level calculations
- `src/lib/paint-calculator.test.ts` — tests for new calculations
- `src/components/RoomForm.tsx` — toggle buttons, per-component paint sections, auto-fill
- `src/components/QuoteSummary.tsx` — quote-level gallon aggregation, shopping list grouping
- `src/lib/db.ts` — Dexie schema version bump, new fields
- `supabase-schema.sql` — new columns on rooms table

### Feature 2 (Calendar)
- `src/app/schedule/page.tsx` — back button, floating "+" button, schedule bottom sheet
- `src/app/jobs/[id]/JobDetailClient.tsx` — prominent "Schedule Job" button

### Feature 3 (Dashboard)
- `src/app/page.tsx` — pipeline cards, today's schedule section

### Feature 4 (Google Calendar)
- `src/app/settings/page.tsx` — connect/disconnect UI
- `src/components/Providers.tsx` — init Google Calendar with env var
- `.env.local` — `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
