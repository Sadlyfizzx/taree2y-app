create or replace function public.public_topup_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_wallet numeric := 0;
  normalized_amount numeric := greatest(coalesce(p_amount, 0), 0);
  txn_id text := concat('QRTOP-', to_char(now(), 'YYMMDDHH24MISS'));
begin
  if p_user_id is null then
    raise exception 'missing_user_id';
  end if;

  if normalized_amount < 10 then
    raise exception 'amount_too_small';
  end if;

  if exists (
    select 1
    from public.app_wallet_transactions
    where user_id = p_user_id
      and coalesce(reference_id, '') = coalesce(p_request_id, '')
      and transaction_type = 'credit'
  ) then
    return jsonb_build_object('ok', true, 'deduped', true);
  end if;

  insert into public.app_wallets (user_id, balance, updated_at)
  values (p_user_id, normalized_amount, now())
  on conflict (user_id)
  do update set
    balance = public.app_wallets.balance + excluded.balance,
    updated_at = now()
  returning balance into current_wallet;

  insert into public.app_wallet_transactions (
    user_id,
    transaction_id,
    transaction_type,
    amount,
    description,
    reference_id,
    created_at
  ) values (
    p_user_id,
    txn_id,
    'credit',
    normalized_amount,
    'شحن محفظة عبر QR',
    p_request_id,
    now()
  );

  return jsonb_build_object(
    'ok', true,
    'wallet', current_wallet,
    'amount', normalized_amount,
    'request_id', p_request_id,
    'transaction_id', txn_id
  );
end;
$$;

grant execute on function public.public_topup_wallet(uuid, numeric, text) to anon;
grant execute on function public.public_topup_wallet(uuid, numeric, text) to authenticated;
