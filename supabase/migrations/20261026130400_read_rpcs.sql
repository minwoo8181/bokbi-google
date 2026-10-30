-- 복비 Supabase A2-3 ⑤ 읽기 함수 + 열람 함수 보강 (저장소 Supabase 구현에 필요한 것만)
-- ① submit_request: 의뢰 id를 서버가 미리 정해 넘김 → 연락처 암호문의 AAD("의뢰 id:칸")에 같은 id를 쓴다 (다른 의뢰로 옮겨 붙이기 방지)
-- ② reveal_contact: 집주인 전화도 돌려줌 — 전화는 로그인 계정(auth) 한 곳에만 있음 (설계 §0-3)
-- ③ audit은 Data API에 노출하지 않으므로 읽기 함수: 처리 기록(관리자만), 열람 기록(관리자 전부 / 그 밖엔 본인 것)

create or replace function public.submit_request(p_request jsonb, p_contacts jsonb, p_terms_version text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  rid uuid := coalesce((p_request ->> 'id')::uuid, gen_random_uuid());
  k text;
begin
  if uid is null then raise exception 'NOT_ALLOWED'; end if;
  insert into public.requests (id, owner_id, apt_id, complex_name, trade_type, pyeong_label, floor_label, masked_dong_ho,
    asking_price_manwon, commission_won, legal_max_won, occupancy, details, recommendation, showing)
  values (rid, uid, p_request ->> 'aptId', p_request ->> 'complexName', p_request ->> 'tradeType', p_request ->> 'pyeongLabel',
    p_request ->> 'floorLabel', p_request ->> 'maskedDongHo', (p_request ->> 'askingPriceManwon')::integer,
    (p_request ->> 'commissionWon')::bigint, (p_request ->> 'legalMaxWon')::bigint, p_request ->> 'occupancy',
    p_request -> 'details', p_request -> 'recommendation', coalesce(p_request -> 'showing', '{"weekly": {}, "blocked": []}'));
  -- 암호문은 서버가 base64로 넘김 (원문은 DB에 오지 않음)
  insert into pii.request_contacts (request_id, dong_ho_enc, owner_name_enc, tenant_phone_enc, memo_enc, key_version)
  values (rid, decode(p_contacts ->> 'dongHo', 'base64'), decode(p_contacts ->> 'ownerName', 'base64'),
    decode(p_contacts ->> 'tenantPhone', 'base64'), decode(p_contacts ->> 'memo', 'base64'),
    coalesce((p_contacts ->> 'keyVersion')::smallint, 1));
  foreach k in array array['TERMS', 'COLLECT', 'PROVIDE'] loop
    insert into public.consents (user_id, consent_key, context, request_id, terms_version) values (uid, k, 'OWNER_REQUEST', rid, p_terms_version);
  end loop;
  return rid;
end $$;

drop function public.reveal_contact(uuid, text, text);
create function public.reveal_contact(p_request uuid, p_purpose text, p_admin_reason text default null)
returns table (dong_ho_enc bytea, owner_name_enc bytea, tenant_phone_enc bytea, memo_enc bytea, key_version smallint, owner_phone text)
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  v_role text;
begin
  if not exists (select 1 from public.requests r where r.id = p_request) then raise exception 'NO_REQUEST'; end if;
  if p_purpose = 'OWNER_VIEW' and (select private.owns_request(p_request)) then v_role := 'owner';
  elsif p_purpose = 'MATCHED_BROKER' and (select private.is_matched_broker(p_request)) then v_role := 'broker';
  elsif p_purpose = 'ADMIN_REVIEW' and (select private.is_admin()) then
    if coalesce(trim(p_admin_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;
    v_role := 'admin';
  else
    raise exception 'NOT_ALLOWED';
  end if;
  insert into audit.access_log (actor_id, actor_role, request_id, purpose, reason)
  values (uid, v_role, p_request, p_purpose, case when v_role = 'admin' then p_admin_reason end);
  return query
  select c.dong_ho_enc, c.owner_name_enc, c.tenant_phone_enc, c.memo_enc, c.key_version, u.phone::text
    from pii.request_contacts c
    join public.requests r on r.id = c.request_id
    left join auth.users u on u.id = r.owner_id
   where c.request_id = p_request;
end $$;

/** 열람 기록: 관리자는 전부, 그 밖엔 내가 연 것만 */
create or replace function public.access_log_list()
returns table (at timestamptz, request_id uuid, purpose text, reason text, actor_role text)
language sql stable security definer set search_path = '' as $$
  select a.at, a.request_id, a.purpose, a.reason, a.actor_role
    from audit.access_log a
   where (select private.is_admin()) or a.actor_id = (select auth.uid())
   order by a.at;
$$;

/** 관리자 처리 기록 (관리자만) */
create or replace function public.admin_actions_list()
returns table (id uuid, at timestamptz, target text, request_id uuid, offer_id uuid, office_id uuid, result text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select private.is_admin()) then raise exception 'NOT_ALLOWED'; end if;
  return query select a.id, a.at, a.target, a.request_id, a.offer_id, a.office_id, a.result from audit.admin_actions a order by a.at;
end $$;

revoke execute on function public.reveal_contact(uuid, text, text), public.access_log_list(), public.admin_actions_list() from public, anon;
grant execute on function public.reveal_contact(uuid, text, text), public.access_log_list(), public.admin_actions_list() to authenticated;
