begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.app_wallets (
  user_id uuid primary key,
  balance numeric(12,2) not null default 0,
  points integer not null default 0,
  subscription text not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_wallets add column if not exists balance numeric(12,2) not null default 0;
alter table public.app_wallets add column if not exists points integer not null default 0;
alter table public.app_wallets add column if not exists subscription text not null default 'none';
alter table public.app_wallets add column if not exists created_at timestamptz not null default now();
alter table public.app_wallets add column if not exists updated_at timestamptz not null default now();

create table if not exists public.app_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  client_id text not null,
  type text not null default 'debit',
  amount numeric(12,2) not null default 0,
  txn_date date not null default current_date,
  description text not null default 'عملية على المحفظة',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_wallet_transactions add column if not exists id uuid default gen_random_uuid();
alter table public.app_wallet_transactions add column if not exists user_id uuid;
alter table public.app_wallet_transactions add column if not exists client_id text;
alter table public.app_wallet_transactions add column if not exists type text;
alter table public.app_wallet_transactions add column if not exists amount numeric(12,2) not null default 0;
alter table public.app_wallet_transactions add column if not exists txn_date date not null default current_date;
alter table public.app_wallet_transactions add column if not exists description text not null default 'عملية على المحفظة';
alter table public.app_wallet_transactions add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.app_wallet_transactions add column if not exists created_at timestamptz not null default now();
alter table public.app_wallet_transactions add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'app_wallet_transactions'
      and column_name = 'kind'
  ) then
    execute $sql$
      update public.app_wallet_transactions
      set type = case
        when coalesce(type, '') <> '' then type
        when lower(coalesce(kind::text, '')) in ('credit', 'refund', 'topup', 'redeem') then 'credit'
        else 'debit'
      end
      where coalesce(type, '') = ''
    $sql$;
    execute 'alter table public.app_wallet_transactions alter column kind drop not null';
  else
    update public.app_wallet_transactions
    set type = coalesce(nullif(type, ''), coalesce(payload->>'type', ''), 'debit')
    where coalesce(type, '') = '';
  end if;
end $$;

update public.app_wallet_transactions
set description = coalesce(nullif(description, ''), payload->>'desc', payload->>'description', 'عملية على المحفظة');

update public.app_wallet_transactions
set txn_date = coalesce(txn_date, current_date),
    amount = coalesce(amount, ((payload->>'amount')::numeric), 0),
    client_id = coalesce(nullif(client_id, ''), payload->>'client_id', payload->>'id', 'legacy-' || md5(coalesce(created_at::text, now()::text) || coalesce(user_id::text, 'anon')))
where txn_date is null
   or amount is null
   or coalesce(client_id, '') = '';

alter table public.app_wallet_transactions alter column type set default 'debit';
alter table public.app_wallet_transactions alter column type set not null;
alter table public.app_wallet_transactions alter column client_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'app_wallet_transactions_client_id_key'
  ) then
    execute 'create unique index app_wallet_transactions_client_id_key on public.app_wallet_transactions (client_id)';
  end if;
