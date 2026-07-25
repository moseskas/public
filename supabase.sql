-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query)
create table if not exists amor_kv (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);
