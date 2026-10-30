-- 권한 표(설계 §4) 전 칸 + 쓰기·제약 시나리오 자동 테스트. seed.sql 다음에 실행한다.
-- 결과는 tests.results (칸·기대·실제·통과). PGlite(npm test)와 Supabase 브랜치(execute_sql) 모두 같은 파일.
-- 사람 바꾸기 = role(anon·authenticated) + request.jwt.claims(sub·aal) — Supabase가 요청마다 하는 것과 같다.

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;   -- 사람을 바꾼 뒤 되돌리는 함수(tests.unbecome)를 부르려고 (시험 전용 스키마)
create table tests.results (
  seq serial primary key,
  section text not null,
  name text not null,
  expected text not null,
  actual text,
  pass boolean generated always as (expected = coalesce(actual, '')) stored
);

create function tests.id(k text) returns uuid language sql immutable as $$
  select (case k
    when 'owner_a' then '00000000-0000-0000-0000-0000000000a1' when 'owner_b' then '00000000-0000-0000-0000-0000000000b1'
    when 'broker_m' then '00000000-0000-0000-0000-0000000000c1' when 'broker_o' then '00000000-0000-0000-0000-0000000000c2'
    when 'broker_p' then '00000000-0000-0000-0000-0000000000c3' when 'broker_q' then '00000000-0000-0000-0000-0000000000c4'
    when 'broker_s' then '00000000-0000-0000-0000-0000000000c5'
    when 'admin1' then '00000000-0000-0000-0000-0000000000d1' when 'admin2' then '00000000-0000-0000-0000-0000000000d1'
    when 'office_m' then '10000000-0000-0000-0000-0000000000c1' when 'office_o' then '10000000-0000-0000-0000-0000000000c2'
    when 'office_p' then '10000000-0000-0000-0000-0000000000c3'
    when 'offer_m1' then '30000000-0000-0000-0000-0000000000c1' when 'offer_o1' then '30000000-0000-0000-0000-0000000001c2'
    when 'offer_m4' then '30000000-0000-0000-0000-0000000004c1' when 'offer_m7' then '30000000-0000-0000-0000-0000000007c1'
    when 'offer_o7' then '30000000-0000-0000-0000-0000000007c2' when 'offer_m8' then '30000000-0000-0000-0000-0000000008c1'
    else '20000000-0000-0000-0000-0000000000' || lpad(substr(k, 2), 2, '0')   -- R1 … R12
  end)::uuid;
$$;

-- 이 사람으로 바꾸기 (트랜잭션 안에서만). admin1 = 2단계 인증 전(aal1), admin2 = 통과(aal2)
create function tests.become(who text) returns void language plpgsql as $$
begin
  if who = 'anon' then
    perform set_config('request.jwt.claims', '{"role": "anon"}', true);
    perform set_config('role', 'anon', true);
  elsif who = 'service' then
    -- 서버 키 (관리자 웹 푸시 발송 경로)
    perform set_config('request.jwt.claims', '{"role": "service_role"}', true);
    perform set_config('role', 'service_role', true);
  else
    perform set_config('request.jwt.claims',
      json_build_object('sub', tests.id(who), 'role', 'authenticated', 'aal', case when who = 'admin2' then 'aal2' else 'aal1' end)::text, true);
    perform set_config('role', 'authenticated', true);
  end if;
end $$;

create function tests.unbecome() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;

-- 읽기 칸: 대상 행이 보이면 Y, 안 보이거나 거절되면 N
create function tests.sees(who text, q text) returns text language plpgsql as $$
declare n bigint; r text;
begin
  perform tests.become(who);
  begin
    execute 'select count(*) from (' || q || ') s' into n;
    r := case when n > 0 then 'Y' else 'N' end;
  exception when others then r := 'N';
  end;
  perform tests.unbecome();
  return r;
end $$;

-- 쓰기: 성공 ok / 권한 없음 DENIED / check 위반 CHECK / 중복 UNIQUE / 그 밖은 오류 메시지(= 앱 오류 코드)
create function tests.try(who text, stmt text) returns text language plpgsql as $$
declare r text;
begin
  if who <> 'postgres' then perform tests.become(who); end if;
  begin
    execute stmt;
    r := 'ok';
  exception
    when insufficient_privilege then r := 'DENIED';
    when check_violation then r := 'CHECK';
    when unique_violation then r := 'UNIQUE';
    when others then r := sqlerrm;
  end;
  if who <> 'postgres' then perform tests.unbecome(); end if;
  return r;
end $$;

-- 이 사람으로 값 하나 읽기 (오류면 ERR:메시지)
create function tests.get(who text, q text) returns text language plpgsql as $$
declare r text;
begin
  perform tests.become(who);
  begin
    execute q into r;
    r := coalesce(r, 'null');
  exception when others then r := 'ERR:' || sqlerrm;
  end;
  perform tests.unbecome();
  return r;
end $$;

-- 값 하나 읽기 (권한 확인 없이, postgres로)
create function tests.val(q text) returns text language plpgsql as $$
declare r text;
begin
  execute q into r;
  return coalesce(r, 'null');
end $$;

create function tests.check(section text, name text, expected text, actual text) returns void language sql as $$
  insert into tests.results (section, name, expected, actual) values (section, name, expected, actual);
$$;

-- ── 1. 권한 표 8줄 × 6명 = 48칸 ──────────────────────────────────
-- 집주인 = 그 의뢰의 집주인(A), 매칭된 중개사 = M, 다른 중개사 = O(같은 의뢰에 요청했지만 선택 안 됨)

