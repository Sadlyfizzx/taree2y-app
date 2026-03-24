create extension if not exists pgcrypto;

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.primary_station_name(p_city text)
returns text
language sql
immutable
as $$
  select case trim(coalesce(p_city, ''))
    when 'القاهرة' then 'محطة القاهرة الرئيسية'
    when 'الجيزة' then 'محطة الجيزة'
    when 'الإسكندرية' then 'محطة الإسكندرية الرئيسية'
    when 'المنصورة' then 'محطة المنصورة الرئيسية'
    when 'أسوان' then 'محطة أسوان الرئيسية'
    when 'الأقصر' then 'محطة الأقصر الرئيسية'
    when 'دمياط' then 'محطة دمياط الرئيسية'
    when 'بورسعيد' then 'محطة بورسعيد الرئيسية'
    when 'الإسماعيلية' then 'محطة الإسماعيلية الرئيسية'
    when 'السويس' then 'محطة السويس الرئيسية'
    when 'مرسى مطروح' then 'محطة مرسى مطروح الرئيسية'
    when 'شرم الشيخ' then 'محطة شرم الشيخ الرئيسية'
    when 'الغردقة' then 'محطة الغردقة الرئيسية'
    when 'دهب' then 'محطة دهب الرئيسية'
    when 'طابا' then 'محطة طابا الرئيسية'
    when 'سوهاج' then 'محطة سوهاج الرئيسية'
    when 'قنا' then 'محطة قنا الرئيسية'
    else case
      when trim(coalesce(p_city, '')) = '' then 'المحطة الرئيسية'
      when trim(coalesce(p_city, '')) like 'محطة%' then trim(coalesce(p_city, ''))
      else 'محطة ' || trim(coalesce(p_city, '')) || ' الرئيسية'
    end
  end;
$$;

create or replace function public.city_code(p_city text)
returns text
language sql
immutable
as $$
  select case trim(coalesce(p_city, ''))
    when 'القاهرة' then 'CAI'
    when 'الجيزة' then 'GIZ'
    when 'الإسكندرية' then 'ALX'
    when 'المنصورة' then 'MNS'
    when 'أسوان' then 'ASN'
    when 'الأقصر' then 'LXR'
    when 'دمياط' then 'DMT'
    when 'بورسعيد' then 'PSD'
    when 'الإسماعيلية' then 'ISM'
    when 'السويس' then 'SUE'
    when 'مرسى مطروح' then 'MAT'
    when 'شرم الشيخ' then 'SSH'
    when 'الغردقة' then 'HRG'
    when 'دهب' then 'DHB'
    when 'طابا' then 'TBA'
    when 'سوهاج' then 'SHG'
    when 'قنا' then 'QNA'
    else upper(substr(regexp_replace(coalesce(p_city, ''), '[^A-Za-z0-9]+', '', 'g') || 'XXX', 1, 3))
  end;
$$;

create or replace function public.company_code(p_company text)
returns text
language sql
immutable
as $$
  select case trim(coalesce(p_company, ''))
    when 'جو باص' then 'JB'
    when 'سوبر جيت' then 'SG'
    when 'بلو باص' then 'BB'
    else 'OT'
  end;
$$;

create or replace function public.class_code(p_service_class text)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_service_class, '') ilike '%VIP%' then 'VIP'
    else 'EM'
  end;
$$;

create or replace function public.build_trip_code(
  p_from_city text,
  p_to_city text,
  p_departure_date date,
  p_departure_time time,
  p_company text,
  p_service_class text
)
returns text
language sql
immutable
as $$
  select 'TRIP-'
    || public.city_code(p_from_city)
    || '-'
    || public.city_code(p_to_city)
    || '-'
    || to_char(p_departure_date, 'YYYYMMDD')
    || '-'
    || to_char(p_departure_time, 'HH24MI')
    || '-'
    || public.company_code(p_company)
    || '-'
    || public.class_code(p_service_class);
$$;

create or replace function public.build_ticket_token()
returns text
language sql
stable
as $$
  select 'TTK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 20));
$$;

