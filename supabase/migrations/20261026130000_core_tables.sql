-- 복비 Supabase 2단계 ① 테이블·제약·권한 (설계 docs/handover/supabase-schema.md v2.1 §3)
-- 원칙: public = 블라인드 칸만, pii = 동·호수·연락처 암호문(열람 함수로만), private = 권한 함수, audit = 추가만 하는 기록.
-- 상태 check 목록은 앱 타입과 같다 → src/lib/data/__tests__/db.test.ts 가 src/lib/data/dbEnums.ts 와 대조.
-- Supabase는 public 스키마의 새 테이블에 anon·authenticated 전체 권한을 기본으로 준다 → 테이블마다 회수하고 필요한 칸만 다시 준다.

create schema if not exists pii;      -- Data API 노출 목록에 넣지 않음 (Supabase 기본 vault 스키마와 이름이 겹치지 않게 pii)
create schema if not exists private;
create schema if not exists audit;
revoke all on schema pii, private, audit from public;
grant usage on schema private to authenticated;   -- RLS 정책이 권한 함수를 부를 수 있게 (스키마는 API에 노출 안 됨)
grant usage on schema audit to authenticated;     -- 관리자 읽기 정책용

create extension if not exists pgcrypto with schema extensions;   -- 가입 확인 코드 해시

-- ── 계정 ──────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'owner' constraint profiles_role_check check (role in ('owner', 'broker', 'admin')),
  created_at timestamptz not null default now()
);

-- ── 중개사무소 ────────────────────────────────────────────────

create table public.broker_offices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  reg_no text not null unique check (length(reg_no) between 1 and 40),
  office_name text not null check (length(office_name) between 1 and 100),
  ceo_name text not null default '' check (length(ceo_name) <= 40),
  office_phone text not null default '' check (length(office_phone) <= 20),
  address text not null default '' check (length(address) <= 200),
  open_year smallint check (open_year between 1980 and 2100),
  agent_count smallint check (agent_count >= 1),
  strengths text[] not null default '{}' check (cardinality(strengths) <= 10),
  conditions text[] not null default '{}' check (cardinality(conditions) <= 10),
  status text not null default 'PENDING' constraint broker_offices_status_check check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  code_hash text not null,                     -- 확인 코드 4자리의 bcrypt 해시 (원문 저장 안 함)
  code_attempts smallint not null default 0 check (code_attempts between 0 and 5),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reject_reason text check (length(reject_reason) <= 200),
  promise_kept integer not null default 0 check (promise_kept >= 0),   -- 약속 이행 집계 (서버 TS 규칙이 계산해 갱신)
  promise_total integer not null default 0 check (promise_total >= promise_kept),
  check ((status = 'REJECTED') = (reject_reason is not null))
);

-- ── 의뢰 (블라인드 칸만) ─────────────────────────────────────

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete set null,   -- 탈퇴해도 거래 기록·통계는 남김
  apt_id text check (length(apt_id) <= 40),
  complex_name text not null check (length(complex_name) between 1 and 100),
  trade_type text not null constraint requests_trade_type_check check (trade_type in ('매매', '전세')),
  pyeong_label text not null check (length(pyeong_label) <= 40),
  floor_label text not null check (length(floor_label) <= 40),
  masked_dong_ho text not null check (length(masked_dong_ho) <= 40),
  asking_price_manwon integer not null check (asking_price_manwon > 0),
  commission_won bigint not null check (commission_won >= 0),
  legal_max_won bigint not null check (legal_max_won >= commission_won),
  occupancy text not null constraint requests_occupancy_check check (occupancy in ('VACANT', 'OWNER', 'TENANT')),
  details jsonb check (details is null or jsonb_typeof(details) = 'object'),
  recommendation jsonb check (recommendation is null or jsonb_typeof(recommendation) = 'object'),   -- 의뢰 시점 추천값 고정
  showing jsonb not null default '{"weekly": {}, "blocked": []}' check (jsonb_typeof(showing) = 'object'),
  stage text not null default 'RECEIVING' constraint requests_stage_check check (stage in ('RECEIVING', 'IN_PROGRESS', 'CONTRACTED', 'ENDED')),
  ended_reason text constraint requests_ended_reason_check
    check (ended_reason in ('EXPIRED', 'CANCELLED', 'WITHDRAWN', 'SOLD_ELSEWHERE', 'RELEASED', 'DEAL_BROKEN', 'FAKE_CONFIRMED')),
  created_at timestamptz not null default now(),
  receiving_until timestamptz not null default now() + interval '48 hours',
  matched_at timestamptz,
  ad_window_started_at timestamptz,
  paused_at timestamptz,
  pause_reason text check (length(pause_reason) <= 40),
  resumed_at timestamptz,
  ended_at timestamptz,
  check ((stage = 'ENDED') = (ended_reason is not null)),
  check ((paused_at is null) or (pause_reason is not null))
);
create index requests_owner_id_idx on public.requests (owner_id);
create index requests_receiving_idx on public.requests (receiving_until) where stage = 'RECEIVING';

