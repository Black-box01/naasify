-- ============================================================================
-- NAASIFY — BaaS marketplace schema
-- Idempotent: safe to run multiple times in the Supabase SQL Editor.
-- Run this file FIRST, then run supabase/seed.sql.
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ----------------------------------------------------------------------------
-- Profiles (1:1 with auth.users, created by trigger)
-- ----------------------------------------------------------------------------
create table if not exists public.naasify_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email citext not null,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.naasify_profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ----------------------------------------------------------------------------
-- Services (the cloud products NAASIFY sells)
-- ----------------------------------------------------------------------------
create table if not exists public.naasify_services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon_key text not null default 'server',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Plans (per service, or bundle when service_id is NULL)
-- ----------------------------------------------------------------------------
create table if not exists public.naasify_plans (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.naasify_services (id) on delete cascade,
  name text not null,
  billing_cycle text not null check (billing_cycle in ('quarterly', 'half_yearly', 'annual')),
  price numeric(12, 2) not null check (price >= 0),
  currency text not null default 'NGN' check (currency in ('NGN', 'USD')),
  features jsonb not null default '[]'::jsonb,
  is_highlighted boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One plan name per service (NULL service = bundle) per billing cycle.
create unique index if not exists plans_unique_cycle_name
  on public.naasify_plans ((coalesce(service_id, '00000000-0000-0000-0000-000000000000'::uuid)), billing_cycle, name);

-- ----------------------------------------------------------------------------
-- Orders (created at checkout, paid by Paystack webhook / callback)
-- ----------------------------------------------------------------------------
create table if not exists public.naasify_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  plan_id uuid not null references public.naasify_plans (id),
  email citext not null,
  billing_cycle text not null check (billing_cycle in ('quarterly', 'half_yearly', 'annual')),
  amount numeric(12, 2) not null,
  currency text not null default 'NGN',
  paystack_reference text not null unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  paid_at timestamptz,
  raw_event jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Subscriptions (activated from a paid order; unique(order_id) = no double activation)
-- ----------------------------------------------------------------------------
create table if not exists public.naasify_subscriptions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.naasify_orders (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  plan_id uuid not null references public.naasify_plans (id),
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  -- Set by the expiry cron the first time a renewal reminder is emailed, so a
  -- user is notified once per window instead of daily for 7 straight days.
  expiry_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration for databases created before expiry tracking existed.
alter table public.naasify_subscriptions
  add column if not exists expiry_notified_at timestamptz;

-- ----------------------------------------------------------------------------
-- Paystack webhook events (event_id PK = hard idempotency against retries)
-- ----------------------------------------------------------------------------
create table if not exists public.naasify_paystack_events (
  event_id text primary key,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in ('received', 'processed', 'failed', 'ignored')),
  error text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Contact messages (public insert; admin inbox)
-- ----------------------------------------------------------------------------
create table if not exists public.naasify_contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email citext not null,
  subject text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'replied')),
  email_sent boolean not null default false,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- User builds (project archives uploaded from the dashboard; admin deploys them)
-- ----------------------------------------------------------------------------
create table if not exists public.naasify_user_builds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null,
  -- Storage object path inside the private "user-builds" bucket: "{user_id}/{file_name}".
  file_key text not null,
  file_size bigint not null default 0,
  mime_type text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed')),
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Support messages (real-time user <-> admin chat)
-- conversation_id is the non-admin participant's user id, so each user keeps one
-- continuous thread with the admin team and admins can group by conversation.
-- ----------------------------------------------------------------------------
create table if not exists public.naasify_support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  sender_id uuid not null references auth.users (id) on delete cascade,
  receiver_id uuid references auth.users (id) on delete set null,
  message_text text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Blog posts (SEO/AEO content marketing; authored in the admin CMS)
