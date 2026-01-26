-- Pending Food Submissions Table (for user-contributed foods awaiting admin approval)
create table if not exists public.pending_food_submissions (
  id bigint generated always as identity not null,
  user_id uuid not null,
  dish_name text not null,
  calories_kcal numeric not null,
  carbohydrates_g numeric not null,
  protein_g numeric not null,
  fats_g numeric not null,
  free_sugar_g numeric null,
  fibre_g numeric null,
  sodium_mg numeric null,
  calcium_mg numeric null,
  iron_mg numeric null,
  vitamin_c_mg numeric null,
  folate_mcg numeric null,
  submission_notes text null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text null,
  reviewed_by uuid null,
  reviewed_at timestamp with time zone null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint pending_food_submissions_pkey primary key (id),
  constraint pending_food_submissions_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint pending_food_submissions_reviewed_by_fkey foreign key (reviewed_by) references auth.users (id) on delete set null
) TABLESPACE pg_default;

-- Create indexes for pending_food_submissions
create index if not exists idx_pending_food_submissions_user_id on public.pending_food_submissions using btree (user_id) TABLESPACE pg_default;
create index if not exists idx_pending_food_submissions_status on public.pending_food_submissions using btree (status) TABLESPACE pg_default;
create index if not exists idx_pending_food_submissions_created_at on public.pending_food_submissions using btree (created_at) TABLESPACE pg_default;

-- Enable RLS for pending_food_submissions
alter table public.pending_food_submissions enable row level security;

-- RLS Policy: Users can view their own submissions
create policy "users_can_view_own_submissions" on public.pending_food_submissions
  for select
  using (auth.uid() = user_id);

-- RLS Policy: Admins can view all submissions
create policy "admins_can_view_all_submissions" on public.pending_food_submissions
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- RLS Policy: Users can insert their own submissions
create policy "users_can_insert_own_submissions" on public.pending_food_submissions
  for insert
  with check (auth.uid() = user_id);

-- RLS Policy: Admins can update submissions (for approval/rejection)
create policy "admins_can_update_submissions" on public.pending_food_submissions
  for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- RLS Policy: Admins can delete submissions
create policy "admins_can_delete_submissions" on public.pending_food_submissions
  for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