-- ── 동·호수·연락처 암호문 (서버가 AES-256-GCM으로 암호화, 키는 DB 밖) ──

create table pii.request_contacts (
  request_id uuid primary key references public.requests (id) on delete cascade,
  dong_ho_enc bytea not null,
  owner_name_enc bytea not null,
  tenant_phone_enc bytea,                    -- 세입자 거주일 때만. 거래가 끝나면 즉시 지움
  memo_enc bytea,                            -- 방문·옵션 메모
  key_version smallint not null default 1,   -- 키 교체용
  purge_after timestamptz                    -- 파기 예정 시각 (의뢰가 끝날 때 RPC가 정함)
);

-- ── 요청 카드 ────────────────────────────────────────────────

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  office_id uuid not null references public.broker_offices (id) on delete restrict,
  card_order smallint not null check (card_order >= 1),
  arrived_at timestamptz not null default now(),
  strengths text[] not null default '{}' check (cardinality(strengths) <= 3),
  matched_at timestamptz,
  released_at timestamptz,
  ad_url text check (length(ad_url) <= 500),
  ad_posted_at timestamptz,
  delay_reason text constraint offers_delay_reason_check check (delay_reason in ('PHOTO', 'TODAY', 'OWNER_CHECK')),
  delay_at timestamptz,
  fake_report_status text constraint offers_fake_report_status_check check (fake_report_status in ('PENDING', 'CONFIRMED', 'REJECTED')),
  fake_report_at timestamptz,
  fake_decided_at timestamptz,
  constraint offers_one_per_office unique (request_id, office_id),   -- 한 의뢰에 한 번
  unique (request_id, card_order),
  check (released_at is null or matched_at is not null),
  check ((ad_url is null) = (ad_posted_at is null)),
  check ((delay_reason is null) = (delay_at is null)),
  check ((fake_report_status is null) = (fake_report_at is null)),
  check ((coalesce(fake_report_status, '') in ('CONFIRMED', 'REJECTED')) = (fake_decided_at is not null))
);
create index offers_office_arrived_idx on public.offers (office_id, arrived_at);

-- ── 거래 기록 (추가만) ───────────────────────────────────────

create table public.deal_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  offer_id uuid not null references public.offers (id) on delete cascade,
  kind text not null constraint deal_events_kind_check
    check (kind in ('OWNER_CHECKED', 'REPORT', 'ANSWER', 'DATE', 'AD_REMOVED', 'OWNER_DECLARED', 'FEE_ANSWER', 'REVIEW')),
  body jsonb not null default '{}' check (jsonb_typeof(body) = 'object'),
  actor_id uuid,
  at timestamptz not null default now(),
  -- 종류별 칸 (null도 막도록 coalesce)
  constraint deal_events_how_check check (kind <> 'OWNER_CHECKED' or coalesce(body ->> 'how', '') in ('CONFIRMED', 'CALL_CONFIRMED')),
  constraint deal_events_step_check
    check (kind not in ('REPORT', 'ANSWER') or coalesce(body ->> 'step', '') in ('PROVISIONAL', 'CONTRACT', 'BALANCE', 'BROKEN')),
  constraint deal_events_declared_step_check check (kind <> 'OWNER_DECLARED' or coalesce(body ->> 'step', '') in ('PROVISIONAL', 'CONTRACT')),
  constraint deal_events_date_field_check check (kind <> 'DATE' or coalesce(body ->> 'field', '') in ('CONTRACT', 'MIDDLE', 'BALANCE')),
  constraint deal_events_fee_reason_check
    check (kind <> 'FEE_ANSWER' or body ->> 'reason' is null or body ->> 'reason' in ('AGREED', 'OVERCHARGED', 'OTHER')),
  constraint deal_events_fee_note_check check (kind <> 'FEE_ANSWER' or coalesce(length(body ->> 'note'), 0) <= 80),
  constraint deal_events_answer_ok_check check (kind <> 'ANSWER' or jsonb_typeof(body -> 'ok') = 'boolean'),
  constraint deal_events_review_check
    check (kind <> 'REVIEW' or (jsonb_typeof(body -> 'stars') = 'number' and (body ->> 'stars')::numeric in (1, 2, 3, 4, 5) and jsonb_typeof(body -> 'chips') = 'array'))
);
create index deal_events_request_id_idx on public.deal_events (request_id);
create index deal_events_offer_id_idx on public.deal_events (offer_id, at);

