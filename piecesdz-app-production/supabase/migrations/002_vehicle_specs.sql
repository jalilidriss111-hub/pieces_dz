-- =============================================================================
-- PiecesDZ — Vehicle Specifications Schema (migration 002)
-- Run this in the Supabase SQL Editor AFTER schema.sql.
-- Creates the "Spécifications techniques" data model: brands, models,
-- generations, engines, and part references, all normalized so new
-- manufacturers/models/generations/engines can be added indefinitely
-- without any code or schema change.
--
-- This migration inserts ZERO rows. Every table starts empty. The app
-- must display "information not available" whenever a row doesn't
-- exist — never fabricate a spec. Populate real data later via the
-- Supabase table editor, a script, or an admin UI (not built here).
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- ENUM TYPES
-- -----------------------------------------------------------------------------
do $$ begin
  create type fuel_type as enum ('petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type induction_type as enum ('naturally_aspirated', 'turbo', 'supercharged', 'twin_turbo', 'electric', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type drivetrain_type as enum ('fwd', 'rwd', 'awd', '4wd');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transmission_type as enum ('manual', 'automatic', 'cvt', 'dct', 'amt');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- VEHICLE BRANDS
-- One row per manufacturer. `origin_region` is free text (e.g. "French",
-- "Japanese", "Chinese") purely for grouping in the UI — not an enum,
-- because the list of regions/manufacturers is expected to keep growing
-- and should never require a schema change to extend.
-- -----------------------------------------------------------------------------
create table if not exists public.vehicle_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  origin_region text,
  logo_url text,
  created_at timestamptz not null default now()
);

create index if not exists vehicle_brands_name_idx on public.vehicle_brands (name);

alter table public.vehicle_brands enable row level security;

drop policy if exists "Brands are viewable by everyone" on public.vehicle_brands;
create policy "Brands are viewable by everyone"
  on public.vehicle_brands for select
  using (true);

-- Intentionally no insert/update/delete policy for regular users: this
-- reference data is maintained by the platform (service role / admin),
-- not by end users. Add an admin-scoped policy later if a moderation
-- UI is built.

-- -----------------------------------------------------------------------------
-- VEHICLE MODELS
-- One row per model per brand (e.g. Dacia → Logan).
-- -----------------------------------------------------------------------------
create table if not exists public.vehicle_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.vehicle_brands(id) on delete cascade,
  name text not null,
  body_type text,
  created_at timestamptz not null default now(),
  unique (brand_id, name)
);

create index if not exists vehicle_models_brand_idx on public.vehicle_models (brand_id);

alter table public.vehicle_models enable row level security;

drop policy if exists "Models are viewable by everyone" on public.vehicle_models;
create policy "Models are viewable by everyone"
  on public.vehicle_models for select
  using (true);

-- -----------------------------------------------------------------------------
-- VEHICLE GENERATIONS
-- One row per generation/facelift of a model (e.g. Logan Mk2, 2012–2020).
-- year_start/year_end define the production window; year_end null means
-- "still in production" or "unknown end year" — the UI should treat null
-- as open-ended, not as an error.
-- -----------------------------------------------------------------------------
create table if not exists public.vehicle_generations (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.vehicle_models(id) on delete cascade,
  name text not null,
  year_start int not null,
  year_end int,
  doors int,
  seats int,
  created_at timestamptz not null default now(),
  unique (model_id, name)
);

create index if not exists vehicle_generations_model_idx on public.vehicle_generations (model_id);
create index if not exists vehicle_generations_years_idx on public.vehicle_generations (year_start, year_end);

alter table public.vehicle_generations enable row level security;

drop policy if exists "Generations are viewable by everyone" on public.vehicle_generations;
create policy "Generations are viewable by everyone"
  on public.vehicle_generations for select
  using (true);

-- -----------------------------------------------------------------------------
-- VEHICLE ENGINES
-- One row per distinct engine/version available within a generation
-- (e.g. Logan Mk2 → "1.5 dCi 90"). Holds every field the spec sheet
-- needs. All nullable except what's structurally required, since a
-- given real-world engine may have incomplete verified data — the UI
-- must render "information not available" per missing field rather
-- than guessing.
-- -----------------------------------------------------------------------------
create table if not exists public.vehicle_engines (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.vehicle_generations(id) on delete cascade,

  -- General
  engine_name text not null,          -- e.g. "1.5 dCi 90"
  engine_code text,                   -- e.g. "K9K 792"
  engine_family text,

  -- Engine
  fuel_type fuel_type,
  displacement_cc int,
  cylinders int,
  valves int,
  induction induction_type,
  power_hp int,
  power_kw int,
  torque_nm int,
  injection_type text,

  -- Transmission
  transmission_type transmission_type,
  gear_count int,
  drivetrain drivetrain_type,

  -- Dimensions & capacities
  length_mm int,
  width_mm int,
  height_mm int,
  wheelbase_mm int,
  weight_kg int,
  fuel_tank_l numeric(5,1),
  boot_capacity_l int,

  -- Fluids & maintenance
  oil_spec text,
  oil_capacity_l numeric(4,2),
  coolant_spec text,
  brake_fluid_spec text,
  transmission_fluid_spec text,
  service_interval_km int,
  service_interval_months int,

  created_at timestamptz not null default now(),
  unique (generation_id, engine_name)
);

