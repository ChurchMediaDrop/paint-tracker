import { RoomType } from "@/lib/types";

export const DOOR_SQ_FT = 20;
export const WINDOW_SQ_FT = 15;
export const WASTE_FACTOR = 1.10;
export const PREP_TIME_FACTOR = 1.15;

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
    case RoomType.WallsAndCeiling:
      rawArea = 2 * (l + w) * h + l * w;
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

export function calculateGallonsNeeded(paintableSqFt: number, coats: number, coverageRate: number): number {
  if (paintableSqFt === 0 || coverageRate === 0) return 0;
  return ((paintableSqFt * coats) / coverageRate) * WASTE_FACTOR;
}

export function roundToNearestQuarterGallon(gallons: number): number {
  return Math.ceil(gallons * 4) / 4;
}

export function calculateLaborHours(paintableSqFt: number, coats: number, laborProductionRate: number): number {
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
