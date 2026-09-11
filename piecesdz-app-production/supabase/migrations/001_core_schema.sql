-- =============================================================================
-- PiecesDZ — Production Database Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- EXTENSIONS
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- ENUM TYPES
-- -----------------------------------------------------------------------------
do $$ begin
  create type shop_category as enum ('new_parts', 'wrecker', 'bodywork', 'mechanical', 'accessories');
exception when duplicate_object then null; end $$;

do $$ begin
  create type part_condition as enum ('new', 'original', 'used', 'aftermarket');
exception when duplicate_object then null; end $$;

do $$ begin
  create type request_status as enum ('pending', 'found', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type news_tag as enum ('arrival', 'promo', 'clearance');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- PROFILES
-- One row per authenticated user (customer or shop owner). Created
-- automatically via trigger when a new auth.users row appears.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  phone text,
  is_shop_owner boolean not null default false,
  wilaya text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -----------------------------------------------------------------------------
-- SHOPS
-- One shop per owner (a user can register at most one shop in this schema;
-- relax the unique constraint if you want multi-shop owners).
-- -----------------------------------------------------------------------------
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  phone text not null,
  wilaya text not null,
  address text not null,
  maps_link text,
  category shop_category not null,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);

create index if not exists shops_wilaya_idx on public.shops (wilaya);
create index if not exists shops_category_idx on public.shops (category);

alter table public.shops enable row level security;

drop policy if exists "Shops are viewable by everyone" on public.shops;
create policy "Shops are viewable by everyone"
  on public.shops for select
  using (true);

drop policy if exists "Owners can insert their own shop" on public.shops;
create policy "Owners can insert their own shop"
  on public.shops for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Owners can update their own shop" on public.shops;
create policy "Owners can update their own shop"
  on public.shops for update
  using (auth.uid() = owner_id);

drop policy if exists "Owners can delete their own shop" on public.shops;
create policy "Owners can delete their own shop"
  on public.shops for delete
  using (auth.uid() = owner_id);

-- Keep profiles.is_shop_owner in sync
create or replace function public.mark_profile_as_shop_owner()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set is_shop_owner = true, updated_at = now() where id = new.owner_id;
  return new;
end;
$$;

drop trigger if exists on_shop_created on public.shops;
create trigger on_shop_created
  after insert on public.shops
  for each row execute procedure public.mark_profile_as_shop_owner();

-- -----------------------------------------------------------------------------
-- PART REQUESTS
-- Submitted by customers. matched_shop_ids is computed at insert time
-- (wilaya match or all_algeria) so shop dashboards can filter cheaply.
-- -----------------------------------------------------------------------------
create table if not exists public.part_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  brand text not null,
  model text not null,
  year int not null,
  category text not null,
  part_name text not null,
  wilaya text not null,
  all_algeria boolean not null default false,
  status request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists part_requests_customer_idx on public.part_requests (customer_id);
create index if not exists part_requests_wilaya_idx on public.part_requests (wilaya);
create index if not exists part_requests_status_idx on public.part_requests (status);

alter table public.part_requests enable row level security;

-- Customers see their own requests. Shop owners can see requests that match
-- their shop's wilaya (or are all-Algeria) so they can respond — this mirrors
-- the "notify matching shops" behavior without needing a fan-out table.
drop policy if exists "Customers view their own requests" on public.part_requests;
create policy "Customers view their own requests"
  on public.part_requests for select
  using (auth.uid() = customer_id);

drop policy if exists "Shops view matching requests" on public.part_requests;
create policy "Shops view matching requests"
  on public.part_requests for select
  using (
    exists (
      select 1 from public.shops s
      where s.owner_id = auth.uid()
        and (part_requests.all_algeria = true or s.wilaya = part_requests.wilaya)
    )
  );

drop policy if exists "Customers can insert their own requests" on public.part_requests;
create policy "Customers can insert their own requests"
  on public.part_requests for insert
  with check (auth.uid() = customer_id);

drop policy if exists "Customers can update their own requests" on public.part_requests;
create policy "Customers can update their own requests"
  on public.part_requests for update
  using (auth.uid() = customer_id);

-- -----------------------------------------------------------------------------
-- SHOP RESPONSES
-- One response per (request, shop). Written exclusively by the shop owner
-- clicking "Mark available" — never generated automatically.
-- -----------------------------------------------------------------------------
create table if not exists public.shop_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.part_requests(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  price numeric(10,2),
  condition part_condition not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, shop_id)
);

create index if not exists shop_responses_request_idx on public.shop_responses (request_id);
create index if not exists shop_responses_shop_idx on public.shop_responses (shop_id);

alter table public.shop_responses enable row level security;

-- The requesting customer can read responses to their own request.
drop policy if exists "Customers view responses to their requests" on public.shop_responses;
create policy "Customers view responses to their requests"
  on public.shop_responses for select
  using (
    exists (
      select 1 from public.part_requests r
      where r.id = shop_responses.request_id and r.customer_id = auth.uid()
    )
  );