do $$
declare
  actors text[] := array['owner_a', 'broker_m', 'broker_o', 'admin1', 'admin2', 'anon'];
  labels text[] := array['집주인', '매칭 중개사', '다른 중개사', '관리자 aal1', '관리자 aal2', '로그인 전'];
  r record;
  i integer;
begin
  for r in
    select * from (values
      -- (줄, 칸별 질의 6개, 기대 6개)
      ('받는 중 의뢰(블라인드)',
        array[format('select 1 from public.requests where id = %L', tests.id('R3'))],
        'YYYNYN'),
      ('동·호수·연락처',
        array[format('select 1 from public.reveal_contact(%L, %L)', tests.id('R1'), 'OWNER_VIEW'),
              format('select 1 from public.reveal_contact(%L, %L)', tests.id('R1'), 'MATCHED_BROKER'),
              format('select 1 from public.reveal_contact(%L, %L)', tests.id('R1'), 'MATCHED_BROKER'),
              format('select 1 from public.reveal_contact(%L, %L, %L)', tests.id('R1'), 'ADMIN_REVIEW', '분쟁 확인'),
              format('select 1 from public.reveal_contact(%L, %L, %L)', tests.id('R1'), 'ADMIN_REVIEW', '분쟁 확인'),
              format('select 1 from public.reveal_contact(%L, %L)', tests.id('R1'), 'OWNER_VIEW')],
        'YYNNYN'),
      ('사무소 정보',
        array[format('select 1 from public.request_disclosures(%L) where reg_no = %L', tests.id('R1'), 'TEST-M'),
              format('select 1 from public.broker_offices where id = %L', tests.id('office_m')),
              format('select 1 from public.broker_offices where id = %L', tests.id('office_m')),
              format('select 1 from public.broker_offices where id = %L', tests.id('office_m')),
              format('select 1 from public.broker_offices where id = %L', tests.id('office_m')),
              format('select 1 from public.broker_offices where id = %L', tests.id('office_m'))],
        'YYNNYN'),
      ('요청 카드',
        array[format('select 1 from public.owner_offer_cards(%L) where offer_id = %L', tests.id('R1'), tests.id('offer_m1')),
              format('select 1 from public.offers where id = %L', tests.id('offer_m1'))],
        'YYNNYN'),
      ('거래 기록',
        array[format('select 1 from public.deal_events where offer_id = %L', tests.id('offer_m1'))],
        'YYNNYN'),
      ('방문 일정',
        array[format('select 1 from public.visits where offer_id = %L', tests.id('offer_m1'))],
        'YYNNYN'),
      ('크레딧',
        array[format('select 1 from public.credit_ledger where office_id = %L', tests.id('office_m'))],
        'NYNNYN'),
      ('열람·처리 기록',
        array[format('select 1 from audit.access_log union all select 1 from audit.admin_actions')],
        'NNNNYN')
    ) as t(label, queries, expected)
  loop
    for i in 1..6 loop
      perform tests.check('권한 표', r.label || ' / ' || labels[i], substr(r.expected, i, 1),
        -- 질의가 하나면 6명 모두 같은 질의, 둘이면 1번째는 집주인 전용·2번째는 나머지
        tests.sees(actors[i], case
          when cardinality(r.queries) = 6 then r.queries[i]
          when cardinality(r.queries) = 2 then case when i = 1 then r.queries[1] else r.queries[2] end
          else r.queries[1] end));
    end loop;
  end loop;
end $$;

-- ── 2. 블라인드·읽기 추가 ─────────────────────────────────────────

select tests.check('블라인드', '다른 집주인(B)은 남의 받는 중 의뢰를 못 봄', 'N', tests.sees('owner_b', format('select 1 from public.requests where id = %L', tests.id('R3'))));
select tests.check('블라인드', '승인 대기 중개사는 피드 0건', 'N', tests.sees('broker_p', 'select 1 from public.requests'));
select tests.check('블라인드', '다른 중개사는 매칭된 곳 방문을 직접 못 봄 (R7)', 'N', tests.sees('broker_o', format('select 1 from public.visits where offer_id = %L', tests.id('offer_m7'))));
select tests.check('블라인드', '매칭된 다른 중개사는 방문 시간만 봄 (visit_slots)', 'Y', tests.sees('broker_o', format('select 1 from public.visit_slots(%L)', tests.id('R7'))));
select tests.check('블라인드', '선택 안 된 중개사는 방문 시간도 못 봄', 'N', tests.sees('broker_o', format('select 1 from public.visit_slots(%L)', tests.id('R1'))));
select tests.check('블라인드', '연락처 표 직접 읽기 거절 (중개사)', 'N', tests.sees('broker_m', 'select 1 from pii.request_contacts'));
select tests.check('블라인드', '연락처 표 직접 읽기 거절 (관리자 aal2)', 'N', tests.sees('admin2', 'select 1 from pii.request_contacts'));
select tests.check('블라인드', '집주인 카드 결과에 사무소 id 칸 없음', '0',
  tests.val($q$select count(*) from pg_proc p, unnest(p.proargnames) a where p.proname in ('owner_offer_cards', 'request_disclosures') and a in ('office_id', 'user_id')$q$));
select tests.check('블라인드', '집주인 카드: 개설 연도는 구간만 (M 2010년)', 'OVER_10',
  tests.get('owner_a', format($q$select office_age_band from public.owner_offer_cards(%L) where offer_id = %L$q$, tests.id('R1'), tests.id('offer_m1'))));
