-- 관리자 웹 푸시 3단계: 15분마다 자동 발송 (대표님 2026-10-29 A안 — 서버 키는 발송 경로 한 곳에서만)
-- 1) 보낸 기록: 같은 알림은 하루 한 번 (한국 날짜 + 알림 key). 서버 키(service_role)만 쓰고 관리자는 읽기만
-- 2) 관리자 처리 기록 읽기 함수: 발송 경로(서버 키)도 부를 수 있게 — 확인·반려 끝난 신고를 할 일에서 빼려면 필요
-- 3) 예약 작업: pg_cron이 15분마다 pg_net으로 우리 발송 경로를 부름. 주소·비밀값은 Supabase Vault에서
--    (vault 이름 bokbi_push_tick_url = https://<배포 도메인>/api/admin/push-tick, bokbi_push_tick_secret = PUSH_TICK_SECRET과 같은 값)

create table public.admin_push_sent (
  day date not null,
  key text not null check (length(key) between 1 and 200),
  sent_at timestamptz not null default now(),
  primary key (day, key)
);

alter table public.admin_push_sent enable row level security;
create policy admin_push_sent_select on public.admin_push_sent for select to authenticated using ((select private.is_admin()));

revoke all on public.admin_push_sent from public, anon, authenticated;
grant select on public.admin_push_sent to authenticated;
grant select, insert on public.admin_push_sent to service_role;
grant update (active, updated_at) on public.admin_push_subscriptions to service_role;

-- 관리자 처리 기록: 관리자(aal2) 또는 서버 키
create or replace function public.admin_actions_list()
returns table (id uuid, at timestamptz, target text, request_id uuid, offer_id uuid, office_id uuid, result text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not ((select private.is_admin()) or coalesce((select auth.jwt() ->> 'role') = 'service_role', false)) then
    raise exception 'NOT_ALLOWED';
  end if;
  return query select a.id, a.at, a.target, a.request_id, a.offer_id, a.office_id, a.result from audit.admin_actions a order by a.at;
end $$;
grant execute on function public.admin_actions_list() to service_role;

-- 예약 작업 (pg_cron·pg_net이 있는 곳 = Supabase에서만). Vault에 값이 없으면 부르지 않음
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_cron;
    create extension if not exists pg_net;
    execute $fn$
      create or replace function private.push_tick() returns void
      language plpgsql security definer set search_path = '' as $body$
      declare u text; s text;
      begin
        select decrypted_secret into u from vault.decrypted_secrets where name = 'bokbi_push_tick_url';
        select decrypted_secret into s from vault.decrypted_secrets where name = 'bokbi_push_tick_secret';
        if u is null or s is null then return; end if;
        perform net.http_post(
          url := u,
          headers := jsonb_build_object('Authorization', 'Bearer ' || s, 'Content-Type', 'application/json'),
          body := '{}'::jsonb,
          timeout_milliseconds := 30000
        );
      end $body$
    $fn$;
    revoke execute on function private.push_tick() from public, anon, authenticated;
    perform cron.schedule('bokbi-admin-push', '*/15 * * * *', 'select private.push_tick()');
  end if;
end $$;
