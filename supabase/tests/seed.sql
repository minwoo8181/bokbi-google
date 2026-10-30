-- 시험 데이터 (가짜만 — 실제 개인정보 금지). 고정 uuid로 permissions.sql이 가리킨다.
-- 사람: 집주인 A·B / 중개사 M(R1에 매칭), O(R1엔 선택 안 됨), P(승인 대기), Q(승인·크레딧 0), S(이번 주 3개) / 관리자
-- 의뢰: R1 진행(세입자) · R2 받는 중(B) · R3 받는 중(A) · R4 진행(M 해제됨) · R5 끝남 31일 · R6 받는 중 기한 31일 지남
--       R7 진행(M·O 매칭, M이 허위 매물 신고 중) · R8 진행(M 잔금 확인됨) · R9~R12 받는 중(B, 크레딧 3개를 다 쓰는 시험)

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-0000000000c1'), ('00000000-0000-0000-0000-0000000000c2'), ('00000000-0000-0000-0000-0000000000c3'),
  ('00000000-0000-0000-0000-0000000000c4'), ('00000000-0000-0000-0000-0000000000c5'),
  ('00000000-0000-0000-0000-0000000000d1');
update public.profiles set role = 'broker' where id in ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2',
  '00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000c5');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000d1';

insert into public.broker_offices (id, user_id, reg_no, office_name, ceo_name, office_phone, address, open_year, agent_count, status, code_hash, reviewed_at) values
  ('10000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', 'TEST-M', '시험공인중개사 M', '가나다', '010-0000-0001', '시험시 시험로 1', 2010, 2, 'APPROVED', 'x', now()),
  ('10000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c2', 'TEST-O', '시험공인중개사 O', '라마바', '010-0000-0002', '시험시 시험로 2', extract(year from now())::smallint - 1, 1, 'APPROVED', 'x', now()),
  ('10000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000c4', 'TEST-Q', '시험공인중개사 Q', '', '', '', null, null, 'APPROVED', 'x', now()),
  ('10000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000c5', 'TEST-S', '시험공인중개사 S', '', '', '', 2020, null, 'APPROVED', 'x', now());
insert into public.broker_offices (id, user_id, reg_no, office_name, status, code_hash) values
  ('10000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c3', 'TEST-P', '시험공인중개사 P', 'PENDING',
   extensions.crypt('1234', extensions.gen_salt('bf')));

insert into public.requests (id, owner_id, complex_name, trade_type, pyeong_label, floor_label, masked_dong_ho, asking_price_manwon,
  commission_won, legal_max_won, occupancy, stage, ended_reason, created_at, receiving_until, matched_at, ad_window_started_at, ended_at) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', '시험단지', '매매', '34평', '중층', '1**동', 90000, 3000000, 4500000, 'TENANT',
   'IN_PROGRESS', null, now() - interval '9 days', now() - interval '7 days', now() - interval '8 days', now() - interval '8 days', null),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', '시험단지', '전세', '25평', '고층', '2**동', 50000, 1500000, 2000000, 'VACANT',
   'RECEIVING', null, now(), now() + interval '24 hours', null, null, null),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a1', '시험단지', '매매', '34평', '저층', '3**동', 85000, 3000000, 4250000, 'OWNER',
   'RECEIVING', null, now(), now() + interval '24 hours', null, null, null),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a1', '시험단지', '매매', '34평', '중층', '4**동', 90000, 3000000, 4500000, 'VACANT',
   'IN_PROGRESS', null, now() - interval '9 days', now() - interval '7 days', now() - interval '8 days', now() - interval '8 days', null),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000a1', '시험단지', '매매', '34평', '중층', '5**동', 90000, 3000000, 4500000, 'TENANT',
   'ENDED', 'WITHDRAWN', now() - interval '45 days', now() - interval '43 days', now() - interval '44 days', now() - interval '44 days', now() - interval '31 days'),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000b1', '시험단지', '전세', '25평', '중층', '6**동', 50000, 1500000, 2000000, 'VACANT',
   'RECEIVING', null, now() - interval '33 days', now() - interval '31 days', null, null, null),
  ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000a1', '시험단지', '매매', '34평', '중층', '7**동', 90000, 3000000, 4500000, 'TENANT',
   'IN_PROGRESS', null, now() - interval '9 days', now() - interval '7 days', now() - interval '8 days', now() - interval '8 days', null),
  ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000a1', '시험단지', '매매', '34평', '중층', '8**동', 90000, 3000000, 4500000, 'VACANT',
   'CONTRACTED', null, now() - interval '60 days', now() - interval '58 days', now() - interval '59 days', now() - interval '59 days', null);
insert into public.requests (id, owner_id, complex_name, trade_type, pyeong_label, floor_label, masked_dong_ho, asking_price_manwon, commission_won, legal_max_won, occupancy)
select ('20000000-0000-0000-0000-0000000000' || n)::uuid, '00000000-0000-0000-0000-0000000000b1', '시험단지', '매매', '34평', '중층', n || '**동', 90000, 3000000, 4500000, 'VACANT'
  from unnest(array['09', '10', '11', '12']) n;