select tests.check('블라인드', '확인 코드 해시는 본인도 못 읽음', 'DENIED', tests.try('broker_m', 'select code_hash from public.broker_offices'));
select tests.check('블라인드', '해제 안 된 곳만 사무소 공개 (R4 해제된 M)', 'N', tests.sees('owner_a', format('select 1 from public.request_disclosures(%L)', tests.id('R4'))));

-- ── 3. 연락처 열람 기록 ─────────────────────────────────────────

select tests.check('열람 기록', '권한 표에서 성공한 열람 3번 = 기록 3줄 (집주인·M·관리자)', '3',
  tests.val(format('select count(*) from audit.access_log where request_id = %L', tests.id('R1'))));
select tests.check('열람 기록', '관리자 기록엔 사유가 남음', '분쟁 확인',
  tests.val(format($q$select reason from audit.access_log where request_id = %L and actor_role = 'admin'$q$, tests.id('R1'))));
select tests.check('열람 기록', '해제된 중개사 열람 거절', 'NOT_ALLOWED',
  tests.try('broker_m', format('select public.reveal_contact(%L, %L)', tests.id('R4'), 'MATCHED_BROKER')));
select tests.check('열람 기록', '거절된 열람은 기록 안 남음', '0', tests.val(format('select count(*) from audit.access_log where request_id = %L', tests.id('R4'))));
select tests.check('열람 기록', '관리자 사유 없이 열람 거절', 'REASON_REQUIRED',
  tests.try('admin2', format('select public.reveal_contact(%L, %L)', tests.id('R1'), 'ADMIN_REVIEW')));
select tests.check('열람 기록', '목적을 바꿔 부르기 거절 (중개사가 OWNER_VIEW)', 'NOT_ALLOWED',
  tests.try('broker_m', format('select public.reveal_contact(%L, %L)', tests.id('R1'), 'OWNER_VIEW')));
select tests.check('열람 기록', '읽기 함수: 관리자 aal2는 전부', 'Y', tests.sees('admin2', 'select 1 from public.access_log_list() where actor_role = ''broker'''));
select tests.check('열람 기록', '읽기 함수: 중개사는 내가 연 것만', 'broker', tests.get('broker_m', 'select string_agg(distinct actor_role, '','') from public.access_log_list()'));
select tests.check('열람 기록', '읽기 함수: 관리자 aal1은 남의 기록 못 봄', 'N', tests.sees('admin1', 'select 1 from public.access_log_list() where actor_role = ''broker'''));
select tests.check('열람 기록', '처리 기록 읽기: 관리자 aal2', 'Y', tests.sees('admin2', 'select 1 from public.admin_actions_list()'));
select tests.check('열람 기록', '처리 기록 읽기: 관리자 aal1 거절', 'NOT_ALLOWED', tests.try('admin1', 'select public.admin_actions_list()'));
select tests.check('열람 기록', '처리 기록 읽기: 중개사 거절', 'NOT_ALLOWED', tests.try('broker_m', 'select public.admin_actions_list()'));
select tests.check('열람 기록', '열람 결과에 집주인 전화 칸 (계정 전화 한 곳)', '1',
  tests.val($q$select count(*) from pg_proc p, unnest(p.proargnames) a where p.proname = 'reveal_contact' and a = 'owner_phone'$q$));
select tests.check('열람 기록', '열람 기록 수정 거절 (postgres도)', 'APPEND_ONLY', tests.try('postgres', $q$update audit.access_log set reason = 'x'$q$));
select tests.check('열람 기록', '열람 기록 삭제 거절 (postgres도)', 'APPEND_ONLY', tests.try('postgres', 'delete from audit.access_log'));
select tests.check('열람 기록', '처리 기록 수정 거절', 'APPEND_ONLY', tests.try('postgres', $q$update audit.admin_actions set result = 'REJECTED'$q$));

-- ── 4. 요청 보내기·크레딧 ───────────────────────────────────────

select tests.check('요청 보내기', '같은 의뢰에 두 번', 'ALREADY_SENT', tests.try('broker_o', format('select public.send_request(%L, %L)', tests.id('R1'), '{}')));
select tests.check('요청 보내기', '받는 중이 아닌 의뢰', 'CLOSED', tests.try('broker_s', format('select public.send_request(%L, %L)', tests.id('R1'), '{}')));
select tests.check('요청 보내기', '기한 지난 받는 중 의뢰', 'CLOSED', tests.try('broker_s', format('select public.send_request(%L, %L)', tests.id('R6'), '{}')));
select tests.check('요청 보내기', '승인 대기 중개사', 'NOT_APPROVED', tests.try('broker_p', format('select public.send_request(%L, %L)', tests.id('R9'), '{}')));
select tests.check('요청 보내기', '크레딧 0개', 'NO_CREDIT', tests.try('broker_q', format('select public.send_request(%L, %L)', tests.id('R9'), '{}')));
select tests.check('요청 보내기', '잘하는 점 4개', 'CHECK', tests.try('broker_s', format('select public.send_request(%L, %L)', tests.id('R9'), '{a,b,c,d}')));
select tests.check('요청 보내기', '오늘 1번째', 'ok', tests.try('broker_s', format('select public.send_request(%L, %L)', tests.id('R9'), '{가격 조율을 잘해요}')));
select tests.check('요청 보내기', '오늘 2번째', 'ok', tests.try('broker_s', format('select public.send_request(%L, %L)', tests.id('R10'), '{}')));
select tests.check('요청 보내기', '오늘 3번째', 'ok', tests.try('broker_s', format('select public.send_request(%L, %L)', tests.id('R11'), '{}')));
select tests.check('요청 보내기', '오늘 4번째 (하루 제한 없음, 크레딧이 떨어짐)', 'NO_CREDIT', tests.try('broker_s', format('select public.send_request(%L, %L)', tests.id('R12'), '{}')));
select tests.check('요청 보내기', 'S 크레딧 3 → 0', '0', tests.val($q$select sum(amount) from public.credit_ledger where office_id = '10000000-0000-0000-0000-0000000000c5'$q$));
select tests.check('요청 보내기', '카드 순번은 도착 순 1', '1', tests.val(format('select card_order from public.offers where request_id = %L', tests.id('R9'))));
select tests.check('요청 보내기', '로그인 전 실행 거절', 'DENIED', tests.try('anon', format('select public.send_request(%L, %L)', tests.id('R9'), '{}')));
select tests.check('크레딧', '장부 직접 쓰기 거절', 'DENIED',
  tests.try('broker_m', $q$insert into public.credit_ledger (office_id, kind, amount, week) values ('10000000-0000-0000-0000-0000000000c1', 'WEEKLY', 3, '2026-01-05')$q$));
