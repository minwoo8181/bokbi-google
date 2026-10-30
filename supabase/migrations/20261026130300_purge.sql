-- 복비 Supabase 2단계 ④ 자동 파기 (처리방침 약속을 DB가 지킴 — 설계 §3, 대표님 확정 2026-10-26)
-- 지우는 것: 연락처 암호문(의뢰 종료 30일 뒤), 세입자 전화(거래 종료 즉시 — RPC가 먼저, 여기서 한 번 더), 행동 기록 13개월, 열람 기록 2년.
-- 남기는 것: 의뢰 블라인드 칸·거래 기록·크레딧·처리 기록. 무엇을 몇 건 지웠는지만 audit.purge_log에.

create or replace function private.purge_expired() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  n_contacts integer;
  n_tenant integer;
  n_events integer;
  n_access integer;
begin
  perform set_config('bokbi.purging', 'on', true);   -- 추가만 하는 기록의 삭제를 이 함수 안에서만 허용

  delete from pii.request_contacts c
   using public.requests r
   where r.id = c.request_id
     and (
       c.purge_after <= now()
       -- 받는 중에 기한이 지나 끝난 의뢰 (DB 단계는 RECEIVING 그대로 — effectiveStage가 EXPIRED로 계산)
       or (r.stage = 'RECEIVING' and r.receiving_until + interval '30 days' <= now())
     );
  get diagnostics n_contacts = row_count;

  update pii.request_contacts c set tenant_phone_enc = null
    from public.requests r
   where r.id = c.request_id and c.tenant_phone_enc is not null
     and (
       r.stage = 'ENDED'
       or exists (select 1 from public.deal_events e
                   where e.request_id = r.id and e.kind = 'ANSWER' and e.body ->> 'step' in ('BALANCE', 'BROKEN') and (e.body ->> 'ok')::boolean)
     );
  get diagnostics n_tenant = row_count;

  delete from public.events e where e.at < now() - interval '13 months';
  get diagnostics n_events = row_count;

  delete from audit.access_log a where a.at < now() - interval '2 years';
  get diagnostics n_access = row_count;

  perform set_config('bokbi.purging', 'off', true);

  insert into audit.purge_log (what, n) values
    ('pii.request_contacts', n_contacts), ('pii.tenant_phone', n_tenant), ('public.events', n_events), ('audit.access_log', n_access);
  return jsonb_build_object('contacts', n_contacts, 'tenantPhones', n_tenant, 'events', n_events, 'accessLog', n_access);
end $$;

revoke execute on function private.purge_expired() from public, anon, authenticated;
grant execute on function private.purge_expired() to service_role;

-- 하루 1번 파기(한국 03:30) + 매주 월요일 크레딧 채움(한국 00:05). pg_cron이 있는 곳(Supabase)에서만 등록
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('bokbi-purge-expired', '30 18 * * *', 'select private.purge_expired()');
    perform cron.schedule('bokbi-weekly-credits', '5 15 * * 0', 'select private.grant_weekly_all()');
  end if;
end $$;
