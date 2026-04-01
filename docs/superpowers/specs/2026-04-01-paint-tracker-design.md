# Paint Tracker — Design Spec

## Overview

Paint Tracker is a Progressive Web App (PWA) for a solo painting contractor to manage customers, jobs, quotes, and scheduling from his iPhone. It replaces notebooks and spreadsheets with a mobile-first tool that works fully offline.

The user does interior painting, exterior painting, power washing, and handyman repairs.

## Goals

1. **Organization** — Know who's scheduled when, what's coming up, track all customers and job history
2. **Accurate quoting** — Room-by-room estimating with paint calculations, labor estimates, and material lists
3. **Learn over time** — Track quoted vs actual hours/materials to improve future estimates
4. **Keep it simple** — Easier than notebooks, not harder. Zero infrastructure cost.

## Non-Goals

- Payment processing
- Customer-facing portal or login
- Crew management or multi-user
- Accounting or tax features
- Any server-side infrastructure

## Architecture

### Purely Client-Side PWA

- **No backend.** Everything runs in the browser and lives on the device.
- **Next.js** static export — generates a fully static site
- **Tailwind CSS** — mobile-first styling, professionally designed
- **IndexedDB via Dexie.js** — all data stored locally on device
- **Service Worker** — caches app shell and assets for full offline functionality
- **Hosted on GitHub Pages or Cloudflare Pages** — free static hosting, $0/month

### Google Calendar Integration

- Google Calendar API called directly from the browser
- OAuth2 flow to connect his Google account (one-time setup)
- When a job is created/updated/deleted, the corresponding Google Calendar event is created/updated/deleted
- Uses a Google Cloud project with Calendar API enabled (free tier, no cost for personal use)
- OAuth client ID configured for the PWA's hosted domain
- Token stored in IndexedDB, refreshed as needed

### Backup & Restore

- "Export Data" button dumps the entire IndexedDB database as a JSON file
- User can save this to iCloud Files, email it, or store wherever they want
- "Import Data" button restores from a previously exported JSON file
- App shows a periodic reminder (e.g. monthly) to back up data
- Export includes a version number for forward-compatible imports

## Data Model

### Customer

| Field | Type | Notes |
|-------|------|-------|
| id | string (UUID) | Primary key |
| name | string | Required |
| phone | string | Optional |
| email | string | Optional |
| address | string | Optional |
| notes | string | e.g. "has a dog", "prefers mornings" |
| createdAt | ISO datetime | Auto-set |
| updatedAt | ISO datetime | Auto-set |

### Job

| Field | Type | Notes |
|-------|------|-------|
| id | string (UUID) | Primary key |
| customerId | string | FK to Customer |
| serviceType | enum | Interior Paint, Exterior Paint, Power Washing, Handyman |
| status | enum | Lead, Quoted, Scheduled, In Progress, Complete, Paid |
| scheduledDate | ISO datetime | When the job is scheduled |
| estimatedDuration | number | Hours |
| address | string | Defaults to customer address, can override |
| notes | string | Job-specific notes |
| googleCalendarEventId | string | For sync, nullable |
| createdAt | ISO datetime | Auto-set |
| updatedAt | ISO datetime | Auto-set |

### Quote

| Field | Type | Notes |
|-------|------|-------|
| id | string (UUID) | Primary key |
| jobId | string | FK to Job |
| laborRate | number | $/hour for this quote |
| markupPercent | number | Applied to total |
| totalMaterials | number | Calculated sum |
| totalLabor | number | Calculated sum |
| totalPrice | number | With markup applied |
| createdAt | ISO datetime | Auto-set |
| updatedAt | ISO datetime | Auto-set |

### Room (Quote Line Item)

| Field | Type | Notes |
|-------|------|-------|
| id | string (UUID) | Primary key |
| quoteId | string | FK to Quote |
| name | string | e.g. "Master Bedroom", "North exterior wall" |
| serviceType | enum | Interior Paint, Exterior Paint, Power Washing, Handyman |
| length | number | Feet, nullable (not needed for handyman) |
| width | number | Feet, nullable |
| height | number | Feet, nullable |
| doorCount | number | Standard doors (~20 sq ft each) |
| windowCount | number | Standard windows (~15 sq ft each) |
| surfaceType | enum | Smooth Drywall, Textured, Exterior Siding, Stucco, Brick, Wood, etc. |
| paintColor | string | Color name or code |
| paintBrand | string | e.g. "Benjamin Moore", "Sherwin-Williams" |
| finishType | enum | Flat, Eggshell, Satin, Semi-Gloss, Gloss |
| coats | number | Default 2 |
| roomType | enum | Walls, Ceiling, Exterior, Other — determines calculation method |
| pricePerGallon | number | User enters for this paint/color |
| paintableSqFt | number | Calculated |
| gallonsNeeded | number | Calculated |
| estimatedLaborHours | number | Calculated |
| materialCost | number | Calculated or manual entry |
| laborCost | number | Calculated |
| description | string | For non-paint items (handyman, power washing) |
| manualHours | number | For non-paint items |
| manualCost | number | For non-paint items |
| sortOrder | number | Display order within quote |

