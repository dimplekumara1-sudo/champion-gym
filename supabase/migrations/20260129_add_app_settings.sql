-- App Settings Table
create table if not exists public.app_settings (
  id text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.app_settings enable row level security;

-- Policies
create policy "Anyone can read settings" on public.app_settings
  for select using (true);

create policy "Admins can manage settings" on public.app_settings
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Insert default AI config
insert into public.app_settings (id, value)
values (
  'ai_config',
  '{
    "provider": "openrouter",
    "model": "google/gemini-2.5-flash",
    "api_key": "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"
  }'::jsonb
)
on conflict (id) do nothing;
