import { ServiceType, JobStatus, FinishType, SurfaceType, StainType, WoodCondition } from "@/lib/types";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function formatDate(isoString: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.InteriorPaint]: "Interior Paint",
  [ServiceType.ExteriorPaint]: "Exterior Paint",
  [ServiceType.PowerWashing]: "Power Washing",
  [ServiceType.Handyman]: "Handyman",
  [ServiceType.DeckStaining]: "Deck Staining",
};
export function formatServiceType(type: ServiceType): string { return SERVICE_TYPE_LABELS[type] ?? type; }

const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  [JobStatus.Lead]: "Lead",
  [JobStatus.Quoted]: "Quoted",
  [JobStatus.Scheduled]: "Scheduled",
  [JobStatus.InProgress]: "In Progress",
  [JobStatus.Complete]: "Complete",
  [JobStatus.Paid]: "Paid",
};
export function formatJobStatus(status: JobStatus): string { return JOB_STATUS_LABELS[status] ?? status; }

const FINISH_TYPE_LABELS: Record<FinishType, string> = {
  [FinishType.Flat]: "Flat",
  [FinishType.Eggshell]: "Eggshell",
  [FinishType.Satin]: "Satin",
  [FinishType.SemiGloss]: "Semi-Gloss",
  [FinishType.Gloss]: "Gloss",
};
export function formatFinishType(type: FinishType): string { return FINISH_TYPE_LABELS[type] ?? type; }

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
export function formatSurfaceType(type: SurfaceType): string { return SURFACE_TYPE_LABELS[type] ?? type; }

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
