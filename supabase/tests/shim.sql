-- 시험 전용 (PGlite): Supabase가 미리 만들어 두는 것을 같은 모양으로 흉내 낸다. 운영·브랜치에는 적용하지 않는다.
-- 역할 3개, auth.users, auth.uid()·auth.jwt()(요청마다 request.jwt.claims 설정을 읽음), extensions 스키마,
-- 그리고 public 스키마의 새 테이블·함수에 anon·authenticated 전체 권한을 주는 Supabase 기본 설정 (마이그레이션이 회수하는지 시험하려고)

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema auth;
create schema extensions;
grant usage on schema public, extensions to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key,
  phone text,
  created_at timestamptz not null default now()
);

create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid;
$$;
grant execute on function auth.jwt(), auth.uid() to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
