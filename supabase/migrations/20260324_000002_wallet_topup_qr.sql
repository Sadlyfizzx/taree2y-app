create extension if not exists pgcrypto;

create table if not exists public.wallet_topup_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  public_token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  latest_amount integer,
  payer_label text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.wallet_topup_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'wallet_topup_requests'
      and policyname = 'wallet_topup_requests_owner_select'
  ) then
    create policy wallet_topup_requests_owner_select
      on public.wallet_topup_requests
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'wallet_topup_requests'
      and policyname = 'wallet_topup_requests_owner_insert'
  ) then
    create policy wallet_topup_requests_owner_insert
      on public.wallet_topup_requests
      for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

create or replace function public.create_wallet_topup_request()
returns table(request_id uuid, public_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_request_id uuid := gen_random_uuid();
  next_public_token text := encode(gen_random_bytes(18), 'hex');
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.wallet_topup_requests (id, user_id, public_token)
  values (next_request_id, auth.uid(), next_public_token);

  return query
  select next_request_id, next_public_token;
end;
$$;

create or replace function public.get_wallet_topup_request_public(
  p_request_id uuid,
  p_public_token text
)
returns table(request_id uuid, status text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select id, wallet_topup_requests.status, wallet_topup_requests.created_at
  from public.wallet_topup_requests
  where id = p_request_id
    and public_token = p_public_token;
end;
$$;

create or replace function public.complete_wallet_topup_request(
  p_request_id uuid,
  p_public_token text,
  p_amount integer,
  p_payer_label text default 'QR wallet top-up'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.wallet_topup_requests%rowtype;
  wallet_table_exists boolean;
  tx_table_exists boolean;
  wallet_amount_column text;
  tx_desc_column text;
  tx_created_column text;
  tx_id_column text;
  tx_sql text;
begin
  if coalesce(p_amount, 0) < 50 then
    raise exception 'Minimum top-up is 50';
  end if;

  select * into request_row
  from public.wallet_topup_requests
  where id = p_request_id
    and public_token = p_public_token
  for update;

  if request_row.id is null then
    raise exception 'Top-up request not found';
  end if;

  if request_row.status <> 'pending' then
    raise exception 'Top-up request is no longer pending';
  end if;

  select to_regclass('public.app_wallets') is not null into wallet_table_exists;
  if not wallet_table_exists then
    raise exception 'app_wallets table not found';
  end if;

  select coalesce(
    (select column_name from information_schema.columns where table_schema = 'public' and table_name = 'app_wallets' and column_name = 'balance' limit 1),
    (select column_name from information_schema.columns where table_schema = 'public' and table_name = 'app_wallets' and column_name = 'wallet' limit 1),
    (select column_name from information_schema.columns where table_schema = 'public' and table_name = 'app_wallets' and column_name = 'amount' limit 1)
  ) into wallet_amount_column;

  if wallet_amount_column is null then
    raise exception 'Wallet amount column not found';
  end if;

  execute format(
    'insert into public.app_wallets (user_id, %1$I) values ($1, $2)
     on conflict (user_id) do update set %1$I = coalesce(public.app_wallets.%1$I, 0) + excluded.%1$I',
    wallet_amount_column
  )
  using request_row.user_id, p_amount;

  select to_regclass('public.app_wallet_transactions') is not null into tx_table_exists;

  if tx_table_exists then
    select coalesce(
      (select column_name from information_schema.columns where table_schema = 'public' and table_name = 'app_wallet_transactions' and column_name = 'desc' limit 1),
      (select column_name from information_schema.columns where table_schema = 'public' and table_name = 'app_wallet_transactions' and column_name = 'description' limit 1)
    ) into tx_desc_column;

    select coalesce(
      (select column_name from information_schema.columns where table_schema = 'public' and table_name = 'app_wallet_transactions' and column_name = 'created_at' limit 1),
      (select column_name from information_schema.columns where table_schema = 'public' and table_name = 'app_wallet_transactions' and column_name = 'date' limit 1)
    ) into tx_created_column;

    select column_name into tx_id_column
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'app_wallet_transactions'
      and column_name = 'id'
    limit 1;

    tx_sql := 'insert into public.app_wallet_transactions (';
    if tx_id_column is not null then
      tx_sql := tx_sql || 'id, ';
    end if;
    tx_sql := tx_sql || 'user_id, type, amount';
    if tx_desc_column is not null then
      tx_sql := tx_sql || format(', %I', tx_desc_column);
    end if;
    if tx_created_column is not null then
      tx_sql := tx_sql || format(', %I', tx_created_column);
    end if;
    tx_sql := tx_sql || ') values (';
    if tx_id_column is not null then
      tx_sql := tx_sql || 'gen_random_uuid(), ';
    end if;
    tx_sql := tx_sql || '$1, $2, $3';
    if tx_desc_column is not null then
      tx_sql := tx_sql || ', $4';
    end if;
    if tx_created_column is not null then
      tx_sql := tx_sql || ', now()';
    end if;
    tx_sql := tx_sql || ')';

    execute tx_sql using request_row.user_id, 'credit', p_amount, coalesce(nullif(trim(p_payer_label), ''), 'QR wallet top-up');
  end if;

  update public.wallet_topup_requests
  set status = 'completed',
      latest_amount = p_amount,
      payer_label = coalesce(nullif(trim(p_payer_label), ''), 'QR wallet top-up'),
      completed_at = now()
  where id = request_row.id;

  return jsonb_build_object(
    'ok', true,
    'request_id', request_row.id,
    'user_id', request_row.user_id,
    'amount', p_amount
  );
end;
$$;

grant execute on function public.create_wallet_topup_request() to authenticated;
grant execute on function public.get_wallet_topup_request_public(uuid, text) to anon, authenticated;
grant execute on function public.complete_wallet_topup_request(uuid, text, integer, text) to anon, authenticated;
