-- Paint Tracker Supabase Schema
-- Run this in the Supabase SQL Editor after creating your project.

create table customers (
  id text primary key,
  name text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table jobs (
  id text primary key,
  customer_id text not null default '',
  service_type text not null default '',
  status text not null default '',
  scheduled_date text not null default '',
  estimated_duration numeric not null default 0,
  address text not null default '',
  notes text not null default '',
  google_calendar_event_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table quotes (
  id text primary key,
  job_id text not null default '',
  labor_rate numeric not null default 0,
  markup_percent numeric not null default 0,
  total_materials numeric not null default 0,
  total_labor numeric not null default 0,
  total_price numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table rooms (
  id text primary key,
  quote_id text not null default '',
  name text not null default '',
  service_type text not null default '',
  room_type text not null default '',
  length numeric,
  width numeric,
  height numeric,
  door_count integer not null default 0,
  window_count integer not null default 0,
  surface_type text,
  paint_color text not null default '',
  paint_brand text not null default '',
  finish_type text,
  coats integer not null default 1,
  price_per_gallon numeric,
  include_trim BOOLEAN DEFAULT false,
  include_doors BOOLEAN DEFAULT false,
  ceiling_color TEXT DEFAULT '',
  ceiling_brand TEXT DEFAULT '',
  ceiling_finish TEXT,
  ceiling_price_per_gallon REAL,
  trim_color TEXT DEFAULT '',
  trim_brand TEXT DEFAULT '',
  trim_finish TEXT,
  trim_price_per_gallon REAL,
  paintable_sq_ft numeric not null default 0,
  gallons_needed numeric not null default 0,
  estimated_labor_hours numeric not null default 0,
  material_cost numeric not null default 0,
  labor_cost numeric not null default 0,
  description text not null default '',
  manual_hours numeric,
  manual_cost numeric,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table actuals (
  id text primary key,
  job_id text not null default '',
  actual_hours numeric not null default 0,
  actual_materials_cost numeric not null default 0,
  actual_gallons_used numeric not null default 0,
  notes text not null default '',
  completed_at text not null default '',
  updated_at timestamptz not null default now()
);

create table message_templates (
  id text primary key,
  name text not null default '',
  channel text not null default '',
  subject text not null default '',
  body text not null default '',
  is_default boolean not null default false,
  updated_at timestamptz not null default now()
);

create table paint_presets (
  id text primary key,
  surface_type text not null default '',
  coverage_rate numeric not null default 0,
  labor_rate numeric not null default 0,
  is_default boolean not null default false,
  updated_at timestamptz not null default now()
);

create table app_settings (
  id text primary key,
  default_labor_rate numeric not null default 50,
  default_markup_percent numeric not null default 20,
  backup_reminder_days integer not null default 30,
  last_backup_date text not null default '',
  google_calendar_connected boolean not null default false,
  google_calendar_token text not null default ''
);

-- Create indexes for sync queries (filter by updated_at)
create index idx_customers_updated_at on customers (updated_at);
create index idx_jobs_updated_at on jobs (updated_at);
create index idx_quotes_updated_at on quotes (updated_at);
create index idx_rooms_updated_at on rooms (updated_at);
create index idx_actuals_updated_at on actuals (updated_at);
create index idx_message_templates_updated_at on message_templates (updated_at);
create index idx_paint_presets_updated_at on paint_presets (updated_at);
