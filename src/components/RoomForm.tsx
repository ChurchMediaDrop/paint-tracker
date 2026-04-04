"use client";

import { useState } from "react";
import {
  ServiceType,
  RoomType,
  SurfaceType,
  FinishType,
  type Room,
} from "@/lib/types";
import DeckForm from "@/components/DeckForm";
import {
  calculatePaintableArea,
  calculateGallonsNeeded,
  calculateLaborHours,
  calculateRoomCost,
  roundToNearestQuarterGallon,
} from "@/lib/paint-calculator";
import { calculateComponentEstimates } from "@/lib/component-calculator";
import { formatCurrency, formatSurfaceType, formatFinishType } from "@/lib/format";
import { usePaintPresets } from "@/hooks/useSettings";

interface RoomFormProps {
  serviceType: ServiceType;
  laborRate: number;
  quoteId: string;
  onSave: (room: Omit<Room, "id" | "updatedAt">) => void;
  onCancel: () => void;
  editRoom?: Room;
  previousRoom?: Room; // Most recently added room in the same quote
}

const PAINT_SERVICES = [ServiceType.InteriorPaint, ServiceType.ExteriorPaint];

const SURFACE_TYPES: SurfaceType[] = [
  SurfaceType.SmoothDrywall,
  SurfaceType.TexturedWalls,
  SurfaceType.Ceiling,
  SurfaceType.TrimBaseboard,
  SurfaceType.Cabinets,
  SurfaceType.ExteriorSiding,
  SurfaceType.Stucco,
  SurfaceType.Brick,
  SurfaceType.WoodDeck,
];

const FINISH_TYPES: FinishType[] = [
  FinishType.Flat,
  FinishType.Eggshell,
  FinishType.Satin,
  FinishType.SemiGloss,
  FinishType.Gloss,
];

const inputClass =
  "w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-4 py-3 text-white placeholder-white/30 text-[15px] focus:outline-none focus:border-orange-500/60 focus:bg-white/10";
const labelClass = "block text-white/50 text-[12px] font-medium mb-1.5";
const selectClass =
  "w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-4 py-3 text-white text-[15px] focus:outline-none focus:border-orange-500/60 focus:bg-white/10 appearance-none";

function deriveChecks(roomType: RoomType): { walls: boolean; ceiling: boolean } {
  switch (roomType) {
    case RoomType.WallsAndCeiling:
      return { walls: true, ceiling: true };
    case RoomType.Ceiling:
      return { walls: false, ceiling: true };
    case RoomType.Walls:
      return { walls: true, ceiling: false };
    case RoomType.Other:
    default:
      return { walls: false, ceiling: false };
  }
}

function deriveRoomType(walls: boolean, ceiling: boolean): RoomType {
  if (walls && ceiling) return RoomType.WallsAndCeiling;
  if (ceiling) return RoomType.Ceiling;
  if (walls) return RoomType.Walls;
  return RoomType.Other;
}

