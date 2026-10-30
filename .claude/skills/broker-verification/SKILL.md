---
name: broker-verification
description: Domain rules and workflow for certified real estate broker onboarding, document upload (VWorld, business card, office photo), admin approval, and credit-based request quota (no daily cap).
---

# Broker Onboarding & Quota Control Specification

## 1. Registration Flow & Document Proof
- **Applicant Fields**:
  - Name, Phone, Broker Office Name (`agent_office_name`), Registration Number (`agent_license_num`), Assigned Region (`region_dong = '다산동'`).
- **Required Verification Uploads**:
  - 1) 브이월드(VWorld) 부동산 중개업 조회 화면 캡처
  - 2) 공인중개사 명함 사진
  - 3) 중개사무소 외부 간판/전경 사진
- **Storage**: Supabase Storage bucket `broker-docs` (Private bucket with signed URLs for admin view only).
- **Default State**: `is_verified = false`. Pending admin manual approval via Supabase Table Editor or Admin panel.

## 2. Request Quota = Credits only (하루 제한 없음, 대표님 2026-10-29)
- **No daily cap.** The earlier "3 per day" rule was removed: credits already refill to 3 every Monday (KST), so a second "3" only confused brokers.
- **Enforcement**: one credit per request (`lib/broker/credits.ts`, RPC `send_request` → `NO_CREDIT`). Do not reintroduce a per-day count without the owner's approval.

## 3. Go-To-Market & Onboarding Strategy (외부 중개사무소 1차 집중 공략)
- **도메인 핵심 배경**:
  - 단지 내 상가 부동산: 가만히 있어도 집주인 워크인(Walk-in)으로 매물이 들어와 플랫폼 초기 참여 유인이 상대적으로 낮음.
  - 단지 외곽/원거리 부동산: 다산 핵심 대단지(다산자이, 푸르지오, 힐스테이트 등) 매물 확보가 매우 어려우며 포털 광고비 부담이 극심함.
- **초기 홍보/영업 전략**:
  - 1차 영업 타겟을 **단지 외곽 및 인근 외부 중개사무소**로 집중 지정.
  - 슬로건/소구점: *"단지 밖에서도 다산 대단지 진성 매물을 광고비 0원으로 즉시 수락하세요."*
  - 인증 방식: 브이월드 화면 캡처 + 명함 + 사무소 사진 3종 업로드 ➔ 관리자 수동 승인(Admin Approval). 추후 공공 API 표준화 시 원클릭 인증으로 고도화.