select tests.check('크레딧', '같은 의뢰 사용 2번 (postgres로 직접)', 'UNIQUE',
  tests.try('postgres', format($q$insert into public.credit_ledger (office_id, kind, amount, request_id) values (%L, 'SPEND', -1, %L)$q$, tests.id('office_m'), tests.id('R1'))));
select tests.check('크레딧', '이번 주 채움: M 2 → 3', 'ok:3', tests.try('broker_m', 'select public.grant_weekly_credits()') || ':' || tests.val($q$select sum(amount) from public.credit_ledger where office_id = '10000000-0000-0000-0000-0000000000c1'$q$));
select tests.check('크레딧', '이번 주 두 번째 채움은 그대로', 'ok:3', tests.try('broker_m', 'select public.grant_weekly_credits()') || ':' || tests.val($q$select sum(amount) from public.credit_ledger where office_id = '10000000-0000-0000-0000-0000000000c1'$q$));
select tests.check('크레딧', '이번 주 지급 줄은 1개', '1', tests.val($q$select count(*) from public.credit_ledger where office_id = '10000000-0000-0000-0000-0000000000c1' and kind = 'WEEKLY' and week = private.kst_week(now())$q$));
select tests.check('크레딧', '장부 수정 거절', 'APPEND_ONLY', tests.try('postgres', 'update public.credit_ledger set amount = 3 where kind = ''WEEKLY'''));

-- ── 5. 매칭 ───────────────────────────────────────────────────

select tests.check('매칭', '4곳 매칭', 'TOO_MANY', tests.try('owner_b', format('select public.confirm_match(%L, array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()])', tests.id('R9'))));
select tests.check('매칭', '0곳 매칭', 'EMPTY', tests.try('owner_b', format($q$select public.confirm_match(%L, '{}')$q$, tests.id('R9'))));
select tests.check('매칭', '남의 의뢰 매칭', 'NO_REQUEST', tests.try('owner_a', format('select public.confirm_match(%L, array[(select id from public.offers where request_id = %L)])', tests.id('R9'), tests.id('R9'))));
select tests.check('매칭', '다른 의뢰 카드로 매칭', 'NO_OFFER', tests.try('owner_b', format('select public.confirm_match(%L, array[%L::uuid])', tests.id('R9'), tests.id('offer_m1'))));
select tests.check('매칭', '집주인은 요청 카드 표를 직접 못 읽음 (id는 카드 함수로)', 'N', tests.sees('owner_b', format('select 1 from public.offers where request_id = %L', tests.id('R9'))));
select tests.check('매칭', '내 의뢰 1곳 매칭', 'ok', tests.try('owner_b', format('select public.confirm_match(%L, array(select offer_id from public.owner_offer_cards(%L)))', tests.id('R9'), tests.id('R9'))));
select tests.check('매칭', '매칭 뒤 단계 진행', 'IN_PROGRESS', tests.val(format('select stage from public.requests where id = %L', tests.id('R9'))));
select tests.check('매칭', '매칭된 S는 연락처 열람 가능', 'ok', tests.try('broker_s', format('select public.reveal_contact(%L, %L)', tests.id('R9'), 'MATCHED_BROKER')));
select tests.check('매칭', '집주인은 단계 칸을 직접 못 바꿈', 'DENIED', tests.try('owner_a', format($q$update public.requests set stage = 'ENDED', ended_reason = 'WITHDRAWN' where id = %L$q$, tests.id('R1'))));
select tests.check('매칭', '집주인은 방문 가능 시간만 직접 바꿈', 'ok', tests.try('owner_a', format($q$update public.requests set showing = '{"weekly": {}, "blocked": []}' where id = %L$q$, tests.id('R1'))));
select tests.check('매칭', '역할 올리기 거절', 'DENIED', tests.try('broker_m', $q$update public.profiles set role = 'admin'$q$));
select tests.check('매칭', '사무소 승인 상태 직접 바꾸기 거절', 'DENIED', tests.try('broker_p', $q$update public.broker_offices set status = 'APPROVED'$q$));

-- ── 6. 거래 기록·후기 ───────────────────────────────────────────

select tests.check('거래 기록', '선택 안 된 중개사 기록 추가 거절', 'NO_OFFER',
  tests.try('broker_o', format($q$select public.append_deal_event(%L, %L, 'REPORT', '{"step": "PROVISIONAL"}')$q$, tests.id('R1'), tests.id('offer_o1'))));
