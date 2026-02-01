-- Create plans table if it doesn't exist
create table if not exists public.plans (
  id text not null,
  name text not null,
  price text not null,
  description text null,
  features text[] null,
  popular boolean null default false,
  updated_at timestamp with time zone null default timezone ('utc'::text, now()),
  duration_months integer null default 1,
  start_date date null,
  end_date date null,
  constraint plans_pkey primary key (id)
);

-- Add discount columns
alter table public.plans 
add column if not exists discount_percentage numeric default 0,
add column if not exists discount_amount numeric default 0,
add column if not exists discount_expiry timestamp with time zone;

-- Enable RLS
alter table public.plans enable row level security;

-- Policies
create policy "Plans are viewable by everyone" 
on public.plans for select 
using (true);

create policy "Plans are manageable by admins" 
on public.plans for all 
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  )
);

-- Seed/Update Plans
insert into public.plans (id, name, price, description, features, popular, duration_months)
values 
  ('strength_1', 'Strength (1 Month)', '1499', 'Build strength and muscle', '{Strength training access}', false, 1),
  ('strength_3', 'Strength (3 Months)', '3999', 'Build strength and muscle', '{Strength training access}', false, 3),
  ('strength_6', 'Strength (6 Months)', '6999', 'Build strength and muscle', '{Strength training access}', false, 6),
  ('strength_12', 'Strength (1 Year)', '9999', 'Build strength and muscle', '{Strength training access}', true, 12),
  ('strength_cardio_1', 'Strength & Cardio (1 Month)', '1999', 'Strength training with cardio workouts', '{Strength training, Cardio workouts}', false, 1),
  ('strength_cardio_3', 'Strength & Cardio (3 Months)', '4999', 'Strength training with cardio workouts', '{Strength training, Cardio workouts}', false, 3),
  ('strength_cardio_6', 'Strength & Cardio (6 Months)', '7999', 'Strength training with cardio workouts', '{Strength training, Cardio workouts}', false, 6),
  ('strength_cardio_12', 'Strength & Cardio (1 Year)', '11999', 'Strength training with cardio workouts', '{Strength training, Cardio workouts}', true, 12),
  ('personal_training_1', 'Personal Training (1 Month)', '4999', 'One-on-one personal training', '{Personal trainer, Customized workout plan}', false, 1),
  ('personal_training_3', 'Personal Training (3 Months)', '11999', 'One-on-one personal training', '{Personal trainer, Customized workout plan}', false, 3),
  ('personal_training_6', 'Personal Training (6 Months)', '24999', 'One-on-one personal training', '{Personal trainer, Customized workout plan}', false, 6),
  ('personal_training_12', 'Personal Training (1 Year)', '39999', 'One-on-one personal training', '{Personal trainer, Customized workout plan}', true, 12)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  description = excluded.description,
  features = excluded.features,
  popular = excluded.popular,
  duration_months = excluded.duration_months;
