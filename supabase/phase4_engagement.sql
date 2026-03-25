create extension if not exists pgcrypto;

create or replace function public.taree2y_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table if exists public.profiles
  add column if not exists last_app_open_at timestamptz,
  add column if not exists referral_code text,
  add column if not exists referred_by_code text,
  add column if not exists referred_by_user_id uuid;

alter table if exists public.app_promo_campaigns
  add column if not exists audience_rules jsonb not null default '{}'::jsonb,
  add column if not exists trigger_kind text not null default 'manual',
  add column if not exists notification_enabled boolean not null default false,
  add column if not exists notification_title text,
  add column if not exists notification_body text,
  add column if not exists cta_label text,
  add column if not exists cta_action text,
  add column if not exists cooldown_hours integer not null default 24;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'app_promo_campaigns_trigger_kind_chk'
  ) then
    alter table public.app_promo_campaigns
      add constraint app_promo_campaigns_trigger_kind_chk
      check (trigger_kind in ('manual', 'targeted', 'reactivation', 'retention', 'referral'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'app_promo_campaigns_cooldown_hours_chk'
  ) then
    alter table public.app_promo_campaigns
      add constraint app_promo_campaigns_cooldown_hours_chk
      check (cooldown_hours >= 0);
  end if;
end $$;

create table if not exists public.app_user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid null references public.app_promo_campaigns(id) on delete set null,
  source text not null default 'system',
  category text not null default 'generic',
  title text not null,
  body text not null default '',
  cta_label text,
  cta_action text,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text,
  priority integer not null default 0,
  read_at timestamptz,
  dismissed_at timestamptz,
  delivered_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists app_user_notifications_user_dedupe_uidx
  on public.app_user_notifications(user_id, dedupe_key);

create index if not exists app_user_notifications_user_active_idx
  on public.app_user_notifications(user_id, dismissed_at, read_at, delivered_at desc);

create index if not exists app_user_notifications_campaign_idx
  on public.app_user_notifications(campaign_id, delivered_at desc);

drop trigger if exists trg_app_user_notifications_touch_updated_at on public.app_user_notifications;
create trigger trg_app_user_notifications_touch_updated_at
before update on public.app_user_notifications
for each row
execute function public.taree2y_touch_updated_at();

create table if not exists public.app_campaign_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  campaign_id uuid null references public.app_promo_campaigns(id) on delete set null,
  event_name text not null,
  event_source text not null default 'app',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists app_campaign_events_campaign_idx
  on public.app_campaign_events(campaign_id, event_name, created_at desc);

create index if not exists app_campaign_events_user_idx
  on public.app_campaign_events(user_id, created_at desc);

create table if not exists public.app_referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  referral_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_app_referral_codes_touch_updated_at on public.app_referral_codes;
create trigger trg_app_referral_codes_touch_updated_at
before update on public.app_referral_codes
for each row
execute function public.taree2y_touch_updated_at();

create table if not exists public.app_referral_claims (
  id uuid primary key default gen_random_uuid(),
  referral_code text not null,
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'applied',
  reward_payload jsonb not null default '{}'::jsonb,
  applied_at timestamptz not null default now(),
  qualified_at timestamptz,
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'app_referral_claims_status_chk'
  ) then
    alter table public.app_referral_claims
      add constraint app_referral_claims_status_chk
      check (status in ('applied', 'qualified', 'rewarded', 'rejected'));
  end if;
end $$;

drop trigger if exists trg_app_referral_claims_touch_updated_at on public.app_referral_claims;
create trigger trg_app_referral_claims_touch_updated_at
before update on public.app_referral_claims
for each row
execute function public.taree2y_touch_updated_at();

alter table public.app_user_notifications enable row level security;
alter table public.app_campaign_events enable row level security;
alter table public.app_referral_codes enable row level security;
alter table public.app_referral_claims enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'app_user_notifications' and policyname = 'app_user_notifications_select_own'
  ) then
    create policy app_user_notifications_select_own
      on public.app_user_notifications
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'app_campaign_events' and policyname = 'app_campaign_events_select_own'
  ) then
    create policy app_campaign_events_select_own
      on public.app_campaign_events
      for select
      using (auth.uid() = user_id or user_id is null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'app_referral_codes' and policyname = 'app_referral_codes_select_own'
  ) then
    create policy app_referral_codes_select_own
      on public.app_referral_codes
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'app_referral_claims' and policyname = 'app_referral_claims_select_own'
  ) then
    create policy app_referral_claims_select_own
      on public.app_referral_claims
      for select
      using (auth.uid() = referred_user_id or auth.uid() = referrer_user_id);
  end if;