### Actuals

| Field | Type | Notes |
|-------|------|-------|
| id | string (UUID) | Primary key |
| jobId | string | FK to Job |
| actualHours | number | Total hours worked |
| actualMaterialsCost | number | What was actually spent |
| actualGallonsUsed | number | Paint gallons used |
| notes | string | What differed from estimate |
| completedAt | ISO datetime | When job was finished |

### MessageTemplate

| Field | Type | Notes |
|-------|------|-------|
| id | string (UUID) | Primary key |
| name | string | e.g. "Quote Follow-up" |
| channel | enum | SMS, Email |
| subject | string | Email subject line (nullable for SMS) |
| body | string | With placeholders: {customer_name}, {job_total}, {scheduled_date}, {job_address}, {service_type} |
| isDefault | boolean | Pre-built templates shipped with app |

### PaintPreset

| Field | Type | Notes |
|-------|------|-------|
| id | string (UUID) | Primary key |
| surfaceType | string | e.g. "Smooth Drywall" |
| coverageRate | number | Sq ft per gallon |
| laborRate | number | Sq ft per hour |
| isDefault | boolean | Ships with app, user can customize |

### CalendarSyncQueue

| Field | Type | Notes |
|-------|------|-------|
| id | string (UUID) | Primary key |
| jobId | string | FK to Job |
| operation | enum | Create, Update, Delete |
| payload | JSON | Event data to sync |
| createdAt | ISO datetime | When queued |

Pending operations are processed in order when connectivity is restored. Successfully synced entries are deleted.

Default presets:

| Surface Type | Coverage (sq ft/gal) | Labor (sq ft/hr) |
|---|---|---|
| Smooth Drywall | 375 | 175 |
| Textured Walls | 275 | 120 |
| Ceiling | 375 | 150 |
| Trim/Baseboard | 400 | 80 |
| Cabinets | 375 | 60 |
| Exterior Siding | 350 | 150 |
| Stucco | 200 | 100 |
| Brick | 250 | 90 |
| Wood/Deck | 300 | 120 |

## UI Design

### Layout: Hub & Spoke

Home screen with large, colorful tile buttons. Tap into a section, back button to return. No persistent bottom nav.

### Home Screen Tiles

1. **Schedule** — Today's jobs and upcoming week
2. **Customers** — Customer list with search
3. **New Quote** — Start a new estimate
4. **Calculator** — Standalone paint calculator
5. Quick stats bar at bottom: open quotes count, month's revenue, jobs completed

### Key Screens

**Schedule View**
- Day/week toggle
- Each job shows: time, customer name, service type, status badge
- Tap a job to see details, change status, view quote

**Customer List**
- Search bar at top
- Each row: name, phone, last job date
- Tap to see customer detail: contact info, notes, full job history

**Customer Detail**
- Contact info with tap-to-call and tap-to-text
- Job history list (most recent first)
- "Send Message" button → template picker

**New Quote Flow**
1. Select or create customer
2. Add rooms/areas one at a time:
   - For paint: room name → dimensions → doors/windows → color, brand, finish, coats → see calculated gallons, hours, cost
   - For power washing/handyman: description → estimated hours → material cost
3. Review screen:
   - All rooms listed with individual costs
   - Shopping list: gallons grouped by color + finish (e.g. "3.2 gal Revere Pewter, Eggshell")
   - Total breakdown: materials, labor, markup, final price
4. "Send Quote" → template picker → opens SMS/email
5. Save creates the Job in "Quoted" status

**Job Detail**
- Status badge with tap to advance (Lead → Quoted → Scheduled → In Progress → Complete → Paid)
- Scheduled date/time (tap to edit, syncs to Google Calendar)
- Quote summary
- "Log Actuals" button (visible when Complete): enter actual hours, materials cost, gallons
- After logging actuals, shows comparison: quoted vs actual hours, cost, gallons