insert into pii.request_contacts (request_id, dong_ho_enc, owner_name_enc, tenant_phone_enc, purge_after) values
  ('20000000-0000-0000-0000-000000000001', '\x01', '\x02', '\x03', null),
  ('20000000-0000-0000-0000-000000000003', '\x01', '\x02', null, null),
  ('20000000-0000-0000-0000-000000000004', '\x01', '\x02', null, null),
  ('20000000-0000-0000-0000-000000000005', '\x01', '\x02', null, now() - interval '1 day'),
  ('20000000-0000-0000-0000-000000000006', '\x01', '\x02', null, null),
  ('20000000-0000-0000-0000-000000000007', '\x01', '\x02', '\x03', null),
  ('20000000-0000-0000-0000-000000000008', '\x01', '\x02', null, null);

-- 요청 카드: 3x = 사무소(c1=M, c2=O) · 의뢰 번호
insert into public.offers (id, request_id, office_id, card_order, arrived_at, strengths, matched_at, released_at, fake_report_status, fake_report_at) values
  ('30000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-0000000000c1', 1, now() - interval '8 days 2 hours', '{"가격 조율을 잘해요"}', now() - interval '8 days', null, null, null),
  ('30000000-0000-0000-0000-0000000001c2', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-0000000000c2', 2, now() - interval '8 days 1 hour', '{}', null, null, null, null),
  ('30000000-0000-0000-0000-0000000004c1', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-0000000000c1', 1, now() - interval '8 days 2 hours', '{}', now() - interval '8 days', now() - interval '1 day', null, null),
  ('30000000-0000-0000-0000-0000000007c1', '20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-0000000000c1', 1, now() - interval '8 days 2 hours', '{}', now() - interval '8 days', null, 'PENDING', now() - interval '1 hour'),
  ('30000000-0000-0000-0000-0000000007c2', '20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-0000000000c2', 2, now() - interval '8 days 1 hour', '{}', now() - interval '8 days', null, null, null),
  ('30000000-0000-0000-0000-0000000008c1', '20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-0000000000c1', 1, now() - interval '59 days 1 hour', '{}', now() - interval '59 days', null, null, null);

insert into public.deal_events (request_id, offer_id, kind, body, at) values
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-0000000000c1', 'OWNER_CHECKED', '{"how": "CONFIRMED"}', now() - interval '7 days'),
  ('20000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-0000000008c1', 'REPORT', '{"step": "BALANCE"}', now() - interval '3 days'),
  ('20000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-0000000008c1', 'ANSWER', '{"step": "BALANCE", "ok": true}', now() - interval '2 days');

insert into public.visits (request_id, offer_id, visit_date, visit_hour) values
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-0000000000c1', private.kst_date(now()) + 2, 14),
  ('20000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-0000000007c1', private.kst_date(now()) + 2, 15);

insert into public.credit_ledger (office_id, kind, amount, request_id, reason, week, at) values
  ('10000000-0000-0000-0000-0000000000c1', 'WEEKLY', 3, null, null, private.kst_week(now()) - 14, now() - interval '14 days'),
  ('10000000-0000-0000-0000-0000000000c1', 'WEEKLY', 3, null, null, private.kst_week(now()) - 7, now() - interval '7 days'),
  ('10000000-0000-0000-0000-0000000000c1', 'SPEND', -1, '20000000-0000-0000-0000-000000000001', null, null, now() - interval '8 days'),
  ('10000000-0000-0000-0000-0000000000c1', 'SPEND', -1, '20000000-0000-0000-0000-000000000004', null, null, now() - interval '8 days'),
  ('10000000-0000-0000-0000-0000000000c1', 'SPEND', -1, '20000000-0000-0000-0000-000000000007', null, null, now() - interval '8 days'),
  ('10000000-0000-0000-0000-0000000000c1', 'SPEND', -1, '20000000-0000-0000-0000-000000000008', null, null, now() - interval '59 days'),
  ('10000000-0000-0000-0000-0000000000c2', 'WEEKLY', 3, null, null, private.kst_week(now()) - 7, now() - interval '7 days'),
  ('10000000-0000-0000-0000-0000000000c2', 'SPEND', -1, '20000000-0000-0000-0000-000000000001', null, null, now() - interval '8 days'),
  ('10000000-0000-0000-0000-0000000000c2', 'SPEND', -1, '20000000-0000-0000-0000-000000000007', null, null, now() - interval '8 days'),
  ('10000000-0000-0000-0000-0000000000c5', 'WEEKLY', 3, null, null, private.kst_week(now()), now());

insert into public.events (at, name, role, actor_hash, session_id, app_version) values
  (now() - interval '14 months', 'feed_view', 'broker', 'hash-old-00000', 's1', 'test'),
  (now() - interval '1 day', 'feed_view', 'broker', 'hash-new-00000', 's2', 'test');

insert into audit.access_log (actor_id, actor_role, request_id, purpose, at) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner', '20000000-0000-0000-0000-000000000003', 'OWNER_VIEW', now() - interval '3 years'),
  ('00000000-0000-0000-0000-0000000000a1', 'owner', '20000000-0000-0000-0000-000000000003', 'OWNER_VIEW', now() - interval '1 day');
insert into audit.admin_actions (actor_id, target, request_id, offer_id, result) values
  ('00000000-0000-0000-0000-0000000000d1', 'FEE_OVERCHARGED', '20000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-0000000008c1', 'CONTACTED');