end $$;

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name_ar text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stations (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete cascade,
  slug text unique,
  name_ar text not null,
  address text,
  lat numeric,
  lng numeric,
  is_primary boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  from_city_id uuid not null references public.cities(id) on delete cascade,
  to_city_id uuid not null references public.cities(id) on delete cascade,
  from_station_id uuid not null references public.stations(id) on delete restrict,
  to_station_id uuid not null references public.stations(id) on delete restrict,
  base_price numeric(12,2) not null,
  duration_minutes integer not null,
  has_rest_stop boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists routes_station_pair_key on public.routes (from_station_id, to_station_id);

create table if not exists public.route_templates (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  departure_time time not null,
  company text not null,
  service_class text not null,
  rating numeric(3,2) not null default 4.5,
  driver_name text,
  driver_rating numeric(3,2) not null default 4.5,
  driver_trips integer not null default 0,
  driver_img text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists route_templates_route_slot_key
  on public.route_templates (route_id, departure_time, company, service_class);

create table if not exists public.trip_instances (
  id uuid primary key default gen_random_uuid(),
  route_template_id uuid not null references public.route_templates(id) on delete cascade,
  route_id uuid not null references public.routes(id) on delete cascade,
  trip_code text not null unique,
  from_city text not null,
  to_city text not null,
  from_station_id uuid references public.stations(id) on delete restrict,
  to_station_id uuid references public.stations(id) on delete restrict,
  from_station_name text,
  to_station_name text,
  departure_date date not null,
  departure_time time not null,
  arrival_time time not null,
  duration_hours numeric(5,2) not null,
  price numeric(12,2) not null,
  company text not null,
  service_class text not null,
  rating numeric(3,2) not null default 4.5,
  driver_name text,
  driver_rating numeric(3,2),
  driver_trips integer,
  driver_img text,
  has_rest_stop boolean not null default false,
  capacity integer not null default 40,
  available_seats_count integer not null default 40,
  badge text,
  status text not null default 'scheduled',
  inventory_source text not null default 'generated_seed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists trip_instances_template_date_key
  on public.trip_instances (route_template_id, departure_date);
create index if not exists trip_instances_city_date_idx
  on public.trip_instances (from_city, to_city, departure_date, departure_time);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  trip_instance_id uuid references public.trip_instances(id) on delete set null,
  client_id text,
  pnr text,
  status text not null default 'upcoming',
  booking_date date not null default current_date,
  final_total numeric(12,2) not null default 0,
  payment_method text not null default 'wallet',
  selected_seats jsonb not null default '[]'::jsonb,
  trip_data jsonb not null default '{}'::jsonb,
  ticket_token text,
  qr_payload text,
  luggage boolean not null default false,
  ride boolean not null default false,
  access boolean not null default false,
  earned_points_pending integer not null default 0,
  points_awarded boolean not null default false,
  promo_code text,
  promo_discount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings add column if not exists user_id uuid;
alter table public.bookings add column if not exists trip_instance_id uuid;
alter table public.bookings add column if not exists client_id text;
alter table public.bookings add column if not exists pnr text;
alter table public.bookings add column if not exists status text not null default 'upcoming';
alter table public.bookings add column if not exists booking_date date not null default current_date;
alter table public.bookings add column if not exists final_total numeric(12,2) not null default 0;
alter table public.bookings add column if not exists payment_method text not null default 'wallet';
alter table public.bookings add column if not exists selected_seats jsonb not null default '[]'::jsonb;
alter table public.bookings add column if not exists trip_data jsonb not null default '{}'::jsonb;
alter table public.bookings add column if not exists ticket_token text;
alter table public.bookings add column if not exists qr_payload text;
alter table public.bookings add column if not exists luggage boolean not null default false;
alter table public.bookings add column if not exists ride boolean not null default false;
alter table public.bookings add column if not exists access boolean not null default false;
alter table public.bookings add column if not exists earned_points_pending integer not null default 0;
alter table public.bookings add column if not exists points_awarded boolean not null default false;
alter table public.bookings add column if not exists promo_code text;
alter table public.bookings add column if not exists promo_discount numeric(12,2) not null default 0;
alter table public.bookings add column if not exists created_at timestamptz not null default now();
alter table public.bookings add column if not exists updated_at timestamptz not null default now();

update public.bookings
set pnr = coalesce(nullif(pnr, ''), 'LEG-' || upper(substr(md5(coalesce(id::text, gen_random_uuid()::text)), 1, 6))),
    client_id = coalesce(nullif(client_id, ''), trip_data->>'client_id', pnr),
    selected_seats = coalesce(selected_seats, trip_data->'selectedSeats', '[]'::jsonb),
    trip_data = coalesce(trip_data, '{}'::jsonb)
where coalesce(pnr, '') = ''
   or coalesce(client_id, '') = ''
   or selected_seats is null
   or trip_data is null;

create unique index if not exists bookings_client_id_key on public.bookings (client_id) where client_id is not null;
create unique index if not exists bookings_pnr_key on public.bookings (pnr) where pnr is not null;
create unique index if not exists bookings_ticket_token_key on public.bookings (ticket_token) where ticket_token is not null;
create index if not exists bookings_user_created_idx on public.bookings (user_id, created_at desc);

create table if not exists public.trip_seats (
  id uuid primary key default gen_random_uuid(),
  trip_instance_id uuid not null references public.trip_instances(id) on delete cascade,
  seat_index integer not null,
  seat_number text not null,
  status text not null default 'available',
  held_by_user_id uuid,
  hold_expires_at timestamptz,
  booking_id uuid references public.bookings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists trip_seats_trip_seat_number_key on public.trip_seats (trip_instance_id, seat_number);
create unique index if not exists trip_seats_trip_seat_index_key on public.trip_seats (trip_instance_id, seat_index);
create index if not exists trip_seats_trip_status_idx on public.trip_seats (trip_instance_id, status);

create table if not exists public.booking_passengers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  passenger_index integer not null,
  seat_number text not null,
  fare_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists booking_passengers_booking_passenger_key on public.booking_passengers (booking_id, passenger_index);
create unique index if not exists booking_passengers_booking_seat_key on public.booking_passengers (booking_id, seat_number);

create or replace function public.generate_seat_label(p_index integer)
returns text
language sql
immutable
as $$
  select (((p_index - 1) / 4) + 1)::text || substr('ABCD', ((p_index - 1) % 4) + 1, 1)
$$;

create or replace function public.release_expired_seat_holds(p_trip_instance_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  update public.trip_seats
  set status = 'available',
      held_by_user_id = null,
      hold_expires_at = null,
      updated_at = now()
  where status = 'held'
    and hold_expires_at is not null
    and hold_expires_at <= now()
    and (p_trip_instance_id is null or trip_instance_id = p_trip_instance_id);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.recalculate_trip_available_seats(p_trip_instance_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  perform public.release_expired_seat_holds(p_trip_instance_id);

  select count(*)::integer
  into v_count
  from public.trip_seats
  where trip_instance_id = p_trip_instance_id
    and status = 'available';

  update public.trip_instances
  set available_seats_count = v_count,
      updated_at = now()
  where id = p_trip_instance_id;

  return v_count;
end;
$$;

create or replace function public.seed_reference_travel_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_route record;
  v_from_city_id uuid;
  v_to_city_id uuid;
  v_from_station_id uuid;
  v_to_station_id uuid;
  v_route_id uuid;
begin
  insert into public.cities (code, name_ar)
  values
    ('cai', 'القاهرة'),
    ('alex', 'الإسكندرية'),
    ('matruh', 'مرسى مطروح'),
    ('portsaid', 'بورسعيد'),
    ('ismailia', 'الإسماعيلية'),
    ('suez', 'السويس'),
    ('damietta', 'دمياط'),
    ('sharm', 'شرم الشيخ'),
    ('hurghada', 'الغردقة'),
    ('dahab', 'دهب'),
    ('taba', 'طابا'),
    ('mansoura', 'المنصورة'),
    ('sohag', 'سوهاج'),
    ('qena', 'قنا'),
    ('luxor', 'الأقصر'),
    ('aswan', 'أسوان')
  on conflict (name_ar) do nothing;

  insert into public.stations (city_id, slug, name_ar, is_primary)
  select c.id, slug_seed.slug, slug_seed.name_ar, slug_seed.is_primary
  from (
    values
      ('القاهرة', 'cairo-main', 'محطة القاهرة الرئيسية', true),
      ('القاهرة', 'cairo-ramses', 'محطة رمسيس', false),
      ('القاهرة', 'cairo-east', 'محطة القاهرة الشرقية', false),
      ('الإسكندرية', 'alex-main', 'محطة الإسكندرية الرئيسية', true),
      ('الإسكندرية', 'alex-sidi-gaber', 'محطة سيدي جابر', false),
      ('مرسى مطروح', 'matruh-main', 'محطة مرسى مطروح الرئيسية', true),
      ('بورسعيد', 'portsaid-main', 'محطة بورسعيد الرئيسية', true),
      ('الإسماعيلية', 'ismailia-main', 'محطة الإسماعيلية الرئيسية', true),
      ('السويس', 'suez-main', 'محطة السويس الرئيسية', true),
      ('دمياط', 'damietta-main', 'محطة دمياط الرئيسية', true),
      ('شرم الشيخ', 'sharm-main', 'محطة شرم الشيخ الرئيسية', true),
      ('الغردقة', 'hurghada-main', 'محطة الغردقة الرئيسية', true),
      ('دهب', 'dahab-main', 'محطة دهب الرئيسية', true),
      ('طابا', 'taba-main', 'محطة طابا الرئيسية', true),
      ('المنصورة', 'mansoura-main', 'محطة المنصورة الرئيسية', true),
      ('سوهاج', 'sohag-main', 'محطة سوهاج الرئيسية', true),
      ('قنا', 'qena-main', 'محطة قنا الرئيسية', true),
      ('الأقصر', 'luxor-main', 'محطة الأقصر الرئيسية', true),
      ('أسوان', 'aswan-main', 'محطة أسوان الرئيسية', true)
  ) as slug_seed(city_name, slug, name_ar, is_primary)
  join public.cities c on c.name_ar = slug_seed.city_name
  on conflict (slug) do nothing;

  for v_route in
    select * from (
      values
        ('القاهرة', 'الإسكندرية', 150::numeric, 180, false),
        ('الإسكندرية', 'القاهرة', 150::numeric, 180, false),
        ('القاهرة', 'المنصورة', 120::numeric, 150, false),
        ('المنصورة', 'القاهرة', 120::numeric, 150, false),
        ('القاهرة', 'بورسعيد', 140::numeric, 210, false),
        ('بورسعيد', 'القاهرة', 140::numeric, 210, false),
        ('القاهرة', 'الإسماعيلية', 100::numeric, 120, false),
        ('الإسماعيلية', 'القاهرة', 100::numeric, 120, false),
        ('القاهرة', 'السويس', 110::numeric, 135, false),
        ('السويس', 'القاهرة', 110::numeric, 135, false),
        ('القاهرة', 'دمياط', 160::numeric, 210, false),
        ('دمياط', 'القاهرة', 160::numeric, 210, false),
        ('القاهرة', 'مرسى مطروح', 300::numeric, 360, true),
        ('مرسى مطروح', 'القاهرة', 300::numeric, 360, true),
        ('الإسكندرية', 'مرسى مطروح', 180::numeric, 240, false),
        ('مرسى مطروح', 'الإسكندرية', 180::numeric, 240, false),
        ('القاهرة', 'الغردقة', 350::numeric, 390, true),
        ('الغردقة', 'القاهرة', 350::numeric, 390, true),
        ('القاهرة', 'شرم الشيخ', 400::numeric, 480, true),
        ('شرم الشيخ', 'القاهرة', 400::numeric, 480, true),
        ('القاهرة', 'دهب', 450::numeric, 540, true),
        ('دهب', 'القاهرة', 450::numeric, 540, true),
        ('القاهرة', 'سوهاج', 320::numeric, 480, true),
        ('سوهاج', 'القاهرة', 320::numeric, 480, true),
        ('القاهرة', 'قنا', 400::numeric, 570, true),
        ('قنا', 'القاهرة', 400::numeric, 570, true),
        ('القاهرة', 'الأقصر', 500::numeric, 660, true),
        ('الأقصر', 'القاهرة', 500::numeric, 660, true),
        ('القاهرة', 'أسوان', 600::numeric, 840, true),
        ('أسوان', 'القاهرة', 600::numeric, 840, true),
        ('الأقصر', 'أسوان', 150::numeric, 210, false),
        ('أسوان', 'الأقصر', 150::numeric, 210, false)
    ) as route_seed(from_city, to_city, base_price, duration_minutes, has_rest_stop)
  loop
    select id into v_from_city_id from public.cities where name_ar = v_route.from_city;
    select id into v_to_city_id from public.cities where name_ar = v_route.to_city;
    select id into v_from_station_id from public.stations where city_id = v_from_city_id and is_primary = true limit 1;
    select id into v_to_station_id from public.stations where city_id = v_to_city_id and is_primary = true limit 1;

    insert into public.routes (
      from_city_id, to_city_id, from_station_id, to_station_id, base_price, duration_minutes, has_rest_stop, active
    ) values (
      v_from_city_id, v_to_city_id, v_from_station_id, v_to_station_id, v_route.base_price, v_route.duration_minutes, v_route.has_rest_stop, true
    )
    on conflict (from_station_id, to_station_id) do update
      set base_price = excluded.base_price,
          duration_minutes = excluded.duration_minutes,
          has_rest_stop = excluded.has_rest_stop,
          active = true,
          updated_at = now();

    select id into v_route_id from public.routes where from_station_id = v_from_station_id and to_station_id = v_to_station_id limit 1;

    insert into public.route_templates (route_id, departure_time, company, service_class, rating, driver_name, driver_rating, driver_trips, driver_img)
    values
      (v_route_id, '06:00'::time, 'جو باص', 'اقتصادي مميز', 4.5, 'أسطى محمود سعيد', 4.8, 342, '👨🏽‍✈️'),
      (v_route_id, '10:00'::time, 'سوبر جيت', 'VIP رجال أعمال', 4.6, 'كابتن أحمد علي', 4.6, 156, '👨🏻‍✈️'),
      (v_route_id, '15:00'::time, 'بلو باص', 'اقتصادي مميز', 4.4, 'كابتن سيد رمضان', 4.9, 520, '👨🏾‍✈️'),
      (v_route_id, '21:00'::time, 'جو باص', 'VIP رجال أعمال', 4.7, 'أسطى محمود سعيد', 4.8, 342, '👨🏽‍✈️')
    on conflict (route_id, departure_time, company, service_class) do nothing;
  end loop;
end;
$$;

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
  v_route record;
  v_template record;
  v_instance_id uuid;
  v_trip_code text;
  v_days_until integer;
  v_fill_threshold integer;
  v_price numeric(12,2);
  v_duration integer;
  v_seeded integer := 0;
begin
  perform public.seed_reference_travel_data();

  select r.*, fc.name_ar as from_city_name, tc.name_ar as to_city_name,
         fs.name_ar as from_station_name, ts.name_ar as to_station_name
  into v_route
  from public.routes r
  join public.cities fc on fc.id = r.from_city_id
  join public.cities tc on tc.id = r.to_city_id
  join public.stations fs on fs.id = r.from_station_id
  join public.stations ts on ts.id = r.to_station_id
  where fc.name_ar = p_from_city
    and tc.name_ar = p_to_city
    and r.active = true
  limit 1;

  if v_route.id is null then
    return jsonb_build_object('ok', true, 'seeded_count', 0, 'message', 'route_not_configured');
  end if;

  v_days_until := (p_departure_date - current_date);
  v_fill_threshold := case
    when v_days_until <= 0 then 78
    when v_days_until <= 1 then 64
    when v_days_until <= 3 then 48
    when v_days_until <= 7 then 35
    else 24
  end;

  for v_template in
    select *
    from public.route_templates
    where route_id = v_route.id
      and active = true
    order by departure_time asc
  loop
    v_duration := v_route.duration_minutes
      + case when v_template.company = 'سوبر جيت' then -12 when v_template.company = 'بلو باص' then 8 else 0 end;

    v_price := round((
      v_route.base_price
      * case when v_template.company = 'بلو باص' then 1.04 when v_template.company = 'سوبر جيت' then 1.08 else 1.0 end
      * case when v_template.service_class like '%VIP%' then 1.42 else 1.0 end
    )::numeric / 10) * 10;

    v_trip_code := 'TRP-' || upper(substr(md5(v_route.id::text || p_departure_date::text || v_template.departure_time::text), 1, 8));

    insert into public.trip_instances (
      route_template_id,
      route_id,
      trip_code,
      from_city,
      to_city,
      from_station_id,
      to_station_id,
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
      driver_name,
      driver_rating,
      driver_trips,
      driver_img,
      has_rest_stop,
      capacity,
      available_seats_count,
      status,
      inventory_source
    ) values (
      v_template.id,
      v_route.id,
      v_trip_code,
      p_from_city,
      p_to_city,
      v_route.from_station_id,
      v_route.to_station_id,
      v_route.from_station_name,
      v_route.to_station_name,
      p_departure_date,
      v_template.departure_time,
      v_template.departure_time + make_interval(mins => v_duration),
      round((v_duration::numeric / 60.0)::numeric, 1),
      v_price,
      v_template.company,
      v_template.service_class,
      v_template.rating,
      v_template.driver_name,
      v_template.driver_rating,
      v_template.driver_trips,
      v_template.driver_img,
      v_route.has_rest_stop,
      40,
      40,
      'scheduled',
      'generated_seed'
    )
    on conflict (route_template_id, departure_date) do nothing;

    select id into v_instance_id
    from public.trip_instances
    where route_template_id = v_template.id
      and departure_date = p_departure_date
    limit 1;

    insert into public.trip_seats (trip_instance_id, seat_index, seat_number, status)
    select
      v_instance_id,
      gs,
      public.generate_seat_label(gs),
      case
        when mod(abs(hashtext(v_trip_code || '-' || gs::text)), 100) < (v_fill_threshold + case when v_template.service_class like '%VIP%' then 5 else 0 end)
          then 'booked'
        else 'available'
      end
    from generate_series(1, 40) as gs
    on conflict (trip_instance_id, seat_number) do nothing;

    perform public.recalculate_trip_available_seats(v_instance_id);
    v_seeded := v_seeded + 1;
  end loop;

  return jsonb_build_object('ok', true, 'seeded_count', v_seeded, 'message', 'inventory_ready');
end;
$$;

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
  v_user_id uuid := auth.uid();
  v_requested integer := coalesce(cardinality(p_seat_numbers), 0);
  v_existing integer := 0;
  v_conflicts integer := 0;
  v_hold_expires_at timestamptz := now() + make_interval(mins => greatest(1, coalesce(p_hold_minutes, 5)));
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'لازم تسجل دخول الأول', 'code', 'unauthorized');
  end if;

  if v_requested = 0 then
    return jsonb_build_object('ok', false, 'message', 'اختار مقعد واحد على الأقل', 'code', 'empty_selection');
  end if;

  perform pg_advisory_xact_lock(hashtext(p_trip_instance_id::text));
  perform public.release_expired_seat_holds(p_trip_instance_id);

  select count(*) into v_existing
  from public.trip_seats
  where trip_instance_id = p_trip_instance_id
    and seat_number = any(p_seat_numbers);

  if v_existing <> v_requested then
    return jsonb_build_object('ok', false, 'message', 'بعض المقاعد غير موجودة على الرحلة', 'code', 'seat_missing');
  end if;

  select count(*) into v_conflicts
  from public.trip_seats
  where trip_instance_id = p_trip_instance_id
    and seat_number = any(p_seat_numbers)
    and (
      status = 'booked'
      or (status = 'held' and coalesce(hold_expires_at, now() + interval '1 second') > now() and held_by_user_id is distinct from v_user_id)
    );

  if v_conflicts > 0 then
    return jsonb_build_object('ok', false, 'message', 'بعض المقاعد لم تعد متاحة', 'code', 'seat_conflict');
  end if;

  update public.trip_seats
  set status = 'available', held_by_user_id = null, hold_expires_at = null, updated_at = now()
  where trip_instance_id = p_trip_instance_id
    and status = 'held'
    and held_by_user_id = v_user_id
    and seat_number <> all(p_seat_numbers);

  update public.trip_seats
  set status = 'held',
      held_by_user_id = v_user_id,
      hold_expires_at = v_hold_expires_at,
      updated_at = now()
  where trip_instance_id = p_trip_instance_id
    and seat_number = any(p_seat_numbers)
    and status <> 'booked';

  perform public.recalculate_trip_available_seats(p_trip_instance_id);

  return jsonb_build_object('ok', true, 'hold_expires_at', v_hold_expires_at, 'message', 'seat_hold_created');
end;
$$;

create or replace function public.release_my_seat_hold(p_trip_instance_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'لازم تسجل دخول الأول', 'code', 'unauthorized');
  end if;

  update public.trip_seats
  set status = 'available',
      held_by_user_id = null,
      hold_expires_at = null,
      updated_at = now()
  where trip_instance_id = p_trip_instance_id
    and status = 'held'
    and held_by_user_id = v_user_id;

  perform public.recalculate_trip_available_seats(p_trip_instance_id);
  return jsonb_build_object('ok', true, 'message', 'seat_hold_released');
end;
$$;

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
  v_user_id uuid := auth.uid();
  v_wallet public.app_wallets%rowtype;
  v_trip public.trip_instances%rowtype;
  v_unique_seats integer := 0;
  v_conflicts integer := 0;
  v_base_total numeric(12,2);
  v_auto_discount numeric(12,2) := 0;
  v_promo_discount numeric(12,2) := 0;
  v_luggage_fee numeric(12,2) := 0;
  v_ride_fee numeric(12,2) := 0;
  v_final_total numeric(12,2) := 0;
  v_points integer := 0;
  v_booking_id uuid;
  v_pnr text;
  v_ticket_token text;
  v_qr_payload text;
  v_booking_date date := current_date;
  v_payment_tx_client_id text;
  v_selected_seats jsonb;
  v_invoice_items jsonb;
  v_trip_snapshot jsonb;
  v_hold_owned_count integer := 0;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'لازم تسجل دخول الأول', 'code', 'unauthorized');
  end if;

  if coalesce(cardinality(p_seat_numbers), 0) = 0 or coalesce(p_passengers, 0) <= 0 then
    return jsonb_build_object('ok', false, 'message', 'اختار المقاعد وعدد الركاب بشكل صحيح', 'code', 'invalid_payload');
  end if;

  select count(distinct seat_no) into v_unique_seats from unnest(p_seat_numbers) as seat_no;
  if v_unique_seats <> p_passengers then
    return jsonb_build_object('ok', false, 'message', 'عدد المقاعد لازم يساوي عدد الركاب', 'code', 'seat_count_mismatch');
  end if;

  perform pg_advisory_xact_lock(hashtext(p_trip_instance_id::text));
  perform public.release_expired_seat_holds(p_trip_instance_id);

  select * into v_trip
  from public.trip_instances
  where id = p_trip_instance_id
  for update;

  if v_trip.id is null then
    return jsonb_build_object('ok', false, 'message', 'الرحلة غير موجودة', 'code', 'trip_missing');
  end if;

  if (v_trip.departure_date + v_trip.departure_time) <= (now() + interval '2 hours') then
    return jsonb_build_object('ok', false, 'message', 'الحجز بيقفل قبل التحرك بساعتين على الأقل', 'code', 'booking_cutoff');
  end if;

  select count(*) into v_hold_owned_count
  from public.trip_seats
  where trip_instance_id = p_trip_instance_id
    and seat_number = any(p_seat_numbers)
    and status = 'held'
    and held_by_user_id = v_user_id
    and coalesce(hold_expires_at, now() + interval '1 second') > now();

  if v_hold_owned_count <> cardinality(p_seat_numbers) then
    return jsonb_build_object('ok', false, 'message', 'انتهى تثبيت المقاعد أو لازم تعيد اختيارها', 'code', 'hold_missing');
  end if;

  select count(*) into v_conflicts
  from public.trip_seats
  where trip_instance_id = p_trip_instance_id
    and seat_number = any(p_seat_numbers)
    and (
      status = 'booked'
      or (status = 'held' and coalesce(hold_expires_at, now() + interval '1 second') > now() and held_by_user_id is distinct from v_user_id)
    );

  if v_conflicts > 0 then
    return jsonb_build_object('ok', false, 'message', 'بعض المقاعد لم تعد متاحة', 'code', 'seat_conflict');
  end if;

  insert into public.app_wallets (user_id, balance, points, subscription)
  values (v_user_id, 0, 0, 'none')
  on conflict (user_id) do nothing;

  select * into v_wallet
  from public.app_wallets
  where user_id = v_user_id
  for update;

  v_base_total := round((v_trip.price * p_passengers)::numeric, 2);
  v_auto_discount := case
    when v_wallet.subscription = 'student' then floor(v_base_total * 0.15)
    when v_wallet.subscription = 'vip' then floor(v_base_total * 0.25)
    else 0
  end;

  if upper(coalesce(p_promo_code, '')) = 'AHLAN50' then
    v_promo_discount := 50;
  elsif upper(coalesce(p_promo_code, '')) = 'EID26' then
    v_promo_discount := floor(v_base_total * 0.20);
  elsif upper(coalesce(p_promo_code, '')) = 'SA3EED15' then
    v_promo_discount := floor(v_base_total * 0.15);
  elsif upper(coalesce(p_promo_code, '')) = 'STUDENT20' then
    v_promo_discount := floor(v_base_total * 0.20);
  else
    v_promo_discount := 0;
  end if;

  v_luggage_fee := case when p_has_luggage then 50 * p_passengers else 0 end;
  v_ride_fee := case when p_ride_to_station then 80 else 0 end;
  v_final_total := greatest(0, v_base_total + v_luggage_fee + v_ride_fee - v_auto_discount - v_promo_discount);
  v_points := greatest(0, floor(greatest(0, v_base_total - v_auto_discount - v_promo_discount) / 5));

  if coalesce(v_wallet.balance, 0) < v_final_total then
    return jsonb_build_object('ok', false, 'message', 'رصيد المحفظة مش كفاية', 'code', 'wallet_insufficient');
  end if;

  v_pnr := 'TRQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  v_ticket_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_qr_payload := 'booking:' || v_pnr || '|token:' || v_ticket_token;
  v_selected_seats := to_jsonb(p_seat_numbers);
  v_payment_tx_client_id := 'BOOK-' || v_pnr;

  v_trip_snapshot := jsonb_build_object(
    'tripInstanceId', v_trip.id,
    'from', v_trip.from_city,
    'to', v_trip.to_city,
    'fromStationName', v_trip.from_station_name,
    'toStationName', v_trip.to_station_name,
    'date', v_trip.departure_date,
    'departureTime', to_char(v_trip.departure_time, 'HH24:MI'),
    'arrivalTime', to_char(v_trip.arrival_time, 'HH24:MI'),
    'durationHour', v_trip.duration_hours,
    'price', v_trip.price,
    'company', v_trip.company,
    'class', v_trip.service_class,
    'rating', v_trip.rating,
    'driver', case when v_trip.driver_name is null then null else jsonb_build_object('name', v_trip.driver_name, 'rating', v_trip.driver_rating, 'trips', v_trip.driver_trips, 'img', v_trip.driver_img) end,
    'hasRestStop', v_trip.has_rest_stop,
    'selectedSeats', v_selected_seats,
    'finalTotal', v_final_total,
    'paymentMethod', 'wallet',
    'status', 'upcoming',
    'earnedPointsPending', v_points,
    'pointsAwarded', false,
    'luggage', p_has_luggage,
    'ride', p_ride_to_station,
    'access', p_needs_access,
    'ticketToken', v_ticket_token,
    'qrPayload', v_qr_payload,
    'bookingDate', v_booking_date,
    'pnr', v_pnr
  );

  insert into public.bookings (
    user_id,
    trip_instance_id,
    client_id,
    pnr,
    status,
    booking_date,
    final_total,
    payment_method,
    selected_seats,
    trip_data,
    ticket_token,
    qr_payload,
    luggage,
    ride,
    access,
    earned_points_pending,
    points_awarded,
    promo_code,
    promo_discount
  ) values (
    v_user_id,
    p_trip_instance_id,
    v_pnr,
    v_pnr,
    'upcoming',
    v_booking_date,
    v_final_total,
    'wallet',
    v_selected_seats,
    v_trip_snapshot,
    v_ticket_token,
    v_qr_payload,
    p_has_luggage,
    p_ride_to_station,
    p_needs_access,
    v_points,
    false,
    upper(nullif(p_promo_code, '')),
    v_promo_discount
  ) returning id into v_booking_id;

  insert into public.booking_passengers (booking_id, passenger_index, seat_number, fare_amount)
  select v_booking_id, ordinality::integer, seat_no, round((v_final_total / greatest(1, p_passengers))::numeric, 2)
  from unnest(p_seat_numbers) with ordinality as seat_list(seat_no, ordinality);

  update public.trip_seats
  set status = 'booked',
      booking_id = v_booking_id,
      held_by_user_id = null,
      hold_expires_at = null,
      updated_at = now()
  where trip_instance_id = p_trip_instance_id
    and seat_number = any(p_seat_numbers);

  update public.app_wallets
  set balance = balance - v_final_total,
      updated_at = now()
  where user_id = v_user_id;

  insert into public.app_wallet_transactions (
    user_id,
    client_id,
    type,
    amount,
    txn_date,
    description,
    payload,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_payment_tx_client_id,
    'debit',
    v_final_total,
    v_booking_date,
    'تذكرة: ' || v_trip.from_city || ' - ' || v_trip.to_city,
    jsonb_build_object(
      'client_id', v_payment_tx_client_id,
      'type', 'debit',
      'amount', v_final_total,
      'date', v_booking_date,
      'desc', 'تذكرة: ' || v_trip.from_city || ' - ' || v_trip.to_city,
      'bookingId', v_booking_id,
      'tripInstanceId', p_trip_instance_id
    ),
    now(),
    now()
  )
  on conflict (client_id) do nothing;

  perform public.recalculate_trip_available_seats(p_trip_instance_id);

  v_invoice_items := to_jsonb(array[
    jsonb_build_object('name', 'تذاكر (' || p_passengers || ')', 'price', v_base_total)
  ]);

  if v_luggage_fee > 0 then
    v_invoice_items := v_invoice_items || jsonb_build_array(jsonb_build_object('name', 'وزن إضافي', 'price', v_luggage_fee));
  end if;
  if v_ride_fee > 0 then
    v_invoice_items := v_invoice_items || jsonb_build_array(jsonb_build_object('name', 'أوبر للمحطة', 'price', v_ride_fee));
  end if;
  if v_auto_discount > 0 then
    v_invoice_items := v_invoice_items || jsonb_build_array(jsonb_build_object('name', 'خصم الباقة', 'price', -v_auto_discount));
  end if;
  if v_promo_discount > 0 then
    v_invoice_items := v_invoice_items || jsonb_build_array(jsonb_build_object('name', 'كود خصم', 'price', -v_promo_discount));
  end if;

  return jsonb_build_object(
    'ok', true,
    'booking', jsonb_build_object(
      'id', v_booking_id,
      'bookingId', v_booking_id,
      'tripInstanceId', p_trip_instance_id,
      'pnr', v_pnr,
      'from', v_trip.from_city,
      'to', v_trip.to_city,
      'fromStationName', v_trip.from_station_name,
      'toStationName', v_trip.to_station_name,
      'date', v_trip.departure_date,
      'departureTime', to_char(v_trip.departure_time, 'HH24:MI'),
      'arrivalTime', to_char(v_trip.arrival_time, 'HH24:MI'),
      'durationHour', v_trip.duration_hours,
      'price', v_trip.price,
      'company', v_trip.company,
      'class', v_trip.service_class,
      'selectedSeats', v_selected_seats,
      'finalTotal', v_final_total,
      'paymentMethod', 'wallet',
      'status', 'upcoming',
      'bookingDate', v_booking_date,
      'earnedPointsPending', v_points,
      'pointsAwarded', false,
      'luggage', p_has_luggage,
      'ride', p_ride_to_station,
      'access', p_needs_access,
      'ticketToken', v_ticket_token,
      'qrPayload', v_qr_payload,
      'driver', case when v_trip.driver_name is null then null else jsonb_build_object('name', v_trip.driver_name, 'rating', v_trip.driver_rating, 'trips', v_trip.driver_trips, 'img', v_trip.driver_img) end,
      'hasRestStop', v_trip.has_rest_stop
    ),
    'invoice', jsonb_build_object(
      'pnr', v_pnr,
      'total', v_final_total,
      'method', 'محفظة طريقي',
      'date', to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
      'items', v_invoice_items
    )
  );
end;
$$;

create or replace function public.cancel_booking_atomic(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_trip public.trip_instances%rowtype;
  v_wallet public.app_wallets%rowtype;
  v_company text;
  v_fee_ratio numeric(5,2) := 0.20;
  v_refund_amount numeric(12,2) := 0;
  v_hours_to_departure numeric := 0;
  v_refund_tx_client_id text;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'لازم تسجل دخول الأول', 'code', 'unauthorized');
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
    and user_id = v_user_id
  for update;

  if v_booking.id is null then
    return jsonb_build_object('ok', false, 'message', 'الحجز غير موجود', 'code', 'booking_missing');
  end if;

  if v_booking.status <> 'upcoming' then
    return jsonb_build_object('ok', false, 'message', 'الحجز غير قابل للإلغاء الآن', 'code', 'booking_not_cancellable');
  end if;

  if v_booking.trip_instance_id is not null then
    select * into v_trip from public.trip_instances where id = v_booking.trip_instance_id for update;
    v_company := coalesce(v_trip.company, v_booking.trip_data->>'company');
    v_hours_to_departure := ((v_trip.departure_date + v_trip.departure_time) - now()) / interval '1 hour';
  else
    v_company := coalesce(v_booking.trip_data->>'company', 'جو باص');
    v_hours_to_departure := 999;
  end if;

  if v_hours_to_departure <= 2 then
    return jsonb_build_object('ok', false, 'message', 'فات وقت الإلغاء المسموح (أقل من ساعتين على التحرك)', 'code', 'cancel_cutoff');
  end if;

  v_fee_ratio := case
    when v_company = 'سوبر جيت' then 0.15
    when v_company = 'بلو باص' then 0.25
    else 0.20
  end;

  if v_hours_to_departure > 24 then
    v_fee_ratio := greatest(0.10, v_fee_ratio - 0.05);
  elsif v_hours_to_departure <= 6 then
    v_fee_ratio := least(0.75, v_fee_ratio + 0.15);
  end if;

  v_refund_amount := greatest(0, round((coalesce(v_booking.final_total, 0) * (1 - v_fee_ratio))::numeric, 0));

  insert into public.app_wallets (user_id, balance, points, subscription)
  values (v_user_id, 0, 0, 'none')
  on conflict (user_id) do nothing;

  select * into v_wallet
  from public.app_wallets
  where user_id = v_user_id
  for update;

  update public.app_wallets
  set balance = balance + v_refund_amount,
      updated_at = now()
  where user_id = v_user_id;

  update public.bookings
  set status = 'cancelled',
      points_awarded = false,
      trip_data = coalesce(trip_data, '{}'::jsonb) || jsonb_build_object('status', 'cancelled', 'pointsAwarded', false),
      updated_at = now()
  where id = p_booking_id;

  update public.trip_seats
  set status = 'available',
      booking_id = null,
      held_by_user_id = null,
      hold_expires_at = null,
      updated_at = now()
  where booking_id = p_booking_id;

  if v_booking.trip_instance_id is not null then
    perform public.recalculate_trip_available_seats(v_booking.trip_instance_id);
  end if;

  v_refund_tx_client_id := 'REF-' || coalesce(v_booking.pnr, upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)));
  insert into public.app_wallet_transactions (
    user_id,
    client_id,
    type,
    amount,
    txn_date,
    description,
    payload,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_refund_tx_client_id,
    'credit',
    v_refund_amount,
    current_date,
    'استرداد تذكرة ' || coalesce(v_booking.pnr, ''),
    jsonb_build_object(
      'client_id', v_refund_tx_client_id,
      'type', 'credit',
      'amount', v_refund_amount,
      'date', current_date,
      'desc', 'استرداد تذكرة ' || coalesce(v_booking.pnr, ''),
      'bookingId', p_booking_id
    ),
    now(),
    now()
  )
  on conflict (client_id) do nothing;

  return jsonb_build_object('ok', true, 'refundAmount', v_refund_amount);
end;
$$;

alter table public.app_wallets enable row level security;
alter table public.app_wallet_transactions enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_passengers enable row level security;
alter table public.cities enable row level security;
alter table public.stations enable row level security;
alter table public.routes enable row level security;
alter table public.route_templates enable row level security;
alter table public.trip_instances enable row level security;
alter table public.trip_seats enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'app_wallets' and policyname = 'wallets_select_own') then
    create policy wallets_select_own on public.app_wallets for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'app_wallets' and policyname = 'wallets_insert_own') then
    create policy wallets_insert_own on public.app_wallets for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'app_wallets' and policyname = 'wallets_update_own') then
    create policy wallets_update_own on public.app_wallets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'app_wallet_transactions' and policyname = 'wallet_tx_select_own') then
    create policy wallet_tx_select_own on public.app_wallet_transactions for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'app_wallet_transactions' and policyname = 'wallet_tx_insert_own') then
    create policy wallet_tx_insert_own on public.app_wallet_transactions for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'app_wallet_transactions' and policyname = 'wallet_tx_update_own') then
    create policy wallet_tx_update_own on public.app_wallet_transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bookings' and policyname = 'bookings_select_own') then
    create policy bookings_select_own on public.bookings for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bookings' and policyname = 'bookings_insert_own') then
    create policy bookings_insert_own on public.bookings for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bookings' and policyname = 'bookings_update_own') then
    create policy bookings_update_own on public.bookings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'booking_passengers' and policyname = 'booking_passengers_select_own') then
    create policy booking_passengers_select_own on public.booking_passengers
      for select using (
        exists (
          select 1 from public.bookings b
          where b.id = booking_id and b.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cities' and policyname = 'cities_read_authenticated') then
    create policy cities_read_authenticated on public.cities for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'stations' and policyname = 'stations_read_authenticated') then
    create policy stations_read_authenticated on public.stations for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'routes' and policyname = 'routes_read_authenticated') then
    create policy routes_read_authenticated on public.routes for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'route_templates' and policyname = 'route_templates_read_authenticated') then
    create policy route_templates_read_authenticated on public.route_templates for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'trip_instances' and policyname = 'trip_instances_read_authenticated') then
    create policy trip_instances_read_authenticated on public.trip_instances for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'trip_seats' and policyname = 'trip_seats_read_authenticated') then
    create policy trip_seats_read_authenticated on public.trip_seats for select using (auth.role() = 'authenticated');
  end if;
