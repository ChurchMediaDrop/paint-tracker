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
  WallsAndCeiling = "walls_and_ceiling",
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
  paintableSqFt: number;
  gallonsNeeded: number;
  ceilingGallonsNeeded: number;
  trimGallonsNeeded: number;
  estimatedLaborHours: number;
  materialCost: number;
  laborCost: number;
  description: string;
  manualHours: number | null;
  manualCost: number | null;
  sortOrder: number;
  updatedAt: string;
}

export interface Actuals {
  id: string;
  jobId: string;
  actualHours: number;
  actualMaterialsCost: number;
  actualGallonsUsed: number;
  notes: string;
  completedAt: string;
  updatedAt: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  channel: MessageChannel;
  subject: string;
  body: string;
  isDefault: boolean;
  updatedAt: string;
}

export interface PaintPreset {
  id: string;
  surfaceType: SurfaceType;
  coverageRate: number;
  laborRate: number;
  isDefault: boolean;
  updatedAt: string;
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
