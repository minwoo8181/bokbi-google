-- 복비 Supabase 2단계 ② 권한 함수 + RLS 정책 + 추가만 하는 기록 (설계 §4 권한 표)
-- 정책은 (select …)로 감싸 한 번만 계산. 권한 함수는 private(노출 안 됨)·security definer·search_path ''.
-- 관리자 = role admin + 2단계 인증(aal2). aal1 관리자는 아무 권한 없음 (is_admin 한 곳에서 확인).

-- ── 권한 함수 ─────────────────────────────────────────────────

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
     and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin');
$$;

/** 로그인한 사람의 승인된 사무소 (없으면 null) */
create or replace function private.my_office_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select b.id from public.broker_offices b where b.user_id = (select auth.uid()) and b.status = 'APPROVED';
$$;

create or replace function private.owns_request(rid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.requests r where r.id = rid and r.owner_id = (select auth.uid()));
$$;

/** 내 사무소가 보낸 요청 카드인지 */
create or replace function private.owns_offer(oid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.offers o join public.broker_offices b on b.id = o.office_id
    where o.id = oid and b.user_id = (select auth.uid()) and b.status = 'APPROVED'
  );
$$;

/** 이 의뢰에 요청을 보낸 적이 있는지 (내 매물 목록에서 끝난 의뢰도 보이게) */
create or replace function private.sent_to_request(rid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.offers o join public.broker_offices b on b.id = o.office_id
    where o.request_id = rid and b.user_id = (select auth.uid()) and b.status = 'APPROVED'
  );
$$;

/** 매칭 확정됐고 해제되지 않은 중개사 (동·호수·연락처 열람 조건) */
create or replace function private.is_matched_broker(rid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.offers o join public.broker_offices b on b.id = o.office_id
    where o.request_id = rid and b.user_id = (select auth.uid()) and b.status = 'APPROVED'
      and o.matched_at is not null and o.released_at is null
  );
$$;

/** 이 요청 카드가 지금 매칭 중인 내 것인지 (광고·방문 쓰기 조건) */
create or replace function private.is_active_offer(oid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.offers o join public.broker_offices b on b.id = o.office_id
    where o.id = oid and b.user_id = (select auth.uid()) and b.status = 'APPROVED'
      and o.matched_at is not null and o.released_at is null
  );
$$;

/** 한국 날짜 (한국은 서머타임이 없어 +9시간 고정) */
create or replace function private.kst_date(t timestamptz) returns date
language sql immutable set search_path = '' as $$
  select ((t at time zone 'UTC') + interval '9 hours')::date;
$$;

-- ── 가입하면 집주인 역할로 프로필 생성 ─────────────────────────

create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

-- ── 추가만 하는 기록: 수정은 늘 거절, 삭제는 파기 함수만 ───────────

create or replace function private.block_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' and current_setting('bokbi.purging', true) = 'on' then
    return old;
  end if;
  raise exception using message = 'APPEND_ONLY', detail = tg_table_schema || '.' || tg_table_name;
end $$;

create trigger deal_events_append_only before update or delete on public.deal_events for each row execute function private.block_change();
create trigger credit_ledger_append_only before update or delete on public.credit_ledger for each row execute function private.block_change();
create trigger consents_append_only before update or delete on public.consents for each row execute function private.block_change();
create trigger events_append_only before update or delete on public.events for each row execute function private.block_change();
create trigger access_log_append_only before update or delete on audit.access_log for each row execute function private.block_change();
create trigger admin_actions_append_only before update or delete on audit.admin_actions for each row execute function private.block_change();
create trigger purge_log_append_only before update or delete on audit.purge_log for each row execute function private.block_change();

-- ── RLS 켜기 (전부) ───────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.broker_offices enable row level security;
alter table public.requests enable row level security;
alter table public.offers enable row level security;
alter table public.deal_events enable row level security;
alter table public.visits enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.consents enable row level security;
alter table public.events enable row level security;
alter table pii.request_contacts enable row level security;   -- 정책 없음 = 함수로만
alter table audit.access_log enable row level security;
alter table audit.admin_actions enable row level security;
alter table audit.purge_log enable row level security;

-- ── 정책 ─────────────────────────────────────────────────────

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

create policy broker_offices_select on public.broker_offices for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
-- 가입 신청: 본인 것만, 상태는 기본값(PENDING) — status 칸은 쓰기 권한이 없음
create policy broker_offices_insert on public.broker_offices for insert to authenticated
  with check (user_id = (select auth.uid()));

-- 받는 중 의뢰는 승인된 중개사 모두 읽기, 요청을 보낸 의뢰는 끝나도 읽기
create policy requests_select on public.requests for select to authenticated
  using (
    owner_id = (select auth.uid())
    or (stage = 'RECEIVING' and receiving_until > now() and (select private.my_office_id()) is not null)
    or (select private.sent_to_request(id))
    or (select private.is_admin())
  );
create policy requests_update_owner on public.requests for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- 요청 카드: 중개사는 내 것만 (서로 모름). 집주인은 owner_offer_cards 함수로만 (사무소 id 없이)
create policy offers_select on public.offers for select to authenticated
  using (office_id = (select private.my_office_id()) or (select private.is_admin()));
create policy offers_update_broker on public.offers for update to authenticated
  using ((select private.is_active_offer(id))) with check ((select private.is_active_offer(id)));

create policy deal_events_select on public.deal_events for select to authenticated
  using ((select private.owns_request(request_id)) or (select private.owns_offer(offer_id)) or (select private.is_admin()));

-- 방문: 집주인은 내 의뢰 전부, 중개사는 내 것만 (다른 곳은 visit_slots 함수로 시간만)
create policy visits_select on public.visits for select to authenticated
  using ((select private.owns_request(request_id)) or (select private.owns_offer(offer_id)) or (select private.is_admin()));
create policy visits_insert_broker on public.visits for insert to authenticated
  with check (
    (select private.is_active_offer(offer_id))
    and exists (select 1 from public.offers o where o.id = offer_id and o.request_id = visits.request_id)
  );
create policy visits_update on public.visits for update to authenticated
  using ((select private.owns_request(request_id)) or (select private.owns_offer(offer_id)))
  with check ((select private.owns_request(request_id)) or (select private.owns_offer(offer_id)));

create policy credit_ledger_select on public.credit_ledger for select to authenticated
  using (office_id = (select private.my_office_id()) or (select private.is_admin()));

create policy consents_select on public.consents for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy consents_insert on public.consents for insert to authenticated
  with check (user_id = (select auth.uid()) and (request_id is null or (select private.owns_request(request_id))));

create policy events_select_admin on public.events for select to authenticated using ((select private.is_admin()));

create policy access_log_select_admin on audit.access_log for select to authenticated using ((select private.is_admin()));
create policy admin_actions_select_admin on audit.admin_actions for select to authenticated using ((select private.is_admin()));
create policy purge_log_select_admin on audit.purge_log for select to authenticated using ((select private.is_admin()));

-- ── 함수 실행 권한: 기본(public) 회수 → 정책이 쓰는 것만 로그인 사용자에게 ──

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_admin(), private.my_office_id(), private.owns_request(uuid), private.owns_offer(uuid),
  private.sent_to_request(uuid), private.is_matched_broker(uuid), private.is_active_offer(uuid) to authenticated;
