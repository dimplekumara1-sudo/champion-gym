-- Unknown Users Management Table
-- Used for temporary user allocation before admin creates actual login profile

create table if not exists public.unknown_users (
  id uuid primary key default gen_random_uuid(),
  temporary_name text not null unique, -- e.g., "GYM_USER_001", "GYM_USER_002"
  essl_id text unique,
  phone_number text,
  full_name text, -- Actual name once verified
  email text unique,
  assigned_at timestamp with time zone default now(),
  verified_at timestamp with time zone, -- When admin assigns proper login
  assigned_by uuid references public.profiles(id),
  status text default 'pending', -- pending, verified, converted, rejected
  check_in_count integer default 0,
  last_check_in timestamp with time zone,
  metadata jsonb default '{}'::jsonb, -- Additional info like gym entry method
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create index for faster lookups
create index idx_unknown_users_temporary_name on public.unknown_users(temporary_name);
create index idx_unknown_users_essl_id on public.unknown_users(essl_id);
create index idx_unknown_users_status on public.unknown_users(status);
create index idx_unknown_users_created_at on public.unknown_users(created_at desc);

-- Enable RLS
alter table public.unknown_users enable row level security;

-- Policies
create policy "Admins can view all unknown users" on public.unknown_users
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Admins can insert unknown users" on public.unknown_users
  for insert with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Admins can update unknown users" on public.unknown_users
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  ) with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Admins can delete unknown users" on public.unknown_users
  for delete using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Create settings for unknown user configuration
insert into public.app_settings (id, value)
values (
  'unknown_users_config',
  '{
    "prefix": "GYM_USER",
    "auto_generate": true,
    "require_phone": false,
    "require_essl_id": false,
    "expiry_days": 30
  }'::jsonb
)
on conflict (id) do nothing;

