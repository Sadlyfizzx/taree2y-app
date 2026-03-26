


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "admin_backups";


ALTER SCHEMA "admin_backups" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "app_private";


ALTER SCHEMA "app_private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "app_private"."build_promo_response"("p_ok" boolean, "p_code" "text", "p_message" "text", "p_data" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select jsonb_build_object(
    'ok', coalesce(p_ok, false),
    'code', coalesce(p_code, 'promo_unknown'),
    'message', coalesce(p_message, ''),
    'data', coalesce(p_data, '{}'::jsonb)
  );
$$;


ALTER FUNCTION "app_private"."build_promo_response"("p_ok" boolean, "p_code" "text", "p_message" "text", "p_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app_private"."consume_app_promo"("p_user_id" "uuid", "p_code" "text", "p_booking_amount" numeric, "p_trip_meta" "jsonb", "p_booking_reference" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'app_private', 'pg_temp'
    AS $$
declare
  v_result jsonb;
  v_campaign_id uuid;
  v_discount_amount numeric(12,2);
  v_promo_code text;
begin
  v_result := app_private.resolve_promo(
    p_user_id,
    p_code,
    p_booking_amount,
    coalesce(p_trip_meta, '{}'::jsonb),
    true
  );

  if coalesce((v_result ->> 'ok')::boolean, false) = false
     or coalesce((v_result -> 'data' ->> 'applied')::boolean, false) = false then
    return v_result;
  end if;

  v_campaign_id := nullif(v_result -> 'data' ->> 'campaign_id', '')::uuid;
  v_discount_amount := coalesce((v_result -> 'data' ->> 'discount_amount')::numeric, 0);
  v_promo_code := nullif(v_result -> 'data' ->> 'promo_code', '');

  insert into public.app_promo_redemptions (
    campaign_id,
    user_id,
    booking_reference,
    promo_code,
    booking_amount,
    discount_amount,
    status,
    trip_meta
  )
  values (
    v_campaign_id,
    p_user_id,
    p_booking_reference,
    v_promo_code,
    greatest(0, coalesce(p_booking_amount, 0)),
    greatest(0, coalesce(v_discount_amount, 0)),
    'consumed',
    coalesce(p_trip_meta, '{}'::jsonb)
  )
  on conflict (campaign_id, booking_reference) do nothing;

  return app_private.build_promo_response(true, 'promo_consumed', coalesce(v_result ->> 'message', 'تم اعتماد كود الخصم.'), v_result -> 'data');
end;
$$;


ALTER FUNCTION "app_private"."consume_app_promo"("p_user_id" "uuid", "p_code" "text", "p_booking_amount" numeric, "p_trip_meta" "jsonb", "p_booking_reference" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app_private"."normalize_promo_code"("p_code" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select upper(btrim(coalesce(p_code, '')));
$$;


ALTER FUNCTION "app_private"."normalize_promo_code"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app_private"."resolve_promo"("p_user_id" "uuid", "p_code" "text", "p_booking_amount" numeric, "p_trip_meta" "jsonb" DEFAULT '{}'::"jsonb", "p_lock" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'app_private', 'pg_temp'
    AS $$
declare
  v_now timestamptz := now();
  v_code text := app_private.normalize_promo_code(p_code);
  v_campaign public.app_promo_campaigns%rowtype;
  v_booking_amount numeric(12,2) := greatest(0, coalesce(p_booking_amount, 0));
  v_discount_amount numeric(12,2) := 0;
  v_user_use_count integer := 0;
  v_global_use_count integer := 0;
  v_has_route_rules boolean := false;
  v_route_allowed boolean := true;
  v_has_successful_booking boolean := false;
  v_from_city text := nullif(btrim(coalesce(p_trip_meta ->> 'from', '')), '');
  v_to_city text := nullif(btrim(coalesce(p_trip_meta ->> 'to', '')), '');
begin
  if v_code = '' then
    return app_private.build_promo_response(
      true,
      'promo_empty',
      '',
      jsonb_build_object(
        'applied', false,
        'promo_code', '',
        'discount_amount', 0
      )
    );
  end if;

  if p_lock then
    select * into v_campaign from public.app_promo_campaigns where code = v_code for update;
  else
    select * into v_campaign from public.app_promo_campaigns where code = v_code;
  end if;

  if not found then
    return app_private.build_promo_response(false, 'promo_not_found', 'كود الخصم غير موجود.', jsonb_build_object('applied', false, 'promo_code', v_code));
  end if;

  if not coalesce(v_campaign.is_active, false) then
    return app_private.build_promo_response(false, 'promo_inactive', 'الكود موجود لكن الحملة متوقفة حالياً.', jsonb_build_object('applied', false, 'promo_code', v_code));
  end if;

  if v_campaign.start_at is not null and v_now < v_campaign.start_at then
    return app_private.build_promo_response(false, 'promo_not_started', 'الكود موجود لكن الحملة لسه ما بدأتش.', jsonb_build_object('applied', false, 'promo_code', v_code, 'starts_at', v_campaign.start_at));
  end if;

  if v_campaign.end_at is not null and v_now > v_campaign.end_at then
    return app_private.build_promo_response(false, 'promo_expired', 'مدة استخدام الكود انتهت.', jsonb_build_object('applied', false, 'promo_code', v_code, 'ends_at', v_campaign.end_at));
  end if;

  if v_booking_amount < coalesce(v_campaign.min_booking_amount, 0) then
    return app_private.build_promo_response(false, 'promo_min_amount', 'قيمة الحجز الحالية أقل من الحد الأدنى المطلوب للكود.', jsonb_build_object('applied', false, 'promo_code', v_code, 'minimum_booking_amount', coalesce(v_campaign.min_booking_amount, 0)));
  end if;

  select exists(select 1 from public.app_promo_route_rules rr where rr.campaign_id = v_campaign.id)
    into v_has_route_rules;

  if v_has_route_rules then
    if v_from_city is null or v_to_city is null then
      return app_private.build_promo_response(false, 'promo_route_not_eligible', 'الكود ده متاح على مسارات معينة فقط.', jsonb_build_object('applied', false, 'promo_code', v_code));
    end if;

    select exists(
      select 1
        from public.app_promo_route_rules rr
       where rr.campaign_id = v_campaign.id
         and rr.from_city = v_from_city
         and rr.to_city = v_to_city
    ) into v_route_allowed;

    if not v_route_allowed then
      return app_private.build_promo_response(false, 'promo_route_not_eligible', 'الكود ده مش متاح على المسار الحالي.', jsonb_build_object('applied', false, 'promo_code', v_code));
    end if;
  end if;

  if coalesce(v_campaign.first_trip_only, false) then
    select exists(
      select 1
        from public.bookings b
       where b.user_id = p_user_id
         and coalesce(b.status, 'upcoming') not in ('cancelled', 'refund_pending')
    ) into v_has_successful_booking;

    if v_has_successful_booking then
      return app_private.build_promo_response(false, 'promo_first_trip_only', 'الكود ده متاح لأول رحلة ناجحة فقط.', jsonb_build_object('applied', false, 'promo_code', v_code, 'first_trip_only', true));
    end if;
  end if;

  select count(*)::int into v_user_use_count
    from public.app_promo_redemptions r
   where r.campaign_id = v_campaign.id
     and r.user_id = p_user_id
     and r.status = 'consumed';

  if v_campaign.per_user_limit is not null and v_user_use_count >= v_campaign.per_user_limit then
    return app_private.build_promo_response(
      false,
      case when v_campaign.per_user_limit = 1 then 'promo_used' else 'promo_user_limit_reached' end,
      case when v_campaign.per_user_limit = 1 then 'الكود اتستخدم قبل كده على حسابك.' else 'وصلت للحد المسموح لاستخدام الكود ده.' end,
      jsonb_build_object('applied', false, 'promo_code', v_code)
    );
  end if;

  select count(*)::int into v_global_use_count
    from public.app_promo_redemptions r
   where r.campaign_id = v_campaign.id
     and r.status = 'consumed';

  if v_campaign.global_limit is not null and v_global_use_count >= v_campaign.global_limit then
    return app_private.build_promo_response(false, 'promo_usage_finished', 'الحملة خلصت ووصلت للحد الأقصى من الاستخدام.', jsonb_build_object('applied', false, 'promo_code', v_code));
  end if;

  if v_campaign.discount_type = 'fixed' then
    v_discount_amount := least(v_booking_amount, v_campaign.discount_value);
  else
    v_discount_amount := round((v_booking_amount * v_campaign.discount_value / 100.0)::numeric, 2);
    if v_campaign.max_discount is not null then
      v_discount_amount := least(v_discount_amount, v_campaign.max_discount);
    end if;
  end if;

  v_discount_amount := greatest(0, v_discount_amount);

  return app_private.build_promo_response(
    true,
    'promo_valid',
    coalesce(v_campaign.message, 'تم تفعيل الكود بنجاح.'),
    jsonb_build_object(
      'applied', true,
      'campaign_id', v_campaign.id,
      'promo_code', v_campaign.code,
      'title', v_campaign.title,
      'description', coalesce(v_campaign.description, ''),
      'discount_type', v_campaign.discount_type,
      'discount_value', v_campaign.discount_value,
      'discount_amount', v_discount_amount,
      'max_discount', v_campaign.max_discount,
      'minimum_booking_amount', v_campaign.min_booking_amount,
      'first_trip_only', v_campaign.first_trip_only,
      'per_user_limit', v_campaign.per_user_limit,
      'global_limit', v_campaign.global_limit,
      'starts_at', v_campaign.start_at,
      'ends_at', v_campaign.end_at,
      'popup_enabled', v_campaign.popup_enabled,
      'highlight_enabled', v_campaign.highlight_enabled,
      'popup_priority', v_campaign.popup_priority,
      'metadata', coalesce(v_campaign.metadata, '{}'::jsonb)
    )
  );
end;
$$;


ALTER FUNCTION "app_private"."resolve_promo"("p_user_id" "uuid", "p_code" "text", "p_booking_amount" numeric, "p_trip_meta" "jsonb", "p_lock" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_referral_code"("p_user_id" "uuid", "p_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."apply_referral_code"("p_user_id" "uuid", "p_code" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_promo_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "discount_type" "text" NOT NULL,
    "discount_value" numeric(10,2) NOT NULL,
    "max_discount_amount" numeric(10,2),
    "min_booking_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "per_user_limit" integer DEFAULT 1 NOT NULL,
    "global_limit" integer,
    "first_time_only" boolean DEFAULT false NOT NULL,
    "eligible_origins" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "eligible_destinations" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "popup_enabled" boolean DEFAULT false NOT NULL,
    "popup_cooldown_hours" integer DEFAULT 72 NOT NULL,
    "priority" integer DEFAULT 0 NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "message" "text",
    "start_at" timestamp with time zone,
    "end_at" timestamp with time zone,
    "max_discount" numeric(12,2),
    "first_trip_only" boolean DEFAULT false NOT NULL,
    "highlight_enabled" boolean DEFAULT true NOT NULL,
    "popup_priority" integer DEFAULT 0 NOT NULL,
    "audience_rules" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "trigger_kind" "text" DEFAULT 'manual'::"text" NOT NULL,
    "notification_enabled" boolean DEFAULT false NOT NULL,
    "notification_title" "text",
    "notification_body" "text",
    "cta_label" "text",
    "cta_action" "text",
    "cooldown_hours" integer DEFAULT 24 NOT NULL,
    CONSTRAINT "app_promo_campaigns_code_upper_chk" CHECK (("code" = "upper"("btrim"("code")))),
    CONSTRAINT "app_promo_campaigns_cooldown_hours_chk" CHECK (("cooldown_hours" >= 0)),
    CONSTRAINT "app_promo_campaigns_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['fixed'::"text", 'percent'::"text"]))),
    CONSTRAINT "app_promo_campaigns_discount_type_chk" CHECK (("discount_type" = ANY (ARRAY['fixed'::"text", 'percent'::"text"]))),
    CONSTRAINT "app_promo_campaigns_discount_value_chk" CHECK (("discount_value" > (0)::numeric)),
    CONSTRAINT "app_promo_campaigns_global_limit_check" CHECK ((("global_limit" IS NULL) OR ("global_limit" > 0))),
    CONSTRAINT "app_promo_campaigns_global_limit_chk" CHECK ((("global_limit" IS NULL) OR ("global_limit" > 0))),
    CONSTRAINT "app_promo_campaigns_max_discount_chk" CHECK ((("max_discount" IS NULL) OR ("max_discount" > (0)::numeric))),
    CONSTRAINT "app_promo_campaigns_min_booking_amount_chk" CHECK (("min_booking_amount" >= (0)::numeric)),
    CONSTRAINT "app_promo_campaigns_per_user_limit_check" CHECK (("per_user_limit" > 0)),
    CONSTRAINT "app_promo_campaigns_per_user_limit_chk" CHECK ((("per_user_limit" IS NULL) OR ("per_user_limit" > 0))),
    CONSTRAINT "app_promo_campaigns_popup_cooldown_hours_check" CHECK (("popup_cooldown_hours" > 0)),
    CONSTRAINT "app_promo_campaigns_trigger_kind_chk" CHECK (("trigger_kind" = ANY (ARRAY['manual'::"text", 'targeted'::"text", 'reactivation'::"text", 'retention'::"text", 'referral'::"text"]))),
    CONSTRAINT "app_promo_campaigns_window_chk" CHECK ((("start_at" IS NULL) OR ("end_at" IS NULL) OR ("end_at" >= "start_at")))
);


ALTER TABLE "public"."app_promo_campaigns" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."campaign_matches_user"("p_campaign" "public"."app_promo_campaigns", "p_user_id" "uuid", "p_context" "jsonb" DEFAULT '{}'::"jsonb") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."campaign_matches_user"("p_campaign" "public"."app_promo_campaigns", "p_user_id" "uuid", "p_context" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_booking_atomic"("p_booking_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_client_action_id text := 'manual-fix-' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint::text;
  v_result jsonb;
begin
  v_result := public.cancel_booking_atomic(p_booking_id::text, v_client_action_id);
  return coalesce(v_result, jsonb_build_object('ok', false, 'message', 'cancel_booking_atomic returned null'));
end;
$$;


ALTER FUNCTION "public"."cancel_booking_atomic"("p_booking_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_booking_atomic"("p_booking_id" "text", "p_client_action_id" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_booking public.bookings;
  v_preview jsonb;
  v_allowed boolean;
  v_fee_ratio numeric;
  v_refund numeric;
  v_client_action_id text;
begin
  select * into v_booking
  from public.bookings b
  where b.id::text = trim(coalesce(p_booking_id, ''))
    and b.user_id = auth.uid()
  for update;

  if v_booking is null then
    return jsonb_build_object('ok', false, 'code', 'booking_not_found', 'message', 'الحجز غير متاح.');
  end if;

  if coalesce(v_booking.status, '') = 'cancelled' then
    return jsonb_build_object('ok', true, 'code', 'already_processed', 'already_processed', true, 'message', 'الحجز اتلغى بالفعل قبل كده بدون أي تكرار.', 'refund_amount', coalesce(v_booking.refund_amount, 0), 'booking', jsonb_build_object('id', v_booking.id, 'status', v_booking.status));
  end if;

  v_preview := public.preview_booking_cancellation_atomic(p_booking_id);
  if coalesce((v_preview ->> 'ok')::boolean, false) = false then
    return v_preview;
  end if;

  v_allowed := coalesce((v_preview #>> '{data,allowed}')::boolean, false);
  v_fee_ratio := coalesce((v_preview #>> '{data,feeRatio}')::numeric, 1);
  v_refund := coalesce((v_preview #>> '{data,refundAmount}')::numeric, 0);

  if not v_allowed then
    return jsonb_build_object('ok', false, 'code', coalesce(v_preview ->> 'code', 'refund_not_allowed'), 'message', coalesce(v_preview ->> 'message', 'الإلغاء غير متاح حالياً.'), 'refund_amount', 0);
  end if;

  v_client_action_id := coalesce(nullif(trim(p_client_action_id), ''), nullif(trim(v_booking.refund_client_action_id), ''), 'cancel-' || v_booking.id::text);

  perform public.ensure_app_wallet(v_booking.user_id);

  if exists (select 1 from public.app_wallet_transactions where client_id = v_client_action_id) then
    update public.bookings
       set status = 'cancelled',
           cancelled_at = coalesce(cancelled_at, now()),
           refund_amount = coalesce(refund_amount, v_refund),
           refund_client_action_id = coalesce(refund_client_action_id, v_client_action_id),
           updated_at = now()
     where id = v_booking.id
    returning * into v_booking;

    return jsonb_build_object('ok', true, 'code', 'already_processed', 'already_processed', true, 'message', 'الحجز اتلغى بالفعل قبل كده بدون أي تكرار.', 'refund_amount', coalesce(v_booking.refund_amount, v_refund), 'booking', jsonb_build_object('id', v_booking.id, 'status', v_booking.status));
  end if;

  update public.bookings
     set status = 'cancelled',
         cancelled_at = coalesce(cancelled_at, now()),
         refund_amount = v_refund,
         refund_client_action_id = v_client_action_id,
         updated_at = now()
   where id = v_booking.id
  returning * into v_booking;

  if v_refund > 0 then
    update public.app_wallets
       set balance = coalesce(balance, 0) + v_refund,
           updated_at = now()
     where user_id = v_booking.user_id;

    insert into public.app_wallet_transactions (
      user_id, type, amount, description, reference_id, client_id, metadata, created_at
    )
    values (
      v_booking.user_id,
      'credit',
      v_refund,
      'استرداد إلغاء رحلة',
      v_booking.id::text,
      v_client_action_id,
      jsonb_build_object('kind', 'refund', 'booking_id', v_booking.id, 'fee_ratio', v_fee_ratio),
      now()
    );
  end if;

  return jsonb_build_object('ok', true, 'code', 'refund_success', 'message', format('تم إلغاء الرحلة، ورجعلك %s ج.م للمحفظة.', v_refund), 'refund_amount', v_refund, 'already_processed', false, 'booking', jsonb_build_object('id', v_booking.id, 'status', v_booking.status));

exception
  when unique_violation then
    update public.bookings
       set status = 'cancelled',
           cancelled_at = coalesce(cancelled_at, now()),
           refund_amount = coalesce(refund_amount, v_refund),
           refund_client_action_id = coalesce(refund_client_action_id, v_client_action_id),
           updated_at = now()
     where id = v_booking.id
    returning * into v_booking;

    return jsonb_build_object('ok', true, 'code', 'already_processed', 'already_processed', true, 'message', 'الحجز اتلغى بالفعل قبل كده بدون أي تكرار.', 'refund_amount', coalesce(v_booking.refund_amount, v_refund), 'booking', jsonb_build_object('id', v_booking.id, 'status', v_booking.status));
end;
$$;


ALTER FUNCTION "public"."cancel_booking_atomic"("p_booking_id" "text", "p_client_action_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_wallet_topup_request"("p_request_id" "uuid", "p_public_token" "text", "p_amount" integer, "p_payer_label" "text" DEFAULT 'QR wallet top-up'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
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
$_$;


ALTER FUNCTION "public"."complete_wallet_topup_request"("p_request_id" "uuid", "p_public_token" "text", "p_amount" integer, "p_payer_label" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."confirm_booking_authoritative"("p_trip_instance_id" "uuid", "p_seat_numbers" "text"[], "p_passengers" integer, "p_promo_code" "text" DEFAULT NULL::"text", "p_has_luggage" boolean DEFAULT false, "p_ride_to_station" boolean DEFAULT false, "p_needs_access" boolean DEFAULT false, "p_hold_token" "text" DEFAULT NULL::"text", "p_idempotency_key" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_request public.booking_confirmation_requests%rowtype;
  v_raw jsonb;
  v_booking jsonb;
  v_invoice jsonb;
  v_wallet_impact jsonb;
  v_result jsonb;
  v_total numeric := 0;
begin
  if v_user_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'AUTH_REQUIRED',
      'message', 'لازم تسجل دخول قبل تأكيد الحجز.'
    );
  end if;

  if p_trip_instance_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'MISSING_TRIP_INSTANCE_ID',
      'message', 'بيانات الرحلة غير مكتملة.'
    );
  end if;

  if coalesce(array_length(p_seat_numbers, 1), 0) = 0 then
    return jsonb_build_object(
      'ok', false,
      'code', 'MISSING_SEATS',
      'message', 'اختار المقاعد الأول.'
    );
  end if;

  if coalesce(trim(p_idempotency_key), '') = '' then
    return jsonb_build_object(
      'ok', false,
      'code', 'MISSING_IDEMPOTENCY_KEY',
      'message', 'رقم الطلب غير موجود.'
    );
  end if;

  perform pg_advisory_xact_lock(
    hashtext(v_user_id::text || ':' || p_idempotency_key)
  );

  select *
    into v_request
  from public.booking_confirmation_requests
  where user_id = v_user_id
    and idempotency_key = p_idempotency_key
  for update;

  if found and v_request.result_payload is not null then
    return v_request.result_payload;
  end if;

  if not found then
    insert into public.booking_confirmation_requests (
      user_id,
      idempotency_key,
      trip_instance_id,
      hold_token,
      request_payload
    )
    values (
      v_user_id,
      p_idempotency_key,
      p_trip_instance_id,
      nullif(trim(coalesce(p_hold_token, '')), ''),
      jsonb_build_object(
        'trip_instance_id', p_trip_instance_id,
        'seat_numbers', p_seat_numbers,
        'passengers', p_passengers,
        'promo_code', nullif(trim(coalesce(p_promo_code, '')), ''),
        'has_luggage', coalesce(p_has_luggage, false),
        'ride_to_station', coalesce(p_ride_to_station, false),
        'needs_access', coalesce(p_needs_access, false),
        'hold_token', nullif(trim(coalesce(p_hold_token, '')), '')
      )
    )
    returning * into v_request;
  end if;

  -- IMPORTANT:
  -- The inner function below must stay fully authoritative and atomic.
  -- It should already do:
  --   trip validation
  --   seat validation / hold validation
  --   pricing finalization
  --   promo revalidation
  --   wallet balance check
  --   wallet debit
  --   booking insert
  --   wallet transaction insert
  -- If your current public.create_booking_atomic does not do that yet,
  -- move its transaction logic into this wrapper instead of calling it.
  v_raw := to_jsonb(
    public.create_booking_atomic(
      p_trip_instance_id := p_trip_instance_id,
      p_seat_numbers := p_seat_numbers,
      p_passengers := p_passengers,
      p_promo_code := nullif(trim(coalesce(p_promo_code, '')), ''),
      p_has_luggage := coalesce(p_has_luggage, false),
      p_ride_to_station := coalesce(p_ride_to_station, false),
      p_needs_access := coalesce(p_needs_access, false)
    )
  );

  if coalesce((v_raw ->> 'ok')::boolean, true) = false then
    update public.booking_confirmation_requests
    set updated_at = now()
    where id = v_request.id;

    return jsonb_build_object(
      'ok', false,
      'code', coalesce(v_raw ->> 'code', 'BOOKING_REJECTED'),
      'message', coalesce(v_raw ->> 'message', 'تعذر تأكيد الحجز حالياً.')
    );
  end if;

  v_booking := coalesce(v_raw -> 'booking', v_raw -> 'ticket', v_raw);

  v_total := coalesce(
    nullif(v_raw #>> '{invoice,total}', '')::numeric,
    nullif(v_booking ->> 'final_total', '')::numeric,
    nullif(v_booking ->> 'finalTotal', '')::numeric,
    0
  );

  v_invoice := coalesce(
    v_raw -> 'invoice',
    jsonb_build_object(
      'pnr', coalesce(v_booking ->> 'pnr', v_booking ->> 'booking_code', v_booking ->> 'id', ''),
      'total', v_total,
      'method', 'محفظة طريقي',
      'date', to_char(now() at time zone 'Africa/Cairo', 'YYYY-MM-DD"T"HH24:MI:SS'),
      'items', jsonb_build_array(
        jsonb_build_object(
          'name', 'إجمالي الحجز',
          'price', v_total
        )
      )
    )
  );

  v_wallet_impact := coalesce(
    v_raw -> 'wallet_impact',
    jsonb_build_object(
      'direction', 'debit',
      'amount', v_total
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'booking', v_booking,
    'invoice', v_invoice,
    'wallet_impact', v_wallet_impact,
    'message', coalesce(v_raw ->> 'message', '')
  );

  update public.booking_confirmation_requests
  set
    booking_ref = coalesce(
      v_booking ->> 'booking_id',
      v_booking ->> 'id',
      v_booking ->> 'pnr',
      booking_ref
    ),
    result_payload = v_result,
    updated_at = now()
  where id = v_request.id;

  return v_result;
exception
  when others then
    if v_request.id is not null then
      update public.booking_confirmation_requests
      set updated_at = now()
      where id = v_request.id;
    end if;
    raise;
end;
$$;


ALTER FUNCTION "public"."confirm_booking_authoritative"("p_trip_instance_id" "uuid", "p_seat_numbers" "text"[], "p_passengers" integer, "p_promo_code" "text", "p_has_luggage" boolean, "p_ride_to_station" boolean, "p_needs_access" boolean, "p_hold_token" "text", "p_idempotency_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."consume_app_promo_code"("p_user_id" "uuid", "p_code" "text", "p_booking_id" "uuid", "p_discount_amount" numeric DEFAULT 0) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_campaign_id uuid;
begin
  select id
  into v_campaign_id
  from public.app_promo_campaigns
  where upper(code) = upper(trim(p_code))
  limit 1;

  if v_campaign_id is null then
    return;
  end if;

  insert into public.app_promo_redemptions (
    promo_id,
    user_id,
    booking_id,
    code,
    discount_amount,
    status
  )
  values (
    v_campaign_id,
    p_user_id,
    p_booking_id,
    upper(trim(p_code)),
    greatest(0, coalesce(p_discount_amount, 0)),
    'used'
  )
  on conflict (booking_id, code) do nothing;
end;
$$;


ALTER FUNCTION "public"."consume_app_promo_code"("p_user_id" "uuid", "p_code" "text", "p_booking_id" "uuid", "p_discount_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_booking_atomic"("p_trip_instance_id" "uuid", "p_seat_numbers" "text"[], "p_passengers" integer, "p_promo_code" "text" DEFAULT NULL::"text", "p_has_luggage" boolean DEFAULT false, "p_ride_to_station" boolean DEFAULT false, "p_needs_access" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."create_booking_atomic"("p_trip_instance_id" "uuid", "p_seat_numbers" "text"[], "p_passengers" integer, "p_promo_code" "text", "p_has_luggage" boolean, "p_ride_to_station" boolean, "p_needs_access" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_public_trip_share"("p_payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_token text;
begin
  v_token := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);

  insert into public.public_trip_shares (
    token,
    public_trip_code,
    share_payload,
    expires_at
  ) values (
    v_token,
    coalesce(p_payload->>'publicTripCode', p_payload->>'pnr'),
    p_payload,
    now() + interval '30 days'
  );

  return jsonb_build_object(
    'ok', true,
    'token', v_token
  );
end;
$$;


ALTER FUNCTION "public"."create_public_trip_share"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_wallet_topup_request"() RETURNS TABLE("request_id" "uuid", "public_token" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."create_wallet_topup_request"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_user_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "campaign_id" "uuid",
    "source" "text" DEFAULT 'system'::"text" NOT NULL,
    "category" "text" DEFAULT 'generic'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" DEFAULT ''::"text" NOT NULL,
    "cta_label" "text",
    "cta_action" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "dedupe_key" "text",
    "priority" integer DEFAULT 0 NOT NULL,
    "read_at" timestamp with time zone,
    "dismissed_at" timestamp with time zone,
    "delivered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_user_notifications" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."deliver_user_notification"("p_user_id" "uuid", "p_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "public"."app_user_notifications"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_row public.app_user_notifications;
begin
  perform public.require_same_user(p_user_id);
  v_row := public.deliver_user_notification_internal(p_user_id, p_payload);
  return v_row;
end;
$$;


ALTER FUNCTION "public"."deliver_user_notification"("p_user_id" "uuid", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."deliver_user_notification_internal"("p_user_id" "uuid", "p_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "public"."app_user_notifications"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."deliver_user_notification_internal"("p_user_id" "uuid", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dismiss_user_notifications"("p_user_id" "uuid", "p_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."dismiss_user_notifications"("p_user_id" "uuid", "p_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_app_wallet"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.app_wallets (user_id, balance, created_at, updated_at)
  values (p_user_id, 0, now(), now())
  on conflict (user_id) do nothing;
end;
$$;


ALTER FUNCTION "public"."ensure_app_wallet"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_referral_code"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."ensure_referral_code"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_wallet_tx_description"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  payload jsonb;
  channel_text text;
  request_text text;
begin
  payload := to_jsonb(new);

  if coalesce(nullif(btrim(new.description), ''), '') = '' then
    channel_text := lower(
      coalesce(
        nullif(payload->>'payment_channel', ''),
        nullif(payload->>'channel', ''),
        'wallet'
      )
    );

    request_text := coalesce(
      nullif(payload->>'request_id', ''),
      nullif(payload->>'reference_id', ''),
      nullif(payload->>'external_ref', '')
    );

    new.description :=
      case
        when channel_text in ('public_qr', 'public_qr_net', 'qr') then 'شحن محفظة عبر QR'
        when channel_text in ('card', 'bank_card') then 'شحن محفظة ببطاقة'
        when channel_text in ('wallet', 'vodafone_cash') then 'شحن محفظة عبر محفظة إلكترونية'
        when channel_text in ('instapay') then 'شحن محفظة عبر إنستاباي'
        else 'عملية على المحفظة'
      end;

    if request_text is not null then
      new.description := new.description || ' - ' || request_text;
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."ensure_wallet_tx_description"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fill_wallet_transaction_client_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
      begin
        if new.client_id is null then
          new.client_id := coalesce(nullif(trim(new.reference_id), ''), 'tx-' || gen_random_uuid()::text);
        end if;
        return new;
      end;
      $$;


ALTER FUNCTION "public"."fill_wallet_transaction_client_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_seat_label"("p_index" integer) RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select (((p_index - 1) / 4) + 1)::text || substr('ABCD', ((p_index - 1) % 4) + 1, 1)
$$;


ALTER FUNCTION "public"."generate_seat_label"("p_index" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_promo_popup_offer"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'app_private', 'pg_temp'
    AS $$
declare
  v_auth_user uuid := auth.uid();
  v_user_id uuid := coalesce(v_auth_user, p_user_id);
  v_profile_last_seen timestamptz;
  v_row public.app_promo_campaigns%rowtype;
  v_result jsonb;
begin
  if v_user_id is null then
    return null;
  end if;

  select p.last_offer_popup_at into v_profile_last_seen
    from public.profiles p
   where p.id = v_user_id;

  for v_row in
    select c.*
      from public.app_promo_campaigns c
     where c.is_active = true
       and (c.start_at is null or c.start_at <= now())
       and (c.end_at is null or c.end_at >= now())
       and (c.popup_enabled = true or c.highlight_enabled = true)
       and not exists (
         select 1 from public.app_promo_route_rules rr where rr.campaign_id = c.id
       )
     order by c.popup_priority desc, c.created_at desc
  loop
    v_result := app_private.resolve_promo(v_user_id, v_row.code, greatest(coalesce(v_row.min_booking_amount, 0), 1), '{}'::jsonb, false);

    if coalesce((v_result ->> 'ok')::boolean, false) = true
       and coalesce((v_result -> 'data' ->> 'applied')::boolean, false) = true then
      if v_row.popup_enabled = true then
        if v_profile_last_seen is not null
           and v_profile_last_seen > now() - make_interval(hours => greatest(coalesce(v_row.popup_cooldown_hours, 72), 1)) then
          return jsonb_build_object(
            'code', v_row.code,
            'title', v_row.title,
            'description', coalesce(v_row.description, ''),
            'message', coalesce(v_row.message, ''),
            'starts_at', v_row.start_at,
            'ends_at', v_row.end_at,
            'discount_type', v_row.discount_type,
            'discount_value', v_row.discount_value,
            'popup_enabled', false,
            'highlight_enabled', v_row.highlight_enabled,
            'metadata', coalesce(v_row.metadata, '{}'::jsonb)
          );
        end if;
      end if;

      return jsonb_build_object(
        'code', v_row.code,
        'title', v_row.title,
        'description', coalesce(v_row.description, ''),
        'message', coalesce(v_row.message, ''),
        'starts_at', v_row.start_at,
        'ends_at', v_row.end_at,
        'discount_type', v_row.discount_type,
        'discount_value', v_row.discount_value,
        'popup_enabled', v_row.popup_enabled,
        'highlight_enabled', v_row.highlight_enabled,
        'metadata', coalesce(v_row.metadata, '{}'::jsonb)
      );
    end if;
  end loop;

  return null;
end;
$$;


ALTER FUNCTION "public"."get_promo_popup_offer"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_trip_share"("p_token" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_payload jsonb;
begin
  select share_payload
    into v_payload
  from public.public_trip_shares
  where token = p_token
    and (expires_at is null or expires_at > now())
  limit 1;

  if v_payload is null then
    return null;
  end if;

  return jsonb_build_object(
    'payload', v_payload
  );
end;
$$;


ALTER FUNCTION "public"."get_public_trip_share"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_referral_summary"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."get_referral_summary"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_targeted_promo_offer"("p_user_id" "uuid", "p_context" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."get_targeted_promo_offer"("p_user_id" "uuid", "p_context" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_trip_seats"("p_trip_instance_id" "uuid") RETURNS TABLE("id" "uuid", "seat_number" "text", "seat_index" integer, "status" "text", "hold_expires_at" timestamp with time zone, "held_by_user_id" "uuid")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    ts.id,
    ts.seat_number,
    ts.seat_index,
    ts.status,
    ts.hold_expires_at,
    ts.held_by_user_id
  from public.trip_seats ts
  where ts.trip_instance_id = p_trip_instance_id
  order by ts.seat_index asc;
$$;


ALTER FUNCTION "public"."get_trip_seats"("p_trip_instance_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_wallet_topup_request_public"("p_request_id" "uuid", "p_public_token" "text") RETURNS TABLE("request_id" "uuid", "status" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  return query
  select id, wallet_topup_requests.status, wallet_topup_requests.created_at
  from public.wallet_topup_requests
  where id = p_request_id
    and public_token = p_public_token;
end;
$$;


ALTER FUNCTION "public"."get_wallet_topup_request_public"("p_request_id" "uuid", "p_public_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'مستخدم جديد')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (
    id,
    display_name,
    phone,
    account_status
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(split_part(new.email, '@', 1), ''),
      'مستخدم'
    ),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    'active'
  )
  on conflict (id) do update
  set
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    phone = coalesce(public.profiles.phone, excluded.phone),
    account_status = coalesce(public.profiles.account_status, 'active');

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_profiles_timestamps"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if tg_op = 'INSERT' then
    new.created_at = coalesce(new.created_at, timezone('utc', now()));
  end if;

  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_profiles_timestamps"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hold_trip_seats"("p_trip_instance_id" "uuid", "p_seat_numbers" "text"[], "p_hold_minutes" integer DEFAULT 5) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."hold_trip_seats"("p_trip_instance_id" "uuid", "p_seat_numbers" "text"[], "p_hold_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hours_until_trip_departure"("p_departure_date" "date", "p_departure_time" time without time zone) RETURNS numeric
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select
    extract(
      epoch from (
        ((p_departure_date + p_departure_time) - timezone('Africa/Cairo', now()))
      )
    ) / 3600.0;
$$;


ALTER FUNCTION "public"."hours_until_trip_departure"("p_departure_date" "date", "p_departure_time" time without time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."hours_until_trip_departure"("p_departure_date" "date", "p_departure_time" time without time zone) IS 'Returns Cairo-local hours until trip departure without invalid interval arithmetic.';



CREATE OR REPLACE FUNCTION "public"."list_user_notifications"("p_user_id" "uuid", "p_limit" integer DEFAULT 50) RETURNS SETOF "public"."app_user_notifications"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."list_user_notifications"("p_user_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_user_notifications_read"("p_user_id" "uuid", "p_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."mark_user_notifications_read"("p_user_id" "uuid", "p_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."preview_app_promo"("p_user_id" "uuid", "p_code" "text", "p_booking_amount" numeric, "p_trip_meta" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'app_private', 'pg_temp'
    AS $$
declare
  v_auth_user uuid := auth.uid();
  v_effective_user uuid := coalesce(v_auth_user, p_user_id);
begin
  if v_effective_user is null then
    return app_private.build_promo_response(false, 'promo_auth_required', 'لازم تسجل دخول الأول قبل استخدام كود الخصم.', jsonb_build_object('applied', false));
  end if;

  if p_user_id is not null and v_auth_user is not null and p_user_id <> v_auth_user then
    return app_private.build_promo_response(false, 'promo_forbidden', 'تعذر مراجعة الكود للحساب الحالي.', jsonb_build_object('applied', false));
  end if;

  return app_private.resolve_promo(v_effective_user, p_code, p_booking_amount, coalesce(p_trip_meta, '{}'::jsonb), false);
end;
$$;


ALTER FUNCTION "public"."preview_app_promo"("p_user_id" "uuid", "p_code" "text", "p_booking_amount" numeric, "p_trip_meta" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."preview_booking_cancellation"("p_booking_id" "text") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.preview_booking_cancellation_atomic(p_booking_id);
$$;


ALTER FUNCTION "public"."preview_booking_cancellation"("p_booking_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."preview_booking_cancellation_atomic"("p_booking_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_booking public.bookings;
  v_departure timestamptz;
  v_hours_to_departure numeric;
  v_total numeric;
  v_fee_ratio numeric;
  v_refund numeric;
begin
  select * into v_booking
  from public.bookings b
  where b.id::text = trim(coalesce(p_booking_id, ''))
    and b.user_id = auth.uid()
  limit 1;

  if v_booking is null then
    return jsonb_build_object('ok', false, 'code', 'booking_not_found', 'message', 'الحجز غير متاح.');
  end if;

  if coalesce(v_booking.status, '') = 'cancelled' then
    return jsonb_build_object('ok', true, 'code', 'already_processed', 'message', 'الحجز ملغي بالفعل.', 'data', jsonb_build_object('allowed', false, 'feeRatio', 1, 'refundAmount', coalesce(v_booking.refund_amount, 0), 'authoritative', true));
  end if;

  v_total := coalesce(v_booking.final_total, 0);
  v_departure := ((v_booking.date::text || ' ' || coalesce(v_booking.departure_time::text, '00:00'))::timestamp at time zone 'Africa/Cairo');
  v_hours_to_departure := extract(epoch from (v_departure - now())) / 3600.0;

  if v_hours_to_departure <= 2 then
    return jsonb_build_object('ok', true, 'code', 'refund_not_allowed', 'message', 'فات وقت الإلغاء المسموح (أقل من ساعتين على التحرك).', 'data', jsonb_build_object('allowed', false, 'feeRatio', 1, 'refundAmount', 0, 'authoritative', true));
  end if;

  v_fee_ratio := case when v_hours_to_departure > 24 then 0.15 when v_hours_to_departure <= 6 then 0.35 else 0.20 end;
  v_refund := greatest(0, round(v_total * (1 - v_fee_ratio)));

  return jsonb_build_object('ok', true, 'code', 'preview_ready', 'message', 'تمت مراجعة أهلية الإلغاء من السيرفر.', 'data', jsonb_build_object('allowed', true, 'feeRatio', v_fee_ratio, 'refundAmount', v_refund, 'authoritative', true));
end;
$$;


ALTER FUNCTION "public"."preview_booking_cancellation_atomic"("p_booking_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."public_topup_wallet"("p_user_id" "uuid", "p_amount" numeric, "p_request_id" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."public_topup_wallet"("p_user_id" "uuid", "p_amount" numeric, "p_request_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."public_topup_wallet"("p_user_id" "uuid", "p_amount" numeric, "p_request_id" "text" DEFAULT NULL::"text", "p_payment_channel" "text" DEFAULT 'public_qr'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_existing numeric;
  v_balance numeric;
begin
  if p_user_id is null then
    raise exception 'Missing user id';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Invalid amount';
  end if;

  if p_request_id is not null then
    select amount
      into v_existing
    from public.app_wallet_transactions
    where reference_id = p_request_id
    limit 1;

    if v_existing is not null then
      select balance
        into v_balance
      from public.app_wallets
      where user_id = p_user_id
      limit 1;

      return jsonb_build_object(
        'ok', true,
        'already_processed', true,
        'balance', coalesce(v_balance, 0)
      );
    end if;
  end if;

  insert into public.app_wallets (user_id, balance)
  values (p_user_id, p_amount)
  on conflict (user_id)
  do update set
    balance = public.app_wallets.balance + excluded.balance;

  insert into public.app_wallet_transactions (
    user_id,
    type,
    amount,
    reference_id,
    payment_channel
  ) values (
    p_user_id,
    'credit',
    p_amount,
    p_request_id,
    p_payment_channel
  );

  select balance
    into v_balance
  from public.app_wallets
  where user_id = p_user_id
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'balance', coalesce(v_balance, 0)
  );
end;
$$;


ALTER FUNCTION "public"."public_topup_wallet"("p_user_id" "uuid", "p_amount" numeric, "p_request_id" "text", "p_payment_channel" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."public_topup_wallet"("p_user_id" "uuid", "p_amount" numeric, "p_request_id" "text", "p_payment_channel" "text" DEFAULT 'public_qr'::"text", "p_client_id" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_now timestamptz := now();

  v_wallets_has_id boolean;
  v_tx_has_wallet_id boolean;
  v_tx_has_client_id boolean;
  v_tx_has_description boolean;
  v_tx_has_reference_id boolean;
  v_tx_has_payment_channel boolean;
  v_tx_has_created_at boolean;
  v_tx_has_id boolean;

  v_wallet_id_type text;
  v_client_id_type text;

  v_wallet_ref_text text;
  v_client_ref_text text;
  v_tx_id_text text;

  v_sql text;
  v_cols text := 'user_id, type, amount';
  v_vals text := format('%L::uuid, %L, %s', p_user_id::text, 'credit', coalesce(p_amount, 0));
begin
  if p_user_id is null then
    raise exception 'Missing user id';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Invalid top-up amount';
  end if;

  if coalesce(trim(p_request_id), '') = '' then
    raise exception 'Missing request id';
  end if;

  update public.app_wallets
  set balance = coalesce(balance, 0) + p_amount,
      updated_at = v_now
  where user_id = p_user_id;

  if not found then
    insert into public.app_wallets (user_id, balance, created_at, updated_at)
    values (p_user_id, p_amount, v_now, v_now);
  end if;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_wallets' and column_name = 'id'
  ) into v_wallets_has_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_wallet_transactions' and column_name = 'wallet_id'
  ) into v_tx_has_wallet_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_wallet_transactions' and column_name = 'client_id'
  ) into v_tx_has_client_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_wallet_transactions' and column_name = 'description'
  ) into v_tx_has_description;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_wallet_transactions' and column_name = 'reference_id'
  ) into v_tx_has_reference_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_wallet_transactions' and column_name = 'payment_channel'
  ) into v_tx_has_payment_channel;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_wallet_transactions' and column_name = 'created_at'
  ) into v_tx_has_created_at;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_wallet_transactions' and column_name = 'id'
  ) into v_tx_has_id;

  select data_type
    into v_wallet_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'app_wallet_transactions'
    and column_name = 'wallet_id';

  select data_type
    into v_client_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'app_wallet_transactions'
    and column_name = 'client_id';

  if v_tx_has_wallet_id then
    if v_wallets_has_id then
      execute 'select id::text from public.app_wallets where user_id = $1 limit 1'
      into v_wallet_ref_text
      using p_user_id;
    else
      v_wallet_ref_text := p_user_id::text;
    end if;

    if coalesce(v_wallet_ref_text, '') <> '' then
      v_cols := v_cols || ', wallet_id';

      if v_wallet_id_type = 'uuid' then
        v_vals := v_vals || format(', %L::uuid', v_wallet_ref_text);
      else
        v_vals := v_vals || format(', %L', v_wallet_ref_text);
      end if;
    end if;
  end if;

  if v_tx_has_client_id then
    if v_client_id_type = 'uuid' then
      v_client_ref_text := public.request_key_to_uuid(
        coalesce(nullif(trim(p_client_id), ''), p_request_id || ':' || p_user_id::text)
      )::text;
      v_cols := v_cols || ', client_id';
      v_vals := v_vals || format(', %L::uuid', v_client_ref_text);
    else
      v_client_ref_text := coalesce(nullif(trim(p_client_id), ''), p_request_id);
      v_cols := v_cols || ', client_id';
      v_vals := v_vals || format(', %L', v_client_ref_text);
    end if;
  end if;

  if v_tx_has_description then
    v_cols := v_cols || ', description';
    v_vals := v_vals || format(', %L', 'شحن رصيد عبر QR');
  end if;

  if v_tx_has_reference_id then
    v_cols := v_cols || ', reference_id';
    v_vals := v_vals || format(', %L', p_request_id);
  end if;

  if v_tx_has_payment_channel then
    v_cols := v_cols || ', payment_channel';
    v_vals := v_vals || format(', %L', coalesce(nullif(trim(p_payment_channel), ''), 'public_qr'));
  end if;

  if v_tx_has_created_at then
    v_cols := v_cols || ', created_at';
    v_vals := v_vals || format(', %L::timestamptz', v_now::text);
  end if;

  v_sql := 'insert into public.app_wallet_transactions (' || v_cols || ') values (' || v_vals || ')';

  begin
    if v_tx_has_id then
      v_sql := v_sql || ' returning id::text';
      execute v_sql into v_tx_id_text;
    else
      execute v_sql;
      v_tx_id_text := null;
    end if;
  exception
    when unique_violation then
      return jsonb_build_object(
        'ok', true,
        'already_processed', true,
        'credited_amount', p_amount,
        'request_id', p_request_id,
        'transaction_id', null
      );
  end;

  return jsonb_build_object(
    'ok', true,
    'already_processed', false,
    'credited_amount', p_amount,
    'request_id', p_request_id,
    'transaction_id', v_tx_id_text
  );
end;
$_$;


ALTER FUNCTION "public"."public_topup_wallet"("p_user_id" "uuid", "p_amount" numeric, "p_request_id" "text", "p_payment_channel" "text", "p_client_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_trip_available_seats"("p_trip_instance_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."recalculate_trip_available_seats"("p_trip_instance_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_campaign_event"("p_user_id" "uuid", "p_campaign_id" "uuid" DEFAULT NULL::"uuid", "p_event_name" "text" DEFAULT ''::"text", "p_event_source" "text" DEFAULT 'app'::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."record_campaign_event"("p_user_id" "uuid", "p_campaign_id" "uuid", "p_event_name" "text", "p_event_source" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_expired_seat_holds"("p_trip_instance_id" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."release_expired_seat_holds"("p_trip_instance_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_my_seat_hold"("p_trip_instance_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."release_my_seat_hold"("p_trip_instance_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_key_to_uuid"("p_value" "text") RETURNS "uuid"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select (
    substr(md5(coalesce(p_value, '')), 1, 8) || '-' ||
    substr(md5(coalesce(p_value, '')), 9, 4) || '-' ||
    substr(md5(coalesce(p_value, '')), 13, 4) || '-' ||
    substr(md5(coalesce(p_value, '')), 17, 4) || '-' ||
    substr(md5(coalesce(p_value, '')), 21, 12)
  )::uuid
$$;


ALTER FUNCTION "public"."request_key_to_uuid"("p_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_self_account_deletion"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := timezone('utc', now());
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.profiles (
    id,
    display_name,
    phone,
    account_status,
    deleted_at,
    created_at,
    updated_at
  )
  values (
    v_user_id,
    'حساب محذوف',
    null,
    'deleted',
    v_now,
    v_now,
    v_now
  )
  on conflict (id) do update
    set account_status = 'deleted',
        deleted_at = coalesce(public.profiles.deleted_at, v_now),
        display_name = coalesce(nullif(public.profiles.display_name, ''), 'حساب محذوف'),
        phone = null,
        updated_at = v_now;

  return jsonb_build_object(
    'ok', true,
    'mode', 'profile_soft_delete',
    'auth_user_deleted', false
  );
end;
$$;


ALTER FUNCTION "public"."request_self_account_deletion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."require_same_user"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;


ALTER FUNCTION "public"."require_same_user"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_reference_travel_data"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."seed_reference_travel_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_trip_inventory_for_search"("p_from_city" "text", "p_to_city" "text", "p_departure_date" "date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."seed_trip_inventory_for_search"("p_from_city" "text", "p_to_city" "text", "p_departure_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_row_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_row_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_referral_rewards"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."sync_referral_rewards"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_user_engagement"("p_user_id" "uuid", "p_context" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."sync_user_engagement"("p_user_id" "uuid", "p_context" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."taree2y_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."taree2y_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_app_promo_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_app_promo_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_booking_confirmation_requests_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_booking_confirmation_requests_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_booking_snapshot"("p_user_id" "uuid") RETURNS TABLE("total_bookings" integer, "active_bookings" integer, "qualifying_bookings" integer, "last_booking_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    count(*)::integer as total_bookings,
    count(*) filter (where coalesce(status, '') not in ('cancelled', 'refund_pending'))::integer as active_bookings,
    count(*) filter (where coalesce(status, '') not in ('cancelled', 'refund_pending'))::integer as qualifying_bookings,
    max(created_at) as last_booking_at
  from public.bookings
  where user_id = p_user_id;
$$;


ALTER FUNCTION "public"."user_booking_snapshot"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_wallet_balance"("p_user_id" "uuid") RETURNS numeric
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(balance, 0)
  from public.app_wallets
  where user_id = p_user_id
  limit 1;
$$;


ALTER FUNCTION "public"."user_wallet_balance"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_app_promo_code"("p_user_id" "uuid", "p_code" "text", "p_booking_amount" numeric, "p_trip_meta" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_campaign public.app_promo_campaigns%rowtype;
  v_used_count integer := 0;
  v_total_used_count integer := 0;
  v_successful_booking_count integer := 0;
  v_origin text := coalesce(nullif(p_trip_meta->>'from', ''), '');
  v_destination text := coalesce(nullif(p_trip_meta->>'to', ''), '');
  v_discount_amount numeric(10,2) := 0;
begin
  select *
  into v_campaign
  from public.app_promo_campaigns
  where upper(code) = upper(trim(p_code))
    and is_active = true
  order by priority desc, created_at desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'applied', false,
      'message', 'كود الخصم غير موجود أو غير مفعل.'
    );
  end if;

  if v_campaign.starts_at is not null and timezone('utc', now()) < v_campaign.starts_at then
    return jsonb_build_object(
      'ok', false,
      'applied', false,
      'code', v_campaign.code,
      'message', 'الحملة لم تبدأ بعد.'
    );
  end if;

  if v_campaign.ends_at is not null and timezone('utc', now()) > v_campaign.ends_at then
    return jsonb_build_object(
      'ok', false,
      'applied', false,
      'code', v_campaign.code,
      'message', 'الحملة انتهت.'
    );
  end if;

  if coalesce(p_booking_amount, 0) < v_campaign.min_booking_amount then
    return jsonb_build_object(
      'ok', false,
      'applied', false,
      'code', v_campaign.code,
      'message', format('الحد الأدنى لاستخدام الكود هو %s ج.م.', v_campaign.min_booking_amount)
    );
  end if;

  if cardinality(v_campaign.eligible_origins) > 0 and not (v_origin = any(v_campaign.eligible_origins)) then
    return jsonb_build_object(
      'ok', false,
      'applied', false,
      'code', v_campaign.code,
      'message', 'الكود غير متاح من محطة التحرك الحالية.'
    );
  end if;

  if cardinality(v_campaign.eligible_destinations) > 0 and not (v_destination = any(v_campaign.eligible_destinations)) then
    return jsonb_build_object(
      'ok', false,
      'applied', false,
      'code', v_campaign.code,
      'message', 'الكود غير متاح لوجهة الرحلة الحالية.'
    );
  end if;

  if to_regclass('public.bookings') is not null then
    select count(*)
    into v_successful_booking_count
    from public.bookings
    where user_id = p_user_id
      and coalesce(status, 'upcoming') in ('upcoming', 'past');
  end if;

  if v_campaign.first_time_only and v_successful_booking_count > 0 then
    return jsonb_build_object(
      'ok', false,
      'applied', false,
      'code', v_campaign.code,
      'message', 'الكود مخصص لأول رحلة فقط.'
    );
  end if;

  select count(*)
  into v_used_count
  from public.app_promo_redemptions
  where promo_id = v_campaign.id
    and user_id = p_user_id
    and status = 'used';

  if v_used_count >= v_campaign.per_user_limit then
    return jsonb_build_object(
      'ok', false,
      'applied', false,
      'code', v_campaign.code,
      'message', 'الكود اتستخدم الحد المسموح ليك.'
    );
  end if;

  if v_campaign.global_limit is not null then
    select count(*)
    into v_total_used_count
    from public.app_promo_redemptions
    where promo_id = v_campaign.id
      and status = 'used';

    if v_total_used_count >= v_campaign.global_limit then
      return jsonb_build_object(
        'ok', false,
        'applied', false,
        'code', v_campaign.code,
        'message', 'الحملة وصلت للحد الأقصى من الاستخدام.'
      );
    end if;
  end if;

  if v_campaign.discount_type = 'fixed' then
    v_discount_amount := greatest(0, v_campaign.discount_value);
  else
    v_discount_amount := round(greatest(0, p_booking_amount) * (v_campaign.discount_value / 100.0), 2);

    if v_campaign.max_discount_amount is not null then
      v_discount_amount := least(v_discount_amount, v_campaign.max_discount_amount);
    end if;
  end if;

  v_discount_amount := least(v_discount_amount, greatest(0, p_booking_amount));

  return jsonb_build_object(
    'ok', true,
    'applied', true,
    'code', v_campaign.code,
    'title', v_campaign.title,
    'description', v_campaign.description,
    'discount_amount', v_discount_amount,
    'discount_type', v_campaign.discount_type,
    'starts_at', v_campaign.starts_at,
    'ends_at', v_campaign.ends_at,
    'message', 'الكود صالح وتمت مراجعته بنجاح.'
  );
end;
$$;


ALTER FUNCTION "public"."validate_app_promo_code"("p_user_id" "uuid", "p_code" "text", "p_booking_amount" numeric, "p_trip_meta" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wallet_topup_request_confirm"("p_request_id" "text", "p_client_id" "text" DEFAULT NULL::"text", "p_payment_channel" "text" DEFAULT 'public_qr'::"text") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.wallet_topup_request_confirm_public(p_request_id, p_client_id, p_payment_channel);
$$;


ALTER FUNCTION "public"."wallet_topup_request_confirm"("p_request_id" "text", "p_client_id" "text", "p_payment_channel" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wallet_topup_request_confirm_public"("p_request_id" "text", "p_client_id" "text" DEFAULT NULL::"text", "p_payment_channel" "text" DEFAULT 'public_qr'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_req public.wallet_topup_requests;
  v_effective_client_id text;
begin
  select *
    into v_req
    from public.wallet_topup_requests
   where request_id = trim(coalesce(p_request_id, ''))
   for update;

  if v_req is null then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'طلب الشحن غير موجود.');
  end if;

  if v_req.status in ('pending', 'paid') and v_req.expires_at <= now() then
    update public.wallet_topup_requests
       set status = 'expired',
           expired_at = coalesce(expired_at, now()),
           updated_at = now()
     where id = v_req.id
    returning * into v_req;

    return jsonb_build_object('ok', false, 'code', 'expired', 'message', 'انتهت صلاحية طلب الشحن.', 'request', public.wallet_topup_request_payload(v_req));
  end if;

  if v_req.status = 'failed' then
    return jsonb_build_object('ok', false, 'code', 'failed', 'message', 'طلب الشحن في حالة فشل.', 'request', public.wallet_topup_request_payload(v_req));
  end if;

  if v_req.status = 'credited' then
    return jsonb_build_object('ok', true, 'code', 'already_processed', 'already_processed', true, 'message', 'الطلب اتعالج بالفعل بدون أي تكرار.', 'request', public.wallet_topup_request_payload(v_req));
  end if;

  v_effective_client_id := coalesce(nullif(trim(p_client_id), ''), nullif(trim(v_req.client_id), ''), 'topup-' || v_req.request_id);

  perform public.ensure_app_wallet(v_req.user_id);

  if exists (select 1 from public.app_wallet_transactions where client_id = v_effective_client_id) then
    update public.wallet_topup_requests
       set status = 'credited',
           paid_at = coalesce(paid_at, now()),
           credited_at = coalesce(credited_at, now()),
           client_id = v_effective_client_id,
           wallet_transaction_ref = coalesce(wallet_transaction_ref, v_effective_client_id),
           updated_at = now()
     where id = v_req.id
    returning * into v_req;

    return jsonb_build_object('ok', true, 'code', 'already_processed', 'already_processed', true, 'message', 'الطلب اتعالج بالفعل بدون أي تكرار.', 'request', public.wallet_topup_request_payload(v_req));
  end if;

  update public.wallet_topup_requests
     set status = 'paid',
         paid_at = coalesce(paid_at, now()),
         client_id = v_effective_client_id,
         payment_channel = coalesce(nullif(trim(p_payment_channel), ''), payment_channel),
         updated_at = now()
   where id = v_req.id
  returning * into v_req;

  update public.app_wallets
     set balance = coalesce(balance, 0) + coalesce(v_req.net_amount, 0),
         updated_at = now()
   where user_id = v_req.user_id;

  insert into public.app_wallet_transactions (
    user_id, type, amount, description, reference_id, client_id, metadata, created_at
  )
  values (
    v_req.user_id,
    'credit',
    v_req.net_amount,
    'شحن المحفظة',
    v_req.request_id,
    v_effective_client_id,
    jsonb_build_object(
      'kind', 'topup',
      'request_id', v_req.request_id,
      'payment_channel', v_req.payment_channel,
      'gross_amount', v_req.gross_amount,
      'fee_amount', v_req.fee_amount,
      'net_amount', v_req.net_amount
    ),
    now()
  );

  update public.wallet_topup_requests
     set status = 'credited',
         credited_at = coalesce(credited_at, now()),
         wallet_transaction_ref = v_effective_client_id,
         updated_at = now()
   where id = v_req.id
  returning * into v_req;

  return jsonb_build_object('ok', true, 'code', 'credited', 'message', 'تمت إضافة الرصيد للمحفظة بنجاح.', 'request', public.wallet_topup_request_payload(v_req));

exception
  when unique_violation then
    select *
      into v_req
      from public.wallet_topup_requests
     where request_id = trim(coalesce(p_request_id, ''));

    update public.wallet_topup_requests
       set status = 'credited',
           paid_at = coalesce(paid_at, now()),
           credited_at = coalesce(credited_at, now()),
           client_id = coalesce(client_id, v_effective_client_id),
           wallet_transaction_ref = coalesce(wallet_transaction_ref, v_effective_client_id),
           updated_at = now()
     where id = v_req.id
    returning * into v_req;

    return jsonb_build_object('ok', true, 'code', 'already_processed', 'already_processed', true, 'message', 'الطلب اتعالج بالفعل بدون أي تكرار.', 'request', public.wallet_topup_request_payload(v_req));
end;
$$;


ALTER FUNCTION "public"."wallet_topup_request_confirm_public"("p_request_id" "text", "p_client_id" "text", "p_payment_channel" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wallet_topup_request_create_or_get"("p_user_id" "uuid", "p_request_id" "text", "p_gross_amount" numeric, "p_fee_amount" numeric, "p_net_amount" numeric, "p_payment_channel" "text" DEFAULT 'public_qr'::"text", "p_client_id" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.wallet_topup_request_create_or_get_public(
    p_user_id, p_request_id, p_gross_amount, p_fee_amount, p_net_amount,
    p_payment_channel, p_client_id, p_metadata
  );
$$;


ALTER FUNCTION "public"."wallet_topup_request_create_or_get"("p_user_id" "uuid", "p_request_id" "text", "p_gross_amount" numeric, "p_fee_amount" numeric, "p_net_amount" numeric, "p_payment_channel" "text", "p_client_id" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wallet_topup_request_create_or_get_public"("p_user_id" "uuid", "p_request_id" "text", "p_gross_amount" numeric, "p_fee_amount" numeric, "p_net_amount" numeric, "p_payment_channel" "text" DEFAULT 'public_qr'::"text", "p_client_id" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_req public.wallet_topup_requests;
begin
  if p_user_id is null or nullif(trim(p_request_id), '') is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_request', 'message', 'بيانات طلب الشحن غير مكتملة.');
  end if;

  insert into public.wallet_topup_requests (
    request_id, user_id, gross_amount, fee_amount, net_amount,
    payment_channel, status, client_id, metadata
  )
  values (
    trim(p_request_id),
    p_user_id,
    round(coalesce(p_gross_amount, 0)::numeric, 2),
    round(coalesce(p_fee_amount, 0)::numeric, 2),
    round(coalesce(p_net_amount, 0)::numeric, 2),
    coalesce(nullif(trim(p_payment_channel), ''), 'public_qr'),
    'pending',
    nullif(trim(p_client_id), ''),
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (request_id) do update
    set updated_at = now()
  returning * into v_req;

  if v_req.status in ('pending', 'paid') and v_req.expires_at <= now() then
    update public.wallet_topup_requests
       set status = 'expired',
           expired_at = coalesce(expired_at, now()),
           updated_at = now()
     where id = v_req.id
    returning * into v_req;
  end if;

  return jsonb_build_object(
    'ok', true,
    'code', case when v_req.status = 'credited' then 'already_processed' when v_req.status = 'expired' then 'expired' else 'request_ready' end,
    'message', case when v_req.status = 'credited' then 'الطلب اتشحن بالفعل قبل كده.' when v_req.status = 'expired' then 'انتهت صلاحية طلب الشحن.' else 'تم تجهيز طلب الشحن.' end,
    'request', public.wallet_topup_request_payload(v_req)
  );
end;
$$;


ALTER FUNCTION "public"."wallet_topup_request_create_or_get_public"("p_user_id" "uuid", "p_request_id" "text", "p_gross_amount" numeric, "p_fee_amount" numeric, "p_net_amount" numeric, "p_payment_channel" "text", "p_client_id" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallet_topup_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "public_token" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "latest_amount" integer,
    "payer_label" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "request_id" "text",
    "gross_amount" numeric(12,2),
    "fee_amount" numeric(12,2) DEFAULT 0,
    "net_amount" numeric(12,2),
    "payment_channel" "text" DEFAULT 'public_qr'::"text",
    "client_id" "text",
    "external_reference" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "paid_at" timestamp with time zone,
    "credited_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    "expired_at" timestamp with time zone,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:30:00'::interval),
    "wallet_transaction_ref" "text",
    "last_error" "text",
    CONSTRAINT "wallet_topup_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."wallet_topup_requests" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wallet_topup_request_payload"("p_req" "public"."wallet_topup_requests") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select to_jsonb(p_req);
$$;


ALTER FUNCTION "public"."wallet_topup_request_payload"("p_req" "public"."wallet_topup_requests") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wallet_topup_request_status"("p_request_id" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.wallet_topup_request_status_public(p_request_id, p_user_id);
$$;


ALTER FUNCTION "public"."wallet_topup_request_status"("p_request_id" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wallet_topup_request_status_public"("p_request_id" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_req public.wallet_topup_requests;
begin
  select *
    into v_req
    from public.wallet_topup_requests
   where request_id = trim(coalesce(p_request_id, ''))
     and (p_user_id is null or user_id = p_user_id)
   limit 1;

  if v_req is null then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'طلب الشحن غير موجود.');
  end if;

  if v_req.status in ('pending', 'paid') and v_req.expires_at <= now() then
    update public.wallet_topup_requests
       set status = 'expired',
           expired_at = coalesce(expired_at, now()),
           updated_at = now()
     where id = v_req.id
    returning * into v_req;
  end if;

  return jsonb_build_object(
    'ok', v_req.status not in ('failed', 'expired'),
    'code', case when v_req.status = 'credited' then 'credited' when v_req.status = 'expired' then 'expired' when v_req.status = 'failed' then 'failed' when v_req.status = 'paid' then 'paid' else 'pending' end,
    'message', case when v_req.status = 'credited' then 'تمت إضافة الرصيد للمحفظة.' when v_req.status = 'expired' then 'انتهت صلاحية طلب الشحن.' when v_req.status = 'failed' then 'فشل طلب الشحن.' when v_req.status = 'paid' then 'تم تسجيل الدفع وبانتظار إضافة الرصيد.' else 'الطلب بانتظار التأكيد.' end,
    'request', public.wallet_topup_request_payload(v_req)
  );
end;
$$;


ALTER FUNCTION "public"."wallet_topup_request_status_public"("p_request_id" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "admin_backups"."app_wallet_transactions_reset_20260323_172817" (
    "id" "uuid",
    "user_id" "uuid",
    "amount" numeric(12,2),
    "description" "text",
    "created_at" timestamp with time zone,
    "client_id" "text",
    "txn_date" "date",
    "payload" "jsonb",
    "updated_at" timestamp with time zone,
    "type" "text"
);


ALTER TABLE "admin_backups"."app_wallet_transactions_reset_20260323_172817" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "admin_backups"."app_wallets_reset_20260323_172817" (
    "user_id" "uuid",
    "balance" numeric(12,2),
    "currency" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "points" integer,
    "subscription" "text"
);


ALTER TABLE "admin_backups"."app_wallets_reset_20260323_172817" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "admin_backups"."bookings_reset_20260323_172817" (
    "id" "uuid",
    "pnr" "text",
    "user_id" "uuid",
    "status" "text",
    "promo_code" "text",
    "luggage" boolean,
    "points_awarded" boolean,
    "qr_payload" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "client_id" "text",
    "booking_date" "date",
    "final_total" numeric(10,2),
    "earned_points_pending" integer,
    "trip_payload" "jsonb",
    "payment_method" "text",
    "selected_seats" "jsonb",
    "trip_data" "jsonb",
    "trip_instance_id" "uuid",
    "ticket_token" "text",
    "ride" boolean,
    "access" boolean,
    "promo_discount" numeric(12,2)
);


ALTER TABLE "admin_backups"."bookings_reset_20260323_172817" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "admin_backups"."trip_instances_reset_20260323_172817" (
    "id" "uuid",
    "route_template_id" "uuid",
    "route_id" "uuid",
    "trip_code" "text",
    "from_city" "text",
    "to_city" "text",
    "from_station_id" "uuid",
    "to_station_id" "uuid",
    "from_station_name" "text",
    "to_station_name" "text",
    "departure_date" "date",
    "departure_time" time without time zone,
    "arrival_time" time without time zone,
    "duration_hours" numeric(5,2),
    "price" numeric(12,2),
    "company" "text",
    "service_class" "text",
    "rating" numeric(3,2),
    "driver_name" "text",
    "driver_rating" numeric(3,2),
    "driver_trips" integer,
    "driver_img" "text",
    "has_rest_stop" boolean,
    "capacity" integer,
    "available_seats_count" integer,
    "badge" "text",
    "status" "text",
    "inventory_source" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "admin_backups"."trip_instances_reset_20260323_172817" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "admin_backups"."trip_seats_reset_20260323_172817" (
    "id" "uuid",
    "trip_instance_id" "uuid",
    "seat_index" integer,
    "seat_number" "text",
    "status" "text",
    "held_by_user_id" "uuid",
    "hold_expires_at" timestamp with time zone,
    "booking_id" "uuid",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "hold_token" "text"
);


ALTER TABLE "admin_backups"."trip_seats_reset_20260323_172817" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_campaign_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "campaign_id" "uuid",
    "event_name" "text" NOT NULL,
    "event_source" "text" DEFAULT 'app'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_campaign_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_promo_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promo_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "booking_id" "uuid",
    "code" "text" NOT NULL,
    "discount_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'used'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "booking_reference" "text" NOT NULL,
    "promo_code" "text" NOT NULL,
    "booking_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "trip_meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "consumed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "app_promo_redemptions_booking_amount_chk" CHECK (("booking_amount" >= (0)::numeric)),
    CONSTRAINT "app_promo_redemptions_discount_amount_chk" CHECK (("discount_amount" >= (0)::numeric)),
    CONSTRAINT "app_promo_redemptions_status_check" CHECK (("status" = ANY (ARRAY['used'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "app_promo_redemptions_status_chk" CHECK (("status" = ANY (ARRAY['consumed'::"text", 'reversed'::"text"])))
);


ALTER TABLE "public"."app_promo_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_promo_route_rules" (
    "id" bigint NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "from_city" "text" NOT NULL,
    "to_city" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_promo_route_rules" OWNER TO "postgres";


ALTER TABLE "public"."app_promo_route_rules" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."app_promo_route_rules_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."app_referral_claims" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referral_code" "text" NOT NULL,
    "referrer_user_id" "uuid" NOT NULL,
    "referred_user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'applied'::"text" NOT NULL,
    "reward_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "applied_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "qualified_at" timestamp with time zone,
    "rewarded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "app_referral_claims_status_chk" CHECK (("status" = ANY (ARRAY['applied'::"text", 'qualified'::"text", 'rewarded'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."app_referral_claims" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_referral_codes" (
    "user_id" "uuid" NOT NULL,
    "referral_code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_referral_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_wallet_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "description" "text" DEFAULT 'عملية على المحفظة'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_id" "text" NOT NULL,
    "txn_date" "date",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "text" DEFAULT 'debit'::"text" NOT NULL,
    "reference_id" "text",
    "payment_channel" "text",
    CONSTRAINT "app_wallet_transactions_type_check" CHECK (("type" = ANY (ARRAY['credit'::"text", 'debit'::"text"])))
);


ALTER TABLE "public"."app_wallet_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_wallets" (
    "user_id" "uuid" NOT NULL,
    "balance" numeric(12,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'EGP'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "points" integer DEFAULT 0 NOT NULL,
    "subscription" "text" DEFAULT 'none'::"text" NOT NULL,
    CONSTRAINT "app_wallets_subscription_check" CHECK (("subscription" = ANY (ARRAY['none'::"text", 'student'::"text", 'vip'::"text"])))
);


ALTER TABLE "public"."app_wallets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_confirmation_requests" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "idempotency_key" "text" NOT NULL,
    "trip_instance_id" "uuid" NOT NULL,
    "hold_token" "text",
    "booking_ref" "text",
    "request_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "result_payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."booking_confirmation_requests" OWNER TO "postgres";


ALTER TABLE "public"."booking_confirmation_requests" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."booking_confirmation_requests_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."booking_passengers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "passenger_index" integer NOT NULL,
    "seat_number" "text" NOT NULL,
    "fare_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."booking_passengers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pnr" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "promo_code" "text",
    "luggage" boolean DEFAULT false NOT NULL,
    "points_awarded" boolean DEFAULT false NOT NULL,
    "qr_payload" "text" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_id" "text",
    "booking_date" "date",
    "final_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "earned_points_pending" integer DEFAULT 0 NOT NULL,
    "trip_payload" "jsonb" DEFAULT '{}'::"jsonb",
    "payment_method" "text" DEFAULT 'wallet'::"text" NOT NULL,
    "selected_seats" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "trip_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "trip_instance_id" "uuid",
    "ticket_token" "text",
    "ride" boolean DEFAULT false NOT NULL,
    "access" boolean DEFAULT false NOT NULL,
    "promo_discount" numeric(12,2) DEFAULT 0 NOT NULL,
    "promo_campaign_id" "uuid",
    "promo_discount_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "cancelled_at" timestamp with time zone,
    "refund_amount" numeric(12,2),
    "refund_client_action_id" "text",
    CONSTRAINT "bookings_status_check" CHECK (("status" = ANY (ARRAY['upcoming'::"text", 'refund_pending'::"text", 'cancelled'::"text", 'past'::"text"])))
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text",
    "name_ar" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "username" "text",
    "phone" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "address_line1" "text",
    "address_line2" "text",
    "city" "text",
    "emergency_phone" "text",
    "onboarding_completed_at" timestamp with time zone,
    "first_app_open_at" timestamp with time zone,
    "last_offer_popup_at" timestamp with time zone,
    "account_status" "text" DEFAULT 'active'::"text",
    "deleted_at" timestamp with time zone,
    "last_app_open_at" timestamp with time zone,
    "referral_code" "text",
    "referred_by_code" "text",
    "referred_by_user_id" "uuid",
    CONSTRAINT "profiles_account_status_check" CHECK (("account_status" = ANY (ARRAY['active'::"text", 'disabled'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promo_codes" (
    "code" "text" NOT NULL,
    "discount_type" "text" NOT NULL,
    "discount_value" numeric(12,2) NOT NULL,
    "max_discount" numeric(12,2),
    "min_subtotal" numeric(12,2) DEFAULT 0 NOT NULL,
    "first_booking_only" boolean DEFAULT false NOT NULL,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "usage_limit" integer,
    "per_user_limit" integer DEFAULT 1 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "route_from" "text",
    "route_to" "text",
    "eligible_tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "promo_codes_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['flat'::"text", 'percent'::"text"])))
);


ALTER TABLE "public"."promo_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."public_trip_shares" (
    "token" "text" NOT NULL,
    "public_trip_code" "text",
    "share_payload" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."public_trip_shares" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."route_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "route_id" "uuid" NOT NULL,
    "departure_time" time without time zone NOT NULL,
    "company" "text" NOT NULL,
    "service_class" "text" NOT NULL,
    "rating" numeric(3,2) DEFAULT 4.5 NOT NULL,
    "driver_name" "text",
    "driver_rating" numeric(3,2) DEFAULT 4.5 NOT NULL,
    "driver_trips" integer DEFAULT 0 NOT NULL,
    "driver_img" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."route_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."routes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_city_id" "uuid" NOT NULL,
    "to_city_id" "uuid" NOT NULL,
    "from_station_id" "uuid" NOT NULL,
    "to_station_id" "uuid" NOT NULL,
    "base_price" numeric(12,2) NOT NULL,
    "duration_minutes" integer NOT NULL,
    "has_rest_stop" boolean DEFAULT false NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."routes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "city_id" "uuid" NOT NULL,
    "slug" "text",
    "name_ar" "text" NOT NULL,
    "address" "text",
    "lat" numeric,
    "lng" numeric,
    "is_primary" boolean DEFAULT false NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_instances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "route_template_id" "uuid" NOT NULL,
    "route_id" "uuid" NOT NULL,
    "trip_code" "text" NOT NULL,
    "from_city" "text" NOT NULL,
    "to_city" "text" NOT NULL,
    "from_station_id" "uuid",
    "to_station_id" "uuid",
    "from_station_name" "text",
    "to_station_name" "text",
    "departure_date" "date" NOT NULL,
    "departure_time" time without time zone NOT NULL,
    "arrival_time" time without time zone NOT NULL,
    "duration_hours" numeric(5,2) NOT NULL,
    "price" numeric(12,2) NOT NULL,
    "company" "text" NOT NULL,
    "service_class" "text" NOT NULL,
    "rating" numeric(3,2) DEFAULT 4.5 NOT NULL,
    "driver_name" "text",
    "driver_rating" numeric(3,2),
    "driver_trips" integer,
    "driver_img" "text",
    "has_rest_stop" boolean DEFAULT false NOT NULL,
    "capacity" integer DEFAULT 40 NOT NULL,
    "available_seats_count" integer DEFAULT 40 NOT NULL,
    "badge" "text",
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "inventory_source" "text" DEFAULT 'generated_seed'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trip_instances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_seats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_instance_id" "uuid" NOT NULL,
    "seat_index" integer NOT NULL,
    "seat_number" "text" NOT NULL,
    "status" "text" DEFAULT 'available'::"text" NOT NULL,
    "held_by_user_id" "uuid",
    "hold_expires_at" timestamp with time zone,
    "booking_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hold_token" "text"
);


ALTER TABLE "public"."trip_seats" OWNER TO "postgres";


ALTER TABLE ONLY "public"."app_campaign_events"
    ADD CONSTRAINT "app_campaign_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_promo_campaigns"
    ADD CONSTRAINT "app_promo_campaigns_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."app_promo_campaigns"
    ADD CONSTRAINT "app_promo_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_promo_redemptions"
    ADD CONSTRAINT "app_promo_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_promo_route_rules"
    ADD CONSTRAINT "app_promo_route_rules_campaign_id_from_city_to_city_key" UNIQUE ("campaign_id", "from_city", "to_city");



ALTER TABLE ONLY "public"."app_promo_route_rules"
    ADD CONSTRAINT "app_promo_route_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_referral_claims"
    ADD CONSTRAINT "app_referral_claims_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_referral_claims"
    ADD CONSTRAINT "app_referral_claims_referred_user_id_key" UNIQUE ("referred_user_id");



ALTER TABLE ONLY "public"."app_referral_codes"
    ADD CONSTRAINT "app_referral_codes_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."app_referral_codes"
    ADD CONSTRAINT "app_referral_codes_referral_code_key" UNIQUE ("referral_code");



ALTER TABLE ONLY "public"."app_user_notifications"
    ADD CONSTRAINT "app_user_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_wallet_transactions"
    ADD CONSTRAINT "app_wallet_transactions_client_id_key" UNIQUE ("client_id");



ALTER TABLE ONLY "public"."app_wallet_transactions"
    ADD CONSTRAINT "app_wallet_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_wallets"
    ADD CONSTRAINT "app_wallets_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."booking_confirmation_requests"
    ADD CONSTRAINT "booking_confirmation_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_confirmation_requests"
    ADD CONSTRAINT "booking_confirmation_requests_user_key" UNIQUE ("user_id", "idempotency_key");



ALTER TABLE ONLY "public"."booking_passengers"
    ADD CONSTRAINT "booking_passengers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pnr_key" UNIQUE ("pnr");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_name_ar_key" UNIQUE ("name_ar");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."public_trip_shares"
    ADD CONSTRAINT "public_trip_shares_pkey" PRIMARY KEY ("token");



ALTER TABLE ONLY "public"."route_templates"
    ADD CONSTRAINT "route_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."routes"
    ADD CONSTRAINT "routes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stations"
    ADD CONSTRAINT "stations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stations"
    ADD CONSTRAINT "stations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."trip_instances"
    ADD CONSTRAINT "trip_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_instances"
    ADD CONSTRAINT "trip_instances_trip_code_key" UNIQUE ("trip_code");



ALTER TABLE ONLY "public"."trip_seats"
    ADD CONSTRAINT "trip_seats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallet_topup_requests"
    ADD CONSTRAINT "wallet_topup_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallet_topup_requests"
    ADD CONSTRAINT "wallet_topup_requests_public_token_key" UNIQUE ("public_token");



CREATE INDEX "app_campaign_events_campaign_idx" ON "public"."app_campaign_events" USING "btree" ("campaign_id", "event_name", "created_at" DESC);



CREATE INDEX "app_campaign_events_user_idx" ON "public"."app_campaign_events" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "app_promo_campaigns_active_window_idx" ON "public"."app_promo_campaigns" USING "btree" ("is_active", "start_at", "end_at", "popup_priority" DESC);



CREATE UNIQUE INDEX "app_promo_campaigns_code_uidx" ON "public"."app_promo_campaigns" USING "btree" ("code");



CREATE UNIQUE INDEX "app_promo_redemptions_booking_code_uq" ON "public"."app_promo_redemptions" USING "btree" ("booking_id", "code") WHERE ("booking_id" IS NOT NULL);



CREATE UNIQUE INDEX "app_promo_redemptions_campaign_booking_uidx" ON "public"."app_promo_redemptions" USING "btree" ("campaign_id", "booking_reference");



CREATE INDEX "app_promo_redemptions_campaign_user_idx" ON "public"."app_promo_redemptions" USING "btree" ("campaign_id", "user_id", "status");



CREATE INDEX "app_promo_redemptions_promo_idx" ON "public"."app_promo_redemptions" USING "btree" ("promo_id", "status");



CREATE INDEX "app_promo_redemptions_user_created_idx" ON "public"."app_promo_redemptions" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "app_promo_redemptions_user_idx" ON "public"."app_promo_redemptions" USING "btree" ("user_id", "code");



CREATE INDEX "app_promo_route_rules_lookup_idx" ON "public"."app_promo_route_rules" USING "btree" ("campaign_id", "from_city", "to_city");



CREATE UNIQUE INDEX "app_promo_route_rules_unique_idx" ON "public"."app_promo_route_rules" USING "btree" ("campaign_id", "from_city", "to_city");



CREATE INDEX "app_user_notifications_campaign_idx" ON "public"."app_user_notifications" USING "btree" ("campaign_id", "delivered_at" DESC);



CREATE INDEX "app_user_notifications_user_active_idx" ON "public"."app_user_notifications" USING "btree" ("user_id", "dismissed_at", "read_at", "delivered_at" DESC);



CREATE UNIQUE INDEX "app_user_notifications_user_dedupe_uidx" ON "public"."app_user_notifications" USING "btree" ("user_id", "dedupe_key");



CREATE UNIQUE INDEX "app_wallet_transactions_client_id_idx" ON "public"."app_wallet_transactions" USING "btree" ("client_id");



CREATE INDEX "app_wallet_transactions_reference_id_idx" ON "public"."app_wallet_transactions" USING "btree" ("reference_id");



CREATE INDEX "app_wallet_transactions_user_id_created_at_idx" ON "public"."app_wallet_transactions" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "app_wallets_user_id_key" ON "public"."app_wallets" USING "btree" ("user_id");



CREATE INDEX "booking_confirmation_requests_user_created_idx" ON "public"."booking_confirmation_requests" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "booking_passengers_booking_passenger_key" ON "public"."booking_passengers" USING "btree" ("booking_id", "passenger_index");



CREATE UNIQUE INDEX "booking_passengers_booking_seat_key" ON "public"."booking_passengers" USING "btree" ("booking_id", "seat_number");



CREATE UNIQUE INDEX "bookings_client_id_idx" ON "public"."bookings" USING "btree" ("client_id");



CREATE UNIQUE INDEX "bookings_client_id_key" ON "public"."bookings" USING "btree" ("client_id");



CREATE UNIQUE INDEX "bookings_ticket_token_key" ON "public"."bookings" USING "btree" ("ticket_token") WHERE ("ticket_token" IS NOT NULL);



CREATE INDEX "bookings_trip_instance_id_idx" ON "public"."bookings" USING "btree" ("trip_instance_id");



CREATE INDEX "bookings_user_created_idx" ON "public"."bookings" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "public_trip_shares_public_trip_code_idx" ON "public"."public_trip_shares" USING "btree" ("public_trip_code");



CREATE UNIQUE INDEX "route_templates_route_slot_key" ON "public"."route_templates" USING "btree" ("route_id", "departure_time", "company", "service_class");



CREATE UNIQUE INDEX "routes_station_pair_key" ON "public"."routes" USING "btree" ("from_station_id", "to_station_id");



CREATE INDEX "trip_instances_city_date_idx" ON "public"."trip_instances" USING "btree" ("from_city", "to_city", "departure_date", "departure_time");



CREATE UNIQUE INDEX "trip_instances_template_date_key" ON "public"."trip_instances" USING "btree" ("route_template_id", "departure_date");



CREATE UNIQUE INDEX "trip_seats_trip_seat_index_key" ON "public"."trip_seats" USING "btree" ("trip_instance_id", "seat_index");



CREATE UNIQUE INDEX "trip_seats_trip_seat_number_key" ON "public"."trip_seats" USING "btree" ("trip_instance_id", "seat_number");



CREATE INDEX "trip_seats_trip_status_idx" ON "public"."trip_seats" USING "btree" ("trip_instance_id", "status");



CREATE UNIQUE INDEX "wallet_topup_requests_client_id_key" ON "public"."wallet_topup_requests" USING "btree" ("client_id") WHERE ("client_id" IS NOT NULL);



CREATE UNIQUE INDEX "wallet_topup_requests_request_id_key" ON "public"."wallet_topup_requests" USING "btree" ("request_id") WHERE ("request_id" IS NOT NULL);



CREATE INDEX "wallet_topup_requests_user_status_idx" ON "public"."wallet_topup_requests" USING "btree" ("user_id", "status", "created_at" DESC);



CREATE OR REPLACE TRIGGER "trg_app_promo_campaigns_touch_updated_at" BEFORE UPDATE ON "public"."app_promo_campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."taree2y_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_app_referral_claims_touch_updated_at" BEFORE UPDATE ON "public"."app_referral_claims" FOR EACH ROW EXECUTE FUNCTION "public"."taree2y_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_app_referral_codes_touch_updated_at" BEFORE UPDATE ON "public"."app_referral_codes" FOR EACH ROW EXECUTE FUNCTION "public"."taree2y_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_app_user_notifications_touch_updated_at" BEFORE UPDATE ON "public"."app_user_notifications" FOR EACH ROW EXECUTE FUNCTION "public"."taree2y_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_app_wallet_transactions_updated_at" BEFORE UPDATE ON "public"."app_wallet_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_app_wallets_updated_at" BEFORE UPDATE ON "public"."app_wallets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_booking_confirmation_requests_updated_at" BEFORE UPDATE ON "public"."booking_confirmation_requests" FOR EACH ROW EXECUTE FUNCTION "public"."touch_booking_confirmation_requests_updated_at"();



CREATE OR REPLACE TRIGGER "trg_booking_passengers_updated_at" BEFORE UPDATE ON "public"."booking_passengers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_bookings_updated_at" BEFORE UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cities_updated_at" BEFORE UPDATE ON "public"."cities" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_fill_wallet_transaction_client_id" BEFORE INSERT ON "public"."app_wallet_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."fill_wallet_transaction_client_id"();



CREATE OR REPLACE TRIGGER "trg_profiles_timestamps" BEFORE INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_profiles_timestamps"();



CREATE OR REPLACE TRIGGER "trg_route_templates_updated_at" BEFORE UPDATE ON "public"."route_templates" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_routes_updated_at" BEFORE UPDATE ON "public"."routes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_stations_updated_at" BEFORE UPDATE ON "public"."stations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_touch_app_promo_updated_at" BEFORE UPDATE ON "public"."app_promo_campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."touch_app_promo_updated_at"();



CREATE OR REPLACE TRIGGER "trg_trip_instances_updated_at" BEFORE UPDATE ON "public"."trip_instances" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_trip_seats_updated_at" BEFORE UPDATE ON "public"."trip_seats" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_wallet_topup_requests_updated_at" BEFORE UPDATE ON "public"."wallet_topup_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_row_updated_at"();



CREATE OR REPLACE TRIGGER "trg_wallet_tx_description" BEFORE INSERT OR UPDATE ON "public"."app_wallet_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_wallet_tx_description"();



ALTER TABLE ONLY "public"."app_campaign_events"
    ADD CONSTRAINT "app_campaign_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."app_promo_campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."app_campaign_events"
    ADD CONSTRAINT "app_campaign_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."app_promo_redemptions"
    ADD CONSTRAINT "app_promo_redemptions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."app_promo_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_promo_redemptions"
    ADD CONSTRAINT "app_promo_redemptions_promo_id_fkey" FOREIGN KEY ("promo_id") REFERENCES "public"."app_promo_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_promo_redemptions"
    ADD CONSTRAINT "app_promo_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_promo_route_rules"
    ADD CONSTRAINT "app_promo_route_rules_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."app_promo_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_referral_claims"
    ADD CONSTRAINT "app_referral_claims_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_referral_claims"
    ADD CONSTRAINT "app_referral_claims_referrer_user_id_fkey" FOREIGN KEY ("referrer_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_referral_codes"
    ADD CONSTRAINT "app_referral_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_user_notifications"
    ADD CONSTRAINT "app_user_notifications_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."app_promo_campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."app_user_notifications"
    ADD CONSTRAINT "app_user_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_wallet_transactions"
    ADD CONSTRAINT "app_wallet_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_wallets"
    ADD CONSTRAINT "app_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."booking_passengers"
    ADD CONSTRAINT "booking_passengers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_trip_instance_id_fkey" FOREIGN KEY ("trip_instance_id") REFERENCES "public"."trip_instances"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."route_templates"
    ADD CONSTRAINT "route_templates_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."routes"
    ADD CONSTRAINT "routes_from_city_id_fkey" FOREIGN KEY ("from_city_id") REFERENCES "public"."cities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."routes"
    ADD CONSTRAINT "routes_from_station_id_fkey" FOREIGN KEY ("from_station_id") REFERENCES "public"."stations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."routes"
    ADD CONSTRAINT "routes_to_city_id_fkey" FOREIGN KEY ("to_city_id") REFERENCES "public"."cities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."routes"
    ADD CONSTRAINT "routes_to_station_id_fkey" FOREIGN KEY ("to_station_id") REFERENCES "public"."stations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stations"
    ADD CONSTRAINT "stations_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_instances"
    ADD CONSTRAINT "trip_instances_from_station_id_fkey" FOREIGN KEY ("from_station_id") REFERENCES "public"."stations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."trip_instances"
    ADD CONSTRAINT "trip_instances_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_instances"
    ADD CONSTRAINT "trip_instances_route_template_id_fkey" FOREIGN KEY ("route_template_id") REFERENCES "public"."route_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_instances"
    ADD CONSTRAINT "trip_instances_to_station_id_fkey" FOREIGN KEY ("to_station_id") REFERENCES "public"."stations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."trip_seats"
    ADD CONSTRAINT "trip_seats_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trip_seats"
    ADD CONSTRAINT "trip_seats_trip_instance_id_fkey" FOREIGN KEY ("trip_instance_id") REFERENCES "public"."trip_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallet_topup_requests"
    ADD CONSTRAINT "wallet_topup_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."app_campaign_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_campaign_events_select_own" ON "public"."app_campaign_events" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



ALTER TABLE "public"."app_promo_campaigns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_promo_campaigns_no_direct_access" ON "public"."app_promo_campaigns" TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."app_promo_redemptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_promo_redemptions_select_own" ON "public"."app_promo_redemptions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."app_promo_route_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_promo_route_rules_no_direct_access" ON "public"."app_promo_route_rules" TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."app_referral_claims" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_referral_claims_select_own" ON "public"."app_referral_claims" FOR SELECT USING ((("auth"."uid"() = "referred_user_id") OR ("auth"."uid"() = "referrer_user_id")));



ALTER TABLE "public"."app_referral_codes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_referral_codes_select_own" ON "public"."app_referral_codes" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."app_user_notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_user_notifications_select_own" ON "public"."app_user_notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."app_wallet_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_wallets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."booking_confirmation_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "booking_confirmation_requests_owner_read" ON "public"."booking_confirmation_requests" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."booking_passengers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "booking_passengers_select_own" ON "public"."booking_passengers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."bookings" "b"
  WHERE (("b"."id" = "booking_passengers"."booking_id") AND ("b"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bookings_insert_own" ON "public"."bookings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "bookings_select_own" ON "public"."bookings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "bookings_update_own" ON "public"."bookings" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."cities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cities_read_authenticated" ON "public"."cities" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "promo codes public read" ON "public"."promo_codes" FOR SELECT USING (true);



ALTER TABLE "public"."promo_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."route_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "route_templates_read_authenticated" ON "public"."route_templates" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."routes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "routes_read_authenticated" ON "public"."routes" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."stations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stations_read_authenticated" ON "public"."stations" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."trip_instances" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trip_instances_read_authenticated" ON "public"."trip_instances" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."trip_seats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trip_seats_read_authenticated" ON "public"."trip_seats" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "users can insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "users can read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."wallet_topup_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wallet_topup_requests_owner_insert" ON "public"."wallet_topup_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "wallet_topup_requests_owner_select" ON "public"."wallet_topup_requests" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "wallet_topup_requests_select_own" ON "public"."wallet_topup_requests" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "wallet_tx_insert_own" ON "public"."app_wallet_transactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "wallet_tx_select_own" ON "public"."app_wallet_transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "wallet_tx_update_own" ON "public"."app_wallet_transactions" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "wallets_insert_own" ON "public"."app_wallets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "wallets_select_own" ON "public"."app_wallets" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "wallets_update_own" ON "public"."app_wallets" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "app_private"."consume_app_promo"("p_user_id" "uuid", "p_code" "text", "p_booking_amount" numeric, "p_trip_meta" "jsonb", "p_booking_reference" "text") FROM PUBLIC;

























































































































































GRANT ALL ON FUNCTION "public"."apply_referral_code"("p_user_id" "uuid", "p_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_referral_code"("p_user_id" "uuid", "p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_referral_code"("p_user_id" "uuid", "p_code" "text") TO "service_role";



GRANT ALL ON TABLE "public"."app_promo_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."app_promo_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."app_promo_campaigns" TO "service_role";



GRANT ALL ON FUNCTION "public"."campaign_matches_user"("p_campaign" "public"."app_promo_campaigns", "p_user_id" "uuid", "p_context" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."campaign_matches_user"("p_campaign" "public"."app_promo_campaigns", "p_user_id" "uuid", "p_context" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."campaign_matches_user"("p_campaign" "public"."app_promo_campaigns", "p_user_id" "uuid", "p_context" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_booking_atomic"("p_booking_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_booking_atomic"("p_booking_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_booking_atomic"("p_booking_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_booking_atomic"("p_booking_id" "text", "p_client_action_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_booking_atomic"("p_booking_id" "text", "p_client_action_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_booking_atomic"("p_booking_id" "text", "p_client_action_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_wallet_topup_request"("p_request_id" "uuid", "p_public_token" "text", "p_amount" integer, "p_payer_label" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_wallet_topup_request"("p_request_id" "uuid", "p_public_token" "text", "p_amount" integer, "p_payer_label" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_wallet_topup_request"("p_request_id" "uuid", "p_public_token" "text", "p_amount" integer, "p_payer_label" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."confirm_booking_authoritative"("p_trip_instance_id" "uuid", "p_seat_numbers" "text"[], "p_passengers" integer, "p_promo_code" "text", "p_has_luggage" boolean, "p_ride_to_station" boolean, "p_needs_access" boolean, "p_hold_token" "text", "p_idempotency_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."confirm_booking_authoritative"("p_trip_instance_id" "uuid", "p_seat_numbers" "text"[], "p_passengers" integer, "p_promo_code" "text", "p_has_luggage" boolean, "p_ride_to_station" boolean, "p_needs_access" boolean, "p_hold_token" "text", "p_idempotency_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_booking_authoritative"("p_trip_instance_id" "uuid", "p_seat_numbers" "text"[], "p_passengers" integer, "p_promo_code" "text", "p_has_luggage" boolean, "p_ride_to_station" boolean, "p_needs_access" boolean, "p_hold_token" "text", "p_idempotency_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."consume_app_promo_code"("p_user_id" "uuid", "p_code" "text", "p_booking_id" "uuid", "p_discount_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."consume_app_promo_code"("p_user_id" "uuid", "p_code" "text", "p_booking_id" "uuid", "p_discount_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."consume_app_promo_code"("p_user_id" "uuid", "p_code" "text", "p_booking_id" "uuid", "p_discount_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_booking_atomic"("p_trip_instance_id" "uuid", "p_seat_numbers" "text"[], "p_passengers" integer, "p_promo_code" "text", "p_has_luggage" boolean, "p_ride_to_station" boolean, "p_needs_access" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."create_booking_atomic"("p_trip_instance_id" "uuid", "p_seat_numbers" "text"[], "p_passengers" integer, "p_promo_code" "text", "p_has_luggage" boolean, "p_ride_to_station" boolean, "p_needs_access" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_booking_atomic"("p_trip_instance_id" "uuid", "p_seat_numbers" "text"[], "p_passengers" integer, "p_promo_code" "text", "p_has_luggage" boolean, "p_ride_to_station" boolean, "p_needs_access" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_public_trip_share"("p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_public_trip_share"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_public_trip_share"("p_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_wallet_topup_request"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_wallet_topup_request"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_wallet_topup_request"() TO "service_role";



GRANT ALL ON TABLE "public"."app_user_notifications" TO "anon";
GRANT ALL ON TABLE "public"."app_user_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."app_user_notifications" TO "service_role";



GRANT ALL ON FUNCTION "public"."deliver_user_notification"("p_user_id" "uuid", "p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."deliver_user_notification"("p_user_id" "uuid", "p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."deliver_user_notification"("p_user_id" "uuid", "p_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."deliver_user_notification_internal"("p_user_id" "uuid", "p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."deliver_user_notification_internal"("p_user_id" "uuid", "p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."deliver_user_notification_internal"("p_user_id" "uuid", "p_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."dismiss_user_notifications"("p_user_id" "uuid", "p_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."dismiss_user_notifications"("p_user_id" "uuid", "p_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dismiss_user_notifications"("p_user_id" "uuid", "p_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_app_wallet"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_app_wallet"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_app_wallet"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_referral_code"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_referral_code"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_referral_code"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_wallet_tx_description"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_wallet_tx_description"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_wallet_tx_description"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fill_wallet_transaction_client_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."fill_wallet_transaction_client_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fill_wallet_transaction_client_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_seat_label"("p_index" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_seat_label"("p_index" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_seat_label"("p_index" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_promo_popup_offer"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_promo_popup_offer"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_promo_popup_offer"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_trip_share"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_trip_share"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_trip_share"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_referral_summary"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_referral_summary"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_referral_summary"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_targeted_promo_offer"("p_user_id" "uuid", "p_context" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."get_targeted_promo_offer"("p_user_id" "uuid", "p_context" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_targeted_promo_offer"("p_user_id" "uuid", "p_context" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_trip_seats"("p_trip_instance_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_trip_seats"("p_trip_instance_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_trip_seats"("p_trip_instance_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_trip_seats"("p_trip_instance_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_wallet_topup_request_public"("p_request_id" "uuid", "p_public_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_wallet_topup_request_public"("p_request_id" "uuid", "p_public_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_wallet_topup_request_public"("p_request_id" "uuid", "p_public_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_profiles_timestamps"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_profiles_timestamps"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_profiles_timestamps"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hold_trip_seats"("p_trip_instance_id" "uuid", "p_seat_numbers" "text"[], "p_hold_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."hold_trip_seats"("p_trip_instance_id" "uuid", "p_seat_numbers" "text"[], "p_hold_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hold_trip_seats"("p_trip_instance_id" "uuid", "p_seat_numbers" "text"[], "p_hold_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."hours_until_trip_departure"("p_departure_date" "date", "p_departure_time" time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."hours_until_trip_departure"("p_departure_date" "date", "p_departure_time" time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hours_until_trip_departure"("p_departure_date" "date", "p_departure_time" time without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."list_user_notifications"("p_user_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."list_user_notifications"("p_user_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_user_notifications"("p_user_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_user_notifications_read"("p_user_id" "uuid", "p_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."mark_user_notifications_read"("p_user_id" "uuid", "p_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_user_notifications_read"("p_user_id" "uuid", "p_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."preview_app_promo"("p_user_id" "uuid", "p_code" "text", "p_booking_amount" numeric, "p_trip_meta" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."preview_app_promo"("p_user_id" "uuid", "p_code" "text", "p_booking_amount" numeric, "p_trip_meta" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."preview_app_promo"("p_user_id" "uuid", "p_code" "text", "p_booking_amount" numeric, "p_trip_meta" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."preview_booking_cancellation"("p_booking_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."preview_booking_cancellation"("p_booking_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."preview_booking_cancellation"("p_booking_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."preview_booking_cancellation_atomic"("p_booking_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."preview_booking_cancellation_atomic"("p_booking_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."preview_booking_cancellation_atomic"("p_booking_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."public_topup_wallet"("p_user_id" "uuid", "p_amount" numeric, "p_request_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."public_topup_wallet"("p_user_id" "uuid", "p_amount" numeric, "p_request_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."public_topup_wallet"("p_user_id" "uuid", "p_amount" numeric, "p_request_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."public_topup_wallet"("p_user_id" "uuid", "p_amount" numeric, "p_request_id" "text", "p_payment_channel" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."public_topup_wallet"("p_user_id" "uuid", "p_amount" numeric, "p_request_id" "text", "p_payment_channel" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."public_topup_wallet"("p_user_id" "uuid", "p_amount" numeric, "p_request_id" "text", "p_payment_channel" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."public_topup_wallet"("p_user_id" "uuid", "p_amount" numeric, "p_request_id" "text", "p_payment_channel" "text", "p_client_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."public_topup_wallet"("p_user_id" "uuid", "p_amount" numeric, "p_request_id" "text", "p_payment_channel" "text", "p_client_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."public_topup_wallet"("p_user_id" "uuid", "p_amount" numeric, "p_request_id" "text", "p_payment_channel" "text", "p_client_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_trip_available_seats"("p_trip_instance_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_trip_available_seats"("p_trip_instance_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_trip_available_seats"("p_trip_instance_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_campaign_event"("p_user_id" "uuid", "p_campaign_id" "uuid", "p_event_name" "text", "p_event_source" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."record_campaign_event"("p_user_id" "uuid", "p_campaign_id" "uuid", "p_event_name" "text", "p_event_source" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_campaign_event"("p_user_id" "uuid", "p_campaign_id" "uuid", "p_event_name" "text", "p_event_source" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."release_expired_seat_holds"("p_trip_instance_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."release_expired_seat_holds"("p_trip_instance_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_expired_seat_holds"("p_trip_instance_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."release_my_seat_hold"("p_trip_instance_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."release_my_seat_hold"("p_trip_instance_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_my_seat_hold"("p_trip_instance_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_key_to_uuid"("p_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."request_key_to_uuid"("p_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_key_to_uuid"("p_value" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."request_self_account_deletion"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."request_self_account_deletion"() TO "anon";
GRANT ALL ON FUNCTION "public"."request_self_account_deletion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_self_account_deletion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."require_same_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."require_same_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."require_same_user"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_reference_travel_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."seed_reference_travel_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_reference_travel_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_trip_inventory_for_search"("p_from_city" "text", "p_to_city" "text", "p_departure_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_trip_inventory_for_search"("p_from_city" "text", "p_to_city" "text", "p_departure_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_trip_inventory_for_search"("p_from_city" "text", "p_to_city" "text", "p_departure_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_row_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_row_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_row_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_referral_rewards"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_referral_rewards"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_referral_rewards"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_engagement"("p_user_id" "uuid", "p_context" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_engagement"("p_user_id" "uuid", "p_context" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_engagement"("p_user_id" "uuid", "p_context" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."taree2y_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."taree2y_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."taree2y_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_app_promo_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_app_promo_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_app_promo_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_booking_confirmation_requests_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_booking_confirmation_requests_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_booking_confirmation_requests_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_booking_snapshot"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_booking_snapshot"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_booking_snapshot"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_wallet_balance"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_wallet_balance"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_wallet_balance"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_app_promo_code"("p_user_id" "uuid", "p_code" "text", "p_booking_amount" numeric, "p_trip_meta" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_app_promo_code"("p_user_id" "uuid", "p_code" "text", "p_booking_amount" numeric, "p_trip_meta" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_app_promo_code"("p_user_id" "uuid", "p_code" "text", "p_booking_amount" numeric, "p_trip_meta" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."wallet_topup_request_confirm"("p_request_id" "text", "p_client_id" "text", "p_payment_channel" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."wallet_topup_request_confirm"("p_request_id" "text", "p_client_id" "text", "p_payment_channel" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wallet_topup_request_confirm"("p_request_id" "text", "p_client_id" "text", "p_payment_channel" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."wallet_topup_request_confirm_public"("p_request_id" "text", "p_client_id" "text", "p_payment_channel" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."wallet_topup_request_confirm_public"("p_request_id" "text", "p_client_id" "text", "p_payment_channel" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wallet_topup_request_confirm_public"("p_request_id" "text", "p_client_id" "text", "p_payment_channel" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."wallet_topup_request_create_or_get"("p_user_id" "uuid", "p_request_id" "text", "p_gross_amount" numeric, "p_fee_amount" numeric, "p_net_amount" numeric, "p_payment_channel" "text", "p_client_id" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."wallet_topup_request_create_or_get"("p_user_id" "uuid", "p_request_id" "text", "p_gross_amount" numeric, "p_fee_amount" numeric, "p_net_amount" numeric, "p_payment_channel" "text", "p_client_id" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wallet_topup_request_create_or_get"("p_user_id" "uuid", "p_request_id" "text", "p_gross_amount" numeric, "p_fee_amount" numeric, "p_net_amount" numeric, "p_payment_channel" "text", "p_client_id" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."wallet_topup_request_create_or_get_public"("p_user_id" "uuid", "p_request_id" "text", "p_gross_amount" numeric, "p_fee_amount" numeric, "p_net_amount" numeric, "p_payment_channel" "text", "p_client_id" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."wallet_topup_request_create_or_get_public"("p_user_id" "uuid", "p_request_id" "text", "p_gross_amount" numeric, "p_fee_amount" numeric, "p_net_amount" numeric, "p_payment_channel" "text", "p_client_id" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wallet_topup_request_create_or_get_public"("p_user_id" "uuid", "p_request_id" "text", "p_gross_amount" numeric, "p_fee_amount" numeric, "p_net_amount" numeric, "p_payment_channel" "text", "p_client_id" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."wallet_topup_requests" TO "anon";
GRANT ALL ON TABLE "public"."wallet_topup_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_topup_requests" TO "service_role";



GRANT ALL ON FUNCTION "public"."wallet_topup_request_payload"("p_req" "public"."wallet_topup_requests") TO "anon";
GRANT ALL ON FUNCTION "public"."wallet_topup_request_payload"("p_req" "public"."wallet_topup_requests") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wallet_topup_request_payload"("p_req" "public"."wallet_topup_requests") TO "service_role";



GRANT ALL ON FUNCTION "public"."wallet_topup_request_status"("p_request_id" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."wallet_topup_request_status"("p_request_id" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wallet_topup_request_status"("p_request_id" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."wallet_topup_request_status_public"("p_request_id" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."wallet_topup_request_status_public"("p_request_id" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wallet_topup_request_status_public"("p_request_id" "text", "p_user_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."app_campaign_events" TO "anon";
GRANT ALL ON TABLE "public"."app_campaign_events" TO "authenticated";
GRANT ALL ON TABLE "public"."app_campaign_events" TO "service_role";



GRANT ALL ON TABLE "public"."app_promo_redemptions" TO "anon";
GRANT ALL ON TABLE "public"."app_promo_redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."app_promo_redemptions" TO "service_role";



GRANT ALL ON TABLE "public"."app_promo_route_rules" TO "anon";
GRANT ALL ON TABLE "public"."app_promo_route_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."app_promo_route_rules" TO "service_role";



GRANT ALL ON SEQUENCE "public"."app_promo_route_rules_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."app_promo_route_rules_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."app_promo_route_rules_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."app_referral_claims" TO "anon";
GRANT ALL ON TABLE "public"."app_referral_claims" TO "authenticated";
GRANT ALL ON TABLE "public"."app_referral_claims" TO "service_role";



GRANT ALL ON TABLE "public"."app_referral_codes" TO "anon";
GRANT ALL ON TABLE "public"."app_referral_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."app_referral_codes" TO "service_role";



GRANT ALL ON TABLE "public"."app_wallet_transactions" TO "anon";
GRANT ALL ON TABLE "public"."app_wallet_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."app_wallet_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."app_wallets" TO "anon";
GRANT ALL ON TABLE "public"."app_wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."app_wallets" TO "service_role";



GRANT ALL ON TABLE "public"."booking_confirmation_requests" TO "anon";
GRANT ALL ON TABLE "public"."booking_confirmation_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_confirmation_requests" TO "service_role";



GRANT ALL ON SEQUENCE "public"."booking_confirmation_requests_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."booking_confirmation_requests_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."booking_confirmation_requests_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."booking_passengers" TO "anon";
GRANT ALL ON TABLE "public"."booking_passengers" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_passengers" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."cities" TO "anon";
GRANT ALL ON TABLE "public"."cities" TO "authenticated";
GRANT ALL ON TABLE "public"."cities" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."promo_codes" TO "anon";
GRANT ALL ON TABLE "public"."promo_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."promo_codes" TO "service_role";



GRANT ALL ON TABLE "public"."public_trip_shares" TO "anon";
GRANT ALL ON TABLE "public"."public_trip_shares" TO "authenticated";
GRANT ALL ON TABLE "public"."public_trip_shares" TO "service_role";



GRANT ALL ON TABLE "public"."route_templates" TO "anon";
GRANT ALL ON TABLE "public"."route_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."route_templates" TO "service_role";



GRANT ALL ON TABLE "public"."routes" TO "anon";
GRANT ALL ON TABLE "public"."routes" TO "authenticated";
GRANT ALL ON TABLE "public"."routes" TO "service_role";



GRANT ALL ON TABLE "public"."stations" TO "anon";
GRANT ALL ON TABLE "public"."stations" TO "authenticated";
GRANT ALL ON TABLE "public"."stations" TO "service_role";



GRANT ALL ON TABLE "public"."trip_instances" TO "anon";
GRANT ALL ON TABLE "public"."trip_instances" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_instances" TO "service_role";



GRANT ALL ON TABLE "public"."trip_seats" TO "anon";
GRANT ALL ON TABLE "public"."trip_seats" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_seats" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































