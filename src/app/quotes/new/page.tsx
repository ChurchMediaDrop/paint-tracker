"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import CustomerPicker from "@/components/CustomerPicker";
import RoomForm from "@/components/RoomForm";
import QuoteSummary from "@/components/QuoteSummary";
import ShoppingList from "@/components/ShoppingList";
import { useCustomer } from "@/hooks/useCustomers";
import { createJob } from "@/hooks/useJobs";
import { createQuote, addRoom, recalculateQuoteTotals } from "@/hooks/useQuotes";
import { useSettings } from "@/hooks/useSettings";
import { ServiceType, JobStatus, type Room, type Quote } from "@/lib/types";
import { formatCurrency, formatServiceType } from "@/lib/format";

type Step = 1 | 2 | 3 | 4;

const SERVICE_TYPES: ServiceType[] = [
  ServiceType.InteriorPaint,
  ServiceType.ExteriorPaint,
  ServiceType.PowerWashing,
  ServiceType.Handyman,
];

const SERVICE_TYPE_ICONS: Record<ServiceType, React.ReactNode> = {
  [ServiceType.InteriorPaint]: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none"/>
      <path d="M7 21h10M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  [ServiceType.ExteriorPaint]: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 10L12 3L21 10V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" stroke="currentColor" strokeWidth="1.8" fill="none"/>
      <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  [ServiceType.PowerWashing]: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3v5M12 3v5M19 3v5M3 8h18M8 13l2 2-2 2M16 13l-2 2 2 2M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  [ServiceType.Handyman]: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" stroke="currentColor" strokeWidth="1.8" fill="none"/>
    </svg>
  ),
};

function SelectedCustomerBadge({ customerId }: { customerId: string }) {
  const customer = useCustomer(customerId);
  if (!customer) return null;
  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-[12px]">{customer.name.charAt(0).toUpperCase()}</span>
      </div>
      <span className="text-emerald-400 text-[14px] font-medium">{customer.name}</span>
    </div>
  );
}