end $$;

drop trigger if exists trg_app_wallets_updated_at on public.app_wallets;
create trigger trg_app_wallets_updated_at before update on public.app_wallets for each row execute function public.set_updated_at();

drop trigger if exists trg_app_wallet_transactions_updated_at on public.app_wallet_transactions;
create trigger trg_app_wallet_transactions_updated_at before update on public.app_wallet_transactions for each row execute function public.set_updated_at();

drop trigger if exists trg_cities_updated_at on public.cities;
create trigger trg_cities_updated_at before update on public.cities for each row execute function public.set_updated_at();

drop trigger if exists trg_stations_updated_at on public.stations;
create trigger trg_stations_updated_at before update on public.stations for each row execute function public.set_updated_at();

drop trigger if exists trg_routes_updated_at on public.routes;
create trigger trg_routes_updated_at before update on public.routes for each row execute function public.set_updated_at();

drop trigger if exists trg_route_templates_updated_at on public.route_templates;
create trigger trg_route_templates_updated_at before update on public.route_templates for each row execute function public.set_updated_at();

drop trigger if exists trg_trip_instances_updated_at on public.trip_instances;
create trigger trg_trip_instances_updated_at before update on public.trip_instances for each row execute function public.set_updated_at();

drop trigger if exists trg_trip_seats_updated_at on public.trip_seats;
create trigger trg_trip_seats_updated_at before update on public.trip_seats for each row execute function public.set_updated_at();

drop trigger if exists trg_bookings_updated_at on public.bookings;
create trigger trg_bookings_updated_at before update on public.bookings for each row execute function public.set_updated_at();

drop trigger if exists trg_booking_passengers_updated_at on public.booking_passengers;
create trigger trg_booking_passengers_updated_at before update on public.booking_passengers for each row execute function public.set_updated_at();

select public.seed_reference_travel_data();

commit;