create index if not exists vehicle_engines_generation_idx on public.vehicle_engines (generation_id);
create index if not exists vehicle_engines_code_idx on public.vehicle_engines (engine_code);

alter table public.vehicle_engines enable row level security;

drop policy if exists "Engines are viewable by everyone" on public.vehicle_engines;
create policy "Engines are viewable by everyone"
  on public.vehicle_engines for select
  using (true);

-- -----------------------------------------------------------------------------
-- PART CATEGORIES (for the "Références de pièces courantes" section)
-- A small fixed taxonomy (oil filter, air filter, brake pads, ...). Kept
-- as a table rather than an enum so new part categories can be added
-- without a migration.
-- -----------------------------------------------------------------------------
create table if not exists public.part_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,           -- e.g. "Filtre à huile"
  slug text not null unique            -- e.g. "oil_filter"
);

alter table public.part_categories enable row level security;

drop policy if exists "Part categories are viewable by everyone" on public.part_categories;
create policy "Part categories are viewable by everyone"
  on public.part_categories for select
  using (true);

-- -----------------------------------------------------------------------------
-- VEHICLE PART REFERENCES
-- The actual "which part number fits this exact engine" data. Tied to a
-- specific vehicle_engine (not just a model/generation) so compatibility
-- is never implied beyond what's verified, per the requirement that
-- fitment must be tied to the exact vehicle/engine/version.
-- Multiple rows per (engine, category) are expected — one for OEM, one
-- per aftermarket brand — distinguished by `reference_type`.
-- -----------------------------------------------------------------------------
create table if not exists public.vehicle_part_references (
  id uuid primary key default gen_random_uuid(),
  engine_id uuid not null references public.vehicle_engines(id) on delete cascade,
  category_id uuid not null references public.part_categories(id) on delete cascade,
  reference_type text not null default 'oem',   -- 'oem' | 'aftermarket' | brand name
  brand_name text,                              -- e.g. "Bosch", "Valeo" — null for OEM
  reference_number text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists vehicle_part_refs_engine_idx on public.vehicle_part_references (engine_id);
create index if not exists vehicle_part_refs_category_idx on public.vehicle_part_references (category_id);
create index if not exists vehicle_part_refs_number_idx on public.vehicle_part_references (reference_number);

alter table public.vehicle_part_references enable row level security;

drop policy if exists "Part references are viewable by everyone" on public.vehicle_part_references;
create policy "Part references are viewable by everyone"
  on public.vehicle_part_references for select
  using (true);

-- -----------------------------------------------------------------------------
-- Convenience view: full spec lookup in one query, for the /specs page.
-- Returns one row per engine with its generation/model/brand joined in,
-- so the app can fetch everything for a selected vehicle without N+1
-- queries. Part references are fetched separately (one-to-many) by
-- engine_id.
-- -----------------------------------------------------------------------------
create or replace view public.vehicle_spec_lookup as
select
  b.id as brand_id, b.name as brand_name, b.origin_region,
  m.id as model_id, m.name as model_name, m.body_type,
  g.id as generation_id, g.name as generation_name, g.year_start, g.year_end, g.doors, g.seats,
  e.id as engine_id, e.engine_name, e.engine_code, e.engine_family,
  e.fuel_type, e.displacement_cc, e.cylinders, e.valves, e.induction,
  e.power_hp, e.power_kw, e.torque_nm, e.injection_type,
  e.transmission_type, e.gear_count, e.drivetrain,
  e.length_mm, e.width_mm, e.height_mm, e.wheelbase_mm, e.weight_kg,
  e.fuel_tank_l, e.boot_capacity_l,
  e.oil_spec, e.oil_capacity_l, e.coolant_spec, e.brake_fluid_spec,
  e.transmission_fluid_spec, e.service_interval_km, e.service_interval_months
from public.vehicle_engines e
join public.vehicle_generations g on g.id = e.generation_id
join public.vehicle_models m on m.id = g.model_id
join public.vehicle_brands b on b.id = m.brand_id;

-- =============================================================================
-- No seed data. All six tables above start empty — brands, models,
-- generations, engines, part categories, and part references are added
-- only as verified real-world data, matching the requirement that the
-- app must never display fabricated specifications.
-- =============================================================================