-- ── 방문 일정 ────────────────────────────────────────────────

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  offer_id uuid not null references public.offers (id) on delete cascade,
  visit_date date not null,
  visit_hour smallint not null constraint visits_hour_check check (visit_hour in (10, 11, 13, 14, 15, 16, 17, 18, 19, 20)),
  created_at timestamptz not null default now(),
  canceled_at timestamptz,
  canceled_by text constraint visits_canceled_by_check check (canceled_by in ('OWNER', 'BROKER', 'SYSTEM')),
  cancel_reason text constraint visits_cancel_reason_check check (cancel_reason in ('ELSEWHERE', 'WITHDRAWN', 'PAUSED')),
  acked_by text[] not null default '{}',
  check ((canceled_at is null) = (canceled_by is null)),
  check (cancel_reason is null or canceled_by = 'SYSTEM')
);
create index visits_request_id_idx on public.visits (request_id);
create index visits_offer_id_idx on public.visits (offer_id);
create unique index visits_one_per_slot on public.visits (request_id, visit_date, visit_hour) where canceled_at is null;

-- ── 크레딧 장부 (함수로만 씀) ─────────────────────────────────

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.broker_offices (id) on delete cascade,
  kind text not null constraint credit_ledger_kind_check check (kind in ('WEEKLY', 'SPEND', 'REFUND')),
  amount smallint not null,
  request_id uuid references public.requests (id) on delete restrict,
  reason text constraint credit_ledger_reason_check check (reason in ('FAKE', 'DEAL')),
  week date,                                 -- 지급한 주의 월요일 (한국 날짜)
  at timestamptz not null default now(),
  check (
    (kind = 'WEEKLY' and amount between 0 and 3 and week is not null and request_id is null and reason is null)
    or (kind = 'SPEND' and amount = -1 and request_id is not null and reason is null and week is null)
    or (kind = 'REFUND' and amount = 1 and request_id is not null and reason is not null and week is null)
  )
);
create index credit_ledger_office_id_idx on public.credit_ledger (office_id, at);
create index credit_ledger_request_id_idx on public.credit_ledger (request_id);
create unique index credit_spend_once on public.credit_ledger (office_id, request_id) where kind = 'SPEND';
create unique index credit_refund_once on public.credit_ledger (office_id, request_id) where kind = 'REFUND';
create unique index credit_weekly_once on public.credit_ledger (office_id, week) where kind = 'WEEKLY';

-- ── 동의 (추가만) ────────────────────────────────────────────

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,   -- 동의 증빙은 탈퇴 뒤에도 보관 (기간은 법무 확인)
  consent_key text not null constraint consents_key_check check (consent_key in ('TERMS', 'COLLECT', 'PROVIDE')),
  context text not null constraint consents_context_check check (context in ('OWNER_REQUEST', 'BROKER_SIGNUP')),
  request_id uuid references public.requests (id) on delete restrict,
  terms_version text not null check (length(terms_version) between 1 and 40),
  at timestamptz not null default now()
);
create index consents_user_id_idx on public.consents (user_id);
create index consents_request_id_idx on public.consents (request_id);

-- ── 행동 기록 (가명, 13개월) ─────────────────────────────────