-- author_id references naasify_profiles (same uuid as auth.users) so the
-- author can be embedded as a join; it nulls out if the profile is removed.
-- ----------------------------------------------------------------------------
create table if not exists public.naasify_blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body_html text not null default '',
  cover_image_url text,
  tags text[] not null default '{}',
  author_id uuid references public.naasify_profiles (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  -- Set when the post goes live (or a future date to schedule publication).
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
create index if not exists services_active_sort_idx on public.naasify_services (is_active, sort_order);
create index if not exists plans_service_active_sort_idx on public.naasify_plans (service_id, is_active, sort_order);
create index if not exists plans_cycle_active_idx on public.naasify_plans (billing_cycle) where is_active;
create index if not exists orders_user_created_idx on public.naasify_orders (user_id, created_at desc);
create index if not exists orders_status_created_idx on public.naasify_orders (status, created_at desc);
create index if not exists subscriptions_user_status_idx on public.naasify_subscriptions (user_id, status);
create index if not exists contact_messages_status_created_idx on public.naasify_contact_messages (status, created_at desc);
create index if not exists profiles_admin_idx on public.naasify_profiles (role) where role = 'admin';
create index if not exists subscriptions_ends_at_active_idx on public.naasify_subscriptions (ends_at) where status = 'active';
create index if not exists user_builds_user_uploaded_idx on public.naasify_user_builds (user_id, uploaded_at desc);
create index if not exists user_builds_status_idx on public.naasify_user_builds (status, uploaded_at desc);
create index if not exists support_messages_conversation_created_idx on public.naasify_support_messages (conversation_id, created_at desc);
create index if not exists support_messages_unread_idx on public.naasify_support_messages (conversation_id) where is_read = false;
-- slug lookups are served by the unique constraint on naasify_blog_posts.slug.
create index if not exists blog_posts_status_published_idx on public.naasify_blog_posts (status, published_at desc);
create index if not exists blog_posts_published_at_idx on public.naasify_blog_posts (published_at desc) where status = 'published';

-- ----------------------------------------------------------------------------
-- updated_at maintenance
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.naasify_profiles;
create trigger profiles_set_updated_at before update on public.naasify_profiles
  for each row execute function public.set_updated_at();
drop trigger if exists services_set_updated_at on public.naasify_services;
create trigger services_set_updated_at before update on public.naasify_services
  for each row execute function public.set_updated_at();
drop trigger if exists plans_set_updated_at on public.naasify_plans;
create trigger plans_set_updated_at before update on public.naasify_plans
  for each row execute function public.set_updated_at();
drop trigger if exists orders_set_updated_at on public.naasify_orders;
create trigger orders_set_updated_at before update on public.naasify_orders
  for each row execute function public.set_updated_at();
drop trigger if exists subscriptions_set_updated_at on public.naasify_subscriptions;
create trigger subscriptions_set_updated_at before update on public.naasify_subscriptions
  for each row execute function public.set_updated_at();
drop trigger if exists user_builds_set_updated_at on public.naasify_user_builds;
create trigger user_builds_set_updated_at before update on public.naasify_user_builds
  for each row execute function public.set_updated_at();
drop trigger if exists blog_posts_set_updated_at on public.naasify_blog_posts;
create trigger blog_posts_set_updated_at before update on public.naasify_blog_posts
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Role helper (SECURITY DEFINER avoids RLS recursion inside policies)
-- ----------------------------------------------------------------------------
create or replace function public.naasify_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.naasify_profiles where id = auth.uid() and role = 'admin');
$$;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.naasify_profiles enable row level security;
alter table public.naasify_services enable row level security;
alter table public.naasify_plans enable row level security;
alter table public.naasify_orders enable row level security;
alter table public.naasify_subscriptions enable row level security;
alter table public.naasify_paystack_events enable row level security;
alter table public.naasify_contact_messages enable row level security;
alter table public.naasify_user_builds enable row level security;
alter table public.naasify_support_messages enable row level security;
alter table public.naasify_blog_posts enable row level security;

-- profiles -------------------------------------------------------------------
drop policy if exists profiles_select_own_or_admin on public.naasify_profiles;
create policy profiles_select_own_or_admin on public.naasify_profiles
  for select to anon, authenticated
  using (id = auth.uid() or public.naasify_is_admin());

drop policy if exists profiles_update_own on public.naasify_profiles;
create policy profiles_update_own on public.naasify_profiles
  for update to authenticated
  using (id = auth.uid())
  -- blocks role self-elevation: the role column may not change on self-update
  with check (
    id = auth.uid()
    and role = (select p.role from public.naasify_profiles p where p.id = auth.uid())
  );

-- services -------------------------------------------------------------------
drop policy if exists services_select_public on public.naasify_services;
create policy services_select_public on public.naasify_services
  for select to anon, authenticated
  using (is_active = true or public.naasify_is_admin());

drop policy if exists services_insert_admin on public.naasify_services;
create policy services_insert_admin on public.naasify_services
  for insert to authenticated
  with check (public.naasify_is_admin());

drop policy if exists services_update_admin on public.naasify_services;
create policy services_update_admin on public.naasify_services
  for update to authenticated
  using (public.naasify_is_admin())
  with check (public.naasify_is_admin());

