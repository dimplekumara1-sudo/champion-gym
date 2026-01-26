-- Indian Foods Table
create table if not exists public.indian_foods (
  id bigint generated always as identity not null,
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
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint indian_foods_pkey primary key (id),
  constraint indian_foods_dish_name_key unique (dish_name)
) TABLESPACE pg_default;

-- Create indexes for indian_foods
create index if not exists idx_indian_foods_dish_name on public.indian_foods using btree (dish_name) TABLESPACE pg_default;
create index if not exists idx_indian_foods_calories on public.indian_foods using btree (calories_kcal) TABLESPACE pg_default;
create index if not exists idx_indian_foods_protein on public.indian_foods using btree (protein_g) TABLESPACE pg_default;

-- User Daily Diet Tracking Table
create table if not exists public.user_daily_diet_tracking (
  id bigint generated always as identity not null,
  user_id uuid not null,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_id bigint not null,
  amount numeric not null,
  unit text not null,
  calories numeric not null,
  protein numeric not null,
  carbs numeric not null,
  fats numeric not null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint user_daily_diet_tracking_pkey primary key (id),
  constraint user_daily_diet_tracking_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint user_daily_diet_tracking_food_id_fkey foreign key (food_id) references public.indian_foods (id) on delete cascade
) TABLESPACE pg_default;

-- Create indexes for user_daily_diet_tracking
create index if not exists idx_user_daily_diet_tracking_user_id on public.user_daily_diet_tracking using btree (user_id) TABLESPACE pg_default;
create index if not exists idx_user_daily_diet_tracking_user_id_date on public.user_daily_diet_tracking using btree (user_id, date) TABLESPACE pg_default;
create index if not exists idx_user_daily_diet_tracking_meal_type on public.user_daily_diet_tracking using btree (meal_type) TABLESPACE pg_default;

-- Enable RLS for user_daily_diet_tracking
alter table public.user_daily_diet_tracking enable row level security;

-- RLS Policy: Users can only view their own diet tracking
create policy "users_can_view_own_diet_tracking" on public.user_daily_diet_tracking
  for select
  using (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own diet tracking
create policy "users_can_insert_own_diet_tracking" on public.user_daily_diet_tracking
  for insert
  with check (auth.uid() = user_id);

-- RLS Policy: Users can only update their own diet tracking
create policy "users_can_update_own_diet_tracking" on public.user_daily_diet_tracking
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own diet tracking
create policy "users_can_delete_own_diet_tracking" on public.user_daily_diet_tracking
  for delete
  using (auth.uid() = user_id);

-- Enable RLS for indian_foods (public read, only admins can insert/update/delete)
alter table public.indian_foods enable row level security;

-- RLS Policy: Anyone can view indian_foods
create policy "anyone_can_view_indian_foods" on public.indian_foods
  for select
  using (true);

-- RLS Policy: Only admins can insert/update/delete indian_foods
create policy "only_admins_can_modify_indian_foods" on public.indian_foods
  for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
