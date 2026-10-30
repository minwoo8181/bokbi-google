-- 복비 Supabase ⑥ 홈 숫자 카드용 공개 집계 (대표님 확정 2026-10-26, 화면 계산 src/lib/home/homeStats.ts)
-- 로그인 전(anon)에도 부를 수 있는 유일한 함수. 합계와 개수만 돌려주고 개별 의뢰·사람 정보는 내보내지 않는다
-- - matchCount: 집주인이 매칭을 확정한 의뢰 수 (복비의 일은 매칭까지)
-- - feeGapTotalWon: 그 의뢰들의 (법정 상한 − 합의 복비) 합
-- - calcCount: 분석 화면 조회 수 (행동 기록 analysis_view — 관리자·테스트 접속은 서버가 기록하지 않음)

create or replace function public.public_stats()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'matchCount', (select count(*) from public.requests r where r.matched_at is not null),
    'feeGapTotalWon', (select coalesce(sum(r.legal_max_won - r.commission_won), 0) from public.requests r where r.matched_at is not null),
    'calcCount', (select count(*) from public.events e where e.name = 'analysis_view')
  );
$$;

revoke execute on function public.public_stats() from public;
grant execute on function public.public_stats() to anon, authenticated;