export default function RoomForm({
  serviceType,
  laborRate,
  quoteId,
  onSave,
  onCancel,
  editRoom,
  previousRoom,
}: RoomFormProps) {
  if (serviceType === ServiceType.DeckStaining) {
    return (
      <DeckForm
        laborRate={laborRate}
        quoteId={quoteId}
        onSave={onSave}
        onCancel={onCancel}
        editRoom={editRoom}
        previousRoom={previousRoom}
      />
    );
  }

  const isPaint = PAINT_SERVICES.includes(serviceType);
  const isExterior = serviceType === ServiceType.ExteriorPaint;
  const paintPresets = usePaintPresets();

  // When adding a new room, pre-fill paint details from previousRoom if available
  const prev = editRoom ?? previousRoom;

  const initialChecks = prev ? deriveChecks(prev.roomType) : { walls: true, ceiling: false };

  // Paint mode state
  const [name, setName] = useState(editRoom?.name ?? "");
  const [includeWalls, setIncludeWalls] = useState(isExterior ? true : initialChecks.walls);
  const [includeCeiling, setIncludeCeiling] = useState(isExterior ? false : initialChecks.ceiling);
  const [length, setLength] = useState(editRoom?.length?.toString() ?? "");
  const [width, setWidth] = useState(editRoom?.width?.toString() ?? "");
  const [height, setHeight] = useState(editRoom?.height?.toString() ?? "");
  const [doorCount, setDoorCount] = useState(editRoom?.doorCount?.toString() ?? "0");
  const [windowCount, setWindowCount] = useState(editRoom?.windowCount?.toString() ?? "0");
  const [surfaceType, setSurfaceType] = useState<SurfaceType>(prev?.surfaceType ?? SurfaceType.SmoothDrywall);
  const [paintColor, setPaintColor] = useState(prev?.paintColor ?? "");
  const [paintBrand, setPaintBrand] = useState(prev?.paintBrand ?? "");
  const [finishType, setFinishType] = useState<FinishType>(prev?.finishType ?? FinishType.Eggshell);
  const [coats, setCoats] = useState(prev?.coats?.toString() ?? "2");
  const [pricePerGallon, setPricePerGallon] = useState(prev?.pricePerGallon?.toString() ?? "45");

  // Trim/door toggle state
  const [includeTrim, setIncludeTrim] = useState(prev?.includeTrim ?? false);
  const [includeDoors, setIncludeDoors] = useState(prev?.includeDoors ?? false);

  // Ceiling paint state
  const [ceilingColor, setCeilingColor] = useState(prev?.ceilingColor ?? "White");
  const [ceilingBrand, setCeilingBrand] = useState(prev?.ceilingBrand ?? "");
  const [ceilingFinish, setCeilingFinish] = useState<FinishType>(prev?.ceilingFinish ?? FinishType.Flat);
  const [ceilingPricePerGallon, setCeilingPricePerGallon] = useState(prev?.ceilingPricePerGallon?.toString() ?? "45");

  // Trim/door paint state
  const [trimColor, setTrimColor] = useState(prev?.trimColor ?? "");
  const [trimBrand, setTrimBrand] = useState(prev?.trimBrand ?? "");
  const [trimFinish, setTrimFinish] = useState<FinishType>(prev?.trimFinish ?? FinishType.SemiGloss);
  const [trimPricePerGallon, setTrimPricePerGallon] = useState(prev?.trimPricePerGallon?.toString() ?? "50");

  // Non-paint mode state
  const [description, setDescription] = useState(editRoom?.description ?? "");
  const [manualHours, setManualHours] = useState(editRoom?.manualHours?.toString() ?? "");
  const [manualCost, setManualCost] = useState(editRoom?.manualCost?.toString() ?? "");

  const [error, setError] = useState("");

  // Derive room type from checkboxes
  const roomType = isExterior ? RoomType.Exterior : deriveRoomType(includeWalls, includeCeiling);

  // Get coverage/labor rates from presets for selected surface type
  const surfacePreset = paintPresets.find((p) => p.surfaceType === surfaceType);
  const coverageRate = surfacePreset?.coverageRate ?? 350;
  const presetLaborRate = surfacePreset?.laborRate ?? 200;

  const ceilingPreset = paintPresets.find((p) => p.surfaceType === SurfaceType.Ceiling);
  const ceilingCoverageRate = ceilingPreset?.coverageRate ?? 400;
  const ceilingLaborRate = ceilingPreset?.laborRate ?? 250;

  const trimPreset = paintPresets.find((p) => p.surfaceType === SurfaceType.TrimBaseboard);
  const trimCoverageRate = trimPreset?.coverageRate ?? 300;
  const trimLaborRate = trimPreset?.laborRate ?? 150;

  // Live calculations
  const parsedLength = parseFloat(length) || null;
  const parsedWidth = parseFloat(width) || null;
  const parsedHeight = parseFloat(height) || null;
  const parsedDoors = parseInt(doorCount, 10) || 0;
  const parsedWindows = parseInt(windowCount, 10) || 0;
  const parsedCoats = parseInt(coats, 10) || 1;
  const parsedPricePerGallon = parseFloat(pricePerGallon) || 0;

  const parsedCeilingPPG = parseFloat(ceilingPricePerGallon) || 0;
  const parsedTrimPPG = parseFloat(trimPricePerGallon) || 0;

  const estimates = isPaint && !isExterior
    ? calculateComponentEstimates({
        length: parsedLength,
        width: parsedWidth,
        height: parsedHeight,
        doorCount: parsedDoors,
        windowCount: parsedWindows,
        coats: parsedCoats,
        includeWalls,
        includeCeiling,
        includeTrim,
        includeDoors,
        wallCoverageRate: coverageRate,
        wallLaborRate: presetLaborRate,
        wallPricePerGallon: parsedPricePerGallon,
        ceilingCoverageRate,
        ceilingLaborRate,
        ceilingPricePerGallon: parsedCeilingPPG,
        trimCoverageRate,
        trimLaborRate,
        trimPricePerGallon: parsedTrimPPG,
      })
    : null;

  // For exterior, keep single-surface calculation
  const exteriorSqFt = isPaint && isExterior
    ? calculatePaintableArea({
        roomType: RoomType.Exterior,
        length: parsedLength,
        width: parsedWidth,
        height: parsedHeight,
        doorCount: parsedDoors,
        windowCount: parsedWindows,
      })
    : 0;
  const exteriorGallonsRaw = isExterior ? calculateGallonsNeeded(exteriorSqFt, parsedCoats, coverageRate) : 0;
  const exteriorLaborHours = isExterior ? calculateLaborHours(exteriorSqFt, parsedCoats, presetLaborRate) : 0;
  const exteriorCost = isExterior
    ? calculateRoomCost({ gallonsNeeded: exteriorGallonsRaw, pricePerGallon: parsedPricePerGallon, laborHours: exteriorLaborHours, laborRate })
    : { materialCost: 0, laborCost: 0 };

  const paintableSqFt = estimates?.totalPaintableSqFt ?? exteriorSqFt;
  const totalRawGallons = estimates?.totalRawGallons ?? exteriorGallonsRaw;
  const gallonsNeeded = roundToNearestQuarterGallon(totalRawGallons);
  const estimatedLaborHours = estimates?.totalLaborHours ?? exteriorLaborHours;
  const materialCost = estimates?.totalMaterialCost ?? exteriorCost.materialCost;
  const laborCost = estimatedLaborHours * laborRate;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (isPaint) {
      if (!name.trim()) {
        setError("Room name is required.");
        return;
      }
      if (!includeWalls && !includeCeiling && !includeTrim && !includeDoors && !isExterior) {
        setError("Select at least one component to paint.");
        return;
      }
      const room: Omit<Room, "id" | "updatedAt"> = {
        quoteId,
        name: name.trim(),
        serviceType,
        roomType,
        length: parsedLength,
        width: parsedWidth,
        height: parsedHeight,
        doorCount: parsedDoors,
        windowCount: parsedWindows,
        surfaceType,
        paintColor: paintColor.trim(),
        paintBrand: paintBrand.trim(),
        finishType,
        coats: parsedCoats,
        pricePerGallon: parsedPricePerGallon,
        includeTrim,
        includeDoors,
        ceilingColor: ceilingColor.trim(),
        ceilingBrand: ceilingBrand.trim(),
        ceilingFinish,
        ceilingPricePerGallon: parsedCeilingPPG,
        trimColor: trimColor.trim(),
        trimBrand: trimBrand.trim(),
        trimFinish,
        trimPricePerGallon: parsedTrimPPG,
        railingLinearFeet: editRoom?.railingLinearFeet ?? 0,
        stairCount: editRoom?.stairCount ?? 0,
        stainType: editRoom?.stainType ?? null,
        woodCondition: editRoom?.woodCondition ?? null,
        paintableSqFt,
        gallonsNeeded,
        ceilingGallonsNeeded: estimates?.ceiling?.rawGallons ?? 0,
        trimGallonsNeeded: (estimates?.trim?.rawGallons ?? 0) + (estimates?.doors?.rawGallons ?? 0),
        estimatedLaborHours,
        materialCost,
        laborCost,
        description: "",
        manualHours: null,
        manualCost: null,
        sortOrder: editRoom?.sortOrder ?? Date.now(),
      };
      onSave(room);
    } else {
      if (!description.trim()) {
        setError("Description is required.");
        return;
      }
      const parsedManualHours = parseFloat(manualHours) || null;
      const parsedManualCost = parseFloat(manualCost) || null;
      const room: Omit<Room, "id" | "updatedAt"> = {
        quoteId,
        name: description.trim(),
        serviceType,
        roomType: RoomType.Other,
        length: null,
        width: null,
        height: null,
        doorCount: 0,
        windowCount: 0,
        surfaceType: null,
        paintColor: "",
        paintBrand: "",
        finishType: null,
        coats: 1,
        pricePerGallon: null,
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
        railingLinearFeet: 0,
        stairCount: 0,
        stainType: null,
        woodCondition: null,
        paintableSqFt: 0,
        gallonsNeeded: 0,
        ceilingGallonsNeeded: 0,
        trimGallonsNeeded: 0,
        estimatedLaborHours: parsedManualHours ?? 0,
        materialCost: parsedManualCost ?? 0,
        laborCost: (parsedManualHours ?? 0) * laborRate,
        description: description.trim(),
        manualHours: parsedManualHours,
        manualCost: parsedManualCost,
        sortOrder: editRoom?.sortOrder ?? Date.now(),
      };
      onSave(room);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {isPaint ? (
        <>
          {/* Room Name */}
          <div>
            <label className={labelClass} htmlFor="rf-name">
              Room Name <span className="text-rose-400">*</span>
            </label>
            <input
              id="rf-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Master Bedroom"
              className={inputClass}
              autoComplete="off"
            />
          </div>

          {/* Paint Area — toggle buttons for interior */}
          {!isExterior && (
            <div>
              <label className={labelClass}>What to Paint</label>
              <div className="flex gap-2">
                {([
                  { label: "Walls", value: includeWalls, toggle: () => setIncludeWalls((v) => !v) },
                  { label: "Ceiling", value: includeCeiling, toggle: () => setIncludeCeiling((v) => !v) },
                  { label: "Trim", value: includeTrim, toggle: () => setIncludeTrim((v) => !v) },
                  { label: "Doors", value: includeDoors, toggle: () => setIncludeDoors((v) => !v) },
                ] as const).map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={btn.toggle}
                    className={`flex-1 py-3 rounded-xl text-[14px] font-medium transition-colors ${
                      btn.value
                        ? "bg-orange-500 text-white"
                        : "bg-white/[0.08] text-white/60 border border-white/[0.12]"
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              {!includeWalls && !includeCeiling && !includeTrim && !includeDoors && (
                <p className="text-amber-400/70 text-[12px] mt-1.5">Select at least one</p>
              )}
            </div>
          )}

          {/* Dimensions — always show all three */}
          <div>
            <label className={labelClass}>Dimensions (ft)</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  placeholder="Length"
                  inputMode="decimal"
                  className={inputClass}
                />
                <p className="text-white/30 text-[11px] mt-1 text-center">Length</p>
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="Width"
                  inputMode="decimal"
                  className={inputClass}
                />
                <p className="text-white/30 text-[11px] mt-1 text-center">Width</p>
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Height"
                  inputMode="decimal"
                  className={inputClass}
                />
                <p className="text-white/30 text-[11px] mt-1 text-center">Height</p>
              </div>
            </div>
          </div>

          {/* Door & Window Count */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass} htmlFor="rf-doors">
                Doors
              </label>
              <input
                id="rf-doors"
                type="number"
                value={doorCount}
                onChange={(e) => setDoorCount(e.target.value)}
                min="0"
                inputMode="numeric"
                className={inputClass}
              />
            </div>
            <div className="flex-1">
              <label className={labelClass} htmlFor="rf-windows">
                Windows
              </label>
              <input
                id="rf-windows"
                type="number"
                value={windowCount}
                onChange={(e) => setWindowCount(e.target.value)}
                min="0"
                inputMode="numeric"
                className={inputClass}
              />
            </div>
          </div>

          {/* Surface Type & Coats */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass} htmlFor="rf-surface">
                Surface Type
              </label>
              <div className="relative">
                <select
                  id="rf-surface"
                  value={surfaceType}
                  onChange={(e) => setSurfaceType(e.target.value as SurfaceType)}
                  className={selectClass}
                >
                  {SURFACE_TYPES.map((st) => (
                    <option key={st} value={st}>
                      {formatSurfaceType(st)}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/40">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                    <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
            <div className="w-28">
              <label className={labelClass} htmlFor="rf-coats">
                Coats
              </label>
              <div className="relative">
                <select
                  id="rf-coats"
                  value={coats}
                  onChange={(e) => setCoats(e.target.value)}
                  className={selectClass}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/40">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                    <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Per-component paint detail sections (interior only) */}
          {!isExterior ? (
            <>
              {/* Wall Paint */}
              {includeWalls && (
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 flex flex-col gap-3">
                  <p className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">Wall Paint</p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className={labelClass} htmlFor="rf-wall-color">Color</label>
                      <input id="rf-wall-color" type="text" value={paintColor} onChange={(e) => setPaintColor(e.target.value)} placeholder="e.g. Swiss Coffee" className={inputClass} autoComplete="off" />
                    </div>
                    <div className="flex-1">
                      <label className={labelClass} htmlFor="rf-wall-brand">Brand</label>
                      <input id="rf-wall-brand" type="text" value={paintBrand} onChange={(e) => setPaintBrand(e.target.value)} placeholder="e.g. Sherwin-Williams" className={inputClass} autoComplete="off" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className={labelClass} htmlFor="rf-wall-finish">Finish</label>
                      <div className="relative">
                        <select id="rf-wall-finish" value={finishType} onChange={(e) => setFinishType(e.target.value as FinishType)} className={selectClass}>
                          {FINISH_TYPES.map((ft) => (<option key={ft} value={ft}>{formatFinishType(ft)}</option>))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/40">
                          <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      </div>
                    </div>
                    <div className="w-28">
                      <label className={labelClass} htmlFor="rf-wall-ppg">$/gal</label>
                      <input id="rf-wall-ppg" type="number" value={pricePerGallon} onChange={(e) => setPricePerGallon(e.target.value)} placeholder="45" inputMode="decimal" className={inputClass} />
                    </div>
                  </div>
                </div>
              )}

              {/* Ceiling Paint */}
              {includeCeiling && (
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 flex flex-col gap-3">
                  <p className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">Ceiling Paint</p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className={labelClass} htmlFor="rf-ceil-color">Color</label>
                      <input id="rf-ceil-color" type="text" value={ceilingColor} onChange={(e) => setCeilingColor(e.target.value)} placeholder="e.g. White" className={inputClass} autoComplete="off" />
                    </div>
                    <div className="flex-1">
                      <label className={labelClass} htmlFor="rf-ceil-brand">Brand</label>
                      <input id="rf-ceil-brand" type="text" value={ceilingBrand} onChange={(e) => setCeilingBrand(e.target.value)} placeholder="e.g. Sherwin-Williams" className={inputClass} autoComplete="off" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className={labelClass} htmlFor="rf-ceil-finish">Finish</label>
                      <div className="relative">
                        <select id="rf-ceil-finish" value={ceilingFinish} onChange={(e) => setCeilingFinish(e.target.value as FinishType)} className={selectClass}>
                          {FINISH_TYPES.map((ft) => (<option key={ft} value={ft}>{formatFinishType(ft)}</option>))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/40">
                          <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      </div>
                    </div>
                    <div className="w-28">
                      <label className={labelClass} htmlFor="rf-ceil-ppg">$/gal</label>
                      <input id="rf-ceil-ppg" type="number" value={ceilingPricePerGallon} onChange={(e) => setCeilingPricePerGallon(e.target.value)} placeholder="45" inputMode="decimal" className={inputClass} />
                    </div>
                  </div>
                </div>
              )}

              {/* Trim/Door Paint */}
              {(includeTrim || includeDoors) && (
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 flex flex-col gap-3">
                  <p className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">Trim / Door Paint</p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className={labelClass} htmlFor="rf-trim-color">Color</label>
                      <input id="rf-trim-color" type="text" value={trimColor} onChange={(e) => setTrimColor(e.target.value)} placeholder="e.g. White Dove" className={inputClass} autoComplete="off" />
                    </div>
                    <div className="flex-1">
                      <label className={labelClass} htmlFor="rf-trim-brand">Brand</label>
                      <input id="rf-trim-brand" type="text" value={trimBrand} onChange={(e) => setTrimBrand(e.target.value)} placeholder="e.g. Benjamin Moore" className={inputClass} autoComplete="off" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className={labelClass} htmlFor="rf-trim-finish">Finish</label>
                      <div className="relative">
                        <select id="rf-trim-finish" value={trimFinish} onChange={(e) => setTrimFinish(e.target.value as FinishType)} className={selectClass}>
                          {FINISH_TYPES.map((ft) => (<option key={ft} value={ft}>{formatFinishType(ft)}</option>))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/40">
                          <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      </div>
                    </div>
                    <div className="w-28">
                      <label className={labelClass} htmlFor="rf-trim-ppg">$/gal</label>
                      <input id="rf-trim-ppg" type="number" value={trimPricePerGallon} onChange={(e) => setTrimPricePerGallon(e.target.value)} placeholder="50" inputMode="decimal" className={inputClass} />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Exterior: single paint details section */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={labelClass} htmlFor="rf-color">Paint Color</label>
                  <input id="rf-color" type="text" value={paintColor} onChange={(e) => setPaintColor(e.target.value)} placeholder="e.g. Swiss Coffee" className={inputClass} autoComplete="off" />
                </div>
                <div className="flex-1">
                  <label className={labelClass} htmlFor="rf-brand">Brand</label>
                  <input id="rf-brand" type="text" value={paintBrand} onChange={(e) => setPaintBrand(e.target.value)} placeholder="e.g. Sherwin-Williams" className={inputClass} autoComplete="off" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={labelClass} htmlFor="rf-finish">Finish</label>
                  <div className="relative">
                    <select id="rf-finish" value={finishType} onChange={(e) => setFinishType(e.target.value as FinishType)} className={selectClass}>
                      {FINISH_TYPES.map((ft) => (<option key={ft} value={ft}>{formatFinishType(ft)}</option>))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/40">
                      <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                </div>
                <div className="w-28">
                  <label className={labelClass} htmlFor="rf-ppg">$/gal</label>
                  <input id="rf-ppg" type="number" value={pricePerGallon} onChange={(e) => setPricePerGallon(e.target.value)} placeholder="45" inputMode="decimal" className={inputClass} />
                </div>
              </div>
            </>
          )}

          {/* Live Calculation Preview */}
          {paintableSqFt > 0 && (
            <div className="rounded-2xl bg-orange-500/10 border border-orange-500/20 px-4 py-4">
              <p className="text-orange-400 text-[11px] font-semibold uppercase tracking-widest mb-3">
                Live Estimate
              </p>
              {/* Per-component lines (interior only) */}
              {estimates && (
                <div className="flex flex-col gap-2 mb-3">
                  {estimates.walls && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-white/50">Walls</span>
                      <span className="text-white">{Math.round(estimates.walls.paintableSqFt)} sq ft &middot; {roundToNearestQuarterGallon(estimates.walls.rawGallons)} gal</span>
                    </div>
                  )}
                  {estimates.ceiling && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-white/50">Ceiling</span>
                      <span className="text-white">{Math.round(estimates.ceiling.paintableSqFt)} sq ft &middot; {roundToNearestQuarterGallon(estimates.ceiling.rawGallons)} gal</span>
                    </div>
                  )}
                  {estimates.trim && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-white/50">Trim</span>
                      <span className="text-white">{Math.round(estimates.trim.paintableSqFt)} sq ft &middot; {roundToNearestQuarterGallon(estimates.trim.rawGallons)} gal</span>
                    </div>
                  )}
                  {estimates.doors && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-white/50">Doors</span>
                      <span className="text-white">{Math.round(estimates.doors.paintableSqFt)} sq ft &middot; {roundToNearestQuarterGallon(estimates.doors.rawGallons)} gal</span>
                    </div>
                  )}
                </div>
              )}
              {/* Totals grid */}
              <div className={`grid grid-cols-2 gap-y-2.5 gap-x-4${estimates ? " pt-2 border-t border-orange-500/15" : ""}`}>
                <div>
                  <p className="text-white/40 text-[11px]">Total Sq Ft</p>
                  <p className="text-white text-[15px] font-semibold">{Math.round(paintableSqFt)} sq ft</p>
                </div>
                <div>
                  <p className="text-white/40 text-[11px]">Gallons Needed</p>
                  <p className="text-white text-[15px] font-semibold">{gallonsNeeded} gal</p>
                </div>
                <div>
                  <p className="text-white/40 text-[11px]">Labor Hours</p>
                  <p className="text-white text-[15px] font-semibold">{estimatedLaborHours.toFixed(1)} hrs</p>
                </div>
                <div>
                  <p className="text-white/40 text-[11px]">Material Cost</p>
                  <p className="text-white text-[15px] font-semibold">{formatCurrency(materialCost)}</p>
                </div>
                <div>
                  <p className="text-white/40 text-[11px]">Labor Cost</p>
                  <p className="text-white text-[15px] font-semibold">{formatCurrency(laborCost)}</p>
                </div>
                <div>
                  <p className="text-white/40 text-[11px]">Room Total</p>
                  <p className="text-orange-400 text-[15px] font-bold">{formatCurrency(materialCost + laborCost)}</p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Non-paint mode */}
          <div>
            <label className={labelClass} htmlFor="rf-desc">
              Description <span className="text-rose-400">*</span>
            </label>
            <input
              id="rf-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Pressure wash driveway"
              className={inputClass}
              autoComplete="off"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass} htmlFor="rf-hours">
                Est. Hours
              </label>
              <input
                id="rf-hours"
                type="number"
                value={manualHours}
                onChange={(e) => setManualHours(e.target.value)}
                placeholder="0"
                inputMode="decimal"
                className={inputClass}
              />
            </div>
            <div className="flex-1">
              <label className={labelClass} htmlFor="rf-mcost">
                Material Cost ($)
              </label>
              <input
                id="rf-mcost"
                type="number"
                value={manualCost}
                onChange={(e) => setManualCost(e.target.value)}
                placeholder="0"
                inputMode="decimal"
                className={inputClass}
              />
            </div>
          </div>
          {(parseFloat(manualHours) > 0 || parseFloat(manualCost) > 0) && (
            <div className="rounded-2xl bg-orange-500/10 border border-orange-500/20 px-4 py-3">
              <p className="text-orange-400 text-[11px] font-semibold uppercase tracking-widest mb-2">
                Estimate
              </p>
              <div className="flex gap-6">
                {parseFloat(manualHours) > 0 && (
                  <div>
                    <p className="text-white/40 text-[11px]">Labor Cost</p>
                    <p className="text-white text-[15px] font-semibold">
                      {formatCurrency((parseFloat(manualHours) || 0) * laborRate)}
                    </p>
                  </div>
                )}
                {parseFloat(manualCost) > 0 && (
                  <div>
                    <p className="text-white/40 text-[11px]">Materials</p>
                    <p className="text-white text-[15px] font-semibold">
                      {formatCurrency(parseFloat(manualCost) || 0)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
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
          {editRoom ? "Update Room" : "Add Room"}
        </button>
      </div>
    </form>
  );
}
