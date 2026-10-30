-- 중개사 가입 서버화 (A4, 대표님 2026-10-29 승인: 작은 잠금 표 추가 · 반려된 신청은 새 신청이 덮어씀 · 다른 휴대폰은 새 코드 받기)
-- 흐름: 화면 → 서버 액션(app/agent/register/actions.ts)이 명단 대조를 서버에서 다시 하고 → 서버 키로 아래 함수만 부른다.
--   · 확인 코드 4자리는 서버가 만들고 여기서 bcrypt 해시만 저장 (원문은 신청한 휴대폰에만 한 번 내려감)
--   · 사무소 확인 실패 잠금: 같은 접속(주소 해시) 5번 틀리면 10분 — lib/broker/signup.ts LOCK_MAX_FAILS·LOCK_MS와 같음
--   · 이미 가입 확인: 같은 등록번호가 확인 대기·승인이면 ALREADY_JOINED
-- 로그인 사용자가 broker_offices에 직접 넣던 길(명단 대조 없이 아무 등록번호로 신청 가능)은 막는다.

-- ── 실패 잠금 표 (화면·API에 안 보임, 서버 키 함수로만) ──
create table private.signup_fails (
  key_hash text primary key check (length(key_hash) between 16 and 128),   -- 접속 주소의 HMAC (원문 없음)
  fails smallint not null check (fails between 1 and 100),
  first_at timestamptz not null default now()
);
revoke all on private.signup_fails from public;

-- ── 가입 신청은 서버 함수로만 ──
drop policy broker_offices_insert on public.broker_offices;
revoke insert on public.broker_offices from authenticated;

-- 잠금·이미 가입 판정. 반환: null = 통과, 'LOCKED' | 'ALREADY_JOINED'
create or replace function public.signup_gate(p_key text, p_reg_no text default null)
returns text
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from private.signup_fails f where f.key_hash = p_key and f.fails >= 5 and f.first_at > now() - interval '10 minutes') then
    return 'LOCKED';
  end if;
  if p_reg_no is not null and exists (select 1 from public.broker_offices b where b.reg_no = p_reg_no and b.status in ('PENDING', 'APPROVED')) then
    return 'ALREADY_JOINED';
  end if;
  return null;
end $$;

-- 사무소 확인 결과 기록: 맞으면 지움, 틀리면 +1 (10분 지난 기록은 1부터 다시). 하루 넘은 기록은 같이 정리
create or replace function public.signup_record(p_key text, p_ok boolean)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from private.signup_fails f where f.first_at < now() - interval '1 day';
  if p_ok then
    delete from private.signup_fails f where f.key_hash = p_key;
    return;
  end if;
  insert into private.signup_fails as f (key_hash, fails, first_at) values (p_key, 1, now())
  on conflict (key_hash) do update set
    fails = case when f.first_at <= now() - interval '10 minutes' then 1 else least(f.fails + 1, 100) end,
    first_at = case when f.first_at <= now() - interval '10 minutes' then now() else f.first_at end;
end $$;

-- 가입 신청 저장 (서버가 명단 대조를 마친 값만 넘김). 반환: null = 저장, 'ALREADY_JOINED' | 'NOT_SIGNED_IN'
create or replace function public.submit_broker_application(p_user uuid, p_reg_no text, p_office_name text, p_ceo_name text, p_office_phone text,
  p_address text, p_open_year integer, p_strengths text[], p_conditions text[], p_code text)
returns text
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(p_code, '') !~ '^[0-9]{4}$' then raise exception 'BAD_CODE'; end if;
  if not exists (select 1 from public.profiles p where p.id = p_user) then return 'NOT_SIGNED_IN'; end if;
  -- 같은 등록번호를 동시에 두 번 눌러도 한 줄만
  perform pg_advisory_xact_lock(hashtext('broker_signup:' || p_reg_no));
  if exists (select 1 from public.broker_offices b where (b.reg_no = p_reg_no or b.user_id = p_user) and b.status in ('PENDING', 'APPROVED')) then
    return 'ALREADY_JOINED';
  end if;
  -- 반려된 신청은 새 신청이 덮어씀 (예전 판정은 audit.admin_actions에 그대로)
  delete from public.broker_offices b where b.status = 'REJECTED' and (b.reg_no = p_reg_no or b.user_id = p_user);
  insert into public.broker_offices (user_id, reg_no, office_name, ceo_name, office_phone, address, open_year, strengths, conditions, code_hash)
  values (p_user, p_reg_no, p_office_name, coalesce(p_ceo_name, ''), coalesce(p_office_phone, ''), coalesce(p_address, ''), p_open_year,
    coalesce(p_strengths, '{}'), coalesce(p_conditions, '{}'), extensions.crypt(p_code, extensions.gen_salt('bf')));
  return null;
end $$;

-- 다른 휴대폰에서 새 확인 코드 받기: 확인 대기 신청의 코드만 바꿈, 틀린 횟수(code_attempts)는 그대로. 반환: null | 'NOT_PENDING'
create or replace function public.reissue_signup_code(p_user uuid, p_code text)
returns text
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(p_code, '') !~ '^[0-9]{4}$' then raise exception 'BAD_CODE'; end if;
  update public.broker_offices b set code_hash = extensions.crypt(p_code, extensions.gen_salt('bf'))
   where b.user_id = p_user and b.status = 'PENDING';
  if not found then return 'NOT_PENDING'; end if;
  return null;
end $$;

revoke execute on function public.signup_gate(text, text), public.signup_record(text, boolean),
  public.submit_broker_application(uuid, text, text, text, text, text, integer, text[], text[], text), public.reissue_signup_code(uuid, text)
from public, anon, authenticated;
grant execute on function public.signup_gate(text, text), public.signup_record(text, boolean),
  public.submit_broker_application(uuid, text, text, text, text, text, integer, text[], text[], text), public.reissue_signup_code(uuid, text)
to service_role;