drop policy if exists services_delete_admin on public.naasify_services;
create policy services_delete_admin on public.naasify_services
  for delete to authenticated
  using (public.naasify_is_admin());

-- plans ----------------------------------------------------------------------
drop policy if exists plans_select_public on public.naasify_plans;
create policy plans_select_public on public.naasify_plans
  for select to anon, authenticated
  using (is_active = true or public.naasify_is_admin());

drop policy if exists plans_insert_admin on public.naasify_plans;
create policy plans_insert_admin on public.naasify_plans
  for insert to authenticated
  with check (public.naasify_is_admin());

drop policy if exists plans_update_admin on public.naasify_plans;
create policy plans_update_admin on public.naasify_plans
  for update to authenticated
  using (public.naasify_is_admin())
  with check (public.naasify_is_admin());

drop policy if exists plans_delete_admin on public.naasify_plans;
create policy plans_delete_admin on public.naasify_plans
  for delete to authenticated
  using (public.naasify_is_admin());

-- orders ---------------------------------------------------------------------
drop policy if exists orders_select_own_or_admin on public.naasify_orders;
create policy orders_select_own_or_admin on public.naasify_orders
  for select to authenticated
  using (user_id = auth.uid() or public.naasify_is_admin());

drop policy if exists orders_insert_own_or_guest on public.naasify_orders;
create policy orders_insert_own_or_guest on public.naasify_orders
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists orders_update_admin on public.naasify_orders;
create policy orders_update_admin on public.naasify_orders
  for update to authenticated
  using (public.naasify_is_admin())
  with check (public.naasify_is_admin());

-- subscriptions --------------------------------------------------------------
drop policy if exists subscriptions_select_own_or_admin on public.naasify_subscriptions;
create policy subscriptions_select_own_or_admin on public.naasify_subscriptions
  for select to authenticated
  using (user_id = auth.uid() or public.naasify_is_admin());

drop policy if exists subscriptions_update_admin on public.naasify_subscriptions;
create policy subscriptions_update_admin on public.naasify_subscriptions
  for update to authenticated
  using (public.naasify_is_admin())
  with check (public.naasify_is_admin());

-- paystack_events: service role only (no policies for anon/authenticated) -----

-- contact_messages -----------------------------------------------------------
drop policy if exists contact_messages_insert_public on public.naasify_contact_messages;
create policy contact_messages_insert_public on public.naasify_contact_messages
  for insert to anon, authenticated
  with check (true);

drop policy if exists contact_messages_select_admin on public.naasify_contact_messages;
create policy contact_messages_select_admin on public.naasify_contact_messages
  for select to authenticated
  using (public.naasify_is_admin());

drop policy if exists contact_messages_update_admin on public.naasify_contact_messages;
create policy contact_messages_update_admin on public.naasify_contact_messages
  for update to authenticated
  using (public.naasify_is_admin())
  with check (public.naasify_is_admin());

drop policy if exists contact_messages_delete_admin on public.naasify_contact_messages;
create policy contact_messages_delete_admin on public.naasify_contact_messages
  for delete to authenticated
  using (public.naasify_is_admin());

-- user_builds ----------------------------------------------------------------
drop policy if exists user_builds_select_own_or_admin on public.naasify_user_builds;
create policy user_builds_select_own_or_admin on public.naasify_user_builds
  for select to authenticated
  using (user_id = auth.uid() or public.naasify_is_admin());

drop policy if exists user_builds_insert_own on public.naasify_user_builds;
create policy user_builds_insert_own on public.naasify_user_builds
  for insert to authenticated
  with check (user_id = auth.uid());

-- Only admins move a build through pending -> processing -> completed.
drop policy if exists user_builds_update_admin on public.naasify_user_builds;
create policy user_builds_update_admin on public.naasify_user_builds
  for update to authenticated
  using (public.naasify_is_admin())
  with check (public.naasify_is_admin());

drop policy if exists user_builds_delete_own_or_admin on public.naasify_user_builds;
create policy user_builds_delete_own_or_admin on public.naasify_user_builds
  for delete to authenticated
  using (user_id = auth.uid() or public.naasify_is_admin());

-- support_messages -----------------------------------------------------------
-- A user sees/edits only their own thread; admins see and manage everything.
drop policy if exists support_messages_select_participant_or_admin on public.naasify_support_messages;
create policy support_messages_select_participant_or_admin on public.naasify_support_messages
  for select to authenticated
  using (
    conversation_id = auth.uid()
    or sender_id = auth.uid()
    or receiver_id = auth.uid()
    or public.naasify_is_admin()
  );

