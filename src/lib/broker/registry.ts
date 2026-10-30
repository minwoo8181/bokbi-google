/**
 * 중개사 가입 명단 대조 (결정론, 순수 함수)
 * - 대표 공인중개사만: 등록번호로 찾은 뒤 대표자·상호를 맞춘다
 * - 명단(src/data/brokers/dasan-offices.json)은 대표자·전화가 들어 있어 서버에서만 읽는다. 이 파일은 명단을 인자로 받아 화면 번들에 끌려가지 않게 한다
 * - 실패 메시지는 등록번호가 명단에 있는지까지만 알려준다 (대표자 이름을 추측하게 두지 않음)
 * 설계: docs/handover/phase5-broker-signup.md §5
 */

export interface BrokerRegistryEntry {
  regNo: string;
  ceo: string;
  office: string;
  address: string;
  /** 확인 전화 번호 (관리자용). 명단 번호가 없으면 상호 안 번호, 그것도 없으면 null → 네이버 부동산 광고 번호로 */
  phone: string | null;
  /** 명단 전화 칸에 번호가 여러 개일 때 나머지 (관리자 확인용, 화면으로 내려보내지 않음) */
  altPhones: string[];
  phoneSource: 'listed' | 'office-name' | null;
  status: string;
  /** 표준 형식 등록번호의 연도. 옛 형식은 null → 관리자가 등록일로 채움 */
  openYear: number | null;
}

export interface BrokerSignupInput {
  regNo: string;
  ceo: string;
  office: string;
}

export type BrokerMatchResult =
  | { status: 'MATCHED' | 'NAME_CLOSE'; entry: BrokerRegistryEntry }
  | { status: 'NOT_FOUND' | 'CEO_MISMATCH' | 'OFFICE_MISMATCH' | 'SUSPENDED' | 'ALREADY_JOINED' };

const ACTIVE_STATUS = '영업중';

/**
 * 등록번호 비교용: 숫자·한글 기호(옛 형식 `가3622-08-04`의 `가`)만 남긴다.
 * 하이픈 없이 숫자만 입력해도(`41360202460048`) 같은 번호로 본다 (대표님 2026-10-25). `제`·`호`·공백·하이픈 종류 무시
 */
export function normalizeRegNo(s: string): string {
  return s.replace(/[제호]/g, '').replace(/[^0-9a-zA-Z가-힣]/g, '');
}

export function normalizeCeo(s: string): string {
  return s.replace(/\s/g, '');
}

/** 상호: 괄호 안(전화번호 등)·법인 표기·업종 꼬리말·공백 제거, 영문 소문자 */
export function normalizeOffice(s: string): string {
  return s
    .replace(/\(.*?\)/g, '')
    .replace(/주식회사|\(주\)|㈜/g, '')
    .replace(/공인중개사사무소|부동산중개법인|부동산중개사무소|중개사무소|공인중개사|부동산중개|부동산/g, '')
    .replace(/[\s·.,]/g, '')
    .toLowerCase();
}

export function matchBrokerOffice(
  input: BrokerSignupInput,
  registry: readonly BrokerRegistryEntry[],
  joinedRegNos: ReadonlySet<string> = new Set(),
): BrokerMatchResult {
  const regNo = normalizeRegNo(input.regNo);
  const entry = registry.find((e) => normalizeRegNo(e.regNo) === regNo);
  if (!entry) return { status: 'NOT_FOUND' };
  if (normalizeCeo(entry.ceo) !== normalizeCeo(input.ceo)) return { status: 'CEO_MISMATCH' };
  if (entry.status !== ACTIVE_STATUS) return { status: 'SUSPENDED' };
  if (joinedRegNos.has(normalizeRegNo(entry.regNo))) return { status: 'ALREADY_JOINED' };

  const a = normalizeOffice(entry.office);
  const b = normalizeOffice(input.office);
  if (a === b && a !== '') return { status: 'MATCHED', entry };
  // 상호 일부만 쓴 경우 (예: "금강하나" ↔ "금강하나공인중개사사무소"는 위에서 이미 같음, "1등" ↔ "1등푸르지오") → 관리자 확인
  if (a && b && (a.includes(b) || b.includes(a))) return { status: 'NAME_CLOSE', entry };
  return { status: 'OFFICE_MISMATCH' };
}
