-- 복비 Supabase 2단계 ③ RPC (돈·여러 테이블이 같이 바뀌는 일만 한 트랜잭션으로)
-- 규칙 판단(기한 지난 일 먼저·광고 전 소유자 확인·보호 기간 등)은 서버 TS에 그대로 두고,
-- DB는 누가 할 수 있는지 + 크레딧 + 한 번만 같은 중복만 강제한다.
-- 실패는 raise exception '<앱 오류 코드>' (메시지 = src/lib/data/repo.ts 의 Result 오류 이름) — approve_broker만 실패 횟수를 남기려고 코드를 반환.
-- 모두 security definer + search_path '' + 로그인 사용자만 실행 (맨 아래 권한).

-- ── 내부 도우미 ───────────────────────────────────────────────

/** 앞으로 잡힌 방문 자동 취소 (offer_ids가 null이면 의뢰 전체) */
create or replace function private.cancel_upcoming_visits(rid uuid, offer_ids uuid[], why text) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.visits v
     set canceled_at = now(), canceled_by = 'SYSTEM', cancel_reason = why, acked_by = '{}'
   where v.request_id = rid and v.canceled_at is null
     and v.visit_date >= private.kst_date(now())
     and (offer_ids is null or v.offer_id = any (offer_ids));
  get diagnostics n = row_count;
  return n;
end $$;

/** 의뢰·거래가 끝남: 연락처는 30일 뒤 파기 예약, 세입자 전화는 즉시 삭제 (대표님 확정 2026-10-26) */
create or replace function private.on_request_closed(rid uuid) returns void
language sql security definer set search_path = '' as $$
  update pii.request_contacts c
     set tenant_phone_enc = null, purge_after = coalesce(c.purge_after, now() + interval '30 days')
   where c.request_id = rid;
$$;

/** 이번 주 월요일 (한국 날짜) */
create or replace function private.kst_week(t timestamptz) returns date
language sql immutable set search_path = '' as $$
  select (private.kst_date(t) - ((extract(isodow from private.kst_date(t))::integer - 1)))::date;
$$;

-- ── 집주인: 의뢰 보내기 (의뢰 + 암호문 연락처 + 동의 3개) ───────────

