create table if not exists public.essl_commands (
  id uuid default gen_random_uuid() primary key,
  sequence_id bigserial, -- Auto-incrementing numeric ID for ADMS compatibility
  essl_id text not null,
  command text not null,
  status text default 'pending', -- pending, sent, completed, failed
  payload jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for fast lookup of pending commands for a device/user
create index if not exists idx_essl_commands_status on public.essl_commands (status) where status = 'pending';
create index if not exists idx_essl_commands_essl_id on public.essl_commands (essl_id);
create index if not exists idx_essl_commands_sequence_id on public.essl_commands (sequence_id);
