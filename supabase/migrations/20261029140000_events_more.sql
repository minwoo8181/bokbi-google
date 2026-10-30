-- 행동 기록 이름 5개 추가 (A7, 대표님 2026-10-29): 방문·단지 검색·자주 묻는 질문 열람·문의 보냄·"크레딧 더 받기" 고른 항목.
-- 표는 그대로, 이름 목록만 넓힌다. 앱 목록 src/lib/analytics/events.ts EVENT_NAMES — db.test.ts가 대조.
-- 쓰기는 그대로 서버(service_role)만 (/api/events가 검사·가명 해시 후 저장), 읽기는 관리자만.

alter table public.events drop constraint events_name_check;
alter table public.events add constraint events_name_check check (name in (
  'analysis_view', 'fee_adjust', 'match_step', 'request_submit', 'match_confirm', 'deal_answer', 'fee_answer', 'review_submit', 'sale_change',
  'broker_signup', 'feed_view', 'request_send', 'send_blocked', 'ad_posted', 'ad_removed', 'visit_saved', 'deal_report', 'more_credits_tap',
  'more_credits_answer', 'page_visit', 'complex_search', 'faq_view', 'inquiry_send',
  'offer_arrived', 'ai_explain', 'external_error', 'admin_action'));

-- 기간별 이름 집계(관리자 지표·홈 "복비 계산 n회")용
create index events_name_at_idx on public.events (name, at);
