import {
  DOOR_SQ_FT,
  WINDOW_SQ_FT,
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
    const doorDeduction = input.includeDoors ? 0 : input.doorCount * DOOR_SQ_FT;
    const wallSqFt = Math.max(0, rawWallArea - doorDeduction - windowDeduction);
    walls = estimateComponent(
      wallSqFt, input.coats, input.wallCoverageRate, input.wallLaborRate, input.wallPricePerGallon
    );
  }

  if (input.includeCeiling) {
    ceiling = estimateComponent(
      l * w, input.coats, input.ceilingCoverageRate, input.ceilingLaborRate, input.ceilingPricePerGallon
    );
  }

  if (input.includeTrim) {
    trim = estimateComponent(
      calculateTrimArea(input.length, input.width), input.coats, input.trimCoverageRate, input.trimLaborRate, input.trimPricePerGallon
    );
  }

  if (input.includeDoors) {
    doors = estimateComponent(
      calculateDoorArea(input.doorCount), input.coats, input.trimCoverageRate, input.trimLaborRate, input.trimPricePerGallon
    );
  }

  const components = [walls, ceiling, trim, doors].filter(
    (c): c is ComponentEstimate => c !== null
  );

  return {
    walls, ceiling, trim, doors,
    totalPaintableSqFt: components.reduce((s, c) => s + c.paintableSqFt, 0),
    totalRawGallons: components.reduce((s, c) => s + c.rawGallons, 0),
    totalLaborHours: components.reduce((s, c) => s + c.laborHours, 0),
    totalMaterialCost: components.reduce((s, c) => s + c.materialCost, 0),
  };
}