function RoomCard({
  room,
  onDelete,
}: {
  room: Room;
  onDelete: (id: string) => void;
}) {
  const total = (room.materialCost || room.manualCost || 0) + (room.laborCost || 0);
  return (
    <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-3.5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-white text-[14px] font-medium truncate">{room.name}</p>
        <p className="text-white/40 text-[12px] mt-0.5">
          {formatServiceType(room.serviceType)}
          {room.paintColor && ` · ${room.paintColor}`}
          {room.paintableSqFt > 0 && ` · ${Math.round(room.paintableSqFt)} sq ft`}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-white text-[14px] font-semibold">{formatCurrency(total)}</span>
        <button
          onClick={() => onDelete(room.id)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-500/15 border border-rose-500/20 text-rose-400 active:bg-rose-500/30 transition-colors"
          aria-label="Remove room"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function RunningTotal({ rooms, laborRate, markupPercent }: { rooms: Room[]; laborRate: number; markupPercent: number }) {
  const totalMaterials = rooms.reduce((sum, r) => sum + (r.materialCost || r.manualCost || 0), 0);
  const totalLaborHours = rooms.reduce((sum, r) => sum + (r.estimatedLaborHours || r.manualHours || 0), 0);
  const totalLabor = totalLaborHours * laborRate;
  const subtotal = totalMaterials + totalLabor;
  const total = subtotal * (1 + markupPercent / 100);

  if (rooms.length === 0) return null;

  return (
    <div className="rounded-2xl bg-orange-500/10 border border-orange-500/20 px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-white/50 text-[12px]">{rooms.length} room{rooms.length !== 1 ? "s" : ""}</p>
        <p className="text-white/70 text-[13px]">
          {formatCurrency(totalMaterials)} materials · {totalLaborHours.toFixed(1)} hrs labor
        </p>
      </div>
      <div className="text-right">
        <p className="text-white/50 text-[11px]">Running Total</p>
        <p className="text-orange-400 font-bold text-[18px]">{formatCurrency(total)}</p>
      </div>
    </div>
  );
}

function NewQuotePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const settings = useSettings();
  const defaultLaborRate = settings?.defaultLaborRate ?? 65;
  const defaultMarkupPercent = settings?.defaultMarkupPercent ?? 20;

  const [step, setStep] = useState<Step>(1);
  const [customerId, setCustomerId] = useState<string | null>(
    searchParams.get("customerId")
  );
  const [serviceType, setServiceType] = useState<ServiceType>(ServiceType.InteriorPaint);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Temp quoteId used during room entry (not yet persisted until step 4 save)
  const [tempQuoteId] = useState(() => `temp-${Date.now()}`);

  // If customerId was pre-populated from URL, jump to step 2
  useEffect(() => {
    if (customerId) {
      setStep(2);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCustomerSelect(id: string) {
    setCustomerId(id);
    setStep(2);
  }

  function handleServiceTypeSelect(type: ServiceType) {
    setServiceType(type);
    setStep(3);
  }

  function handleRoomSave(roomData: Omit<Room, "id">) {
    const room: Room = { ...roomData, id: `temp-room-${Date.now()}-${Math.random()}` };
    setRooms((prev) => [...prev, room]);
    setShowRoomForm(false);
  }

  function handleDeleteRoom(id: string) {
    setRooms((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleSaveQuote() {
    if (!customerId) return;
    setSaving(true);
    setSaveError("");
    try {
      const jobId = await createJob({
        customerId,
        serviceType,
        status: JobStatus.Quoted,
        scheduledDate: "",
        estimatedDuration: 0,
        address: "",
        notes: "",
        googleCalendarEventId: "",
      });

      const quoteId = await createQuote({
        jobId,
        laborRate: defaultLaborRate,
        markupPercent: defaultMarkupPercent,
        totalMaterials: 0,
        totalLabor: 0,
        totalPrice: 0,
      });

      // Add all rooms
      for (const room of rooms) {
        const { id: _id, ...roomData } = room;
        void _id;
        await addRoom({ ...roomData, quoteId });
      }

      await recalculateQuoteTotals(quoteId);

      router.push(`/jobs/${jobId}`);
    } catch {
      setSaveError("Failed to save quote. Please try again.");
      setSaving(false);
    }
  }

  // Build a fake Quote object for preview purposes on step 4
  const previewQuote: Quote = {
    id: tempQuoteId,
    jobId: "",
    laborRate: defaultLaborRate,
    markupPercent: defaultMarkupPercent,
    totalMaterials: 0,
    totalLabor: 0,
    totalPrice: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const stepTitles: Record<Step, string> = {
    1: "New Quote",
    2: "Service Type",
    3: "Add Rooms",
    4: "Review Quote",
  };

  return (
    <AppShell showBack title={stepTitles[step]}>
      <div className="flex flex-col px-4 pb-28 pt-4 gap-4">

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-orange-500" : "bg-white/[0.10]"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Customer Selection */}
        {step === 1 && (
          <div className="flex flex-col gap-3">
            <p className="text-white/70 text-[15px]">Select a customer for this quote.</p>
            <CustomerPicker onSelect={handleCustomerSelect} />
          </div>
        )}

        {/* Step 2: Service Type */}
        {step === 2 && (
          <div className="flex flex-col gap-3">
            {customerId && <SelectedCustomerBadge customerId={customerId} />}
            <p className="text-white/70 text-[15px]">What type of service is this quote for?</p>
            <div className="flex flex-col gap-2">
              {SERVICE_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => handleServiceTypeSelect(type)}
                  className="flex items-center gap-4 px-4 py-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] active:bg-white/10 transition-colors text-left min-h-[64px]"
                >
                  <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center text-orange-400 flex-shrink-0">
                    {SERVICE_TYPE_ICONS[type]}
                  </div>
                  <span className="text-white font-medium text-[16px]">
                    {formatServiceType(type)}
                  </span>
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="text-white/30 ml-auto" aria-hidden="true">
                    <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              className="text-blue-400 text-[15px] py-2 active:opacity-60 transition-opacity"
            >
              &larr; Change Customer
            </button>
          </div>
        )}

        {/* Step 3: Add Rooms */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            {customerId && <SelectedCustomerBadge customerId={customerId} />}

            <div className="flex items-center justify-between">
              <p className="text-white/70 text-[15px]">
                {formatServiceType(serviceType)} — add each area or room.
              </p>
            </div>

            {/* Room Form */}
            {showRoomForm ? (
              <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4">
                <h3 className="text-white font-semibold text-[15px] mb-4">New Room</h3>
                <RoomForm
                  serviceType={serviceType}
                  laborRate={defaultLaborRate}
                  quoteId={tempQuoteId}
                  onSave={handleRoomSave}
                  onCancel={() => setShowRoomForm(false)}
                />
              </div>
            ) : (
              <button
                onClick={() => setShowRoomForm(true)}
                className="flex items-center gap-3 w-full px-4 py-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] border-dashed active:bg-white/10 transition-colors min-h-[60px]"
              >
                <div className="w-9 h-9 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-orange-400" aria-hidden="true">
                    <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="text-orange-400 font-medium text-[15px]">Add Room / Area</span>
              </button>
            )}

            {/* Rooms list */}
            {rooms.length > 0 && !showRoomForm && (
              <div className="flex flex-col gap-2">
                <p className="text-white/40 text-[12px] font-semibold uppercase tracking-widest">Added Rooms</p>
                {rooms.map((room) => (
                  <RoomCard key={room.id} room={room} onDelete={handleDeleteRoom} />
                ))}
              </div>
            )}

            {/* Running total */}
            {!showRoomForm && (
              <RunningTotal
                rooms={rooms}
                laborRate={defaultLaborRate}
                markupPercent={defaultMarkupPercent}
              />
            )}

            {/* Navigation */}
            {!showRoomForm && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setStep(4)}
                  disabled={rooms.length === 0}
                  className="w-full py-4 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform disabled:opacity-40 shadow-lg shadow-orange-900/30"
                >
                  Review Quote &rarr;
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="text-blue-400 text-[15px] py-2 active:opacity-60 transition-opacity"
                >
                  &larr; Change Service Type
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            {customerId && <SelectedCustomerBadge customerId={customerId} />}

            <QuoteSummary
              quote={previewQuote}
              rooms={rooms}
            />

            {saveError && (
              <p className="text-rose-400 text-[14px] font-medium text-center">{saveError}</p>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={handleSaveQuote}
                disabled={saving}
                className="w-full py-4 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform disabled:opacity-50 shadow-lg shadow-orange-900/30"
              >
                {saving ? "Saving…" : "Save Quote"}
              </button>
              <button
                disabled
                className="w-full py-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-white/40 font-medium text-[15px] cursor-not-allowed"
              >
                Send Quote (Coming Soon)
              </button>
              <button
                onClick={() => setStep(3)}
                className="text-blue-400 text-[15px] py-2 active:opacity-60 transition-opacity"
              >
                &larr; Add More Rooms
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function NewQuotePage() {
  return (
    <Suspense fallback={
      <AppShell showBack title="New Quote">
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-orange-400 animate-spin" />
        </div>
      </AppShell>
    }>
      <NewQuotePageInner />
    </Suspense>
  );
}
