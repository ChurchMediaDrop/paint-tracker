import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import {
  SurfaceType,
  MessageChannel,
  type PaintPreset,
  type MessageTemplate,
  type AppSettings,
} from "@/lib/types";

const DEFAULT_PRESETS: Omit<PaintPreset, "updatedAt">[] = [
  { id: "preset-smooth-drywall", surfaceType: SurfaceType.SmoothDrywall, coverageRate: 375, laborRate: 175, isDefault: true },
  { id: "preset-textured-walls", surfaceType: SurfaceType.TexturedWalls, coverageRate: 275, laborRate: 120, isDefault: true },
  { id: "preset-ceiling", surfaceType: SurfaceType.Ceiling, coverageRate: 375, laborRate: 150, isDefault: true },
  { id: "preset-trim-baseboard", surfaceType: SurfaceType.TrimBaseboard, coverageRate: 400, laborRate: 80, isDefault: true },
  { id: "preset-cabinets", surfaceType: SurfaceType.Cabinets, coverageRate: 375, laborRate: 60, isDefault: true },
  { id: "preset-exterior-siding", surfaceType: SurfaceType.ExteriorSiding, coverageRate: 350, laborRate: 150, isDefault: true },
  { id: "preset-stucco", surfaceType: SurfaceType.Stucco, coverageRate: 200, laborRate: 100, isDefault: true },
  { id: "preset-brick", surfaceType: SurfaceType.Brick, coverageRate: 250, laborRate: 90, isDefault: true },
  { id: "preset-wood-deck", surfaceType: SurfaceType.WoodDeck, coverageRate: 300, laborRate: 120, isDefault: true },
];

const DEFAULT_TEMPLATES: Omit<MessageTemplate, "updatedAt">[] = [
  {
    id: "template-quote-sent",
    name: "Quote Sent",
    channel: MessageChannel.SMS,
    subject: "",
    body: "Hi {customer_name}, here's your quote for {service_type} at {job_address}: ${job_total}. Let me know if you have any questions!",
    isDefault: true,
  },
  {
    id: "template-quote-followup",
    name: "Quote Follow-up",
    channel: MessageChannel.SMS,
    subject: "",
    body: "Hi {customer_name}, just following up on the quote I sent for {service_type}. Happy to answer any questions.",
    isDefault: true,
  },
  {
    id: "template-appointment-reminder",
    name: "Appointment Reminder",
    channel: MessageChannel.SMS,
    subject: "",
    body: "Hi {customer_name}, just a reminder I'll be at {job_address} on {scheduled_date}. See you then!",
    isDefault: true,
  },
  {
    id: "template-job-complete",
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

let seeded = false;

export function resetSeedFlag(): void {
  seeded = false;
}

export async function seedDatabase(): Promise<void> {
  if (seeded) return;
  seeded = true;

  const now = new Date().toISOString();

  // Use bulkPut with deterministic IDs — safe to call on every page load
  const existingPresets = await db.paintPresets.count();
  if (existingPresets === 0) {
    await db.paintPresets.bulkPut(
      DEFAULT_PRESETS.map((p) => ({ ...p, updatedAt: now }))
    );
  }

  const existingTemplates = await db.messageTemplates.count();
  if (existingTemplates === 0) {
    await db.messageTemplates.bulkPut(
      DEFAULT_TEMPLATES.map((t) => ({ ...t, updatedAt: now }))
    );
  }

  await db.appSettings.put(DEFAULT_SETTINGS);
}