end $$;

create or replace function public.require_same_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.ensure_referral_code(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_attempt integer := 0;
begin
  perform public.require_same_user(p_user_id);

  select referral_code into v_code
  from public.app_referral_codes
  where user_id = p_user_id;

  if v_code is not null then
    return v_code;
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));

    begin
      insert into public.app_referral_codes(user_id, referral_code)
      values (p_user_id, v_code);

      update public.profiles
         set referral_code = v_code,
             updated_at = now()
       where id = p_user_id;

      return v_code;
    exception
      when unique_violation then
        if v_attempt > 10 then
          raise;
        end if;
    end;
  end loop;
end;
$$;

create or replace function public.record_campaign_event(
  p_user_id uuid,
  p_campaign_id uuid default null,
  p_event_name text default '',
  p_event_source text default 'app',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform public.require_same_user(p_user_id);

  insert into public.app_campaign_events(
    user_id,
    campaign_id,
    event_name,
    event_source,
    metadata
  )
  values (
    p_user_id,
    p_campaign_id,
    coalesce(nullif(trim(p_event_name), ''), 'unknown_event'),
    coalesce(nullif(trim(p_event_source), ''), 'app'),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.deliver_user_notification_internal(
  p_user_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns public.app_user_notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_dedupe_key text := nullif(trim(v_payload->>'dedupe_key'), '');
  v_row public.app_user_notifications;
  v_campaign_id uuid := nullif(v_payload->>'campaign_id', '')::uuid;
begin
  insert into public.app_user_notifications(
    user_id,
    campaign_id,
    source,
    category,
    title,
    body,
    cta_label,
    cta_action,
    payload,
    dedupe_key,
    priority,
    expires_at
  )
  values (
    p_user_id,
    coalesce(v_campaign_id, nullif(v_payload->>'campaignId', '')::uuid),
    coalesce(nullif(trim(v_payload->>'source'), ''), 'system'),
    coalesce(nullif(trim(v_payload->>'category'), ''), 'generic'),
    coalesce(nullif(trim(v_payload->>'title'), ''), 'تنبيه جديد'),
    coalesce(v_payload->>'body', ''),
    nullif(trim(v_payload->>'cta_label'), ''),
    nullif(trim(v_payload->>'cta_action'), ''),
    coalesce(v_payload->'payload', v_payload, '{}'::jsonb),
    v_dedupe_key,
    coalesce((v_payload->>'priority')::integer, 0),
    nullif(v_payload->>'expires_at', '')::timestamptz
  )
  on conflict (user_id, dedupe_key)
  do update set
    campaign_id = coalesce(excluded.campaign_id, public.app_user_notifications.campaign_id),
    source = excluded.source,
    category = excluded.category,
    title = excluded.title,
    body = excluded.body,
    cta_label = excluded.cta_label,
    cta_action = excluded.cta_action,
    payload = excluded.payload,
    priority = greatest(excluded.priority, public.app_user_notifications.priority),
    dismissed_at = null,
    delivered_at = now(),
    updated_at = now()
  returning * into v_row;

  if v_row.campaign_id is not null then
    insert into public.app_campaign_events(user_id, campaign_id, event_name, event_source, metadata)
    values (
      p_user_id,
      v_row.campaign_id,
      'notification_delivered',
      coalesce(nullif(trim(v_row.source), ''), 'system'),
      jsonb_build_object('notification_id', v_row.id)
    );
  end if;

  return v_row;
end;
$$;

create or replace function public.deliver_user_notification(
  p_user_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns public.app_user_notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.app_user_notifications;
begin
  perform public.require_same_user(p_user_id);
  v_row := public.deliver_user_notification_internal(p_user_id, p_payload);
  return v_row;
end;
$$;

create or replace function public.list_user_notifications(
  p_user_id uuid,
  p_limit integer default 50
)
returns setof public.app_user_notifications
language sql
security definer
set search_path = public
as $$
  with _auth as (
    select public.require_same_user(p_user_id)
  )
  select n.*
    from public.app_user_notifications n
   where n.user_id = p_user_id
     and n.dismissed_at is null
     and (n.expires_at is null or n.expires_at > now())
   order by n.delivered_at desc, n.created_at desc
   limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

create or replace function public.mark_user_notifications_read(
  p_user_id uuid,
  p_ids uuid[] default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  rec record;
begin
  perform public.require_same_user(p_user_id);

  for rec in
    update public.app_user_notifications n
       set read_at = coalesce(n.read_at, now()),
           updated_at = now()
     where n.user_id = p_user_id
       and n.dismissed_at is null
       and (p_ids is null or n.id = any(p_ids))
       and n.read_at is null
     returning n.id, n.campaign_id
  loop
    v_count := v_count + 1;
    if rec.campaign_id is not null then
      perform public.record_campaign_event(
        p_user_id,
        rec.campaign_id,
        'notification_read',
        'notification_center',
        jsonb_build_object('notification_id', rec.id)
      );
    end if;
  end loop;

  return v_count;
end;
$$;

create or replace function public.dismiss_user_notifications(
  p_user_id uuid,
  p_ids uuid[] default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  rec record;
begin
  perform public.require_same_user(p_user_id);

  for rec in
    update public.app_user_notifications n
       set dismissed_at = coalesce(n.dismissed_at, now()),
           updated_at = now()
     where n.user_id = p_user_id
       and (p_ids is null or n.id = any(p_ids))
       and n.dismissed_at is null
     returning n.id, n.campaign_id
  loop
    v_count := v_count + 1;
    if rec.campaign_id is not null then
      perform public.record_campaign_event(
        p_user_id,
        rec.campaign_id,
        'notification_dismissed',
        'notification_center',
        jsonb_build_object('notification_id', rec.id)
      );
    end if;
  end loop;

  return v_count;
end;
$$;

create or replace function public.user_booking_snapshot(p_user_id uuid)
returns table (
  total_bookings integer,
  active_bookings integer,
  qualifying_bookings integer,
  last_booking_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    count(*)::integer as total_bookings,
    count(*) filter (where coalesce(status, '') not in ('cancelled', 'refund_pending'))::integer as active_bookings,
    count(*) filter (where coalesce(status, '') not in ('cancelled', 'refund_pending'))::integer as qualifying_bookings,
    max(created_at) as last_booking_at
  from public.bookings
  where user_id = p_user_id;
$$;

create or replace function public.user_wallet_balance(p_user_id uuid)
returns numeric
language sql
security definer
set search_path = public
as $$
  select coalesce(balance, 0)
  from public.app_wallets
  where user_id = p_user_id
  limit 1;
$$;

create or replace function public.campaign_matches_user(
  p_campaign public.app_promo_campaigns,
  p_user_id uuid,
  p_context jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rules jsonb := coalesce(p_campaign.audience_rules, '{}'::jsonb);
  v_profile public.profiles%rowtype;
  v_total_bookings integer := 0;
  v_active_bookings integer := 0;
  v_qualifying_bookings integer := 0;
  v_last_booking_at timestamptz;
  v_last_active_at timestamptz;
  v_inactive_days integer := 0;
  v_wallet_balance numeric := 0;
  v_context_from text := coalesce(nullif(trim(p_context->>'from'), ''), nullif(trim(p_context->>'route_from'), ''));
  v_context_to text := coalesce(nullif(trim(p_context->>'to'), ''), nullif(trim(p_context->>'route_to'), ''));
  v_route_required boolean := false;
  v_route_match boolean := false;
begin
  select * into v_profile from public.profiles where id = p_user_id;

  select total_bookings, active_bookings, qualifying_bookings, last_booking_at
    into v_total_bookings, v_active_bookings, v_qualifying_bookings, v_last_booking_at
    from public.user_booking_snapshot(p_user_id);

  v_last_active_at := greatest(
    coalesce(v_profile.last_app_open_at, '-infinity'::timestamptz),
    coalesce(v_last_booking_at, '-infinity'::timestamptz),
    coalesce(v_profile.updated_at, '-infinity'::timestamptz)
  );

  if v_last_active_at = '-infinity'::timestamptz then
    v_inactive_days := 9999;
  else
    v_inactive_days := greatest(0, floor(extract(epoch from (now() - v_last_active_at)) / 86400)::integer);
  end if;

  v_wallet_balance := coalesce(public.user_wallet_balance(p_user_id), 0);

  if (v_rules ? 'inactive_days_gte') and v_inactive_days < coalesce((v_rules->>'inactive_days_gte')::integer, 0) then
    return false;
  end if;

  if (v_rules ? 'min_bookings') and v_qualifying_bookings < coalesce((v_rules->>'min_bookings')::integer, 0) then
    return false;
  end if;

  if (v_rules ? 'max_bookings') and v_qualifying_bookings > coalesce((v_rules->>'max_bookings')::integer, 2147483647) then
    return false;
  end if;

  if coalesce((v_rules->>'first_trip_only')::boolean, false) and v_qualifying_bookings > 0 then
    return false;
  end if;

  if coalesce((v_rules->>'requires_no_upcoming_trip')::boolean, false) and exists (
    select 1 from public.bookings where user_id = p_user_id and status = 'upcoming'
  ) then
    return false;
  end if;

  if (v_rules ? 'wallet_balance_lte') and v_wallet_balance > coalesce((v_rules->>'wallet_balance_lte')::numeric, 0) then
    return false;
  end if;

  if (v_rules ? 'wallet_balance_gte') and v_wallet_balance < coalesce((v_rules->>'wallet_balance_gte')::numeric, 0) then
    return false;
  end if;

  select exists(
    select 1 from public.app_promo_route_rules rr where rr.campaign_id = p_campaign.id
  ) into v_route_required;

  if v_route_required then
    if v_context_from is null or v_context_to is null then
      return false;
    end if;

    select exists(
      select 1
      from public.app_promo_route_rules rr
      where rr.campaign_id = p_campaign.id
        and lower(rr.from_city) = lower(v_context_from)
        and lower(rr.to_city) = lower(v_context_to)
    ) into v_route_match;

    if not v_route_match then
      return false;
    end if;
  end if;

  if p_campaign.start_at is not null and p_campaign.start_at > now() then
    return false;
  end if;

  if p_campaign.end_at is not null and p_campaign.end_at < now() then
    return false;
  end if;

  if not coalesce(p_campaign.is_active, false) then
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.get_targeted_promo_offer(
  p_user_id uuid,
  p_context jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.app_promo_campaigns%rowtype;
  v_last_seen timestamptz;
  v_route jsonb;
begin
  perform public.require_same_user(p_user_id);

  for v_campaign in
    select *
    from public.app_promo_campaigns c
    where c.is_active = true
      and (c.popup_enabled = true or c.highlight_enabled = true)
      and public.campaign_matches_user(c, p_user_id, p_context)
    order by c.popup_priority desc, c.updated_at desc, c.created_at desc
  loop
    select max(created_at)
      into v_last_seen
      from public.app_campaign_events e
      where e.user_id = p_user_id
        and e.campaign_id = v_campaign.id
        and e.event_name in ('offer_popup_shown', 'offer_highlight_impression', 'offer_copied', 'offer_dismissed');

    if v_last_seen is not null and v_campaign.cooldown_hours > 0 and v_last_seen > now() - make_interval(hours => v_campaign.cooldown_hours) then
      continue;
    end if;

    select jsonb_agg(jsonb_build_object('from', rr.from_city, 'to', rr.to_city))
      into v_route
      from public.app_promo_route_rules rr
     where rr.campaign_id = v_campaign.id;

    return jsonb_build_object(
      'campaignId', v_campaign.id,
      'code', v_campaign.code,
      'title', v_campaign.title,
      'description', coalesce(v_campaign.description, ''),
      'message', coalesce(v_campaign.message, ''),
      'popupEnabled', v_campaign.popup_enabled,
      'highlightEnabled', v_campaign.highlight_enabled,
      'startsAt', v_campaign.start_at,
      'endsAt', v_campaign.end_at,
      'triggerKind', v_campaign.trigger_kind,
      'ctaLabel', coalesce(v_campaign.cta_label, ''),
      'ctaAction', coalesce(v_campaign.cta_action, ''),
      'routeParams', case when jsonb_array_length(coalesce(v_route, '[]'::jsonb)) > 0 then (v_route->0) else null end
    );
  end loop;

  return null;
end;
$$;

create or replace function public.sync_referral_rewards(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  v_count integer := 0;
begin
  perform public.require_same_user(p_user_id);

  for rec in
    select c.*
    from public.app_referral_claims c
    where c.referred_user_id = p_user_id
      and c.status = 'applied'
  loop
    if exists (
      select 1
      from public.bookings b
      where b.user_id = rec.referred_user_id
        and coalesce(b.status, '') not in ('cancelled', 'refund_pending')
    ) then
      update public.app_referral_claims
         set status = 'qualified',
             qualified_at = now(),
             reward_payload = jsonb_build_object(
               'reward_hint', 'qualified_first_booking',
               'qualified_at', now()
             ),
             updated_at = now()
       where id = rec.id;

      perform public.deliver_user_notification_internal(
        rec.referrer_user_id,
        jsonb_build_object(
          'source', 'referral',
          'category', 'retention',
          'title', 'إحالة جديدة qualified',
          'body', 'أحد المستخدمين اللي شاركت معه الكود أكمل أول حجز ناجح. راجع الإحصائيات من الحساب.',
          'dedupe_key', 'referral-qualified-' || rec.id,
          'payload', jsonb_build_object('referralClaimId', rec.id)
        )
      );

      perform public.deliver_user_notification_internal(
        rec.referred_user_id,
        jsonb_build_object(
          'source', 'referral',
          'category', 'retention',
          'title', 'تم تأكيد إحالتك',
          'body', 'أول حجز على الحساب أكد ربط الدعوة بنجاح. أي مزايا لاحقة هتظهر هنا أولاً.',
          'dedupe_key', 'referred-qualified-' || rec.id,
          'payload', jsonb_build_object('referralClaimId', rec.id)
        )
      );

      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

create or replace function public.sync_user_engagement(
  p_user_id uuid,
  p_context jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seeded integer := 0;
  v_qualified integer := 0;
  v_campaign record;
  v_inactive_days integer := 0;
  v_last_active_at timestamptz;
  v_profile public.profiles%rowtype;
  v_last_booking_at timestamptz;
  v_referral_code text;
begin
  perform public.require_same_user(p_user_id);

  select * into v_profile from public.profiles where id = p_user_id;
  select max(created_at) into v_last_booking_at from public.bookings where user_id = p_user_id;

  v_last_active_at := greatest(
    coalesce(v_profile.last_app_open_at, '-infinity'::timestamptz),
    coalesce(v_last_booking_at, '-infinity'::timestamptz),
    coalesce(v_profile.updated_at, '-infinity'::timestamptz)
  );

  if v_last_active_at = '-infinity'::timestamptz then
    v_inactive_days := 9999;
  else
    v_inactive_days := greatest(0, floor(extract(epoch from (now() - v_last_active_at)) / 86400)::integer);
  end if;

  update public.profiles
     set last_app_open_at = now(),
         updated_at = now()
   where id = p_user_id;

  v_referral_code := public.ensure_referral_code(p_user_id);
  v_qualified := public.sync_referral_rewards(p_user_id);

  for v_campaign in
    select *
    from public.app_promo_campaigns c
    where c.notification_enabled = true
      and c.is_active = true
      and public.campaign_matches_user(c, p_user_id, p_context)
    order by c.popup_priority desc, c.updated_at desc, c.created_at desc
  loop
    perform public.deliver_user_notification_internal(
      p_user_id,
      jsonb_build_object(
        'campaign_id', v_campaign.id,
        'source', 'campaign',
        'category', case when v_campaign.trigger_kind = 'reactivation' then 'retention' else 'campaign' end,
        'title', coalesce(v_campaign.notification_title, v_campaign.title),
        'body', coalesce(v_campaign.notification_body, v_campaign.message, v_campaign.description, ''),
        'cta_label', coalesce(v_campaign.cta_label, ''),
        'cta_action', coalesce(v_campaign.cta_action, ''),
        'dedupe_key', 'campaign-notification-' || v_campaign.id,
        'priority', coalesce(v_campaign.popup_priority, 0),
        'payload', jsonb_build_object(
          'campaignId', v_campaign.id,
          'triggerKind', v_campaign.trigger_kind,
          'code', coalesce(v_campaign.code, '')
        )
      )
    );

    v_seeded := v_seeded + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'message', 'تمت مزامنة طبقة التفاعل.',
    'data', jsonb_build_object(
      'seeded_notifications', v_seeded,
      'qualified_referrals', v_qualified,
      'inactive_days', v_inactive_days,
      'referral_code', v_referral_code
    )
  );
end;
$$;

create or replace function public.get_referral_summary(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_profile public.profiles%rowtype;
  v_total integer := 0;
  v_pending integer := 0;
  v_qualified integer := 0;
  v_rewarded integer := 0;
  v_latest_status text := '';
begin
  perform public.require_same_user(p_user_id);
  v_code := public.ensure_referral_code(p_user_id);
  perform public.sync_referral_rewards(p_user_id);

  select * into v_profile from public.profiles where id = p_user_id;

  select
    count(*)::integer,
    count(*) filter (where status = 'applied')::integer,
    count(*) filter (where status = 'qualified')::integer,
    count(*) filter (where status = 'rewarded')::integer
  into v_total, v_pending, v_qualified, v_rewarded
  from public.app_referral_claims
  where referrer_user_id = p_user_id;

  select status into v_latest_status
  from public.app_referral_claims
  where referred_user_id = p_user_id
  order by created_at desc
  limit 1;

  return jsonb_build_object(
    'code', v_code,
    'appliedCode', coalesce(v_profile.referred_by_code, ''),
    'referredByUserId', v_profile.referred_by_user_id,
    'canApplyCode', v_profile.referred_by_code is null,
    'totalInvites', v_total,
    'pendingInvites', v_pending,
    'qualifiedInvites', v_qualified,
    'rewardedInvites', v_rewarded,
    'latestStatus', coalesce(v_latest_status, ''),
    'message', case when v_profile.referred_by_code is null then 'لسه تقدر تربط الحساب بكود دعوة واحد.' else 'الحساب مربوط بالفعل بكود دعوة.' end
  );
end;
$$;

create or replace function public.apply_referral_code(
  p_user_id uuid,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_referrer_user_id uuid;
  v_has_booking boolean := false;
  v_existing_code text;
begin
  perform public.require_same_user(p_user_id);

  if v_code = '' then
    return jsonb_build_object('ok', false, 'code', 'referral_empty', 'message', 'اكتب كود الدعوة أولاً.');
  end if;

  select referred_by_code into v_existing_code from public.profiles where id = p_user_id;
  if v_existing_code is not null then
    return jsonb_build_object('ok', false, 'code', 'referral_exists', 'message', 'الحساب مربوط بالفعل بكود دعوة.');
  end if;

  select user_id into v_referrer_user_id
  from public.app_referral_codes
  where referral_code = v_code;

  if v_referrer_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'referral_invalid', 'message', 'كود الدعوة غير صحيح.');
  end if;

  if v_referrer_user_id = p_user_id then
    return jsonb_build_object('ok', false, 'code', 'referral_self', 'message', 'لا يمكن استخدام كود الدعوة الخاص بك.');
  end if;

  select exists(
    select 1
    from public.bookings
    where user_id = p_user_id
      and coalesce(status, '') not in ('cancelled', 'refund_pending')
  ) into v_has_booking;

  if v_has_booking then
    return jsonb_build_object('ok', false, 'code', 'referral_not_eligible', 'message', 'كود الدعوة متاح قبل أول حجز ناجح فقط.');
  end if;

  insert into public.app_referral_claims(
    referral_code,
    referrer_user_id,
    referred_user_id,
    status,
    reward_payload
  )
  values (
    v_code,
    v_referrer_user_id,
    p_user_id,
    'applied',
    jsonb_build_object('created_from', 'app')
  )
  on conflict (referred_user_id) do nothing;

  update public.profiles
     set referred_by_code = v_code,
         referred_by_user_id = v_referrer_user_id,
         updated_at = now()
   where id = p_user_id;

  perform public.record_campaign_event(
    p_user_id,
    null,
    'referral_applied',
    'profile_referral',
    jsonb_build_object('referral_code', v_code, 'referrer_user_id', v_referrer_user_id)
  );

  perform public.deliver_user_notification_internal(
    v_referrer_user_id,
    jsonb_build_object(
      'source', 'referral',
      'category', 'retention',
      'title', 'مستخدم جديد دخل بكودك',
      'body', 'تم ربط حساب جديد بكود الدعوة الخاص بك. أول حجز ناجح هيحوّل الحالة لـ qualified.',
      'dedupe_key', 'referral-applied-' || p_user_id,
      'payload', jsonb_build_object('referredUserId', p_user_id, 'referralCode', v_code)
    )
  );

  perform public.deliver_user_notification_internal(
    p_user_id,
    jsonb_build_object(
      'source', 'referral',
      'category', 'retention',
      'title', 'تم حفظ كود الدعوة',
      'body', 'الحساب اتربط بكود الدعوة بنجاح. أول حجز ناجح هيأكد الإحالة.',
      'dedupe_key', 'referral-linked-' || p_user_id,
      'payload', jsonb_build_object('referralCode', v_code)
    )
  );

  return jsonb_build_object('ok', true, 'code', 'referral_applied', 'message', 'تم ربط الحساب بكود الدعوة.');
end;
$$;

grant execute on function public.ensure_referral_code(uuid) to authenticated;
grant execute on function public.record_campaign_event(uuid, uuid, text, text, jsonb) to authenticated;
grant execute on function public.deliver_user_notification(uuid, jsonb) to authenticated;
grant execute on function public.list_user_notifications(uuid, integer) to authenticated;
grant execute on function public.mark_user_notifications_read(uuid, uuid[]) to authenticated;
grant execute on function public.dismiss_user_notifications(uuid, uuid[]) to authenticated;
grant execute on function public.get_targeted_promo_offer(uuid, jsonb) to authenticated;
grant execute on function public.sync_user_engagement(uuid, jsonb) to authenticated;
grant execute on function public.get_referral_summary(uuid) to authenticated;
grant execute on function public.apply_referral_code(uuid, text) to authenticated;
grant execute on function public.sync_referral_rewards(uuid) to authenticated;
