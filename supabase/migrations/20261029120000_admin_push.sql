-- 관리자 웹 푸시 받는 기기 (대표님 2026-10-29: 관리자 알림은 문자 대신 무료 웹 푸시)
-- 기기마다 한 줄(브라우저가 준 주소 endpoint). 끄면 active = false (이 설계엔 삭제가 없음)
-- 관리자(role admin + 2단계 인증)만, 자기 기기만 읽고 쓴다. 자동 발송(예약 작업)은 다음 단계에서 서버 키로 읽는다

create table public.admin_push_subscriptions (
  endpoint text primary key check (endpoint like 'https://%'),
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  prefs jsonb not null default '{"MORNING": true, "OVERDUE": true, "SERVICE": true, "SIGNUP": false}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index admin_push_subscriptions_user_idx on public.admin_push_subscriptions (user_id);

alter table public.admin_push_subscriptions enable row level security;

create policy admin_push_select on public.admin_push_subscriptions for select to authenticated
  using ((select private.is_admin()) and user_id = (select auth.uid()));
create policy admin_push_insert on public.admin_push_subscriptions for insert to authenticated
  with check ((select private.is_admin()) and user_id = (select auth.uid()));
create policy admin_push_update on public.admin_push_subscriptions for update to authenticated
  using ((select private.is_admin()) and user_id = (select auth.uid()))
  with check ((select private.is_admin()) and user_id = (select auth.uid()));

revoke all on public.admin_push_subscriptions from public, anon, authenticated;
grant select, insert on public.admin_push_subscriptions to authenticated;
grant update (p256dh, auth, prefs, active, updated_at) on public.admin_push_subscriptions to authenticated;
grant select on public.admin_push_subscriptions to service_role;