**Standalone Calculator**
- Enter room dimensions (length, width, height)
- Pick surface type, coats
- Subtract doors/windows
- Shows: paintable sq ft, gallons needed, estimated labor hours
- "Add to Quote" button to roll into a formal quote

**Settings**
- Default labor rate ($/hour)
- Default markup percentage
- Paint presets (view/edit coverage and labor rates)
- Message templates (view/edit/create)
- Google Calendar connection
- Export/Import data
- Backup reminder frequency

### Templated Messaging

Pre-built templates that ship with the app:

1. **Quote Sent** — "Hi {customer_name}, here's your quote for {service_type} at {job_address}: ${job_total}. Let me know if you have any questions!"
2. **Quote Follow-up** — "Hi {customer_name}, just following up on the quote I sent for {service_type}. Happy to answer any questions."
3. **Appointment Reminder** — "Hi {customer_name}, just a reminder I'll be at {job_address} on {scheduled_date}. See you then!"
4. **Job Complete** — "Hi {customer_name}, the {service_type} at {job_address} is all done. Let me know if you'd like to do a walk-through!"

Tapping "Send" opens the native iOS SMS compose or email compose with the message pre-filled via `sms:` or `mailto:` URL schemes. User just taps send.

Custom templates can be created in Settings.

## Paint Calculator Logic

### Paintable Area Calculation

```
wallArea = 2 * (length + width) * height
doorDeduction = doorCount * 20  // sq ft per standard door
windowDeduction = windowCount * 15  // sq ft per standard window
paintableSqFt = wallArea - doorDeduction - windowDeduction
```

For ceilings: `paintableSqFt = length * width`
For exterior/flat surfaces: user enters sq ft directly or uses length * height

### Gallons Needed

```
coverageRate = preset[surfaceType].coverageRate  // sq ft per gallon
rawGallons = (paintableSqFt * coats) / coverageRate
gallonsNeeded = rawGallons * 1.10  // 10% waste factor
```

Round up to nearest quarter gallon for purchasing.

### Labor Hours

```
laborProductionRate = preset[surfaceType].laborRate  // sq ft per hour
laborHours = (paintableSqFt * coats) / laborProductionRate
```

Add 15% for prep time (taping, covering, setup/cleanup).

### Cost Calculation

```
materialCost = gallonsNeeded * pricePerGallon  // user enters price per gallon
laborCost = laborHours * hourlyRate  // from settings or quote-level override
subtotal = materialCost + laborCost
total = subtotal * (1 + markupPercent / 100)
```

### Shopping List Aggregation

Across all rooms in a quote, group gallons by (color + finish + brand):
- "3.2 gal — Revere Pewter, Eggshell, Benjamin Moore"
- "1.1 gal — Simply White, Semi-Gloss, Benjamin Moore"
- "0.8 gal — Primer, Flat, Kilz"

Round each to nearest purchasable size (quart = 0.25 gal, gallon = 1.0 gal, 5-gallon bucket = 5.0 gal).

## Quoted vs Actual Tracking

After completing a job, the user logs actual hours, materials cost, and gallons used. The app stores this alongside the original quote.

On the Job Detail screen, a comparison view shows:
- Quoted hours vs actual hours (and % difference)
- Quoted materials cost vs actual cost
- Quoted gallons vs actual gallons

Over time, the Settings screen shows aggregate accuracy stats:
- Average hours variance by service type
- Average materials variance by service type
- This helps the user calibrate their labor rates and coverage assumptions

## Offline Behavior

- The entire app works offline. All data reads and writes go to IndexedDB.
- The service worker caches the full app shell (HTML, JS, CSS, images) on first load.
- Google Calendar sync only happens when online. If offline, calendar operations are queued and executed when connectivity returns.
- A small indicator in the app header shows online/offline status.

## Hosting

- **Static export** from Next.js (`next export` or `output: 'export'`)
- Deploy to **GitHub Pages** or **Cloudflare Pages** — both free
- Custom domain optional (e.g. painttracker.yourdomain.com)
- HTTPS required for service worker and PWA install — both platforms provide this free

## Future Enhancements (Post-MVP)

These are explicitly out of scope for the initial build but noted for later:

- Photo documentation (before/after per job)
- Simple income tracking (paid/unpaid totals)
- Seasonal analytics (busiest months, average job size)
- Weather check integration for exterior jobs
- Recurring customer reminders ("Last painted 3 years ago")
- iCloud automatic backup integration