select tests.check('거래 기록', '다른 중개사 카드에 기록 추가 거절 (R7, O → M 카드)', 'NOT_ALLOWED',
  tests.try('broker_o', format($q$select public.append_deal_event(%L, %L, 'REPORT', '{"step": "PROVISIONAL"}')$q$, tests.id('R7'), tests.id('offer_m7'))));
select tests.check('거래 기록', '중개사가 집주인 답 쓰기 거절', 'NOT_ALLOWED',
  tests.try('broker_m', format($q$select public.append_deal_event(%L, %L, 'ANSWER', '{"step": "PROVISIONAL", "ok": true}')$q$, tests.id('R1'), tests.id('offer_m1'))));
select tests.check('거래 기록', '집주인이 후기를 기록 함수로 쓰기 거절', 'NOT_ALLOWED',
  tests.try('owner_a', format($q$select public.append_deal_event(%L, %L, 'REVIEW', '{"stars": 5, "chips": []}')$q$, tests.id('R1'), tests.id('offer_m1'))));
select tests.check('거래 기록', '목록 밖 단계 거절', 'CHECK',
  tests.try('broker_m', format($q$select public.append_deal_event(%L, %L, 'REPORT', '{"step": "DONE"}')$q$, tests.id('R1'), tests.id('offer_m1'))));
select tests.check('거래 기록', '단계 칸 빠짐 거절', 'CHECK',
  tests.try('broker_m', format($q$select public.append_deal_event(%L, %L, 'REPORT', '{}')$q$, tests.id('R1'), tests.id('offer_m1'))));
select tests.check('거래 기록', '중개사 가계약 알림', 'ok',
  tests.try('broker_m', format($q$select public.append_deal_event(%L, %L, 'REPORT', '{"step": "PROVISIONAL", "priceManwon": 89000}')$q$, tests.id('R1'), tests.id('offer_m1'))));
-- 매칭 뒤 희망가 바꾸기 (20261027120000_owner_change_price.sql)
select tests.check('희망가', '중개사는 못 바꿈', 'NO_REQUEST',
  tests.try('broker_m', format($q$select public.owner_change_price(%L, (select asking_price_manwon + 1000 from public.requests where id = %L), 1000000, 2000000)$q$, tests.id('R1'), tests.id('R1'))));
select tests.check('희망가', '복비가 법정 상한보다 크면 거절', 'BAD_FEE',
  tests.try('owner_a', format($q$select public.owner_change_price(%L, (select asking_price_manwon + 1000 from public.requests where id = %L), 3000000, 2000000)$q$, tests.id('R1'), tests.id('R1'))));
select tests.check('희망가', '2배 넘게 바꾸면 거절 (오타)', 'BAD_PRICE',
  tests.try('owner_a', format($q$select public.owner_change_price(%L, (select asking_price_manwon * 3 from public.requests where id = %L), 1000000, 2000000)$q$, tests.id('R1'), tests.id('R1'))));
select tests.check('희망가', '집주인이 바꾸면 매칭된 곳마다 기록', 'ok:1',
  tests.try('owner_a', format($q$select public.owner_change_price(%L, (select asking_price_manwon + 1000 from public.requests where id = %L), 1000000, 2000000)$q$, tests.id('R1'), tests.id('R1')))
  || ':' || tests.val(format($q$select count(*) from public.deal_events where request_id = %L and offer_id = %L and kind = 'PRICE_CHANGED'$q$, tests.id('R1'), tests.id('offer_m1'))));
select tests.check('희망가', '집주인 알렸어요 체크', 'ok',
  tests.try('owner_a', format($q$select public.append_deal_event(%L, %L, 'PRICE_NOTIFIED', '{"priceManwon": 90000}')$q$, tests.id('R1'), tests.id('offer_m1'))));
select tests.check('희망가', '중개사는 알렸어요 못 씀', 'NOT_ALLOWED',
  tests.try('broker_m', format($q$select public.append_deal_event(%L, %L, 'PRICE_NOTIFIED', '{"priceManwon": 90000}')$q$, tests.id('R1'), tests.id('offer_m1'))));
select tests.check('거래 기록', '기록 수정 거절 (중개사)', 'DENIED', tests.try('broker_m', $q$update public.deal_events set body = '{}'$q$));
select tests.check('거래 기록', '기록 수정 거절 (postgres도)', 'APPEND_ONLY', tests.try('postgres', $q$update public.deal_events set body = '{}'$q$));
select tests.check('거래 기록', '기록 삭제 거절 (postgres도)', 'APPEND_ONLY', tests.try('postgres', 'delete from public.deal_events'));
select tests.check('후기', '잔금 확인 전 후기', 'NOT_DONE', tests.try('owner_a', format($q$select public.submit_review(%L, %L, 5, '{}')$q$, tests.id('R1'), tests.id('offer_m1'))));
select tests.check('후기', '잔금 확인 뒤 후기', 'ok', tests.try('owner_a', format($q$select public.submit_review(%L, %L, 5, '{"설명이 친절해요"}')$q$, tests.id('R8'), tests.id('offer_m8'))));
select tests.check('후기', '후기 2번', 'ALREADY_REVIEWED', tests.try('owner_a', format($q$select public.submit_review(%L, %L, 4, '{}')$q$, tests.id('R8'), tests.id('offer_m8'))));
select tests.check('후기', '후기 크레딧 돌려받기는 1번', '1', tests.val(format($q$select count(*) from public.credit_ledger where request_id = %L and kind = 'REFUND'$q$, tests.id('R8'))));
select tests.check('후기', '별점 6 거절', 'CHECK', tests.try('postgres', format($q$insert into public.deal_events (request_id, offer_id, kind, body) values (%L, %L, 'REVIEW', '{"stars": 6, "chips": []}')$q$, tests.id('R1'), tests.id('offer_m1'))));
select tests.check('후기', '후기 집계가 카드에 반영 (다른 의뢰 후기도 사무소 기준)', '1',
  tests.get('owner_a', format('select review_count from public.owner_offer_cards(%L) where offer_id = %L', tests.id('R1'), tests.id('offer_m1'))));