drop policy if exists support_messages_insert_participant_or_admin on public.naasify_support_messages;
create policy support_messages_insert_participant_or_admin on public.naasify_support_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (conversation_id = auth.uid() or public.naasify_is_admin())
  );

-- Read receipts: a participant (or admin) may flip is_read on their thread.
drop policy if exists support_messages_update_participant_or_admin on public.naasify_support_messages;
create policy support_messages_update_participant_or_admin on public.naasify_support_messages
  for update to authenticated
  using (conversation_id = auth.uid() or public.naasify_is_admin())
  with check (conversation_id = auth.uid() or public.naasify_is_admin());

drop policy if exists support_messages_delete_admin on public.naasify_support_messages;
create policy support_messages_delete_admin on public.naasify_support_messages
  for delete to authenticated
  using (public.naasify_is_admin());

-- blog_posts -----------------------------------------------------------------
-- Anyone (anon or signed-in) can read published posts; admins read every post
-- including drafts. Only admins may create, update or delete.
drop policy if exists blog_posts_select_public on public.naasify_blog_posts;
create policy blog_posts_select_public on public.naasify_blog_posts
  for select to anon, authenticated
  using (status = 'published' or public.naasify_is_admin());

drop policy if exists blog_posts_insert_admin on public.naasify_blog_posts;
create policy blog_posts_insert_admin on public.naasify_blog_posts
  for insert to authenticated
  with check (public.naasify_is_admin());

drop policy if exists blog_posts_update_admin on public.naasify_blog_posts;
create policy blog_posts_update_admin on public.naasify_blog_posts
  for update to authenticated
  using (public.naasify_is_admin())
  with check (public.naasify_is_admin());

drop policy if exists blog_posts_delete_admin on public.naasify_blog_posts;
create policy blog_posts_delete_admin on public.naasify_blog_posts
  for delete to authenticated
  using (public.naasify_is_admin());

-- ----------------------------------------------------------------------------
-- Storage: private "user-builds" bucket, objects namespaced as {user_id}/...
-- ----------------------------------------------------------------------------
-- 100 MB per object; the bucket stays private (admin downloads via signed URL).
insert into storage.buckets (id, name, public, file_size_limit)
values ('user-builds', 'user-builds', false, 104857600)
on conflict (id) do update set public = false, file_size_limit = 104857600;

drop policy if exists user_builds_storage_select on storage.objects;
create policy user_builds_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'user-builds'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.naasify_is_admin())
  );

drop policy if exists user_builds_storage_insert on storage.objects;
create policy user_builds_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'user-builds'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists user_builds_storage_update on storage.objects;
create policy user_builds_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'user-builds'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.naasify_is_admin())
  )
  with check (
    bucket_id = 'user-builds'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.naasify_is_admin())
  );

drop policy if exists user_builds_storage_delete on storage.objects;
create policy user_builds_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'user-builds'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.naasify_is_admin())
  );

-- ----------------------------------------------------------------------------
-- Realtime: stream support_messages inserts/updates to the chat clients.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'naasify_support_messages'
  ) then
    alter publication supabase_realtime add table public.naasify_support_messages;
  end if;
end
$$;

-- ============================================================================
-- IMPORTANT: MANUAL STEPS AFTER RUNNING THIS FILE
-- 1. Run supabase/seed.sql next (services + plans + the All-in-One bundle).
-- 2. Create your admin account through /signup on the app (or in Supabase
--    Auth with "Auto Confirm User" enabled), then promote it:
--      update public.naasify_profiles set role = 'admin' where email = 'you@example.com';
-- 3. Resend: verify the naasify.online domain (SPF/DKIM) so emails can be sent
--    from info@naasify.online. Until then use onboarding@resend.dev in
--    RESEND_FROM_EMAIL for testing.
-- 4. Paystack dashboard -> Settings -> Webhooks: set the URL to
--    https://<your-domain>/api/webhooks/paystack and copy the secret into
--    PAYSTACK_SECRET_KEY (the signature is HMAC-SHA512 of the raw body).
-- 5. The "user-builds" storage bucket and the support_messages realtime
--    publication are created automatically above (nothing manual needed).
-- 6. Expiry cron: deploy the daily job (vercel.json -> /api/cron/expiring) and
--    set CRON_SECRET; Vercel calls it with "Authorization: Bearer <CRON_SECRET>".
-- ============================================================================
