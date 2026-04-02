import { db } from "@/lib/db";
import { getSupabase } from "@/lib/supabase";
import type { Table } from "dexie";

// ---------------------------------------------------------------------------
// Sync state
// ---------------------------------------------------------------------------

interface SyncStatus {
  syncing: boolean;
  lastSynced: Date | null;
  error: string | null;
}

type SyncListener = (status: SyncStatus) => void;

const currentState: SyncStatus = {
  syncing: false,
  lastSynced: null,
  error: null,
};

const listeners = new Set<SyncListener>();

function notify(patch: Partial<SyncStatus>): void {
  Object.assign(currentState, patch);
  for (const fn of listeners) {
    fn({ ...currentState });
  }
}

export function subscribeSyncStatus(fn: SyncListener): () => void {
  listeners.add(fn);
  fn({ ...currentState }); // call immediately with current state
  return () => listeners.delete(fn);
}

// ---------------------------------------------------------------------------
// Key mappers
// ---------------------------------------------------------------------------

function camelToSnake(key: string): string {
  return key.replace(/([A-Z])/g, (_, c: string) => `_${c.toLowerCase()}`);
}

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function toSupabase(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    out[camelToSnake(k)] = v;
  }
  return out;
}

function fromSupabase(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    out[snakeToCamel(k)] = v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Table config
// ---------------------------------------------------------------------------

interface TableConfig {
  dexieTable: string;
  supabaseTable: string;
  toSupabase: (r: Record<string, unknown>) => Record<string, unknown>;
  fromSupabase: (r: Record<string, unknown>) => Record<string, unknown>;
}

const SYNCED_TABLES: TableConfig[] = [
  { dexieTable: "customers",        supabaseTable: "customers",         toSupabase, fromSupabase },
  { dexieTable: "jobs",             supabaseTable: "jobs",              toSupabase, fromSupabase },
  { dexieTable: "quotes",           supabaseTable: "quotes",            toSupabase, fromSupabase },
  { dexieTable: "rooms",            supabaseTable: "rooms",             toSupabase, fromSupabase },
  { dexieTable: "actuals",          supabaseTable: "actuals",           toSupabase, fromSupabase },
  { dexieTable: "messageTemplates", supabaseTable: "message_templates", toSupabase, fromSupabase },
  { dexieTable: "paintPresets",     supabaseTable: "paint_presets",     toSupabase, fromSupabase },
  { dexieTable: "appSettings",      supabaseTable: "app_settings",      toSupabase, fromSupabase },
];

// ---------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------

async function pushTable(
  config: TableConfig,
  lastSyncTimestamp: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const table = (db as unknown as Record<string, unknown>)[config.dexieTable] as Table<
    Record<string, unknown>,
    string
  >;

  let records: Record<string, unknown>[];

  if (config.dexieTable === "appSettings") {
    // No updatedAt index — always push all
    records = await table.toArray();
  } else {
    records = await table
      .where("updatedAt")
      .above(lastSyncTimestamp)
      .toArray();
  }

  if (records.length === 0) return;

  const mapped = records.map(config.toSupabase);
  const { error } = await supabase
    .from(config.supabaseTable)
    .upsert(mapped, { onConflict: "id" });

  if (error) throw new Error(`Push ${config.supabaseTable}: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Pull
// ---------------------------------------------------------------------------

async function pullTable(
  config: TableConfig,
  lastSyncTimestamp: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const table = (db as unknown as Record<string, unknown>)[config.dexieTable] as Table<
    Record<string, unknown>,
    string
  >;

  let query = supabase.from(config.supabaseTable).select("*");

  if (config.dexieTable !== "appSettings") {
    query = query.gt("updated_at", lastSyncTimestamp);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Pull ${config.supabaseTable}: ${error.message}`);
  if (!data || data.length === 0) return;

  const mapped = (data as Record<string, unknown>[]).map(config.fromSupabase);
  await table.bulkPut(mapped);
}

// ---------------------------------------------------------------------------
// Sync orchestration
// ---------------------------------------------------------------------------

const LAST_SYNC_KEY = "paintTracker_lastSyncTimestamp";
let syncInProgress = false;

export async function syncWithCloud(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || syncInProgress) return;

  syncInProgress = true;
  notify({ syncing: true, error: null });

  try {
    const lastSyncTimestamp =
      localStorage.getItem(LAST_SYNC_KEY) ?? "1970-01-01T00:00:00.000Z";

    const syncStartTime = new Date().toISOString();

    for (const config of SYNCED_TABLES) {
      await pushTable(config, lastSyncTimestamp);
    }

    for (const config of SYNCED_TABLES) {
      await pullTable(config, lastSyncTimestamp);
    }

    localStorage.setItem(LAST_SYNC_KEY, syncStartTime);
    notify({ syncing: false, lastSynced: new Date(), error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sync] syncWithCloud error:", message);
    notify({ syncing: false, error: message });
  } finally {
    syncInProgress = false;
  }
}

// ---------------------------------------------------------------------------
// Debounced trigger
// ---------------------------------------------------------------------------

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSyncDebounced(): void {
  if (!getSupabase()) return;

  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    syncWithCloud();
  }, 2000);
}
