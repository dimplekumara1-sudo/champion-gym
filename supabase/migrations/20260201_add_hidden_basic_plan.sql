-- Add hidden column to plans
alter table public.plans 
add column if not exists hidden boolean default false;

-- Insert Basic Plan (Admin Only)
insert into public.plans (id, name, price, description, features, popular, duration_months, hidden)
values 
  ('basic', 'Basic Plan', '0', 'Admin assigned basic access', '{Basic gym access}', false, 1, true)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  hidden = excluded.hidden;
