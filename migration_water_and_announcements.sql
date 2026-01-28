-- Water Intake Table
create table if not exists public.water_intake (
  id bigint generated always as identity not null,
  user_id uuid not null,
  amount_ml numeric not null default 0,
  date date not null default CURRENT_DATE,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint water_intake_pkey primary key (id),
  constraint water_intake_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint water_intake_user_date_unique unique (user_id, date)
) TABLESPACE pg_default;

-- Create index for water_intake
create index if not exists idx_water_intake_user_id on public.water_intake using btree (user_id) TABLESPACE pg_default;
create index if not exists idx_water_intake_date on public.water_intake using btree (date) TABLESPACE pg_default;

-- Enable RLS for water_intake
alter table public.water_intake enable row level security;

-- RLS Policies for water_intake
create policy "Users can view own water intake" on public.water_intake
  for select using (auth.uid() = user_id);

create policy "Users can insert own water intake" on public.water_intake
  for insert with check (auth.uid() = user_id);

create policy "Users can update own water intake" on public.water_intake
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own water intake" on public.water_intake
  for delete using (auth.uid() = user_id);

-- Gym Announcements Table
create table if not exists public.announcements (
  id bigint generated always as identity not null,
  title text not null,
  content text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  is_active boolean not null default true,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  created_by uuid null,
  constraint announcements_pkey primary key (id),
  constraint announcements_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null
) TABLESPACE pg_default;

-- Enable RLS for announcements
alter table public.announcements enable row level security;

-- RLS Policies for announcements
create policy "Anyone can view active announcements" on public.announcements
  for select using (is_active = true);

create policy "Admins can manage announcements" on public.announcements
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
