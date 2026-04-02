"use client";

import { useState, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import AppShell from "@/components/AppShell";
import {
  useSettings,
  updateSettings,
  usePaintPresets,
  updatePaintPreset,
  useMessageTemplates,
  updateMessageTemplate,
  createMessageTemplate,
  deleteMessageTemplate,
} from "@/hooks/useSettings";
import { exportDatabase, importDatabase, downloadJson } from "@/lib/backup";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { syncWithCloud } from "@/lib/sync";
import { formatSurfaceType, formatServiceType } from "@/lib/format";
import { MessageChannel, SurfaceType, ServiceType } from "@/lib/types";
import type { MessageTemplate, PaintPreset } from "@/lib/types";
import { db } from "@/lib/db";

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-1 pt-2 pb-1">
      <h2 className="text-white/50 text-[12px] font-semibold uppercase tracking-widest">{title}</h2>
    </div>
  );
}

// ─── Defaults Section ─────────────────────────────────────────────────────────
function DefaultsSection() {
  const settings = useSettings();
  const [laborRate, setLaborRate] = useState<string>("");
  const [markupPercent, setMarkupPercent] = useState<string>("");
  const [laborSaved, setLaborSaved] = useState(false);
  const [markupSaved, setMarkupSaved] = useState(false);

  // Initialize from settings once loaded
  const [initialized, setInitialized] = useState(false);
  if (settings && !initialized) {
    setLaborRate(String(settings.defaultLaborRate ?? 65));
    setMarkupPercent(String(settings.defaultMarkupPercent ?? 15));
    setInitialized(true);
  }

  async function saveLaborRate() {
    const val = parseFloat(laborRate);
    if (isNaN(val)) return;
    await updateSettings({ defaultLaborRate: val });
    setLaborSaved(true);
    setTimeout(() => setLaborSaved(false), 1500);
  }

  async function saveMarkup() {
    const val = parseFloat(markupPercent);
    if (isNaN(val)) return;
    await updateSettings({ defaultMarkupPercent: val });
    setMarkupSaved(true);
    setTimeout(() => setMarkupSaved(false), 1500);
  }

  return (
    <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] overflow-hidden">
      {/* Labor Rate row */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.05]">
        <div className="min-w-0">
          <p className="text-white text-[15px]">Labor Rate</p>
          <p className="text-white/40 text-[12px]">$/hour</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-[15px]">$</span>
          <input
            type="number"
            inputMode="decimal"
            value={laborRate}
            onChange={(e) => { setLaborRate(e.target.value); setLaborSaved(false); }}
            onBlur={saveLaborRate}
            className="w-20 bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2 text-white text-[15px] text-right focus:outline-none focus:border-emerald-500/60"
          />
          {laborSaved && <span className="text-emerald-400 text-[12px] font-medium">Saved</span>}
        </div>
      </div>

      {/* Markup row */}
      <div className="flex items-center justify-between px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-white text-[15px]">Default Markup</p>
          <p className="text-white/40 text-[12px]">percentage</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={markupPercent}
            onChange={(e) => { setMarkupPercent(e.target.value); setMarkupSaved(false); }}
            onBlur={saveMarkup}
            className="w-20 bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2 text-white text-[15px] text-right focus:outline-none focus:border-emerald-500/60"
          />
          <span className="text-white/40 text-[15px]">%</span>
          {markupSaved && <span className="text-emerald-400 text-[12px] font-medium">Saved</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Paint Preset Row ─────────────────────────────────────────────────────────
function PresetRow({ preset }: { preset: PaintPreset }) {
  const [editing, setEditing] = useState(false);
  const [coverageRate, setCoverageRate] = useState(String(preset.coverageRate));
  const [laborRate, setLaborRate] = useState(String(preset.laborRate));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    const coverage = parseFloat(coverageRate);
    const labor = parseFloat(laborRate);
    if (isNaN(coverage) || isNaN(labor)) return;
    setSaving(true);
    try {
      await updatePaintPreset(preset.id, { coverageRate: coverage, laborRate: labor });
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 py-3.5 border-b border-white/[0.05] last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-white text-[14px] font-medium truncate">
            {formatSurfaceType(preset.surfaceType)}
          </p>
          {!editing && (
            <p className="text-white/40 text-[12px] mt-0.5">
              {preset.coverageRate} sq ft/gal · {preset.laborRate} sq ft/hr
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {saved && <span className="text-emerald-400 text-[12px] font-medium">Saved</span>}
          {editing ? (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 rounded-lg bg-white/[0.08] text-white/60 text-[13px] font-medium active:bg-white/15 min-h-[34px]"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[13px] font-semibold border border-emerald-500/30 active:bg-emerald-500/30 disabled:opacity-50 min-h-[34px]"
              >
                {saving ? "…" : "Save"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-blue-400 text-[14px] font-medium active:opacity-60 transition-opacity min-h-[44px] px-2"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div>
            <label className="block text-white/40 text-[11px] font-medium mb-1">Coverage (sq ft/gal)</label>
            <input
              type="number"
              inputMode="decimal"
              value={coverageRate}
              onChange={(e) => setCoverageRate(e.target.value)}
              className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2 text-white text-[14px] focus:outline-none focus:border-emerald-500/60"
            />
          </div>
          <div>
            <label className="block text-white/40 text-[11px] font-medium mb-1">Labor (sq ft/hr)</label>
            <input
              type="number"
              inputMode="decimal"
              value={laborRate}
              onChange={(e) => setLaborRate(e.target.value)}
              className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2 text-white text-[14px] focus:outline-none focus:border-emerald-500/60"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Message Template Row ─────────────────────────────────────────────────────
function TemplateRow({ template, onDeleted }: { template: MessageTemplate; onDeleted: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(template.name);
  const [channel, setChannel] = useState<MessageChannel>(template.channel);
  const [subject, setSubject] = useState(template.subject ?? "");
  const [body, setBody] = useState(template.body);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function save() {
    if (!name.trim() || !body.trim()) return;
    setSaving(true);
    try {
      await updateMessageTemplate(template.id, { name: name.trim(), channel, subject: subject.trim(), body: body.trim() });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    await deleteMessageTemplate(template.id);
    onDeleted();
  }

  return (
    <div className="px-4 py-3.5 border-b border-white/[0.05] last:border-b-0">
      {!editing ? (
        <div className="flex items-start gap-3">
          <div
            className={[
              "flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border mt-0.5",
              template.channel === "sms"
                ? "bg-green-500/15 text-green-300 border-green-500/25"
                : "bg-blue-500/15 text-blue-300 border-blue-500/25",
            ].join(" ")}
          >
            {template.channel === "sms" ? "SMS" : "Email"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[14px] font-medium truncate">{template.name}</p>
            <p className="text-white/40 text-[12px] mt-0.5 line-clamp-2">{template.body}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="text-blue-400 text-[14px] font-medium active:opacity-60 transition-opacity min-h-[44px] px-1"
            >
              Edit
            </button>
            {!template.isDefault && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-500/15 border border-rose-500/20 text-rose-400 active:bg-rose-500/30 transition-colors"
                aria-label="Delete template"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-white/40 text-[11px] font-medium mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2 text-white text-[14px] focus:outline-none focus:border-blue-500/60"
              />
            </div>
            <div>
              <label className="block text-white/40 text-[11px] font-medium mb-1">Channel</label>
              <div className="relative">
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as MessageChannel)}
                  className="w-full appearance-none bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2 text-white text-[14px] focus:outline-none focus:border-blue-500/60 pr-7"
                >
                  <option value={MessageChannel.SMS} className="bg-neutral-900">SMS</option>
                  <option value={MessageChannel.Email} className="bg-neutral-900">Email</option>
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40">
                  <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
                    <path d="M1 1L5 6L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          {channel === MessageChannel.Email && (
            <div>
              <label className="block text-white/40 text-[11px] font-medium mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2 text-white text-[14px] focus:outline-none focus:border-blue-500/60"
              />
            </div>
          )}
          <div>
            <label className="block text-white/40 text-[11px] font-medium mb-1">
              Body — use {"{customer_name}"}, {"{service_type}"}, {"{job_total}"}, {"{scheduled_date}"}, {"{job_address}"}
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white text-[14px] focus:outline-none focus:border-blue-500/60 resize-none leading-relaxed"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setEditing(false); setName(template.name); setChannel(template.channel); setSubject(template.subject ?? ""); setBody(template.body); }}
              className="flex-1 py-3 rounded-xl bg-white/[0.08] text-white/60 font-medium text-[14px] active:bg-white/15"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !name.trim() || !body.trim()}
              className="flex-1 py-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold text-[14px] active:scale-[0.98] transition-transform disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="mt-3 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 flex flex-col gap-2">
          <p className="text-rose-300 text-[13px] text-center font-medium">Delete "{template.name}"?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-2.5 rounded-xl bg-white/[0.08] text-white/60 font-medium text-[13px]"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white font-semibold text-[13px]"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add Template Form ────────────────────────────────────────────────────────
function AddTemplateForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<MessageChannel>(MessageChannel.SMS);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) { setError("Name is required."); return; }
    if (!body.trim()) { setError("Body is required."); return; }
    setSaving(true);
    try {
      await createMessageTemplate({
        name: name.trim(),
        channel,
        subject: subject.trim(),
        body: body.trim(),
        isDefault: false,
      });
      onDone();
    } catch {
      setError("Failed to create template.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4 flex flex-col gap-3">
      <h3 className="text-white font-semibold text-[15px]">New Template</h3>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-white/40 text-[11px] font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2 text-white text-[14px] focus:outline-none focus:border-blue-500/60"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-white/40 text-[11px] font-medium mb-1">Channel</label>
          <div className="relative">
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as MessageChannel)}
              className="w-full appearance-none bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2 text-white text-[14px] focus:outline-none focus:border-blue-500/60 pr-7"
            >
              <option value={MessageChannel.SMS} className="bg-neutral-900">SMS</option>
              <option value={MessageChannel.Email} className="bg-neutral-900">Email</option>
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40">
              <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
                <path d="M1 1L5 6L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
      {channel === MessageChannel.Email && (
        <div>
          <label className="block text-white/40 text-[11px] font-medium mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2 text-white text-[14px] focus:outline-none focus:border-blue-500/60"
          />
        </div>
      )}
      <div>
        <label className="block text-white/40 text-[11px] font-medium mb-1">
          Body
        </label>
        <textarea
          value={body}
          onChange={(e) => { setBody(e.target.value); setError(""); }}
          rows={4}
          placeholder="Hi {customer_name}, your {service_type} is scheduled for {scheduled_date}…"
          className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white text-[14px] placeholder-white/25 focus:outline-none focus:border-blue-500/60 resize-none leading-relaxed"
        />
      </div>
      {error && <p className="text-rose-400 text-[13px]">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={onDone}
          className="flex-1 py-3 rounded-xl bg-white/[0.08] text-white/60 font-medium text-[14px] active:bg-white/15"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold text-[14px] active:scale-[0.98] transition-transform disabled:opacity-40"
        >
          {saving ? "Saving…" : "Create Template"}
        </button>
      </div>
    </div>
  );
}

// ─── Cloud Sync Section ───────────────────────────────────────────────────────
function CloudSyncSection() {
  const syncStatus = useSyncStatus();
  const [syncing, setSyncing] = useState(false);

  async function handleSyncNow() {
    setSyncing(true);
    await syncWithCloud();
    setSyncing(false);
  }

  return (
    <>
      <SectionHeader title="Cloud Sync" />
      <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-[14px] font-medium">Last Synced</p>
            <p className="text-white/40 text-[13px] mt-0.5">
              {syncStatus.lastSynced
                ? syncStatus.lastSynced.toLocaleString()
                : "Never"}
            </p>
          </div>
          <button
            onClick={handleSyncNow}
            disabled={syncing || syncStatus.syncing}
            className="px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[14px] font-medium active:bg-blue-500/30 transition-colors disabled:opacity-50"
          >
            {syncing || syncStatus.syncing ? "Syncing…" : "Sync Now"}
          </button>
        </div>
        {syncStatus.error && (
          <p className="text-amber-400/80 text-[12px]">
            Sync issue: {syncStatus.error}. Will retry automatically.
          </p>
        )}
        {!process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <p className="text-white/30 text-[12px]">
            Cloud sync not configured. Add Supabase credentials to enable.
          </p>
        )}
      </div>
    </>
  );
}

// ─── Accuracy Stats Section ───────────────────────────────────────────────────
function AccuracyStats() {
  const data = useLiveQuery(async () => {
    const actuals = await db.actuals.toArray();
    if (!actuals.length) return null;

    const results: { serviceType: ServiceType; hoursVariancePct: number }[] = [];
    for (const actual of actuals) {
      const job = await db.jobs.get(actual.jobId);
      if (!job) continue;
      const quote = await db.quotes.where("jobId").equals(actual.jobId).first();
      if (!quote || !quote.totalLabor || !quote.laborRate) continue;
      const quotedHours = quote.totalLabor / quote.laborRate;
      if (!quotedHours) continue;
      const variancePct = ((actual.actualHours - quotedHours) / quotedHours) * 100;
      results.push({ serviceType: job.serviceType, hoursVariancePct: variancePct });
    }
    return results;
  });

  if (!data || data.length === 0) return null;

  // Group by service type
  const byServiceType = new Map<ServiceType, number[]>();
  for (const r of data) {
    const existing = byServiceType.get(r.serviceType) ?? [];
    existing.push(r.hoursVariancePct);
    byServiceType.set(r.serviceType, existing);
  }

  const summaries = Array.from(byServiceType.entries()).map(([serviceType, variances]) => {
    const avg = variances.reduce((a, b) => a + b, 0) / variances.length;
    return { serviceType, avg, count: variances.length };
  });

  return (
    <>
      <SectionHeader title="Accuracy Stats" />
      <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] overflow-hidden">
        {summaries.map((s, idx) => {
          const isOver = s.avg > 0;
          const isUnder = s.avg < 0;
          return (
            <div
              key={s.serviceType}
              className={`px-4 py-3.5 flex items-center justify-between gap-3 ${idx < summaries.length - 1 ? "border-b border-white/[0.05]" : ""}`}
            >
              <div className="min-w-0">
                <p className="text-white text-[14px] font-medium truncate">
                  {formatServiceType(s.serviceType)}
                </p>
                <p className="text-white/40 text-[12px]">{s.count} job{s.count !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p
                  className={[
                    "text-[15px] font-semibold tabular-nums",
                    isOver ? "text-rose-400" : isUnder ? "text-emerald-400" : "text-white/60",
                  ].join(" ")}
                >
                  {s.avg >= 0 ? "+" : ""}{s.avg.toFixed(1)}%
                </p>
                <p className="text-white/40 text-[11px]">
                  {isOver ? "over on hours" : isUnder ? "under on hours" : "on target"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const settings = useSettings();
  const presets = usePaintPresets();
  const templates = useMessageTemplates();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [exportStatus, setExportStatus] = useState<"idle" | "exporting" | "done">("idle");
  const [importStatus, setImportStatus] = useState<"idle" | "importing" | "done" | "error">("idle");
  const [backupFrequency, setBackupFrequency] = useState<string>("");
  const [backupFreqInitialized, setBackupFreqInitialized] = useState(false);

  if (settings && !backupFreqInitialized) {
    setBackupFrequency(String(settings.backupReminderDays ?? 14));
    setBackupFreqInitialized(true);
  }

  async function handleExport() {
    setExportStatus("exporting");
    try {
      const json = await exportDatabase();
      const today = new Date().toISOString().split("T")[0];
      downloadJson(json, `paint-tracker-backup-${today}.json`);
      await updateSettings({ lastBackupDate: new Date().toISOString() });
      setExportStatus("done");
      setTimeout(() => setExportStatus("idle"), 2500);
    } catch {
      setExportStatus("idle");
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus("importing");
    try {
      const text = await file.text();
      await importDatabase(text);
      setImportStatus("done");
      alert("Data imported successfully. The app will reflect the new data shortly.");
      setTimeout(() => setImportStatus("idle"), 2500);
    } catch (err) {
      setImportStatus("error");
      alert(`Import failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      setTimeout(() => setImportStatus("idle"), 3000);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleBackupFrequencyChange(val: string) {
    setBackupFrequency(val);
    const days = parseInt(val);
    if (!isNaN(days)) {
      await updateSettings({ backupReminderDays: days });
    }
  }

  return (
    <AppShell showBack title="Settings">
      <div className="flex flex-col px-4 pb-28 pt-4 gap-3">

        {/* ── Cloud Sync ── */}
        <CloudSyncSection />

        {/* ── Defaults ── */}
        <SectionHeader title="Defaults" />
        <DefaultsSection />

        {/* ── Paint Presets ── */}
        <SectionHeader title="Paint Presets" />
        <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] overflow-hidden">
          {presets.length === 0 ? (
            <p className="px-4 py-4 text-white/40 text-[14px]">No presets found.</p>
          ) : (
            presets.map((preset) => <PresetRow key={preset.id} preset={preset} />)
          )}
        </div>

        {/* ── Message Templates ── */}
        <SectionHeader title="Message Templates" />
        {templates.length > 0 && (
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] overflow-hidden">
            {templates.map((t) => (
              <TemplateRow key={t.id} template={t} onDeleted={() => {}} />
            ))}
          </div>
        )}

        {showAddTemplate ? (
          <AddTemplateForm onDone={() => setShowAddTemplate(false)} />
        ) : (
          <button
            onClick={() => setShowAddTemplate(true)}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] border-dashed text-blue-400 font-medium text-[15px] active:bg-white/10 transition-colors min-h-[56px]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Add Template
          </button>
        )}

        {/* ── Google Calendar ── */}
        <SectionHeader title="Google Calendar" />
        <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-white text-[15px] font-medium">Google Calendar</p>
            <p className="text-white/40 text-[13px] mt-0.5">Not connected</p>
          </div>
          <button
            disabled
            className="px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/30 font-medium text-[14px] cursor-not-allowed"
            title="Coming soon"
          >
            Connect
          </button>
        </div>
        <p className="text-white/30 text-[12px] text-center -mt-1">Google Calendar integration coming soon</p>

        {/* ── Backup & Restore ── */}
        <SectionHeader title="Backup & Restore" />
        <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] overflow-hidden">
          {/* Last backup */}
          <div className="px-4 py-3.5 border-b border-white/[0.05] flex items-center justify-between">
            <p className="text-white/60 text-[14px]">Last Backup</p>
            <p className="text-white text-[14px]">
              {settings?.lastBackupDate
                ? new Date(settings.lastBackupDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "Never"}
            </p>
          </div>

          {/* Backup frequency */}
          <div className="px-4 py-3.5 border-b border-white/[0.05] flex items-center justify-between gap-3">
            <p className="text-white/60 text-[14px]">Remind me every</p>
            <div className="relative">
              <select
                value={backupFrequency}
                onChange={(e) => handleBackupFrequencyChange(e.target.value)}
                className="appearance-none bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2 text-white text-[14px] focus:outline-none focus:border-emerald-500/60 pr-8"
              >
                <option value="7" className="bg-neutral-900">7 days</option>
                <option value="14" className="bg-neutral-900">14 days</option>
                <option value="30" className="bg-neutral-900">30 days</option>
                <option value="60" className="bg-neutral-900">60 days</option>
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40">
                <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
                  <path d="M1 1L5 6L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Export */}
          <div className="px-4 py-3.5 border-b border-white/[0.05]">
            <button
              onClick={handleExport}
              disabled={exportStatus !== "idle"}
              className="w-full py-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 font-semibold text-[15px] active:bg-emerald-500/25 transition-colors disabled:opacity-60 min-h-[52px]"
            >
              {exportStatus === "exporting" ? "Exporting…" : exportStatus === "done" ? "Exported!" : "Export Data"}
            </button>
          </div>

          {/* Import */}
          <div className="px-4 py-3.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="import-file"
            />
            <label
              htmlFor="import-file"
              className={[
                "flex items-center justify-center w-full py-3.5 rounded-xl border font-semibold text-[15px] min-h-[52px] cursor-pointer transition-colors",
                importStatus === "idle"
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-300 active:bg-amber-500/20"
                  : importStatus === "importing"
                  ? "bg-white/[0.06] border-white/[0.08] text-white/40 cursor-not-allowed"
                  : importStatus === "done"
                  ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-300"
                  : "bg-rose-500/15 border-rose-500/25 text-rose-300",
              ].join(" ")}
            >
              {importStatus === "importing" ? "Importing…" : importStatus === "done" ? "Imported!" : importStatus === "error" ? "Import Failed" : "Import Data"}
            </label>
          </div>
        </div>

        {/* ── Accuracy Stats ── */}
        <AccuracyStats />

      </div>
    </AppShell>
  );
}