create or replace function public.build_booking_reference(p_departure_date date default current_date)
returns text
language sql
stable
as $$
  select 'TRQ-' || to_char(coalesce(p_departure_date, current_date), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
$$;

create or replace function public.build_ticket_qr_payload(
  p_booking_id uuid,
  p_booking_ref text,
  p_trip_code text,
  p_ticket_token text,
  p_issued_at timestamptz default now()
)
returns text
language sql
stable
as $$
  select jsonb_build_object(
    'v', 1,
    'booking_id', p_booking_id,
    'booking_ref', p_booking_ref,
    'trip_code', p_trip_code,
    'ticket_token', p_ticket_token,
    'issued_at', coalesce(p_issued_at, now())
  )::text;
$$;

create table if not exists public.app_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(12,2) not null default 0,
  points integer not null default 0,
  subscription text not null default 'none',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_wallets
  add column if not exists balance numeric(12,2) not null default 0,
  add column if not exists points integer not null default 0,
  add column if not exists subscription text not null default 'none',
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.app_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text,
  type text,
  amount numeric(12,2),
  txn_date date,
  description text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_wallet_transactions
  add column if not exists client_id text,
  add column if not exists type text,
  add column if not exists amount numeric(12,2),
  add column if not exists txn_date date,
  add column if not exists description text,
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists app_wallet_transactions_client_id_idx
  on public.app_wallet_transactions (client_id)
  where client_id is not null;

create index if not exists app_wallet_transactions_user_created_idx
  on public.app_wallet_transactions (user_id, created_at desc);

create table if not exists public.routes (
  route_key text primary key,
  from_city text not null,
  to_city text not null,
  base_price integer not null,
  duration_min integer not null,
  popularity numeric(4,2) not null default 0.65,
  has_rest_stop boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.route_templates (
  id uuid primary key default gen_random_uuid(),
  route_key text not null references public.routes(route_key) on delete cascade,
  departure_time time not null,
  company text not null,
  service_class text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(route_key, departure_time, company, service_class)
);

create table if not exists public.trip_instances (
  id uuid primary key default gen_random_uuid(),
  trip_code text not null,
  route_key text not null references public.routes(route_key) on delete cascade,
  from_city text not null,
  to_city text not null,
  from_station_name text,
  to_station_name text,
  departure_date date not null,
  departure_time time not null,
  arrival_time time not null,
  duration_hours numeric(6,2) not null,
  price integer not null,
  company text not null,
  service_class text not null,
  rating numeric(3,1) not null default 4.5,
  badge text,
  capacity integer not null default 40,
  available_seats_count integer not null default 40,
  booking_cutoff_minutes integer not null default 120,
  luggage_allowance_kg integer not null default 20,
  has_rest_stop boolean not null default false,
  driver_name text,
  driver_rating numeric(3,1),
  driver_trips integer,
  driver_img text,
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trip_instances
  add column if not exists trip_code text,
  add column if not exists from_station_name text,
  add column if not exists to_station_name text,
  add column if not exists booking_cutoff_minutes integer not null default 120,
  add column if not exists luggage_allowance_kg integer not null default 20,
  add column if not exists driver_name text,
  add column if not exists driver_rating numeric(3,1),
  add column if not exists driver_trips integer,
  add column if not exists driver_img text,
  add column if not exists status text not null default 'scheduled',
  add column if not exists badge text,
  add column if not exists capacity integer not null default 40,
  add column if not exists available_seats_count integer not null default 40,
  add column if not exists has_rest_stop boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists trip_instances_trip_code_idx
  on public.trip_instances (trip_code);

create unique index if not exists trip_instances_unique_trip_idx
  on public.trip_instances (from_city, to_city, departure_date, departure_time, company, service_class);

create index if not exists trip_instances_search_idx
  on public.trip_instances (from_city, to_city, departure_date, departure_time);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text,
  trip_instance_id uuid references public.trip_instances(id) on delete set null,
  pnr text,
  status text not null default 'upcoming',
  booking_date date not null default current_date,
  final_total numeric(12,2) not null default 0,
  payment_method text not null default 'wallet',
  selected_seats text[] not null default '{}'::text[],
  ticket_token text,
  qr_payload text,
  promo_code text,
  luggage boolean not null default false,
  ride boolean not null default false,
  access boolean not null default false,
  earned_points_pending integer not null default 0,
  points_awarded boolean not null default false,
  trip_data jsonb not null default '{}'::jsonb,
  invoice_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings
  add column if not exists client_id text,
  add column if not exists trip_instance_id uuid references public.trip_instances(id) on delete set null,
  add column if not exists pnr text,
  add column if not exists status text not null default 'upcoming',
  add column if not exists booking_date date not null default current_date,
  add column if not exists final_total numeric(12,2) not null default 0,
  add column if not exists payment_method text not null default 'wallet',
  add column if not exists selected_seats text[] not null default '{}'::text[],
  add column if not exists ticket_token text,
  add column if not exists qr_payload text,
  add column if not exists promo_code text,
  add column if not exists luggage boolean not null default false,
  add column if not exists ride boolean not null default false,
  add column if not exists access boolean not null default false,
  add column if not exists earned_points_pending integer not null default 0,
  add column if not exists points_awarded boolean not null default false,
  add column if not exists trip_data jsonb not null default '{}'::jsonb,
  add column if not exists invoice_data jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists bookings_client_id_idx
  on public.bookings (client_id)
  where client_id is not null;

create unique index if not exists bookings_pnr_idx
  on public.bookings (pnr)
  where pnr is not null;

create unique index if not exists bookings_ticket_token_idx
  on public.bookings (ticket_token)
  where ticket_token is not null;

create table if not exists public.trip_seats (
  id uuid primary key default gen_random_uuid(),
  trip_instance_id uuid not null references public.trip_instances(id) on delete cascade,
  seat_number text not null,
  seat_index integer not null,
  status text not null default 'available',
  held_by_user_id uuid references auth.users(id) on delete set null,
  hold_token uuid,
  hold_expires_at timestamptz,
  booking_id uuid references public.bookings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(trip_instance_id, seat_number)
);

alter table public.trip_seats
  add column if not exists held_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists hold_token uuid,
  add column if not exists hold_expires_at timestamptz,
  add column if not exists booking_id uuid references public.bookings(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists trip_seats_trip_status_idx
  on public.trip_seats (trip_instance_id, status);

create table if not exists public.booking_seats (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  trip_instance_id uuid not null references public.trip_instances(id) on delete cascade,
  seat_number text not null,
  passenger_name text,
  created_at timestamptz not null default now(),
  unique(booking_id, seat_number)
);

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  discount_type text not null,
  value numeric(12,2) not null,
  minimum_amount numeric(12,2) not null default 0,
  first_time_only boolean not null default false,
  active boolean not null default true,
  allowed_routes text[],
  allowed_subscriptions text[],
  max_total_uses integer,
  max_uses_per_user integer,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.promo_codes
  add column if not exists code text,
  add column if not exists discount_type text,
  add column if not exists value numeric(12,2),
  add column if not exists minimum_amount numeric(12,2) not null default 0,
  add column if not exists first_time_only boolean not null default false,
  add column if not exists active boolean not null default true,
  add column if not exists allowed_routes text[],
  add column if not exists allowed_subscriptions text[],
  add column if not exists max_total_uses integer,
  add column if not exists max_uses_per_user integer,
  add column if not exists start_at timestamptz,
  add column if not exists end_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists promo_codes_code_idx
  on public.promo_codes (upper(code));

create table if not exists public.promo_code_usages (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists promo_code_usages_user_idx
  on public.promo_code_usages (promo_code_id, user_id);

drop trigger if exists app_wallets_set_updated_at on public.app_wallets;
create trigger app_wallets_set_updated_at
before update on public.app_wallets
for each row execute function public.set_row_updated_at();

drop trigger if exists app_wallet_transactions_set_updated_at on public.app_wallet_transactions;
create trigger app_wallet_transactions_set_updated_at
before update on public.app_wallet_transactions
for each row execute function public.set_row_updated_at();

drop trigger if exists routes_set_updated_at on public.routes;
create trigger routes_set_updated_at
before update on public.routes
for each row execute function public.set_row_updated_at();

drop trigger if exists route_templates_set_updated_at on public.route_templates;
create trigger route_templates_set_updated_at
before update on public.route_templates
for each row execute function public.set_row_updated_at();

drop trigger if exists trip_instances_set_updated_at on public.trip_instances;
create trigger trip_instances_set_updated_at
before update on public.trip_instances
for each row execute function public.set_row_updated_at();

drop trigger if exists trip_seats_set_updated_at on public.trip_seats;
create trigger trip_seats_set_updated_at
before update on public.trip_seats
for each row execute function public.set_row_updated_at();

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_row_updated_at();

drop trigger if exists promo_codes_set_updated_at on public.promo_codes;
create trigger promo_codes_set_updated_at
before update on public.promo_codes
for each row execute function public.set_row_updated_at();

alter table public.app_wallets enable row level security;
alter table public.app_wallet_transactions enable row level security;
alter table public.routes enable row level security;
alter table public.route_templates enable row level security;
alter table public.trip_instances enable row level security;
alter table public.trip_seats enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_seats enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promo_code_usages enable row level security;

drop policy if exists app_wallets_select_own on public.app_wallets;
create policy app_wallets_select_own on public.app_wallets
for select using (auth.uid() = user_id);

drop policy if exists app_wallets_insert_own on public.app_wallets;
create policy app_wallets_insert_own on public.app_wallets
for insert with check (auth.uid() = user_id);

drop policy if exists app_wallets_update_own on public.app_wallets;
create policy app_wallets_update_own on public.app_wallets
for update using (auth.uid() = user_id);

drop policy if exists app_wallet_transactions_select_own on public.app_wallet_transactions;
create policy app_wallet_transactions_select_own on public.app_wallet_transactions
for select using (auth.uid() = user_id);

drop policy if exists app_wallet_transactions_insert_own on public.app_wallet_transactions;
create policy app_wallet_transactions_insert_own on public.app_wallet_transactions
for insert with check (auth.uid() = user_id);

drop policy if exists bookings_select_own on public.bookings;
create policy bookings_select_own on public.bookings
for select using (auth.uid() = user_id);

drop policy if exists bookings_insert_own on public.bookings;
create policy bookings_insert_own on public.bookings
for insert with check (auth.uid() = user_id);

drop policy if exists bookings_update_own on public.bookings;
create policy bookings_update_own on public.bookings
for update using (auth.uid() = user_id);

drop policy if exists booking_seats_select_own on public.booking_seats;
create policy booking_seats_select_own on public.booking_seats
for select using (
  exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and b.user_id = auth.uid()
  )
);

drop policy if exists routes_public_read on public.routes;
create policy routes_public_read on public.routes
for select to authenticated using (true);

drop policy if exists route_templates_public_read on public.route_templates;
create policy route_templates_public_read on public.route_templates
for select to authenticated using (true);

drop policy if exists trip_instances_public_read on public.trip_instances;
create policy trip_instances_public_read on public.trip_instances
for select to authenticated using (true);

drop policy if exists trip_seats_public_read on public.trip_seats;
create policy trip_seats_public_read on public.trip_seats
for select to authenticated using (true);

drop policy if exists promo_codes_public_read on public.promo_codes;
create policy promo_codes_public_read on public.promo_codes
for select to authenticated using (active = true);

drop policy if exists promo_code_usages_select_own on public.promo_code_usages;
create policy promo_code_usages_select_own on public.promo_code_usages
for select using (auth.uid() = user_id);

insert into public.routes (route_key, from_city, to_city, base_price, duration_min, popularity, has_rest_stop)
values
  ('القاهرة-الإسكندرية','القاهرة','الإسكندرية',150,180,0.95,false),
  ('الإسكندرية-القاهرة','الإسكندرية','القاهرة',150,180,0.95,false),
  ('القاهرة-المنصورة','القاهرة','المنصورة',120,150,0.78,false),
  ('المنصورة-القاهرة','المنصورة','القاهرة',120,150,0.78,false),
  ('القاهرة-بورسعيد','القاهرة','بورسعيد',140,210,0.72,false),
  ('بورسعيد-القاهرة','بورسعيد','القاهرة',140,210,0.72,false),
  ('القاهرة-الإسماعيلية','القاهرة','الإسماعيلية',100,120,0.70,false),
  ('الإسماعيلية-القاهرة','الإسماعيلية','القاهرة',100,120,0.70,false),
  ('القاهرة-السويس','القاهرة','السويس',110,135,0.68,false),
  ('السويس-القاهرة','السويس','القاهرة',110,135,0.68,false),
  ('القاهرة-دمياط','القاهرة','دمياط',160,210,0.60,false),
  ('دمياط-القاهرة','دمياط','القاهرة',160,210,0.60,false),
  ('القاهرة-مرسى مطروح','القاهرة','مرسى مطروح',300,360,0.75,true),
  ('مرسى مطروح-القاهرة','مرسى مطروح','القاهرة',300,360,0.75,true),
  ('الإسكندرية-مرسى مطروح','الإسكندرية','مرسى مطروح',180,240,0.70,false),
  ('مرسى مطروح-الإسكندرية','مرسى مطروح','الإسكندرية',180,240,0.70,false),
  ('القاهرة-الغردقة','القاهرة','الغردقة',350,390,0.76,true),
  ('الغردقة-القاهرة','الغردقة','القاهرة',350,390,0.76,true),
  ('القاهرة-شرم الشيخ','القاهرة','شرم الشيخ',400,480,0.82,true),
  ('شرم الشيخ-القاهرة','شرم الشيخ','القاهرة',400,480,0.82,true),
  ('القاهرة-دهب','القاهرة','دهب',450,540,0.74,true),
  ('دهب-القاهرة','دهب','القاهرة',450,540,0.74,true),
  ('القاهرة-سوهاج','القاهرة','سوهاج',320,480,0.72,true),
  ('سوهاج-القاهرة','سوهاج','القاهرة',320,480,0.72,true),
  ('القاهرة-قنا','القاهرة','قنا',400,570,0.70,true),
  ('قنا-القاهرة','قنا','القاهرة',400,570,0.70,true),
  ('القاهرة-الأقصر','القاهرة','الأقصر',500,660,0.82,true),
  ('الأقصر-القاهرة','الأقصر','القاهرة',500,660,0.82,true),
  ('القاهرة-أسوان','القاهرة','أسوان',600,840,0.78,true),
  ('أسوان-القاهرة','أسوان','القاهرة',600,840,0.78,true),
  ('الأقصر-أسوان','الأقصر','أسوان',150,210,0.65,false),
  ('أسوان-الأقصر','أسوان','الأقصر',150,210,0.65,false)
on conflict (route_key) do update
set from_city = excluded.from_city,
    to_city = excluded.to_city,
    base_price = excluded.base_price,
    duration_min = excluded.duration_min,
    popularity = excluded.popularity,
    has_rest_stop = excluded.has_rest_stop,
    updated_at = now();

with template_rows(category, departure_time, company, service_class) as (
  values
    ('short','06:00','جو باص','اقتصادي مميز'),
    ('short','08:00','سوبر جيت','اقتصادي مميز'),
    ('short','10:00','بلو باص','اقتصادي مميز'),
    ('short','12:30','جو باص','VIP رجال أعمال'),
    ('short','15:00','سوبر جيت','اقتصادي مميز'),
    ('short','18:00','بلو باص','اقتصادي مميز'),
    ('short','21:00','جو باص','VIP رجال أعمال'),
    ('medium','06:00','جو باص','اقتصادي مميز'),
    ('medium','08:30','سوبر جيت','VIP رجال أعمال'),
    ('medium','11:00','بلو باص','اقتصادي مميز'),
    ('medium','14:00','جو باص','VIP رجال أعمال'),
    ('medium','17:30','سوبر جيت','اقتصادي مميز'),
    ('medium','21:00','بلو باص','اقتصادي مميز'),
    ('long','07:00','جو باص','اقتصادي مميز'),
    ('long','10:00','سوبر جيت','VIP رجال أعمال'),
    ('long','19:30','جو باص','اقتصادي مميز'),
    ('long','22:00','سوبر جيت','VIP رجال أعمال')
)
insert into public.route_templates (route_key, departure_time, company, service_class)
select
  r.route_key,
  template_rows.departure_time::time,
  template_rows.company,
  template_rows.service_class
from public.routes r
join template_rows
  on template_rows.category = case
    when r.duration_min <= 210 then 'short'
    when r.duration_min >= 480 then 'long'
    else 'medium'
  end
on conflict (route_key, departure_time, company, service_class) do nothing;

insert into public.promo_codes (code, discount_type, value, minimum_amount, first_time_only, active)
values
  ('AHLAN50', 'fixed', 50, 0, true, true),
  ('EID26', 'percent', 20, 0, false, true),
  ('SA3EED15', 'percent', 15, 0, false, true),
  ('STUDENT20', 'percent', 20, 0, false, true)
on conflict ((upper(code))) do update
set discount_type = excluded.discount_type,
    value = excluded.value,
    minimum_amount = excluded.minimum_amount,
    first_time_only = excluded.first_time_only,
    active = excluded.active,
    updated_at = now();

create or replace function public.release_expired_seat_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_released integer := 0;
begin
  update public.trip_seats
  set status = 'available',
      held_by_user_id = null,
      hold_token = null,
      hold_expires_at = null,
      updated_at = now()
  where status = 'held'
    and hold_expires_at is not null
    and hold_expires_at <= now();

  get diagnostics v_released = row_count;

  if v_released > 0 then
    update public.trip_instances ti
    set available_seats_count = (
      select count(*)
      from public.trip_seats ts
      where ts.trip_instance_id = ti.id
        and ts.status = 'available'
    ),
    updated_at = now()
    where exists (
      select 1
      from public.trip_seats ts
      where ts.trip_instance_id = ti.id
    );
  end if;

  return v_released;
end;
$$;

grant execute on function public.release_expired_seat_holds() to authenticated;

create or replace function public.release_my_seat_hold(
  p_trip_instance_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_released integer := 0;
begin
  if v_user is null or p_trip_instance_id is null then
    return 0;
  end if;

  update public.trip_seats
  set status = 'available',
      held_by_user_id = null,
      hold_token = null,
      hold_expires_at = null,
      updated_at = now()
  where trip_instance_id = p_trip_instance_id
    and status = 'held'
    and held_by_user_id = v_user;

  get diagnostics v_released = row_count;

  if v_released > 0 then
    update public.trip_instances
    set available_seats_count = (
      select count(*)
      from public.trip_seats
      where trip_instance_id = p_trip_instance_id
        and status = 'available'
    ),
    updated_at = now()
    where id = p_trip_instance_id;
  end if;

  return v_released;
end;
$$;

grant execute on function public.release_my_seat_hold(uuid) to authenticated;

create or replace function public.seed_trip_inventory_for_search(
  p_from_city text,
  p_to_city text,
  p_departure_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_route_key text := p_from_city || '-' || p_to_city;
begin
  if p_from_city is null or p_to_city is null or p_departure_date is null then
    return jsonb_build_object('ok', false, 'message', 'Missing search params');
  end if;

  if not exists (select 1 from public.routes where route_key = v_route_key) then
    return jsonb_build_object('ok', false, 'code', 'no_direct_route', 'message', 'No direct route');
  end if;

  insert into public.trip_instances (
    trip_code,
    route_key,
    from_city,
    to_city,
    from_station_name,
    to_station_name,
    departure_date,
    departure_time,
    arrival_time,
    duration_hours,
    price,
    company,
    service_class,
    rating,
    badge,
    capacity,
    available_seats_count,
    booking_cutoff_minutes,
    luggage_allowance_kg,
    has_rest_stop,
    driver_name,
    driver_rating,
    driver_trips,
    driver_img,
    status
  )
  select
    public.build_trip_code(
      r.from_city,
      r.to_city,
      p_departure_date,
      rt.departure_time,
      rt.company,
      rt.service_class
    ),
    r.route_key,
    r.from_city,
    r.to_city,
    public.primary_station_name(r.from_city),
    public.primary_station_name(r.to_city),
    p_departure_date,
    rt.departure_time,
    (
      rt.departure_time
      + make_interval(
          mins => greatest(
            90,
            r.duration_min
            + case
                when rt.company = 'سوبر جيت' then -12
                when rt.company = 'بلو باص' then 8
                else 0
              end
            + ((abs(hashtext(r.route_key || p_departure_date::text || rt.departure_time::text)) % 25) - 12)
          )
        )
    )::time,
    round((
      greatest(
        90,
        r.duration_min
        + case
            when rt.company = 'سوبر جيت' then -12
            when rt.company = 'بلو باص' then 8
            else 0
          end
        + ((abs(hashtext(r.route_key || p_departure_date::text || rt.departure_time::text)) % 25) - 12)
      ) / 60.0
    )::numeric, 1),
    greatest(
      r.base_price,
      round((
        r.base_price
        * case
            when rt.company = 'بلو باص' then 1.04
            when rt.company = 'سوبر جيت' then 1.08
            else 1.0
          end
        * case
            when rt.service_class like '%VIP%' then 1.42
            else 1.0
          end
        * case
            when extract(hour from rt.departure_time) >= 19 or extract(hour from rt.departure_time) < 6 then 1.06
            when extract(hour from rt.departure_time) between 7 and 9 then 1.03
            else 1.0
          end
        * ((97 + (abs(hashtext(r.route_key || p_departure_date::text || rt.departure_time::text || rt.company)) % 7)) / 100.0)
      ) / 10.0
    ) * 10),
    rt.company,
    rt.service_class,
    round((4.1 + ((abs(hashtext(r.route_key || rt.company || rt.departure_time::text)) % 9) / 10.0))::numeric, 1),
    null,
    40,
    40,
    120,
    20,
    r.has_rest_stop,
    case abs(hashtext(r.route_key || rt.company)) % 3
      when 0 then 'أسطى محمود سعيد'
      when 1 then 'كابتن أحمد علي'
      else 'كابتن سيد رمضان'
    end,
    case abs(hashtext(r.route_key || rt.company)) % 3
      when 0 then 4.8
      when 1 then 4.6
      else 4.9
    end,
    case abs(hashtext(r.route_key || rt.company)) % 3
      when 0 then 342
      when 1 then 156
      else 520
    end,
    case abs(hashtext(r.route_key || rt.company)) % 3
      when 0 then '👨🏽‍✈️'
      when 1 then '👨🏻‍✈️'
      else '👨🏾‍✈️'
    end,
    'scheduled'
  from public.routes r
  join public.route_templates rt on rt.route_key = r.route_key
  where r.route_key = v_route_key
  on conflict (from_city, to_city, departure_date, departure_time, company, service_class) do nothing;

  insert into public.trip_seats (
    trip_instance_id,
    seat_number,
    seat_index,
    status
  )
  select
    ti.id,
    (((gs.n - 1) / 4) + 1)::text || (array['A', 'B', 'C', 'D'])[((gs.n - 1) % 4) + 1],
    gs.n,
    'available'
  from public.trip_instances ti
  cross join generate_series(1, 40) as gs(n)
  where ti.from_city = p_from_city
    and ti.to_city = p_to_city
    and ti.departure_date = p_departure_date
    and not exists (
      select 1
      from public.trip_seats ts
      where ts.trip_instance_id = ti.id
        and ts.seat_index = gs.n
    );

  update public.trip_instances ti
  set available_seats_count = (
      select count(*)
      from public.trip_seats ts
      where ts.trip_instance_id = ti.id
        and ts.status = 'available'
    ),
    badge = case
      when ranked.cheapest_rank = 1 then 'cheapest'
      when ranked.fastest_rank = 1 then 'fastest'
      when ti.service_class like '%VIP%' then 'vip'
      else null
    end,
    updated_at = now()
  from (
    select
      id,
      row_number() over (
        partition by from_city, to_city, departure_date
        order by price asc, id
      ) as cheapest_rank,
      row_number() over (
        partition by from_city, to_city, departure_date
        order by duration_hours asc, id
      ) as fastest_rank
    from public.trip_instances
    where from_city = p_from_city
      and to_city = p_to_city
      and departure_date = p_departure_date
  ) as ranked
  where ti.id = ranked.id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.seed_trip_inventory_for_search(text, text, date) to authenticated;

create or replace function public.hold_trip_seats(
  p_trip_instance_id uuid,
  p_seat_numbers text[],
  p_hold_minutes integer default 5
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_requested integer := coalesce(array_length(p_seat_numbers, 1), 0);
  v_updated integer := 0;
  v_hold_expires_at timestamptz := now() + make_interval(mins => greatest(coalesce(p_hold_minutes, 5), 1));
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'message', 'Unauthorized');
  end if;

  if p_trip_instance_id is null or v_requested = 0 then
    return jsonb_build_object('ok', false, 'message', 'اختر المقاعد أولاً');
  end if;

  perform public.release_expired_seat_holds();
  perform public.release_my_seat_hold(p_trip_instance_id);

  update public.trip_seats
  set status = 'held',
      held_by_user_id = v_user,
      hold_token = gen_random_uuid(),
      hold_expires_at = v_hold_expires_at,
      updated_at = now()
  where trip_instance_id = p_trip_instance_id
    and seat_number = any(p_seat_numbers)
    and status = 'available';

  get diagnostics v_updated = row_count;

  if v_updated <> v_requested then
    perform public.release_my_seat_hold(p_trip_instance_id);
    return jsonb_build_object(
      'ok', false,
      'code', 'seat_unavailable',
      'message', 'بعض المقاعد لم تعد متاحة'
    );
  end if;

  update public.trip_instances
  set available_seats_count = (
    select count(*)
    from public.trip_seats
    where trip_instance_id = p_trip_instance_id
      and status = 'available'
  ),
  updated_at = now()
  where id = p_trip_instance_id;

  return jsonb_build_object(
    'ok', true,
    'hold_expires_at', v_hold_expires_at,
    'seat_numbers', p_seat_numbers
  );
end;
$$;

grant execute on function public.hold_trip_seats(uuid, text[], integer) to authenticated;

create or replace function public.create_booking_atomic(
  p_trip_instance_id uuid,
  p_seat_numbers text[],
  p_passengers integer,
  p_promo_code text default null,
  p_has_luggage boolean default false,
  p_ride_to_station boolean default false,
  p_needs_access boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_trip public.trip_instances%rowtype;
  v_wallet public.app_wallets%rowtype;
  v_promo public.promo_codes%rowtype;
  v_requested integer := coalesce(array_length(p_seat_numbers, 1), 0);
  v_base_total numeric(12,2);
  v_auto_discount numeric(12,2) := 0;
  v_promo_discount numeric(12,2) := 0;
  v_luggage_fee numeric(12,2) := 0;
  v_ride_fee numeric(12,2) := 0;
  v_final_total numeric(12,2) := 0;
  v_new_balance numeric(12,2) := 0;
  v_pnr text;
  v_ticket_token text := public.build_ticket_token();
  v_booking_id uuid;
  v_points integer := 0;
  v_booked_count integer := 0;
  v_invoice jsonb;
  v_trip_payload jsonb;
  v_usage_count integer := 0;
  v_qr_payload text;
  v_departure_at timestamp;
begin
  begin
    if v_user is null then
      raise exception 'Unauthorized';
    end if;

    if p_trip_instance_id is null then
      raise exception 'الرحلة غير صالحة';
    end if;

    if p_passengers is null or p_passengers <= 0 then
      raise exception 'عدد الركاب غير صالح';
    end if;

    if v_requested = 0 or v_requested <> p_passengers then
      raise exception 'عدد المقاعد لا يساوي عدد الركاب';
    end if;

    perform public.release_expired_seat_holds();

    select *
    into v_trip
    from public.trip_instances
    where id = p_trip_instance_id
    for update;

    if not found then
      raise exception 'الرحلة غير موجودة';
    end if;

    v_departure_at := (v_trip.departure_date + v_trip.departure_time);

    if timezone('Africa/Cairo', now()) >= v_departure_at then
      raise exception 'الرحلة اتحركت بالفعل';
    end if;

    if extract(epoch from (v_departure_at - timezone('Africa/Cairo', now()))) / 60.0 < coalesce(v_trip.booking_cutoff_minutes, 120) then
      raise exception 'الحجز بيقفل قبل التحرك بساعتين على الأقل';
    end if;

    insert into public.app_wallets (user_id, balance, points, subscription)
    values (v_user, 0, 0, 'none')
    on conflict (user_id) do nothing;

    select *
    into v_wallet
    from public.app_wallets
    where user_id = v_user
    for update;

    v_base_total := coalesce(v_trip.price, 0) * p_passengers;
    v_luggage_fee := case when p_has_luggage then 50 * p_passengers else 0 end;
    v_ride_fee := case when p_ride_to_station then 80 else 0 end;

    if v_wallet.subscription = 'student' then
      v_auto_discount := floor(v_base_total * 0.15);
    elsif v_wallet.subscription = 'vip' then
      v_auto_discount := floor(v_base_total * 0.25);
    end if;

    if coalesce(trim(p_promo_code), '') <> '' then
      select *
      into v_promo
      from public.promo_codes
      where upper(code) = upper(trim(p_promo_code))
        and active = true
        and (start_at is null or start_at <= now())
        and (end_at is null or end_at >= now());

      if not found then
        raise exception 'كود الخصم غير صالح أو منتهي';
      end if;

      if v_promo.minimum_amount is not null and v_base_total < v_promo.minimum_amount then
        raise exception 'قيمة الطلب أقل من الحد الأدنى للكود';
      end if;

      if v_promo.first_time_only and exists (
        select 1 from public.bookings where user_id = v_user and status <> 'cancelled'
      ) then
        raise exception 'الكود ده لأول رحلة فقط';
      end if;

      if v_promo.allowed_routes is not null and coalesce(array_length(v_promo.allowed_routes, 1), 0) > 0 and not (v_trip.route_key = any(v_promo.allowed_routes)) then
        raise exception 'الكود غير متاح على هذا المسار';
      end if;

      if v_promo.allowed_subscriptions is not null and coalesce(array_length(v_promo.allowed_subscriptions, 1), 0) > 0 and not (v_wallet.subscription = any(v_promo.allowed_subscriptions)) then
        raise exception 'الكود غير متاح لهذه الباقة';
      end if;

      select count(*) into v_usage_count
      from public.promo_code_usages
      where promo_code_id = v_promo.id;

      if v_promo.max_total_uses is not null and v_usage_count >= v_promo.max_total_uses then
        raise exception 'الكود استُهلك بالكامل';
      end if;

      select count(*) into v_usage_count
      from public.promo_code_usages
      where promo_code_id = v_promo.id
        and user_id = v_user;

      if v_promo.max_uses_per_user is not null and v_usage_count >= v_promo.max_uses_per_user then
        raise exception 'استخدمت الكود قبل كده بالحد الأقصى';
      end if;

      if v_promo.discount_type = 'fixed' then
        v_promo_discount := least(v_base_total, v_promo.value);
      else
        v_promo_discount := floor(v_base_total * v_promo.value / 100.0);
      end if;
    end if;

    v_final_total := greatest(0, v_base_total + v_luggage_fee + v_ride_fee - v_auto_discount - v_promo_discount);

    if coalesce(v_wallet.balance, 0) < v_final_total then
      raise exception 'رصيد المحفظة غير كافٍ';
    end if;

    v_pnr := public.build_booking_reference(v_trip.departure_date);

    insert into public.bookings (
      user_id,
      client_id,
      trip_instance_id,
      pnr,
      status,
      booking_date,
      final_total,
      payment_method,
      selected_seats,
      ticket_token,
      qr_payload,
      promo_code,
      luggage,
      ride,
      access,
      earned_points_pending,
      points_awarded,
      trip_data,
      invoice_data
    )
    values (
      v_user,
      'BOOK-' || v_pnr,
      v_trip.id,
      v_pnr,
      'upcoming',
      current_date,
      v_final_total,
      'wallet',
      p_seat_numbers,
      v_ticket_token,
      null,
      nullif(trim(p_promo_code), ''),
      p_has_luggage,
      p_ride_to_station,
      p_needs_access,
      floor(greatest(0, v_base_total - v_auto_discount - v_promo_discount) / 5.0),
      false,
      '{}'::jsonb,
      '{}'::jsonb
    )
    returning id into v_booking_id;

    update public.trip_seats
    set status = 'booked',
        booking_id = v_booking_id,
        held_by_user_id = null,
        hold_token = null,
        hold_expires_at = null,
        updated_at = now()
    where trip_instance_id = v_trip.id
      and seat_number = any(p_seat_numbers)
      and status = 'held'
      and held_by_user_id = v_user
      and hold_expires_at > now();

    get diagnostics v_booked_count = row_count;

    if v_booked_count <> v_requested then
      raise exception 'انتهت مهلة تثبيت المقاعد أو تغيرت الإتاحة';
    end if;

    insert into public.booking_seats (booking_id, trip_instance_id, seat_number)
    select v_booking_id, v_trip.id, unnest(p_seat_numbers);

    v_new_balance := coalesce(v_wallet.balance, 0) - v_final_total;

    update public.app_wallets
    set balance = v_new_balance,
        updated_at = now()
    where user_id = v_user;

    insert into public.app_wallet_transactions (
      user_id,
      client_id,
      type,
      amount,
      txn_date,
      description,
      payload
    )
    values (
      v_user,
      'BOOKING-' || v_booking_id::text,
      'debit',
      v_final_total,
      current_date,
      'تذكرة: ' || v_trip.from_city || ' - ' || v_trip.to_city,
      jsonb_build_object(
        'booking_id', v_booking_id,
        'trip_instance_id', v_trip.id,
        'pnr', v_pnr,
        'ticket_token', v_ticket_token,
        'trip_code', v_trip.trip_code
      )
    );

    if v_promo.id is not null then
      insert into public.promo_code_usages (promo_code_id, user_id, booking_id)
      values (v_promo.id, v_user, v_booking_id);
    end if;

    update public.trip_instances
    set available_seats_count = (
      select count(*)
      from public.trip_seats
      where trip_instance_id = v_trip.id
        and status = 'available'
    ),
    updated_at = now()
    where id = v_trip.id;

    v_points := floor(greatest(0, v_base_total - v_auto_discount - v_promo_discount) / 5.0);
    v_qr_payload := public.build_ticket_qr_payload(v_booking_id, v_pnr, v_trip.trip_code, v_ticket_token, now());

    v_trip_payload := jsonb_build_object(
      'id', v_booking_id,
      'bookingId', v_booking_id,
      'tripInstanceId', v_trip.id,
      'tripCode', v_trip.trip_code,
      'pnr', v_pnr,
      'from', v_trip.from_city,
      'to', v_trip.to_city,
      'fromStationName', v_trip.from_station_name,
      'toStationName', v_trip.to_station_name,
      'date', v_trip.departure_date::text,
      'departureTime', to_char(v_trip.departure_time, 'HH24:MI'),
      'arrivalTime', to_char(v_trip.arrival_time, 'HH24:MI'),
      'durationHour', v_trip.duration_hours,
      'price', v_trip.price,
      'company', v_trip.company,
      'class', v_trip.service_class,
      'rating', to_char(v_trip.rating, 'FM0.0'),
      'hasRestStop', v_trip.has_rest_stop,
      'bookingCutoffMinutes', v_trip.booking_cutoff_minutes,
      'luggageAllowanceKg', v_trip.luggage_allowance_kg,
      'driver', jsonb_build_object(
        'name', v_trip.driver_name,
        'rating', v_trip.driver_rating,
        'trips', v_trip.driver_trips,
        'img', v_trip.driver_img
      ),
      'selectedSeats', p_seat_numbers,
      'bookingDate', current_date::text,
      'finalTotal', v_final_total,
      'paymentMethod', 'wallet',
      'status', 'upcoming',
      'earnedPointsPending', v_points,
      'pointsAwarded', false,
      'luggage', p_has_luggage,
      'ride', p_ride_to_station,
      'access', p_needs_access,
      'ticketToken', v_ticket_token,
      'qrPayload', v_qr_payload
    );

    v_invoice := jsonb_build_object(
      'pnr', v_pnr,
      'tripCode', v_trip.trip_code,
      'total', v_final_total,
      'method', 'محفظة طريقي',
      'date', to_char(timezone('Africa/Cairo', now()), 'YYYY-MM-DD HH24:MI'),
      'items', jsonb_build_array(
        jsonb_build_object('name', 'تذاكر (' || p_passengers || ')', 'price', v_base_total)
      )
      || case when p_has_luggage then jsonb_build_array(jsonb_build_object('name', 'وزن إضافي', 'price', v_luggage_fee)) else '[]'::jsonb end
      || case when p_ride_to_station then jsonb_build_array(jsonb_build_object('name', 'توصيلة للمحطة', 'price', v_ride_fee)) else '[]'::jsonb end
      || case when v_auto_discount > 0 then jsonb_build_array(jsonb_build_object('name', 'خصم الباقة', 'price', -v_auto_discount)) else '[]'::jsonb end
      || case when v_promo_discount > 0 then jsonb_build_array(jsonb_build_object('name', 'كود خصم', 'price', -v_promo_discount)) else '[]'::jsonb end
    );

    update public.bookings
    set trip_data = v_trip_payload,
        invoice_data = v_invoice,
        qr_payload = v_qr_payload,
        updated_at = now()
    where id = v_booking_id;

    return jsonb_build_object(
      'ok', true,
      'booking', v_trip_payload,
      'invoice', v_invoice,
      'walletBalance', v_new_balance
    );
  exception when others then
    return jsonb_build_object(
      'ok', false,
      'message', SQLERRM,
      'code', SQLSTATE
    );
  end;
end;
$$;

grant execute on function public.create_booking_atomic(uuid, text[], integer, text, boolean, boolean, boolean) to authenticated;

create or replace function public.cancel_booking_atomic(
  p_booking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_trip public.trip_instances%rowtype;
  v_wallet public.app_wallets%rowtype;
  v_base_fee numeric(6,2) := 0.20;
  v_fee_ratio numeric(6,2) := 0.20;
  v_refund numeric(12,2) := 0;
  v_hours_to_departure numeric(12,2) := 0;
begin
  begin
    if v_user is null then
      raise exception 'Unauthorized';
    end if;

    select * into v_booking
    from public.bookings
    where id = p_booking_id
      and user_id = v_user
    for update;

    if not found then
      raise exception 'الحجز غير موجود';
    end if;

    if v_booking.status <> 'upcoming' then
      raise exception 'الرحلة دي غير قابلة للإلغاء الآن';
    end if;

    select * into v_trip
    from public.trip_instances
    where id = v_booking.trip_instance_id
    for update;

    if not found then
      raise exception 'بيانات الرحلة غير موجودة';
    end if;

    v_hours_to_departure := extract(epoch from (((v_trip.departure_date + v_trip.departure_time) - timezone('Africa/Cairo', now())))) / 3600.0;

    if v_hours_to_departure <= 2 then
      raise exception 'فات وقت الإلغاء المسموح (أقل من ساعتين على التحرك)';
    end if;

    if v_trip.company = 'سوبر جيت' then
      v_base_fee := 0.15;
    elsif v_trip.company = 'بلو باص' then
      v_base_fee := 0.25;
    else
      v_base_fee := 0.20;
    end if;

    v_fee_ratio := v_base_fee;
    if v_hours_to_departure > 24 then
      v_fee_ratio := greatest(0.10, v_base_fee - 0.05);
    elsif v_hours_to_departure <= 6 then
      v_fee_ratio := least(0.75, v_base_fee + 0.15);
    end if;

    v_refund := greatest(0, round(v_booking.final_total * (1 - v_fee_ratio)));

    insert into public.app_wallets (user_id, balance, points, subscription)
    values (v_user, 0, 0, 'none')
    on conflict (user_id) do nothing;

    select * into v_wallet
    from public.app_wallets
    where user_id = v_user
    for update;

    update public.bookings
    set status = 'cancelled',
        points_awarded = false,
        trip_data = jsonb_set(coalesce(v_booking.trip_data, '{}'::jsonb), '{status}', '"cancelled"'::jsonb, true),
        updated_at = now()
    where id = v_booking.id;

    update public.trip_seats
    set status = 'available',
        booking_id = null,
        held_by_user_id = null,
        hold_token = null,
        hold_expires_at = null,
        updated_at = now()
    where booking_id = v_booking.id;

    update public.trip_instances
    set available_seats_count = (
      select count(*)
      from public.trip_seats
      where trip_instance_id = v_trip.id
        and status = 'available'
    ),
    updated_at = now()
    where id = v_trip.id;

    update public.app_wallets
    set balance = coalesce(v_wallet.balance, 0) + v_refund,
        updated_at = now()
    where user_id = v_user;

    insert into public.app_wallet_transactions (
      user_id,
      client_id,
      type,
      amount,
      txn_date,
      description,
      payload
    )
    values (
      v_user,
      'REFUND-' || v_booking.id::text,
      'credit',
      v_refund,
      current_date,
      'استرداد تذكرة ' || coalesce(v_booking.pnr, v_booking.id::text),
      jsonb_build_object(
        'booking_id', v_booking.id,
        'pnr', v_booking.pnr,
        'trip_code', coalesce(v_booking.trip_data->>'tripCode', null)
      )
    );

    return jsonb_build_object(
      'ok', true,
      'refundAmount', v_refund
    );
  exception when others then
    return jsonb_build_object(
      'ok', false,
      'message', SQLERRM,
      'code', SQLSTATE
    );
  end;
end;
$$;

grant execute on function public.cancel_booking_atomic(uuid) to authenticated;
