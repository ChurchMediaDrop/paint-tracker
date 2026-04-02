import { ServiceType, FinishType, type Room } from "@/lib/types";
import { roundToNearestQuarterGallon } from "@/lib/paint-calculator";

export interface ShoppingListItem {
  paintColor: string;
  paintBrand: string;
  finishType: FinishType;
  totalGallons: number;
  purchaseGallons: number;
  purchaseRecommendation: string;
  pricePerGallon: number;
  totalCost: number;
}

interface PaintEntry {
  paintColor: string;
  paintBrand: string;
  finishType: FinishType;
  rawGallons: number;
  pricePerGallon: number;
}

function extractPaintEntries(room: Room): PaintEntry[] {
  const entries: PaintEntry[] = [];

  // Wall paint
  if (room.paintColor && room.finishType && room.gallonsNeeded > 0) {
    entries.push({
      paintColor: room.paintColor,
      paintBrand: room.paintBrand,
      finishType: room.finishType,
      rawGallons: room.gallonsNeeded,
      pricePerGallon: room.pricePerGallon ?? 0,
    });
  }

  // Ceiling paint
  if (room.ceilingColor && room.ceilingFinish) {
    const ceilingGallons = (room as any).ceilingGallonsNeeded ?? 0;
    if (ceilingGallons > 0) {
      entries.push({
        paintColor: room.ceilingColor,
        paintBrand: room.ceilingBrand,
        finishType: room.ceilingFinish,
        rawGallons: ceilingGallons,
        pricePerGallon: room.ceilingPricePerGallon ?? 0,
      });
    }
  }

  // Trim/door paint
  if ((room.includeTrim || room.includeDoors) && room.trimColor && room.trimFinish) {
    const trimGallons = (room as any).trimGallonsNeeded ?? 0;
    if (trimGallons > 0) {
      entries.push({
        paintColor: room.trimColor,
        paintBrand: room.trimBrand,
        finishType: room.trimFinish,
        rawGallons: trimGallons,
        pricePerGallon: room.trimPricePerGallon ?? 0,
      });
    }
  }

  return entries;
}

export function aggregateShoppingList(rooms: Room[]): ShoppingListItem[] {
  const paintRooms = rooms.filter(
    (r) => r.serviceType === ServiceType.InteriorPaint || r.serviceType === ServiceType.ExteriorPaint
  );

  const groups = new Map<string, PaintEntry[]>();
  for (const room of paintRooms) {
    for (const entry of extractPaintEntries(room)) {
      const key = `${entry.paintColor}|${entry.finishType}|${entry.paintBrand}`;
      const existing = groups.get(key) ?? [];
      existing.push(entry);
      groups.set(key, existing);
    }
  }

  return Array.from(groups.entries()).map(([, groupEntries]) => {
    const first = groupEntries[0];
    const totalGallons = groupEntries.reduce((sum, e) => sum + e.rawGallons, 0);
    const purchaseGallons = roundToNearestQuarterGallon(totalGallons);
    const pricePerGallon = first.pricePerGallon;

    return {
      paintColor: first.paintColor,
      paintBrand: first.paintBrand,
      finishType: first.finishType,
      totalGallons,
      purchaseGallons,
      purchaseRecommendation: recommendPurchaseSize(purchaseGallons),
      pricePerGallon,
      totalCost: purchaseGallons * pricePerGallon,
    };
  });
}

export function recommendPurchaseSize(gallons: number): string {
  if (gallons <= 0) return "0 gallons";
  if (gallons < 1) {
    const quarts = Math.ceil(gallons * 4);
    return `${quarts} quart${quarts !== 1 ? "s" : ""}`;
  }
  const roundedUp = Math.ceil(gallons);
  if (roundedUp < 5) {
    return `${roundedUp} gallon${roundedUp !== 1 ? "s" : ""}`;
  }
  const fiveGallons = Math.floor(roundedUp / 5);
  const remainingGallons = roundedUp % 5;
  if (remainingGallons === 0) {
    return `${fiveGallons} five-gallon${fiveGallons !== 1 ? "s" : ""}`;
  }
  return `${fiveGallons} five-gallon + ${remainingGallons} gallon${remainingGallons !== 1 ? "s" : ""}`;
}
