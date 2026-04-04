"use client";

import { useState } from "react";
import {
  ServiceType,
  RoomType,
  SurfaceType,
  StainType,
  WoodCondition,
  type Room,
} from "@/lib/types";
import { calculateDeckEstimate, type DeckEstimate } from "@/lib/deck-calculator";
import { roundToNearestQuarterGallon } from "@/lib/paint-calculator";
import { formatCurrency, formatStainType, formatWoodCondition } from "@/lib/format";
import { usePaintPresets } from "@/hooks/useSettings";

interface DeckFormProps {
  laborRate: number;
  quoteId: string;
  onSave: (room: Omit<Room, "id" | "updatedAt">) => void;
  onCancel: () => void;
  editRoom?: Room;
  previousRoom?: Room;
}

const STAIN_TYPES: StainType[] = [
  StainType.Transparent,
  StainType.SemiTransparent,
  StainType.SolidPaint,
];

const WOOD_CONDITIONS: WoodCondition[] = [
  WoodCondition.Smooth,
  WoodCondition.Rough,
];

const inputClass =
  "w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-4 py-3 text-white placeholder-white/30 text-[15px] focus:outline-none focus:border-orange-500/60 focus:bg-white/10";
const labelClass = "block text-white/50 text-[12px] font-medium mb-1.5";