-- A shop owner can read/write their own shop's responses.
drop policy if exists "Shop owners view their own responses" on public.shop_responses;
create policy "Shop owners view their own responses"
  on public.shop_responses for select
  using (
    exists (select 1 from public.shops s where s.id = shop_responses.shop_id and s.owner_id = auth.uid())
  );

drop policy if exists "Shop owners can insert responses" on public.shop_responses;
create policy "Shop owners can insert responses"
  on public.shop_responses for insert
  with check (
    exists (select 1 from public.shops s where s.id = shop_responses.shop_id and s.owner_id = auth.uid())
  );

drop policy if exists "Shop owners can update their responses" on public.shop_responses;
create policy "Shop owners can update their responses"
  on public.shop_responses for update
  using (
    exists (select 1 from public.shops s where s.id = shop_responses.shop_id and s.owner_id = auth.uid())
  );

-- When a response is inserted, flip the parent request to 'found'.
create or replace function public.mark_request_found()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.part_requests
    set status = 'found', updated_at = now()
    where id = new.request_id and status = 'pending';
  return new;
end;
$$;

drop trigger if exists on_response_created on public.shop_responses;
create trigger on_response_created
  after insert on public.shop_responses
  for each row execute procedure public.mark_request_found();

-- -----------------------------------------------------------------------------
-- NEWS POSTS
-- Published exclusively by authenticated shop owners for their own shop.
-- -----------------------------------------------------------------------------
create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  title text not null,
  body text,
  tag news_tag not null default 'arrival',
  created_at timestamptz not null default now()
);

create index if not exists news_posts_shop_idx on public.news_posts (shop_id);
create index if not exists news_posts_created_idx on public.news_posts (created_at desc);

alter table public.news_posts enable row level security;

drop policy if exists "News is viewable by everyone" on public.news_posts;
create policy "News is viewable by everyone"
  on public.news_posts for select
  using (true);

drop policy if exists "Shop owners can publish news for their shop" on public.news_posts;
create policy "Shop owners can publish news for their shop"
  on public.news_posts for insert
  with check (
    exists (select 1 from public.shops s where s.id = news_posts.shop_id and s.owner_id = auth.uid())
  );

drop policy if exists "Shop owners can delete their own news" on public.news_posts;
create policy "Shop owners can delete their own news"
  on public.news_posts for delete
  using (
    exists (select 1 from public.shops s where s.id = news_posts.shop_id and s.owner_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- REVIEWS
-- Customer-to-shop, 5-star + text. One review per (customer, shop) — editable,
-- not stackable, to keep the average honest per relationship.
-- -----------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid references public.part_requests(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, customer_id)
);

create index if not exists reviews_shop_idx on public.reviews (shop_id);

alter table public.reviews enable row level security;

drop policy if exists "Reviews are viewable by everyone" on public.reviews;
create policy "Reviews are viewable by everyone"
  on public.reviews for select
  using (true);

drop policy if exists "Customers can insert their own review" on public.reviews;
create policy "Customers can insert their own review"
  on public.reviews for insert
  with check (auth.uid() = customer_id);

drop policy if exists "Customers can update their own review" on public.reviews;
create policy "Customers can update their own review"
  on public.reviews for update
  using (auth.uid() = customer_id);

drop policy if exists "Customers can delete their own review" on public.reviews;
create policy "Customers can delete their own review"
  on public.reviews for delete
  using (auth.uid() = customer_id);

-- -----------------------------------------------------------------------------
-- COMPUTED RATING VIEW
-- Average rating + count per shop, computed strictly from real reviews.
-- Exposed as a view so the client never trusts a cached column.
-- -----------------------------------------------------------------------------
create or replace view public.shop_ratings as
select
  shop_id,
  round(avg(rating)::numeric, 2) as avg_rating,
  count(*) as review_count
from public.reviews
group by shop_id;

-- -----------------------------------------------------------------------------
-- BLOCKED SHOPS
-- Per-customer block list, persisted server-side (not localStorage) so it
-- follows the user across devices.
-- -----------------------------------------------------------------------------
create table if not exists public.blocked_shops (
  customer_id uuid not null references public.profiles(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, shop_id)
);

alter table public.blocked_shops enable row level security;

drop policy if exists "Users manage their own blocked list" on public.blocked_shops;
create policy "Users manage their own blocked list"
  on public.blocked_shops for all
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);

-- -----------------------------------------------------------------------------
-- updated_at helper trigger (generic, reused across tables)
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.shops;
create trigger set_updated_at before update on public.shops
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.part_requests;
create trigger set_updated_at before update on public.part_requests
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.shop_responses;
create trigger set_updated_at before update on public.shop_responses
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.reviews;
create trigger set_updated_at before update on public.reviews
  for each row execute procedure public.set_updated_at();

-- -----------------------------------------------------------------------------
-- REALTIME
-- Enable realtime replication for the tables the client subscribes to.
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.part_requests;
alter publication supabase_realtime add table public.shop_responses;
alter publication supabase_realtime add table public.news_posts;

-- =============================================================================
-- End of schema. No seed data is inserted — the platform starts empty by
-- design (see requirement: no mock/dummy data).
-- =============================================================================
