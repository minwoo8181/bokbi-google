-- 사무소 실적 저장 (A10, 2026-10-29). 약속 이행 건수(promise_kept)·계약까지 간 거래 수(promise_total)는
-- 서버가 TS 규칙(lib/deal/settle.ts promiseStats)으로 다시 세서 이 함수로만 저장한다 (lib/broker/officeStats.ts).
-- 거래 기록이 추가될 때마다 서버 액션(app/actions/data.ts)이 부름. 브라우저(로그인 사용자·로그인 전)는 못 부름.

create or replace function public.set_office_promise(p_office uuid, p_kept integer, p_total integer)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_kept < 0 or p_total < p_kept then raise exception 'BAD_STATS'; end if;
  update public.broker_offices b set promise_kept = p_kept, promise_total = p_total where b.id = p_office;
end $$;

revoke execute on function public.set_office_promise(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.set_office_promise(uuid, integer, integer) to service_role;
