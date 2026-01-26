-- Nutrition Goals Table
create table if not exists public.nutrition_goals (
  id bigint generated always as identity not null,
  user_id uuid not null unique,
  daily_calories_target numeric not null default 2000,
  daily_protein_target numeric not null default 150,
  daily_carbs_target numeric not null default 200,
  daily_fat_target numeric not null default 65,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint nutrition_goals_pkey primary key (id),
  constraint nutrition_goals_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
) TABLESPACE pg_default;

-- Create index for nutrition_goals
create index if not exists idx_nutrition_goals_user_id on public.nutrition_goals using btree (user_id) TABLESPACE pg_default;

-- Enable RLS for nutrition_goals
alter table public.nutrition_goals enable row level security;

-- RLS Policy: Users can only view their own nutrition goals
create policy "users_can_view_own_nutrition_goals" on public.nutrition_goals
  for select
  using (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own nutrition goals
create policy "users_can_insert_own_nutrition_goals" on public.nutrition_goals
  for insert
  with check (auth.uid() = user_id);

-- RLS Policy: Users can only update their own nutrition goals
create policy "users_can_update_own_nutrition_goals" on public.nutrition_goals
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own nutrition goals
create policy "users_can_delete_own_nutrition_goals" on public.nutrition_goals
  for delete
  using (auth.uid() = user_id);
