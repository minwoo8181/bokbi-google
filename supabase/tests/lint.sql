-- 보안·성능 점검 (Supabase get_advisors와 같은 항목을 SQL로 직접). 결과 = tests.lint 행, WARN·ERROR가 0이어야 통과.
-- 대상: 우리가 만든 스키마 public·pii·private·audit (tests 스키마 제외). 브랜치에서는 get_advisors 결과와 함께 본다.

create schema if not exists tests;
create table if not exists tests.lint (level text not null, name text not null, detail text not null);
truncate tests.lint;

-- 0013 rls_disabled_in_public 등: RLS 꺼진 표
insert into tests.lint
select 'ERROR', 'rls_disabled', n.nspname || '.' || c.relname
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where c.relkind = 'r' and n.nspname in ('public', 'pii', 'audit') and not c.relrowsecurity;

-- 0011 function_search_path_mutable: search_path 고정 안 된 함수
insert into tests.lint
select 'WARN', 'function_search_path_mutable', n.nspname || '.' || p.proname
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname in ('public', 'private', 'audit')
   and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%');

-- 로그인 전(anon)이 실행할 수 있는 함수 (예외는 홈 숫자 카드 공개 집계 public_stats 하나 — 합계·개수만)
insert into tests.lint
select 'ERROR', 'anon_can_execute', n.nspname || '.' || p.proname
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname in ('public', 'private', 'audit') and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'EXECUTE')
   and not (n.nspname = 'public' and p.proname = 'public_stats');

-- 로그인 사용자가 실행할 수 있는 security definer 함수 중 RPC 목록·정책 함수에 없는 것 (실수로 열린 함수)
insert into tests.lint
select 'WARN', 'unexpected_authenticated_execute', n.nspname || '.' || p.proname
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname in ('public', 'private', 'audit') and p.prosecdef and has_function_privilege('authenticated', p.oid, 'EXECUTE')
   and p.proname not in (
     'submit_request', 'send_request', 'confirm_match', 'release_offer', 'owner_sale_change', 'owner_change_price', 'append_deal_event', 'submit_review',
     'file_fake_report', 'decide_fake_report', 'admin_log_fee_review', 'grant_weekly_credits', 'approve_broker', 'owner_offer_cards',
     'request_disclosures', 'visit_slots', 'reveal_contact', 'access_log_list', 'admin_actions_list', 'public_stats',
     'is_admin', 'my_office_id', 'owns_request', 'owns_offer', 'sent_to_request', 'is_matched_broker', 'is_active_offer');

-- anon이 읽거나 쓸 수 있는 표
insert into tests.lint
select 'ERROR', 'anon_table_privilege', n.nspname || '.' || c.relname
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where c.relkind = 'r' and n.nspname in ('public', 'pii', 'audit')
   and (has_table_privilege('anon', c.oid, 'SELECT') or has_table_privilege('anon', c.oid, 'INSERT')
        or has_table_privilege('anon', c.oid, 'UPDATE') or has_table_privilege('anon', c.oid, 'DELETE'));

-- 로그인 사용자가 연락처 표에 직접 닿음
insert into tests.lint
select 'ERROR', 'pii_table_privilege', n.nspname || '.' || c.relname
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where c.relkind = 'r' and n.nspname = 'pii'
   and (has_table_privilege('authenticated', c.oid, 'SELECT') or has_table_privilege('authenticated', c.oid, 'INSERT')
        or has_table_privilege('authenticated', c.oid, 'UPDATE') or has_table_privilege('authenticated', c.oid, 'DELETE'));

-- 로그인 사용자가 지울 수 있는 표 (이 설계엔 삭제가 없음)
insert into tests.lint
select 'WARN', 'authenticated_can_delete', n.nspname || '.' || c.relname
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where c.relkind = 'r' and n.nspname in ('public', 'pii', 'audit') and has_table_privilege('authenticated', c.oid, 'DELETE');

-- 0003 auth_rls_initplan: 정책 안의 auth.*·private.* 호출이 (select …)로 감싸이지 않음 (행마다 다시 계산)
insert into tests.lint
select 'WARN', 'auth_rls_initplan', schemaname || '.' || tablename || ' / ' || policyname
  from pg_policies
 where schemaname in ('public', 'pii', 'audit')
   and (
     (select count(*) from regexp_matches(coalesce(qual, '') || ' ' || coalesce(with_check, ''), '(auth|private)\.\w+\(', 'g'))
     <> (select count(*) from regexp_matches(coalesce(qual, '') || ' ' || coalesce(with_check, ''), 'SELECT (auth|private)\.\w+\(', 'g'))
   );

-- 0006 multiple_permissive_policies: 같은 표·역할·동작에 허용 정책 2개 이상
insert into tests.lint
select 'WARN', 'multiple_permissive_policies', schemaname || '.' || tablename || ' / ' || cmd || ' / ' || r
  from pg_policies, unnest(roles) r
 where schemaname in ('public', 'pii', 'audit') and permissive = 'PERMISSIVE'
 group by schemaname, tablename, cmd, r having count(*) > 1;

-- 0001 unindexed_foreign_keys
insert into tests.lint
select 'INFO', 'unindexed_foreign_keys', cn.nspname || '.' || cl.relname || ' / ' || c.conname
  from pg_constraint c
  join pg_class cl on cl.oid = c.conrelid
  join pg_namespace cn on cn.oid = cl.relnamespace
 where c.contype = 'f' and cn.nspname in ('public', 'pii', 'audit')
   and not exists (
     select 1 from pg_index i
      where i.indrelid = c.conrelid and (i.indkey::int2[])[0:cardinality(c.conkey) - 1] = c.conkey
   );

-- 0009 duplicate_index
insert into tests.lint
select 'WARN', 'duplicate_index', n.nspname || '.' || string_agg(ci.relname, ', ')
  from pg_index i join pg_class ci on ci.oid = i.indexrelid join pg_namespace n on n.oid = ci.relnamespace
 where n.nspname in ('public', 'pii', 'audit')
 group by n.nspname, i.indrelid, i.indkey::text, coalesce(pg_get_expr(i.indpred, i.indrelid), '')
having count(*) > 1;

-- 0008 rls_enabled_no_policy: 정책 없는 RLS 표 (pii.request_contacts는 의도 — 함수로만 열람)
insert into tests.lint
select case when n.nspname = 'pii' then 'INFO' else 'WARN' end, 'rls_enabled_no_policy', n.nspname || '.' || c.relname
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where c.relkind = 'r' and n.nspname in ('public', 'pii', 'audit') and c.relrowsecurity
   and not exists (select 1 from pg_policies p where p.schemaname = n.nspname and p.tablename = c.relname);