-- ── 7. 허위 매물 ───────────────────────────────────────────────

select tests.check('허위 매물', '중개사가 신고 상태 직접 바꾸기 거절', 'DENIED',
  tests.try('broker_m', format($q$update public.offers set fake_report_status = 'CONFIRMED', fake_report_at = now(), fake_decided_at = now() where id = %L$q$, tests.id('offer_m7'))));
select tests.check('허위 매물', '선택 안 된 곳 신고 거절', 'NO_OFFER', tests.try('broker_o', format('select public.file_fake_report(%L, %L)', tests.id('R1'), tests.id('offer_o1'))));
select tests.check('허위 매물', '같은 카드 두 번 신고', 'ALREADY_REPORTED', tests.try('broker_m', format('select public.file_fake_report(%L, %L)', tests.id('R7'), tests.id('offer_m7'))));
select tests.check('허위 매물', '관리자 aal1 판정 거절', 'NOT_ALLOWED', tests.try('admin1', format($q$select public.decide_fake_report(%L, %L, 'CONFIRMED')$q$, tests.id('R7'), tests.id('offer_m7'))));
select tests.check('허위 매물', '중개사 판정 거절', 'NOT_ALLOWED', tests.try('broker_m', format($q$select public.decide_fake_report(%L, %L, 'CONFIRMED')$q$, tests.id('R7'), tests.id('offer_m7'))));
select tests.check('허위 매물', '관리자 aal2 판정 (맞음)', 'ok', tests.try('admin2', format($q$select public.decide_fake_report(%L, %L, 'CONFIRMED')$q$, tests.id('R7'), tests.id('offer_m7'))));
select tests.check('허위 매물', '두 번 판정', 'ALREADY_DECIDED', tests.try('admin2', format($q$select public.decide_fake_report(%L, %L, 'REJECTED')$q$, tests.id('R7'), tests.id('offer_m7'))));
select tests.check('허위 매물', '의뢰 종료', 'ENDED:FAKE_CONFIRMED', tests.val(format($q$select stage || ':' || ended_reason from public.requests where id = %L$q$, tests.id('R7'))));
select tests.check('허위 매물', '매칭된 2곳 크레딧 돌려받기', '2', tests.val(format($q$select count(*) from public.credit_ledger where request_id = %L and kind = 'REFUND' and reason = 'FAKE'$q$, tests.id('R7'))));
select tests.check('허위 매물', '앞으로 잡힌 방문 자동 취소', 'SYSTEM', tests.val(format('select canceled_by from public.visits where request_id = %L', tests.id('R7'))));
select tests.check('허위 매물', '세입자 전화 즉시 삭제', 'null', tests.val(format('select tenant_phone_enc::text from pii.request_contacts where request_id = %L', tests.id('R7'))));
select tests.check('허위 매물', '처리 기록 1줄', '1', tests.val(format($q$select count(*) from audit.admin_actions where request_id = %L and target = 'FAKE_REPORT'$q$, tests.id('R7'))));
select tests.check('관리자 기록', '복비 확인 결과 기록', 'ok', tests.try('admin2', format($q$select public.admin_log_fee_review(%L, %L, 'CONFIRMED')$q$, tests.id('R8'), tests.id('offer_m8'))));
select tests.check('관리자 기록', '같은 건 두 번 판정', 'DECIDED', tests.try('admin2', format($q$select public.admin_log_fee_review(%L, %L, 'REJECTED')$q$, tests.id('R8'), tests.id('offer_m8'))));
select tests.check('관리자 기록', '연락함은 여러 번', 'ok', tests.try('admin2', format($q$select public.admin_log_fee_review(%L, %L, 'CONTACTED')$q$, tests.id('R8'), tests.id('offer_m8'))));

-- ── 8. 가입 승인 ───────────────────────────────────────────────

select tests.check('가입 승인', '관리자 aal1 거절', 'NOT_ALLOWED', tests.try('admin1', format($q$select public.approve_broker(%L, 'APPROVE', '1234', 2015)$q$, tests.id('office_p'))));
select tests.check('가입 승인', '반려 사유 없음', 'REASON_REQUIRED', tests.get('admin2', format($q$select public.approve_broker(%L, 'REJECT', null, null, ' ')$q$, tests.id('office_p'))));
select tests.check('가입 승인', '틀린 코드', 'CODE_MISMATCH', tests.get('admin2', format($q$select public.approve_broker(%L, 'APPROVE', '9999', 2015)$q$, tests.id('office_p'))));
select tests.check('가입 승인', '틀린 코드 횟수 남음 (예외 대신 반환이라 저장됨)', '1', tests.val(format('select code_attempts from public.broker_offices where id = %L', tests.id('office_p'))));
select tests.check('가입 승인', '맞는 코드 (12-34도 숫자만 비교)', 'null', tests.get('admin2', format($q$select public.approve_broker(%L, 'APPROVE', '12-34', 2015)$q$, tests.id('office_p'))));
select tests.check('가입 승인', '승인된 곳 다시 승인', 'NOT_PENDING', tests.get('admin2', format($q$select public.approve_broker(%L, 'APPROVE', '1234', 2015)$q$, tests.id('office_p'))));
select tests.check('가입 승인', '승인 뒤 상태·역할', 'APPROVED:broker', tests.val(format($q$select b.status || ':' || p.role from public.broker_offices b join public.profiles p on p.id = b.user_id where b.id = %L$q$, tests.id('office_p'))));
select tests.check('가입 승인', '승인되면 피드가 보임', 'Y', tests.sees('broker_p', format('select 1 from public.requests where id = %L', tests.id('R2'))));

