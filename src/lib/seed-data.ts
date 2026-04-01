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
