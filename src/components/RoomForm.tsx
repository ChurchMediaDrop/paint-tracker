"use client";

import { useState, useEffect } from "react";
import {
  ServiceType,
  RoomType,
  SurfaceType,
  FinishType,
  type Room,
} from "@/lib/types";
import {
  calculatePaintableArea,
  calculateGallonsNeeded,
  calculateLaborHours,
  calculateRoomCost,
  roundToNearestQuarterGallon,
} from "@/lib/paint-calculator";
import { formatCurrency, formatSurfaceType, formatFinishType } from "@/lib/format";
import { usePaintPresets } from "@/hooks/useSettings";

interface RoomFormProps {
  serviceType: ServiceType;
  laborRate: number;
  quoteId: string;
  onSave: (room: Omit<Room, "id">) => void;
  onCancel: () => void;
}

const PAINT_SERVICES = [ServiceType.InteriorPaint, ServiceType.ExteriorPaint];

const ROOM_TYPE_OPTIONS = [
  { value: RoomType.Walls, label: "Walls" },
  { value: RoomType.Ceiling, label: "Ceiling" },
  { value: RoomType.Exterior, label: "Exterior" },
];

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

export default function RoomForm({
  serviceType,
  laborRate,
  quoteId,
  onSave,
  onCancel,
}: RoomFormProps) {
  const isPaint = PAINT_SERVICES.includes(serviceType);
  const paintPresets = usePaintPresets();

  // Paint mode state
  const [name, setName] = useState("");
  const [roomType, setRoomType] = useState<RoomType>(RoomType.Walls);
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [doorCount, setDoorCount] = useState("0");
  const [windowCount, setWindowCount] = useState("0");
  const [surfaceType, setSurfaceType] = useState<SurfaceType>(SurfaceType.SmoothDrywall);
  const [paintColor, setPaintColor] = useState("");
  const [paintBrand, setPaintBrand] = useState("");
  const [finishType, setFinishType] = useState<FinishType>(FinishType.Eggshell);
  const [coats, setCoats] = useState("2");
  const [pricePerGallon, setPricePerGallon] = useState("45");

  // Non-paint mode state
  const [description, setDescription] = useState("");
  const [manualHours, setManualHours] = useState("");
  const [manualCost, setManualCost] = useState("");

  const [error, setError] = useState("");

  // Get coverage/labor rates from presets for selected surface type
  const surfacePreset = paintPresets.find((p) => p.surfaceType === surfaceType);
  const coverageRate = surfacePreset?.coverageRate ?? 350;
  const presetLaborRate = surfacePreset?.laborRate ?? 200;

  // Live calculations
  const parsedLength = parseFloat(length) || null;
  const parsedWidth = parseFloat(width) || null;
  const parsedHeight = parseFloat(height) || null;
  const parsedDoors = parseInt(doorCount, 10) || 0;
  const parsedWindows = parseInt(windowCount, 10) || 0;
  const parsedCoats = parseInt(coats, 10) || 1;
  const parsedPricePerGallon = parseFloat(pricePerGallon) || 0;

  const paintableSqFt = isPaint
    ? calculatePaintableArea({
        roomType,
        length: parsedLength,
        width: parsedWidth,
        height: parsedHeight,
        doorCount: parsedDoors,
        windowCount: parsedWindows,
      })
    : 0;

  const gallonsRaw = isPaint
    ? calculateGallonsNeeded(paintableSqFt, parsedCoats, coverageRate)
    : 0;
  const gallonsNeeded = roundToNearestQuarterGallon(gallonsRaw);

  const estimatedLaborHours = isPaint
    ? calculateLaborHours(paintableSqFt, parsedCoats, presetLaborRate)
    : 0;

  const { materialCost, laborCost } = isPaint
    ? calculateRoomCost({
        gallonsNeeded,
        pricePerGallon: parsedPricePerGallon,
        laborHours: estimatedLaborHours,
        laborRate,
      })
    : { materialCost: 0, laborCost: 0 };

  // Reset dimensions when room type changes
  useEffect(() => {
    setLength("");
    setWidth("");
    setHeight("");
  }, [roomType]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (isPaint) {
      if (!name.trim()) {
        setError("Room name is required.");
        return;
      }
      const room: Omit<Room, "id"> = {
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
        paintableSqFt,
        gallonsNeeded,
        estimatedLaborHours,
        materialCost,
        laborCost,
        description: "",
        manualHours: null,
        manualCost: null,
        sortOrder: Date.now(),
      };
      onSave(room);
    } else {
      if (!description.trim()) {
        setError("Description is required.");
        return;
      }
      const parsedManualHours = parseFloat(manualHours) || null;
      const parsedManualCost = parseFloat(manualCost) || null;
      const room: Omit<Room, "id"> = {
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
        paintableSqFt: 0,
        gallonsNeeded: 0,
        estimatedLaborHours: parsedManualHours ?? 0,
        materialCost: parsedManualCost ?? 0,
        laborCost: (parsedManualHours ?? 0) * laborRate,
        description: description.trim(),
        manualHours: parsedManualHours,
        manualCost: parsedManualCost,
        sortOrder: Date.now(),
      };
      onSave(room);
    }
  }

  const showWidth = roomType === RoomType.Walls || roomType === RoomType.Ceiling;
  const showHeight = roomType === RoomType.Walls || roomType === RoomType.Exterior;

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

          {/* Room Type */}
          <div>
            <label className={labelClass}>Room Type</label>
            <div className="flex gap-2">
              {ROOM_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRoomType(opt.value)}
                  className={`flex-1 py-3 rounded-xl text-[14px] font-medium transition-colors ${
                    roomType === opt.value
                      ? "bg-orange-500 text-white"
                      : "bg-white/[0.08] text-white/60 border border-white/[0.12]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dimensions */}
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
              {showWidth && (
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
              )}
              {showHeight && (
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
              )}
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

          {/* Surface Type */}
          <div>
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

          {/* Paint Details */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass} htmlFor="rf-color">
                Paint Color
              </label>
              <input
                id="rf-color"
                type="text"
                value={paintColor}
                onChange={(e) => setPaintColor(e.target.value)}
                placeholder="e.g. Swiss Coffee"
                className={inputClass}
                autoComplete="off"
              />
            </div>
            <div className="flex-1">
              <label className={labelClass} htmlFor="rf-brand">
                Brand
              </label>
              <input
                id="rf-brand"
                type="text"
                value={paintBrand}
                onChange={(e) => setPaintBrand(e.target.value)}
                placeholder="e.g. Sherwin-Williams"
                className={inputClass}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Finish & Coats */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass} htmlFor="rf-finish">
                Finish
              </label>
              <div className="relative">
                <select
                  id="rf-finish"
                  value={finishType}
                  onChange={(e) => setFinishType(e.target.value as FinishType)}
                  className={selectClass}
                >
                  {FINISH_TYPES.map((ft) => (
                    <option key={ft} value={ft}>
                      {formatFinishType(ft)}
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

          {/* Price per gallon */}
          <div>
            <label className={labelClass} htmlFor="rf-ppg">
              Price per Gallon ($)
            </label>
            <input
              id="rf-ppg"
              type="number"
              value={pricePerGallon}
              onChange={(e) => setPricePerGallon(e.target.value)}
              placeholder="45"
              inputMode="decimal"
              className={inputClass}
            />
          </div>

          {/* Live Calculation Preview */}
          {paintableSqFt > 0 && (
            <div className="rounded-2xl bg-orange-500/10 border border-orange-500/20 px-4 py-4">
              <p className="text-orange-400 text-[11px] font-semibold uppercase tracking-widest mb-3">
                Live Estimate
              </p>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                <div>
                  <p className="text-white/40 text-[11px]">Paintable Sq Ft</p>
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
          Add Room
        </button>
      </div>
    </form>
  );
}
