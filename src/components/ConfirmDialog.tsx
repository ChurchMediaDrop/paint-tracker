"use client";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-8"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-sm rounded-2xl bg-[#1c1c1e] border border-white/[0.12] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-6 pb-2 text-center">
          <h2 className="text-white font-semibold text-[17px] mb-1.5">{title}</h2>
          <p className="text-white/60 text-[14px] leading-relaxed">{message}</p>
        </div>
        <div className="flex border-t border-white/[0.08] mt-4">
          <button
            onClick={onCancel}
            className="flex-1 py-4 text-white/70 font-medium text-[16px] active:bg-white/[0.06] transition-colors border-r border-white/[0.08]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-4 text-emerald-400 font-semibold text-[16px] active:bg-white/[0.06] transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