export default function DeckForm({
  laborRate,
  quoteId,
  onSave,
  onCancel,
  editRoom,
}: DeckFormProps) {
  const paintPresets = usePaintPresets();

  const [name, setName] = useState(editRoom?.name ?? "");
  const [length, setLength] = useState(editRoom?.length?.toString() ?? "");
  const [width, setWidth] = useState(editRoom?.width?.toString() ?? "");
  const [railingFeet, setRailingFeet] = useState(
    editRoom?.railingLinearFeet?.toString() ?? "0"
  );
  const [stairCount, setStairCount] = useState(
    editRoom?.stairCount?.toString() ?? "0"
  );
  const [stainType, setStainType] = useState<StainType>(
    editRoom?.stainType ?? StainType.SemiTransparent
  );
  const [woodCondition, setWoodCondition] = useState<WoodCondition>(
    editRoom?.woodCondition ?? WoodCondition.Smooth
  );
  const [paintColor, setPaintColor] = useState(editRoom?.paintColor ?? "");
  const [paintBrand, setPaintBrand] = useState(editRoom?.paintBrand ?? "");
  const [pricePerGallon, setPricePerGallon] = useState(
    editRoom?.pricePerGallon?.toString() ?? "40"
  );
  const [coats, setCoats] = useState(editRoom?.coats?.toString() ?? "1");

  const [error, setError] = useState("");

  // Get WoodDeck preset labor production rate (sq ft / hr)
  const deckPreset = paintPresets.find((p) => p.surfaceType === SurfaceType.WoodDeck);
  const laborProductionRate = deckPreset?.laborRate ?? 120;

  // Live calculations
  const parsedLength = parseFloat(length) || null;
  const parsedWidth = parseFloat(width) || null;
  const parsedRailingFeet = parseFloat(railingFeet) || 0;
  const parsedStairCount = parseInt(stairCount, 10) || 0;
  const parsedCoats = parseInt(coats, 10) || 1;
  const parsedPPG = parseFloat(pricePerGallon) || 0;

  const estimate: DeckEstimate = calculateDeckEstimate({
    length: parsedLength,
    width: parsedWidth,
    railingLinearFeet: parsedRailingFeet,
    stairCount: parsedStairCount,
    coats: parsedCoats,
    stainType,
    woodCondition,
    pricePerGallon: parsedPPG,
    laborProductionRate,
  });

  const gallonsNeeded = roundToNearestQuarterGallon(estimate.rawGallons);
  const laborCost = estimate.laborHours * laborRate;
  const showEstimate = estimate.totalSqFt > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Deck name is required.");
      return;
    }

    const room: Omit<Room, "id" | "updatedAt"> = {
      quoteId,
      name: name.trim(),
      serviceType: ServiceType.DeckStaining,
      roomType: RoomType.Other,
      surfaceType: SurfaceType.WoodDeck,
      length: parsedLength,
      width: parsedWidth,
      height: null,
      doorCount: 0,
      windowCount: 0,
      paintColor: paintColor.trim(),
      paintBrand: paintBrand.trim(),
      finishType: null,
      coats: parsedCoats,
      pricePerGallon: parsedPPG,
      includeTrim: false,
      includeDoors: false,
      ceilingColor: "",
      ceilingBrand: "",
      ceilingFinish: null,
      ceilingPricePerGallon: null,
      trimColor: "",
      trimBrand: "",
      trimFinish: null,
      trimPricePerGallon: null,
      railingLinearFeet: parsedRailingFeet,
      stairCount: parsedStairCount,
      stainType,
      woodCondition,
      paintableSqFt: estimate.totalSqFt,
      gallonsNeeded,
      ceilingGallonsNeeded: 0,
      trimGallonsNeeded: 0,
      estimatedLaborHours: estimate.laborHours,
      materialCost: estimate.materialCost,
      laborCost,
      description: "",
      manualHours: null,
      manualCost: null,
      sortOrder: editRoom?.sortOrder ?? Date.now(),
    };

    onSave(room);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Deck Name */}
      <div>
        <label className={labelClass} htmlFor="df-name">
          Deck Name <span className="text-rose-400">*</span>
        </label>
        <input
          id="df-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Back Deck"
          className={inputClass}
          autoComplete="off"
        />
      </div>

      {/* Dimensions */}
      <div>
        <label className={labelClass}>Dimensions (ft)</label>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              id="df-length"
              type="number"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="Length"
              inputMode="decimal"
              className={inputClass}
            />
          </div>
          <div className="flex items-center text-white/30 text-[15px] pb-0.5">×</div>
          <div className="flex-1">
            <input
              id="df-width"
              type="number"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="Width"
              inputMode="decimal"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Railing + Stairs */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelClass} htmlFor="df-railing">
            Railing (linear ft)
          </label>
          <input
            id="df-railing"
            type="number"
            value={railingFeet}
            onChange={(e) => setRailingFeet(e.target.value)}
            placeholder="0"
            inputMode="decimal"
            className={inputClass}
          />
        </div>
        <div className="flex-1">
          <label className={labelClass} htmlFor="df-stairs">
            Stair Steps
          </label>
          <input
            id="df-stairs"
            type="number"
            value={stairCount}
            onChange={(e) => setStairCount(e.target.value)}
            placeholder="0"
            inputMode="numeric"
            className={inputClass}
          />
        </div>
      </div>

      {/* Product Type */}
      <div>
        <label className={labelClass}>Product Type</label>
        <div className="flex gap-2">
          {STAIN_TYPES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStainType(st)}
              className={`flex-1 py-3 rounded-xl text-[13px] font-medium transition-colors ${
                stainType === st
                  ? "bg-orange-500 text-white"
                  : "bg-white/[0.08] text-white/50 border border-white/[0.12] active:bg-white/15"
              }`}
            >
              {formatStainType(st)}
            </button>
          ))}
        </div>
      </div>

      {/* Wood Condition */}
      <div>
        <label className={labelClass}>Wood Condition</label>
        <div className="flex gap-2">
          {WOOD_CONDITIONS.map((wc) => (
            <button
              key={wc}
              type="button"
              onClick={() => setWoodCondition(wc)}
              className={`flex-1 py-3 rounded-xl text-[14px] font-medium transition-colors ${
                woodCondition === wc
                  ? "bg-orange-500 text-white"
                  : "bg-white/[0.08] text-white/50 border border-white/[0.12] active:bg-white/15"
              }`}
            >
              {formatWoodCondition(wc)}
            </button>
          ))}
        </div>
      </div>

      {/* Color, Brand, Coats, Price */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelClass} htmlFor="df-color">
            Stain Color
          </label>
          <input
            id="df-color"
            type="text"
            value={paintColor}
            onChange={(e) => setPaintColor(e.target.value)}
            placeholder="e.g. Cedar"
            className={inputClass}
            autoComplete="off"
          />
        </div>
        <div className="flex-1">
          <label className={labelClass} htmlFor="df-brand">
            Brand
          </label>
          <input
            id="df-brand"
            type="text"
            value={paintBrand}
            onChange={(e) => setPaintBrand(e.target.value)}
            placeholder="e.g. Cabot"
            className={inputClass}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelClass} htmlFor="df-coats">
            Coats
          </label>
          <input
            id="df-coats"
            type="number"
            value={coats}
            onChange={(e) => setCoats(e.target.value)}
            placeholder="1"
            inputMode="numeric"
            className={inputClass}
          />
        </div>
        <div className="flex-1">
          <label className={labelClass} htmlFor="df-ppg">
            $/gal
          </label>
          <input
            id="df-ppg"
            type="number"
            value={pricePerGallon}
            onChange={(e) => setPricePerGallon(e.target.value)}
            placeholder="40"
            inputMode="decimal"
            className={inputClass}
          />
        </div>
      </div>

      {/* Live Estimate Preview */}
      {showEstimate && (
        <div className="rounded-2xl bg-orange-500/10 border border-orange-500/20 px-4 py-4">
          <p className="text-orange-400 text-[11px] font-semibold uppercase tracking-widest mb-3">
            Live Estimate
          </p>
          {/* Breakdown lines */}
          <div className="flex flex-col gap-2 mb-3">
            {estimate.floorSqFt > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-white/50">Floor</span>
                <span className="text-white">{Math.round(estimate.floorSqFt)} sq ft</span>
              </div>
            )}
            {estimate.railingSqFt > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-white/50">Railing</span>
                <span className="text-white">{Math.round(estimate.railingSqFt)} sq ft</span>
              </div>
            )}
            {estimate.stairSqFt > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-white/50">Stairs</span>
                <span className="text-white">{Math.round(estimate.stairSqFt)} sq ft</span>
              </div>
            )}
          </div>
          {/* Totals grid */}
          <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 pt-2 border-t border-orange-500/15">
            <div>
              <p className="text-white/40 text-[11px]">Total Sq Ft</p>
              <p className="text-white text-[15px] font-semibold">
                {Math.round(estimate.totalSqFt)} sq ft
              </p>
            </div>
            <div>
              <p className="text-white/40 text-[11px]">Gallons Needed</p>
              <p className="text-white text-[15px] font-semibold">{gallonsNeeded} gal</p>
            </div>
            <div>
              <p className="text-white/40 text-[11px]">Labor Hours</p>
              <p className="text-white text-[15px] font-semibold">
                {estimate.laborHours.toFixed(1)} hrs
              </p>
            </div>
            <div>
              <p className="text-white/40 text-[11px]">Material Cost</p>
              <p className="text-white text-[15px] font-semibold">
                {formatCurrency(estimate.materialCost)}
              </p>
            </div>
            <div>
              <p className="text-white/40 text-[11px]">Labor Cost</p>
              <p className="text-white text-[15px] font-semibold">{formatCurrency(laborCost)}</p>
            </div>
            <div>
              <p className="text-white/40 text-[11px]">Total</p>
              <p className="text-orange-400 text-[15px] font-bold">
                {formatCurrency(estimate.materialCost + laborCost)}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-rose-400 text-[13px] font-medium">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3.5 rounded-2xl bg-white/[0.08] text-white/70 font-medium text-[15px] active:bg-white/15 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 py-3.5 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform shadow-lg shadow-orange-900/30"
        >
          {editRoom ? "Update Deck" : "Add Deck"}
        </button>
      </div>
    </form>
  );
}
