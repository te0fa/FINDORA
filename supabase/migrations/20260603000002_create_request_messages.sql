-- ============================================================
-- Migration: Create request_messages table
-- Run this in Supabase SQL Editor to enable customer-reviewer chat
-- ============================================================

create table if not exists public.request_messages (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid not null references public.requests(id) on delete cascade,
  sender_type    text not null check (sender_type in ('customer', 'staff', 'system')),
  sender_id      uuid,
  message        text not null,
  read_at        timestamptz,
  metadata       jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Index for fast lookup by request
create index if not exists idx_request_messages_request_id
  on public.request_messages (request_id, created_at asc);

-- Index for unread messages
create index if not exists idx_request_messages_unread
  on public.request_messages (request_id, sender_type, read_at)
  where read_at is null;

-- Disable RLS (admin client handles access control at app level)
alter table public.request_messages disable row level security;

-- ============================================================
-- Done! The chat feature will now work automatically.
-- ============================================================
