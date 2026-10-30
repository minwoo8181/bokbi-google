-- 매칭 뒤 집주인 희망가 바꾸기 (대표님 2026-10-27, 적용은 대표님 확인 후)
-- 1) 거래 기록 종류 2개 추가: PRICE_CHANGED(매칭된 곳마다, 중개사에게 새 소식) · PRICE_NOTIFIED(집주인이 전화·문자로 알렸다고 체크)
-- 2) owner_change_price: 의뢰 희망가·복비·법정 상한을 바꾸고 매칭된 곳마다 PRICE_CHANGED를 같은 트랜잭션에 남긴다.
--    복비는 서버 TS가 합의 비율 그대로 계산해 넘긴다 (lib/deal/priceChange.ts → dealFee.feeForPrice). DB는 범위만 지킨다
-- 3) append_deal_event: 집주인이 PRICE_NOTIFIED를 쓸 수 있게

alter table public.deal_events drop constraint deal_events_kind_check;
alter table public.deal_events add constraint deal_events_kind_check
  check (kind in ('OWNER_CHECKED', 'REPORT', 'ANSWER', 'DATE', 'AD_REMOVED', 'OWNER_DECLARED', 'FEE_ANSWER', 'REVIEW', 'PRICE_CHANGED', 'PRICE_NOTIFIED'));
alter table public.deal_events add constraint deal_events_price_check
  check (kind not in ('PRICE_CHANGED', 'PRICE_NOTIFIED') or (jsonb_typeof(body -> 'priceManwon') = 'number' and (body ->> 'priceManwon')::numeric > 0));

create or replace function public.owner_change_price(p_request uuid, p_price integer, p_fee bigint, p_legal_max bigint)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_req public.requests;
  v_offer uuid;
begin
  select * into v_req from public.requests r where r.id = p_request and r.owner_id = (select auth.uid()) for update;
  if not found then raise exception 'NO_REQUEST'; end if;
  if v_req.stage <> 'IN_PROGRESS' then raise exception 'WRONG_STAGE'; end if;
  if p_price is null or p_price <= 0 or p_price = v_req.asking_price_manwon then raise exception 'BAD_PRICE'; end if;
  -- 너무 멀리 바꾸면 오타로 본다 (lib/deal/dealFee.ts checkDealPrice와 같은 범위: 지금 희망가의 절반 ~ 2배)
  if p_price * 2 < v_req.asking_price_manwon or p_price > v_req.asking_price_manwon * 2 then raise exception 'BAD_PRICE'; end if;
  if p_fee is null or p_legal_max is null or p_fee < 0 or p_fee > p_legal_max then raise exception 'BAD_FEE'; end if;

  update public.requests r
     set asking_price_manwon = p_price, commission_won = p_fee, legal_max_won = p_legal_max
   where r.id = p_request;

  for v_offer in
    select o.id from public.offers o where o.request_id = p_request and o.matched_at is not null and o.released_at is null
  loop
    insert into public.deal_events (request_id, offer_id, kind, body, actor_id)
    values (p_request, v_offer, 'PRICE_CHANGED',
            jsonb_build_object('priceManwon', p_price, 'fromManwon', v_req.asking_price_manwon, 'feeWon', p_fee), (select auth.uid()));
  end loop;
end $$;

-- 집주인이 쓸 수 있는 거래 기록에 PRICE_NOTIFIED 추가 (나머지는 20261026130200_rpc.sql 그대로)
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
    if p_kind not in ('ANSWER', 'OWNER_DECLARED', 'FEE_ANSWER', 'DATE', 'PRICE_NOTIFIED') then raise exception 'NOT_ALLOWED'; end if;
    if p_kind = 'DATE' then v_body := v_body || '{"by": "OWNER"}'; end if;
    if p_kind = 'PRICE_NOTIFIED' and p_effects is not null then raise exception 'NOT_ALLOWED'; end if;
  elsif (select private.is_active_offer(p_offer)) then
    if p_kind not in ('OWNER_CHECKED', 'REPORT', 'DATE', 'AD_REMOVED') then raise exception 'NOT_ALLOWED'; end if;
    if p_effects is not null then raise exception 'NOT_ALLOWED'; end if;
    v_body := v_body - 'by';
    if p_kind = 'AD_REMOVED' then
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

revoke execute on function public.owner_change_price(uuid, integer, bigint, bigint) from public, anon;
grant execute on function public.owner_change_price(uuid, integer, bigint, bigint) to authenticated;