-- ── 9. 거래 종료·파기 ─────────────────────────────────────────

select tests.check('파기', '해제 확인 = 세입자 전화 즉시 삭제 + 의뢰 종료', 'ok',
  tests.try('owner_a', format($q$select public.append_deal_event(%L, %L, 'ANSWER', '{"step": "PROVISIONAL", "ok": true}')$q$, tests.id('R1'), tests.id('offer_m1'))));
select tests.check('파기', '(해제 보고)', 'ok',
  tests.try('broker_m', format($q$select public.append_deal_event(%L, %L, 'REPORT', '{"step": "BROKEN"}')$q$, tests.id('R1'), tests.id('offer_m1'))));
select tests.check('파기', '(해제 확인)', 'ok',
  tests.try('owner_a', format($q$select public.append_deal_event(%L, %L, 'ANSWER', '{"step": "BROKEN", "ok": true}', '{"stage": "ENDED"}')$q$, tests.id('R1'), tests.id('offer_m1'))));
select tests.check('파기', '세입자 전화 null', 'null', tests.val(format('select tenant_phone_enc::text from pii.request_contacts where request_id = %L', tests.id('R1'))));
select tests.check('파기', '연락처는 30일 뒤 파기 예약', 'true',
  tests.val(format($q$select (purge_after between now() + interval '29 days' and now() + interval '31 days')::text from pii.request_contacts where request_id = %L$q$, tests.id('R1'))));
select tests.check('파기', '의뢰 종료 DEAL_BROKEN', 'ENDED:DEAL_BROKEN', tests.val(format($q$select stage || ':' || ended_reason from public.requests where id = %L$q$, tests.id('R1'))));
select tests.check('파기', '서버가 넘긴 단계 값 검사', 'BAD_EFFECTS',
  tests.try('owner_a', format($q$select public.append_deal_event(%L, %L, 'FEE_ANSWER', '{"kept": true}', '{"stage": "RECEIVING"}')$q$, tests.id('R8'), tests.id('offer_m8'))));
select tests.check('파기', '파기 함수는 로그인 사용자가 못 부름', 'DENIED', tests.try('admin2', 'select private.purge_expired()'));
select tests.check('파기', '파기 실행', 'ok', tests.try('postgres', 'select private.purge_expired()'));
select tests.check('파기', '종료 30일 지난 연락처 삭제 (R5)', '0', tests.val(format('select count(*) from pii.request_contacts where request_id = %L', tests.id('R5'))));
select tests.check('파기', '받는 중 기한 30일 지난 연락처 삭제 (R6)', '0', tests.val(format('select count(*) from pii.request_contacts where request_id = %L', tests.id('R6'))));
select tests.check('파기', '진행 중 연락처는 남음 (R8)', '1', tests.val(format('select count(*) from pii.request_contacts where request_id = %L', tests.id('R8'))));
select tests.check('파기', '의뢰 블라인드 칸은 남음 (R5)', '1', tests.val(format('select count(*) from public.requests where id = %L', tests.id('R5'))));
select tests.check('파기', '13개월 지난 행동 기록만 삭제', 'hash-new-00000', tests.val('select string_agg(actor_hash, '','') from public.events'));
select tests.check('파기', '2년 지난 열람 기록만 삭제', '0', tests.val($q$select count(*) from audit.access_log where at < now() - interval '2 years'$q$));
select tests.check('파기', '지운 건수 기록 4줄', '4', tests.val('select count(*) from audit.purge_log'));

-- ── 9-1. 홈 숫자 카드 공개 집계 ──────────────────────────────────

select tests.check('공개 집계', '로그인 전에도 부를 수 있음', 'Y', tests.sees('anon', 'select public.public_stats()'));
select tests.check('공개 집계', '돌려주는 칸은 합계·개수 3개뿐', 'calcCount,feeGapTotalWon,matchCount',
  tests.get('anon', 'select string_agg(k, '','' order by k) from jsonb_object_keys(public.public_stats()) k'));
select tests.check('공개 집계', '매칭 건수 = 매칭 확정된 의뢰 수', tests.val('select count(*) from public.requests where matched_at is not null'),
  tests.get('anon', $q$select public.public_stats() ->> 'matchCount'$q$));
select tests.check('공개 집계', '낮게 정한 금액 합 = (상한 − 합의 복비) 합', tests.val('select sum(legal_max_won - commission_won) from public.requests where matched_at is not null'),
  tests.get('anon', $q$select public.public_stats() ->> 'feeGapTotalWon'$q$));
select tests.check('공개 집계', '로그인 전 다른 함수는 여전히 거절', 'DENIED', tests.try('anon', 'select public.owner_offer_cards(gen_random_uuid())'));

-- ── 9-2. 관리자 웹 푸시 받는 기기 ─────────────────────────────────