create or replace function public.submit_request(p_request jsonb, p_contacts jsonb, p_terms_version text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  rid uuid;
  k text;
begin
  if uid is null then raise exception 'NOT_ALLOWED'; end if;
  insert into public.requests (owner_id, apt_id, complex_name, trade_type, pyeong_label, floor_label, masked_dong_ho,
    asking_price_manwon, commission_won, legal_max_won, occupancy, details, recommendation, showing)
  values (uid, p_request ->> 'aptId', p_request ->> 'complexName', p_request ->> 'tradeType', p_request ->> 'pyeongLabel',
    p_request ->> 'floorLabel', p_request ->> 'maskedDongHo', (p_request ->> 'askingPriceManwon')::integer,
    (p_request ->> 'commissionWon')::bigint, (p_request ->> 'legalMaxWon')::bigint, p_request ->> 'occupancy',
    p_request -> 'details', p_request -> 'recommendation', coalesce(p_request -> 'showing', '{"weekly": {}, "blocked": []}'))
  returning id into rid;
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

-- ── 중개사: 요청 보내기 = 막힘 검사 + 카드 + 크레딧 1개 ──────────────

create or replace function public.send_request(p_request uuid, p_strengths text[])
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_office uuid;
  v_req public.requests;
  v_balance integer;
  v_order integer;
  v_offer uuid;
begin
  -- 사무소 행 잠금: 같은 중개사가 동시에 눌러도 크레딧이 한 번씩만 빠짐 (하루 제한은 없음, 대표님 2026-10-29)
  select b.id into v_office from public.broker_offices b
   where b.user_id = (select auth.uid()) and b.status = 'APPROVED' for update;
  if v_office is null then raise exception 'NOT_APPROVED'; end if;
  select * into v_req from public.requests r where r.id = p_request for update;
  if not found then raise exception 'NO_REQUEST'; end if;
  -- 검사 순서는 lib/broker/feed.ts sendBlock 과 같음 (TODO_FIRST는 서버 TS가 먼저 확인)
  if exists (select 1 from public.offers o where o.request_id = p_request and o.office_id = v_office) then raise exception 'ALREADY_SENT'; end if;
  if v_req.stage <> 'RECEIVING' or v_req.receiving_until <= now() then raise exception 'CLOSED'; end if;
  select coalesce(sum(c.amount), 0) into v_balance from public.credit_ledger c where c.office_id = v_office;
  if v_balance < 1 then raise exception 'NO_CREDIT'; end if;
  select coalesce(max(o.card_order), 0) + 1 into v_order from public.offers o where o.request_id = p_request;
  insert into public.offers (request_id, office_id, card_order, strengths) values (p_request, v_office, v_order, coalesce(p_strengths, '{}'))
  returning id into v_offer;
  insert into public.credit_ledger (office_id, kind, amount, request_id) values (v_office, 'SPEND', -1, p_request);
  return v_offer;
end $$;

-- ── 집주인: 매칭 확정 (최대 3곳) ──────────────────────────────────

create or replace function public.confirm_match(p_request uuid, p_offer_ids uuid[])
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_req public.requests;
  n integer := coalesce(cardinality(array(select distinct unnest(p_offer_ids))), 0);
begin
  select * into v_req from public.requests r where r.id = p_request and r.owner_id = (select auth.uid()) for update;
  if not found then raise exception 'NO_REQUEST'; end if;
  if n = 0 then raise exception 'EMPTY'; end if;
  if n > 3 then raise exception 'TOO_MANY'; end if;   -- MAX_MATCH
  if v_req.stage <> 'RECEIVING' or v_req.receiving_until <= now() then raise exception 'CLOSED'; end if;
  if (select count(*) from public.offers o where o.request_id = p_request and o.id = any (p_offer_ids)) <> n then raise exception 'NO_OFFER'; end if;
  update public.offers o set matched_at = now() where o.request_id = p_request and o.id = any (p_offer_ids);
  update public.requests r set stage = 'IN_PROGRESS', matched_at = now(), ad_window_started_at = now() where r.id = p_request;
end $$;

-- ── 집주인: 한 곳 해제 (남은 곳이 없으면 의뢰 종료 — lib/requests/stage.ts releaseOffer) ──

create or replace function public.release_offer(p_request uuid, p_offer uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.requests r where r.id = p_request and r.owner_id = (select auth.uid()) for update;
  if not found then raise exception 'NO_REQUEST'; end if;
  update public.offers o set released_at = now()
   where o.id = p_offer and o.request_id = p_request and o.matched_at is not null and o.released_at is null;
  if not found then raise exception 'NO_OFFER'; end if;
  if not exists (select 1 from public.offers o where o.request_id = p_request and o.matched_at is not null and o.released_at is null) then
    update public.requests r set stage = 'ENDED', ended_reason = 'RELEASED', ended_at = now() where r.id = p_request and r.stage <> 'ENDED';
    perform private.on_request_closed(p_request);
  end if;
end $$;

-- ── 집주인: 잠시 멈춤·다시 시작·거둬들이기·다른 곳에서 팔았어요·취소 (lib/deal/deal.ts pauseByOwner·resumeByOwner·endByOwner) ──

create or replace function public.owner_sale_change(p_request uuid, p_action text, p_reason text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_req public.requests;
  v_matched uuid[];
begin
  select * into v_req from public.requests r where r.id = p_request and r.owner_id = (select auth.uid()) for update;
  if not found then raise exception 'NO_REQUEST'; end if;
  v_matched := array(select o.id from public.offers o where o.request_id = p_request and o.matched_at is not null and o.released_at is null);
  if p_action = 'CANCEL' then
    if v_req.stage <> 'RECEIVING' then raise exception 'WRONG_STAGE'; end if;
    update public.requests r set stage = 'ENDED', ended_reason = 'CANCELLED', ended_at = now() where r.id = p_request;
    perform private.on_request_closed(p_request);
  elsif p_action = 'PAUSE' then
    if v_req.stage <> 'IN_PROGRESS' or v_req.paused_at is not null then raise exception 'WRONG_STAGE'; end if;
    update public.requests r set paused_at = now(), pause_reason = coalesce(p_reason, '') where r.id = p_request;
    perform private.cancel_upcoming_visits(p_request, v_matched, 'PAUSED');
  elsif p_action = 'RESUME' then
    if v_req.paused_at is null then raise exception 'WRONG_STAGE'; end if;
    update public.requests r set paused_at = null, pause_reason = null, resumed_at = now(), ad_window_started_at = now() where r.id = p_request;
  elsif p_action in ('WITHDRAWN', 'SOLD_ELSEWHERE') then
    if v_req.stage <> 'IN_PROGRESS' then raise exception 'WRONG_STAGE'; end if;
    update public.requests r set stage = 'ENDED', ended_reason = p_action, ended_at = now() where r.id = p_request;
    perform private.cancel_upcoming_visits(p_request, v_matched, case when p_action = 'WITHDRAWN' then 'WITHDRAWN' else 'ELSEWHERE' end);
    perform private.on_request_closed(p_request);
  else
    raise exception 'BAD_ACTION';
  end if;
end $$;

-- ── 거래 기록 추가 (쓸 수 있는 쪽 확인 + 서버 TS가 계산한 결과를 같은 트랜잭션에) ──
-- p_effects (집주인만): {"stage": "CONTRACTED" | "ENDED", "cancelVisitIds": [uuid…]} — applyDeals·closeOthers 결과.
-- 잔금 확인·해제 확인이면 세입자 전화는 DB가 직접 즉시 삭제 (서버를 믿지 않아도 지켜지게).

create or replace function public.append_deal_event(p_request uuid, p_offer uuid, p_kind text, p_body jsonb, p_effects jsonb default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  v_offer public.offers;
  v_owner boolean;
  v_body jsonb := coalesce(p_body, '{}');
  v_id uuid;
  v_stage text := p_effects ->> 'stage';
begin
  select * into v_offer from public.offers o where o.id = p_offer and o.request_id = p_request for update;
  if not found or v_offer.matched_at is null or v_offer.released_at is not null then raise exception 'NO_OFFER'; end if;
  v_owner := exists (select 1 from public.requests r where r.id = p_request and r.owner_id = uid);
  if v_owner then
    if p_kind not in ('ANSWER', 'OWNER_DECLARED', 'FEE_ANSWER', 'DATE') then raise exception 'NOT_ALLOWED'; end if;
    if p_kind = 'DATE' then v_body := v_body || '{"by": "OWNER"}'; end if;
  elsif (select private.is_active_offer(p_offer)) then
    if p_kind not in ('OWNER_CHECKED', 'REPORT', 'DATE', 'AD_REMOVED') then raise exception 'NOT_ALLOWED'; end if;
    if p_effects is not null then raise exception 'NOT_ALLOWED'; end if;
    v_body := v_body - 'by';
    if p_kind = 'AD_REMOVED' then
      -- 내린 광고는 기록에 남기고 링크는 비움 (다시 시작하면 새로 올리게 — offerRepo.removeAd)
      v_body := case when v_offer.ad_url is null then '{}'::jsonb
                     else jsonb_build_object('ad', jsonb_build_object('url', v_offer.ad_url, 'postedAt', v_offer.ad_posted_at)) end;
      update public.offers o set ad_url = null, ad_posted_at = null where o.id = p_offer;
    end if;
  else
    raise exception 'NOT_ALLOWED';
  end if;

  insert into public.deal_events (request_id, offer_id, kind, body, actor_id) values (p_request, p_offer, p_kind, v_body, uid)
  returning id into v_id;

  if p_effects is not null then
    if v_stage = 'CONTRACTED' then
      update public.requests r set stage = 'CONTRACTED', ended_reason = null, ended_at = null where r.id = p_request and r.stage = 'IN_PROGRESS';
    elsif v_stage = 'ENDED' then
      update public.requests r set stage = 'ENDED', ended_reason = 'DEAL_BROKEN', ended_at = now() where r.id = p_request and r.stage <> 'ENDED';
      perform private.on_request_closed(p_request);
    elsif v_stage is not null then
      raise exception 'BAD_EFFECTS';
    end if;
    if jsonb_typeof(p_effects -> 'cancelVisitIds') = 'array' then
      update public.visits v set canceled_at = now(), canceled_by = 'SYSTEM', cancel_reason = 'ELSEWHERE', acked_by = '{}'
       where v.request_id = p_request and v.canceled_at is null
         and v.id in (select (x #>> '{}')::uuid from jsonb_array_elements(p_effects -> 'cancelVisitIds') x);
    end if;
  end if;

  if p_kind = 'ANSWER' and (v_body ->> 'ok')::boolean and v_body ->> 'step' in ('BALANCE', 'BROKEN') then
    perform private.on_request_closed(p_request);
  end if;
  return v_id;
end $$;

-- ── 집주인: 후기 = 후기 기록 + 크레딧 1개 돌려주기 (lib/broker/credits.ts returnDealCredit) ──

create or replace function public.submit_review(p_request uuid, p_offer uuid, p_stars integer, p_chips text[])
returns void
language plpgsql security definer set search_path = '' as $$
declare v_office uuid;
begin
  if not (select private.owns_request(p_request)) then raise exception 'NO_REQUEST'; end if;
  select o.office_id into v_office from public.offers o where o.id = p_offer and o.request_id = p_request for update;
  if v_office is null then raise exception 'NO_OFFER'; end if;
  if not exists (
    select 1 from public.deal_events e
     where e.offer_id = p_offer and e.kind = 'ANSWER' and e.body ->> 'step' = 'BALANCE' and (e.body ->> 'ok')::boolean
  ) then raise exception 'NOT_DONE'; end if;
  if exists (select 1 from public.deal_events e where e.offer_id = p_offer and e.kind = 'REVIEW') then raise exception 'ALREADY_REVIEWED'; end if;
  insert into public.deal_events (request_id, offer_id, kind, body, actor_id)
  values (p_request, p_offer, 'REVIEW', jsonb_build_object('stars', p_stars, 'chips', to_jsonb(coalesce(p_chips, '{}'))), (select auth.uid()));
  -- 쓴 크레딧이 있고 아직 안 돌려줬을 때만 (한 의뢰에 한 번 — credit_refund_once)
  if exists (select 1 from public.credit_ledger c where c.office_id = v_office and c.request_id = p_request and c.kind = 'SPEND') then
    insert into public.credit_ledger (office_id, kind, amount, request_id, reason) values (v_office, 'REFUND', 1, p_request, 'DEAL')
    on conflict (office_id, request_id) where kind = 'REFUND' do nothing;
  end if;
end $$;

-- ── 중개사: 허위 매물 신고 (lib/broker/fakeReport.ts fileFakeReport) ──

create or replace function public.file_fake_report(p_request uuid, p_offer uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_offer public.offers;
begin
  if not (select private.is_active_offer(p_offer)) then raise exception 'NO_OFFER'; end if;
  select * into v_offer from public.offers o where o.id = p_offer and o.request_id = p_request for update;
  if not found then raise exception 'NO_OFFER'; end if;
  if v_offer.fake_report_status is not null then raise exception 'ALREADY_REPORTED'; end if;
  if v_offer.ad_url is not null then raise exception 'AD_POSTED'; end if;
  update public.offers o set fake_report_status = 'PENDING', fake_report_at = now() where o.id = p_offer;
end $$;

-- ── 관리자: 허위 매물 판정 = 판정 + (맞음이면) 의뢰 종료·환불·방문 취소·세입자 전화 삭제 + 처리 기록 ──

create or replace function public.decide_fake_report(p_request uuid, p_offer uuid, p_verdict text)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_offer public.offers;
begin
  if not (select private.is_admin()) then raise exception 'NOT_ALLOWED'; end if;
  if p_verdict not in ('CONFIRMED', 'REJECTED') then raise exception 'BAD_VERDICT'; end if;
  select * into v_offer from public.offers o where o.id = p_offer and o.request_id = p_request for update;
  if not found or v_offer.fake_report_status is null then raise exception 'NO_REPORT'; end if;
  if v_offer.fake_report_status <> 'PENDING' then raise exception 'ALREADY_DECIDED'; end if;
  update public.offers o set fake_report_status = p_verdict, fake_decided_at = now() where o.id = p_offer;
  insert into audit.admin_actions (actor_id, target, request_id, offer_id, result) values ((select auth.uid()), 'FAKE_REPORT', p_request, p_offer, p_verdict);
  if p_verdict = 'CONFIRMED' then
    update public.requests r set stage = 'ENDED', ended_reason = 'FAKE_CONFIRMED', ended_at = now() where r.id = p_request and r.stage <> 'ENDED';
    perform private.cancel_upcoming_visits(p_request, null, 'ELSEWHERE');
    -- 매칭됐던 곳(해제 포함)과 신고한 곳은 쓴 크레딧 1개 돌려받기 (settleFakeRefunds)
    insert into public.credit_ledger (office_id, kind, amount, request_id, reason)
    select o.office_id, 'REFUND', 1, p_request, 'FAKE' from public.offers o
     where o.request_id = p_request and (o.matched_at is not null or o.fake_report_status is not null)
       and exists (select 1 from public.credit_ledger c where c.office_id = o.office_id and c.request_id = p_request and c.kind = 'SPEND')
    on conflict (office_id, request_id) where kind = 'REFUND' do nothing;
    perform private.on_request_closed(p_request);
  end if;
end $$;

-- ── 관리자: 복비 "중개사가 더 요구" 처리 기록 (lib/admin/adminLog.ts) ──

create or replace function public.admin_log_fee_review(p_request uuid, p_offer uuid, p_result text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (select private.is_admin()) then raise exception 'NOT_ALLOWED'; end if;
  insert into audit.admin_actions (actor_id, target, request_id, offer_id, result) values ((select auth.uid()), 'FEE_OVERCHARGED', p_request, p_offer, p_result);
exception when unique_violation then
  raise exception 'DECIDED';
end $$;

-- ── 크레딧: 매주 월요일(한국) 3개까지 채움 (lib/broker/credits.ts refillWeekly) ──

create or replace function private.refill_office(p_office uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_balance integer;
begin
  perform 1 from public.broker_offices b where b.id = p_office for update;
  select coalesce(sum(c.amount), 0) into v_balance from public.credit_ledger c where c.office_id = p_office;
  -- 이미 3개 이상이어도 0개 지급 줄을 남겨 "이번 주 채움"을 기록 (주간 1번 — credit_weekly_once)
  insert into public.credit_ledger (office_id, kind, amount, week) values (p_office, 'WEEKLY', greatest(0, 3 - v_balance), private.kst_week(now()))
  on conflict (office_id, week) where kind = 'WEEKLY' do nothing;
  return (select coalesce(sum(c.amount), 0) from public.credit_ledger c where c.office_id = p_office);
end $$;

/** 내 사무소 이번 주 채움 (화면을 열 때 서버가 부름). 남은 크레딧 반환 */
create or replace function public.grant_weekly_credits()
returns integer
language plpgsql security definer set search_path = '' as $$
declare v_office uuid := (select private.my_office_id());
begin
  if v_office is null then raise exception 'NOT_APPROVED'; end if;
  return private.refill_office(v_office);
end $$;

/** 예약 작업: 승인된 사무소 전체 (cron) */
create or replace function private.grant_weekly_all() returns integer
language plpgsql security definer set search_path = '' as $$
declare r record; n integer := 0;
begin
  for r in select b.id from public.broker_offices b where b.status = 'APPROVED' loop
    perform private.refill_office(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;

-- ── 관리자: 가입 승인·반려 (lib/broker/application.ts — 연도 범위 검사는 서버 TS) ──
-- 반환: null = 성공, 아니면 오류 코드 (실패 횟수를 남기려고 예외 대신 반환)

create or replace function public.approve_broker(p_office uuid, p_decision text, p_spoken_code text default null,
  p_open_year integer default null, p_reject_reason text default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare v public.broker_offices;
begin
  if not (select private.is_admin()) then raise exception 'NOT_ALLOWED'; end if;
  select * into v from public.broker_offices b where b.id = p_office for update;
  if not found or v.status <> 'PENDING' then return 'NOT_PENDING'; end if;
  if p_decision = 'REJECT' then
    if coalesce(trim(p_reject_reason), '') = '' then return 'REASON_REQUIRED'; end if;
    update public.broker_offices b set status = 'REJECTED', reviewed_at = now(), reject_reason = p_reject_reason where b.id = p_office;
    insert into audit.admin_actions (actor_id, target, office_id, result) values ((select auth.uid()), 'BROKER_SIGNUP', p_office, 'REJECTED');
    return null;
  elsif p_decision <> 'APPROVE' then
    return 'BAD_DECISION';
  end if;
  if v.code_attempts >= 5 then return 'LOCKED'; end if;
  if extensions.crypt(regexp_replace(coalesce(p_spoken_code, ''), '\D', '', 'g'), v.code_hash) <> v.code_hash then
    update public.broker_offices b set code_attempts = code_attempts + 1 where b.id = p_office;
    return 'CODE_MISMATCH';
  end if;
  if coalesce(p_open_year, v.open_year) is null then return 'YEAR_REQUIRED'; end if;
  update public.broker_offices b set status = 'APPROVED', reviewed_at = now(), reject_reason = null, open_year = coalesce(p_open_year, v.open_year)
   where b.id = p_office;
  update public.profiles p set role = 'broker' where p.id = v.user_id and p.role = 'owner';
  insert into audit.admin_actions (actor_id, target, office_id, result) values ((select auth.uid()), 'BROKER_SIGNUP', p_office, 'CONFIRMED');
  return null;
end $$;

-- ── 집주인: 요청 카드 (사무소 id 없이, 개설 연도·인원은 구간만 — lib/requests/stage.ts officeAgeBand·agentCountBand) ──

create or replace function public.owner_offer_cards(p_request uuid)
returns table (
  offer_id uuid, card_order smallint, arrived_at timestamptz, strengths text[], conditions text[],
  office_age_band text, agent_count_band text, promise_kept integer, promise_total integer,
  review_count integer, review_average numeric, review_chips jsonb,
  matched_at timestamptz, released_at timestamptz, ad_url text, ad_posted_at timestamptz,
  delay_reason text, delay_at timestamptz, fake_report_status text, fake_report_at timestamptz, fake_decided_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select private.owns_request(p_request)) then raise exception 'NO_REQUEST'; end if;
  return query
  select o.id, o.card_order, o.arrived_at, o.strengths, b.conditions,
    case when b.open_year is null then null
         when extract(year from private.kst_date(now()))::integer - b.open_year < 3 then 'UNDER_3'
         when extract(year from private.kst_date(now()))::integer - b.open_year < 10 then 'FROM_3_TO_10'
         else 'OVER_10' end,
    case when b.agent_count is null or b.agent_count < 1 then null when b.agent_count = 1 then 'ONE' else 'TWO_PLUS' end,
    b.promise_kept, b.promise_total,
    coalesce(rv.n, 0)::integer, rv.avg_stars, coalesce(rv.chips, '{}'::jsonb),
    o.matched_at, o.released_at, o.ad_url, o.ad_posted_at, o.delay_reason, o.delay_at,
    o.fake_report_status, o.fake_report_at, o.fake_decided_at
  from public.offers o
  join public.broker_offices b on b.id = o.office_id
  left join lateral (
    select count(*) as n, round(avg((e.body ->> 'stars')::numeric), 1) as avg_stars,
      (select jsonb_object_agg(c.chip, c.cnt) from (
         select ch.chip, count(*) as cnt from public.deal_events e2 join public.offers o2 on o2.id = e2.offer_id,
           jsonb_array_elements_text(e2.body -> 'chips') as ch(chip)
          where o2.office_id = o.office_id and e2.kind = 'REVIEW' group by ch.chip) c) as chips
    from public.deal_events e join public.offers o3 on o3.id = e.offer_id
    where o3.office_id = o.office_id and e.kind = 'REVIEW'
  ) rv on true
  where o.request_id = p_request
  order by o.card_order;
end $$;

-- ── 집주인: 매칭 확정·해제 안 된 곳의 사무소 정보 (사무소 id 없이) ──

create or replace function public.request_disclosures(p_request uuid)
returns table (offer_id uuid, office_name text, ceo_name text, office_phone text, address text, reg_no text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select private.owns_request(p_request)) then raise exception 'NO_REQUEST'; end if;
  return query
  select o.id, b.office_name, b.ceo_name, b.office_phone, b.address, b.reg_no
    from public.offers o join public.broker_offices b on b.id = o.office_id
   where o.request_id = p_request and o.matched_at is not null and o.released_at is null
   order by o.card_order;
end $$;

-- ── 매칭된 중개사·집주인: 이 의뢰에 잡힌 방문 시간 (누구 것인지 없이) ──

create or replace function public.visit_slots(p_request uuid)
returns table (visit_date date, visit_hour smallint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not ((select private.owns_request(p_request)) or (select private.is_matched_broker(p_request))) then raise exception 'NOT_ALLOWED'; end if;
  return query
  select v.visit_date, v.visit_hour from public.visits v
   where v.request_id = p_request and v.canceled_at is null
   order by v.visit_date, v.visit_hour;
end $$;

-- ── 동·호수·연락처 열람: 권한 확인 + 기록 + 암호문 반환 (복호화는 서버) ──

create or replace function public.reveal_contact(p_request uuid, p_purpose text, p_admin_reason text default null)
returns table (dong_ho_enc bytea, owner_name_enc bytea, tenant_phone_enc bytea, memo_enc bytea, key_version smallint)
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
  select c.dong_ho_enc, c.owner_name_enc, c.tenant_phone_enc, c.memo_enc, c.key_version
    from pii.request_contacts c where c.request_id = p_request;
end $$;

-- ── 실행 권한 ─────────────────────────────────────────────────

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_admin(), private.my_office_id(), private.owns_request(uuid), private.owns_offer(uuid),
  private.sent_to_request(uuid), private.is_matched_broker(uuid), private.is_active_offer(uuid) to authenticated;
grant execute on function private.grant_weekly_all() to service_role;

revoke execute on function
  public.submit_request(jsonb, jsonb, text), public.send_request(uuid, text[]), public.confirm_match(uuid, uuid[]),
  public.release_offer(uuid, uuid), public.owner_sale_change(uuid, text, text), public.append_deal_event(uuid, uuid, text, jsonb, jsonb),
  public.submit_review(uuid, uuid, integer, text[]), public.file_fake_report(uuid, uuid), public.decide_fake_report(uuid, uuid, text),
  public.admin_log_fee_review(uuid, uuid, text), public.grant_weekly_credits(), public.approve_broker(uuid, text, text, integer, text),
  public.owner_offer_cards(uuid), public.request_disclosures(uuid), public.visit_slots(uuid), public.reveal_contact(uuid, text, text)
from public, anon;
grant execute on function
  public.submit_request(jsonb, jsonb, text), public.send_request(uuid, text[]), public.confirm_match(uuid, uuid[]),
  public.release_offer(uuid, uuid), public.owner_sale_change(uuid, text, text), public.append_deal_event(uuid, uuid, text, jsonb, jsonb),
  public.submit_review(uuid, uuid, integer, text[]), public.file_fake_report(uuid, uuid), public.decide_fake_report(uuid, uuid, text),
  public.admin_log_fee_review(uuid, uuid, text), public.grant_weekly_credits(), public.approve_broker(uuid, text, text, integer, text),
  public.owner_offer_cards(uuid), public.request_disclosures(uuid), public.visit_slots(uuid), public.reveal_contact(uuid, text, text)
to authenticated;