create table public.events (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  name text not null constraint events_name_check check (name in (
    'analysis_view', 'fee_adjust', 'match_step', 'request_submit', 'match_confirm', 'deal_answer', 'fee_answer', 'review_submit', 'sale_change',
    'broker_signup', 'feed_view', 'request_send', 'send_blocked', 'ad_posted', 'ad_removed', 'visit_saved', 'deal_report', 'more_credits_tap',
    'offer_arrived', 'ai_explain', 'external_error', 'admin_action')),
  role text not null constraint events_role_check check (role in ('owner', 'broker', 'system', 'admin')),
  actor_hash text not null check (length(actor_hash) between 8 and 128),
  session_id text not null check (length(session_id) <= 64),
  request_id uuid,
  offer_id uuid,
  props jsonb not null default '{}' check (jsonb_typeof(props) = 'object'),
  app_version text not null check (length(app_version) <= 40)
);
create index events_at_idx on public.events (at);

-- ── 기록 (추가만) ────────────────────────────────────────────

create table audit.access_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  actor_role text not null constraint access_log_role_check check (actor_role in ('owner', 'broker', 'admin')),
  request_id uuid not null,
  purpose text not null constraint access_log_purpose_check check (purpose in ('OWNER_VIEW', 'MATCHED_BROKER', 'ADMIN_REVIEW')),
  reason text check (length(reason) <= 200),   -- 관리자만, 필수
  at timestamptz not null default now(),
  check ((actor_role = 'admin') = (reason is not null))
);
create index access_log_actor_at_idx on audit.access_log (actor_id, at);
create index access_log_request_id_idx on audit.access_log (request_id);

create table audit.admin_actions (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor_id uuid not null,
  -- 앱 AdminTargetKind 2개 + DB에서만 남기는 가입 승인·반려
  target text not null constraint admin_actions_target_check check (target in ('FAKE_REPORT', 'FEE_OVERCHARGED', 'BROKER_SIGNUP')),
  request_id uuid,
  offer_id uuid,
  office_id uuid,
  result text not null constraint admin_actions_result_check check (result in ('CONFIRMED', 'REJECTED', 'CONTACTED')),
  check ((target = 'BROKER_SIGNUP') = (office_id is not null)),
  check (target = 'BROKER_SIGNUP' or (request_id is not null and offer_id is not null))
);
-- 판정(확인·반려)은 대상마다 한 번 (연락함은 여러 번) → 앱 AppendError 'DECIDED'
create unique index admin_actions_decided_once on audit.admin_actions (target, request_id, offer_id)
  where result in ('CONFIRMED', 'REJECTED') and target <> 'BROKER_SIGNUP';
create index admin_actions_at_idx on audit.admin_actions (at);

create table audit.purge_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  what text not null,
  n integer not null check (n >= 0)          -- 지운 건수만 (내용 없이)
);

-- ── 권한: 기본 전체 권한 회수 → 필요한 칸만 ─────────────────────

revoke all on public.profiles, public.broker_offices, public.requests, public.offers, public.deal_events, public.visits,
  public.credit_ledger, public.consents, public.events from anon, authenticated;
revoke all on pii.request_contacts, audit.access_log, audit.admin_actions, audit.purge_log from public;

grant select on public.profiles to authenticated;
-- 확인 코드 해시·실패 횟수는 본인에게도 안 보임
grant select (id, user_id, reg_no, office_name, ceo_name, office_phone, address, open_year, agent_count, strengths, conditions,
  status, submitted_at, reviewed_at, reject_reason, promise_kept, promise_total) on public.broker_offices to authenticated;
grant insert (user_id, reg_no, office_name, ceo_name, office_phone, address, strengths, conditions, code_hash) on public.broker_offices to authenticated;
grant select on public.requests to authenticated;
grant update (showing) on public.requests to authenticated;
grant select on public.offers to authenticated;
grant update (ad_url, ad_posted_at, delay_reason, delay_at) on public.offers to authenticated;
grant select on public.deal_events to authenticated;
grant select on public.visits to authenticated;
grant insert (request_id, offer_id, visit_date, visit_hour) on public.visits to authenticated;
grant update (canceled_at, canceled_by, acked_by) on public.visits to authenticated;
grant select on public.credit_ledger to authenticated;
grant select on public.consents to authenticated;
grant insert (user_id, consent_key, context, request_id, terms_version) on public.consents to authenticated;
grant select on public.events to authenticated;
grant select on audit.access_log, audit.admin_actions, audit.purge_log to authenticated;
-- 행동 기록은 서버(service_role)가 씀
grant insert on public.events to service_role;