select tests.check('웹 푸시', '관리자 aal2: 자기 기기 등록', 'ok', tests.try('admin2', format($q$insert into public.admin_push_subscriptions (endpoint, user_id, p256dh, auth) values ('https://push.example/a2', %L, 'p', 'a')$q$, tests.id('admin2'))));
select tests.check('웹 푸시', '관리자 aal2: 끄기(active)', 'ok', tests.try('admin2', $q$update public.admin_push_subscriptions set active = false where endpoint = 'https://push.example/a2'$q$));
select tests.check('웹 푸시', '관리자 aal2: 자기 기기 읽기', 'Y', tests.sees('admin2', 'select 1 from public.admin_push_subscriptions'));
select tests.check('웹 푸시', '관리자 aal1 등록 거절', 'DENIED', tests.try('admin1', format($q$insert into public.admin_push_subscriptions (endpoint, user_id, p256dh, auth) values ('https://push.example/a1', %L, 'p', 'a')$q$, tests.id('admin1'))));
select tests.check('웹 푸시', '집주인 등록 거절', 'DENIED', tests.try('owner_a', format($q$insert into public.admin_push_subscriptions (endpoint, user_id, p256dh, auth) values ('https://push.example/o', %L, 'p', 'a')$q$, tests.id('owner_a'))));
select tests.check('웹 푸시', '다른 사람은 못 읽음', 'N', tests.sees('admin1', 'select 1 from public.admin_push_subscriptions'));
select tests.check('웹 푸시', '지우기 없음', 'DENIED', tests.try('admin2', 'delete from public.admin_push_subscriptions'));
select tests.check('웹 푸시 발송', '서버 키: 처리 기록 읽기', 'Y', tests.sees('service', 'select 1 from public.admin_actions_list()'));
select tests.check('웹 푸시 발송', '서버 키: 보낸 기록 쓰기', 'ok', tests.try('service', $q$insert into public.admin_push_sent (day, key) values ('2026-10-29', 'MORNING')$q$));
select tests.check('웹 푸시 발송', '같은 날 같은 알림 두 번 거절', 'UNIQUE', tests.try('service', $q$insert into public.admin_push_sent (day, key) values ('2026-10-29', 'MORNING')$q$));
select tests.check('웹 푸시 발송', '서버 키: 받는 기기 읽기', 'Y', tests.sees('service', 'select 1 from public.admin_push_subscriptions'));
select tests.check('웹 푸시 발송', '관리자 aal2: 보낸 기록 읽기만', 'Y', tests.sees('admin2', 'select 1 from public.admin_push_sent'));
select tests.check('웹 푸시 발송', '관리자도 보낸 기록은 못 씀', 'DENIED', tests.try('admin2', $q$insert into public.admin_push_sent (day, key) values ('2026-10-30', 'X')$q$));
select tests.check('웹 푸시 발송', '중개사는 보낸 기록 못 읽음', 'N', tests.sees('broker_m', 'select 1 from public.admin_push_sent'));
select tests.check('웹 푸시 발송', '중개사는 처리 기록 함수 거절', 'NOT_ALLOWED', tests.try('broker_m', 'select public.admin_actions_list()'));
select tests.check('웹 푸시', 'https 주소만', 'CHECK', tests.try('postgres', format($q$insert into public.admin_push_subscriptions (endpoint, user_id, p256dh, auth) values ('http://x', %L, 'p', 'a')$q$, tests.id('admin2'))));

-- ── 10. check 목록 밖 값 ────────────────────────────────────────

select tests.check('check', '의뢰 단계 DONE 거절', 'CHECK', tests.try('postgres', format($q$update public.requests set stage = 'DONE' where id = %L$q$, tests.id('R3'))));
select tests.check('check', '종료 이유 없는 ENDED 거절', 'CHECK', tests.try('postgres', format($q$update public.requests set stage = 'ENDED' where id = %L$q$, tests.id('R3'))));
select tests.check('check', '복비가 법정 상한 초과 거절', 'CHECK', tests.try('postgres', format('update public.requests set commission_won = legal_max_won + 1 where id = %L', tests.id('R3'))));
select tests.check('check', '방문 시간 12시 거절', 'CHECK', tests.try('postgres', format('update public.visits set visit_hour = 12 where request_id = %L', tests.id('R1'))));
select tests.check('check', '행동 기록 이름 목록 밖 거절', 'CHECK',
  tests.try('postgres', $q$insert into public.events (name, role, actor_hash, session_id, app_version) values ('unknown', 'owner', 'hash-0000', 's', 't')$q$));
select tests.check('check', '로그인 사용자는 행동 기록 못 씀 (서버만)', 'DENIED',
  tests.try('owner_a', $q$insert into public.events (name, role, actor_hash, session_id, app_version) values ('feed_view', 'broker', 'hash-0000', 's', 't')$q$));
-- A7 (2026-10-29): 새 이름 5개는 서버 키로만 저장, 로그인 전에도 직접 못 씀
select tests.check('check', '로그인 전에는 행동 기록 못 씀', 'DENIED',
  tests.try('anon', $q$insert into public.events (name, role, actor_hash, session_id, app_version) values ('page_visit', 'owner', 'hash-0000', 's', 't')$q$));
select tests.check('check', '서버 키는 새 이름(방문·검색·FAQ·문의·크레딧 고름) 저장', 'ok',
  tests.try('service', $q$insert into public.events (name, role, actor_hash, session_id, app_version) values
    ('page_visit', 'owner', 'hash-a7-0001', 's', 't'), ('complex_search', 'owner', 'hash-a7-0001', 's', 't'), ('faq_view', 'broker', 'hash-a7-0001', 's', 't'),
    ('inquiry_send', 'owner', 'hash-a7-0001', 's', 't'), ('more_credits_answer', 'broker', 'hash-a7-0001', 's', 't')$q$));
