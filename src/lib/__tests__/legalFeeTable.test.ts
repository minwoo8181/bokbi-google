import { describe, it, expect } from 'vitest';
import { calculateLegalCommission, commissionFromDiscount, commissionVat, computeCommissionQuote } from '../commission';
import { formatWon } from '../utils';
import { getMatchCaseFeed } from '../market/repository';
import type { TradeType } from '@/components/analysis/types';

/**
 * 공식 요율표 대조: 한국공인중개사협회 게시 「부동산 중개보수 요율표」 (공인중개사법 시행규칙 공포·시행 2021.12.30)
 * 주택(주택의 부속토지, 주택분양권 포함). 행마다 하한 경계·상한 직전 금액의 요율과 한도를 확인한다.
 */
const 억 = 100_000_000;
const 만 = 10_000;

interface Row {
  type: TradeType;
  label: string;
  /** 구간 하한 (이상) */
  from: number;
  /** 구간 상한 (미만), 마지막 구간은 null */
  to: number | null;
  permille: number;
  limitWon: number | null;
}

const OFFICIAL_TABLE: Row[] = [
  { type: '매매', label: '5천만원 미만', from: 0, to: 5000 * 만, permille: 6, limitWon: 250_000 },
  { type: '매매', label: '5천만원 이상 ~ 2억원 미만', from: 5000 * 만, to: 2 * 억, permille: 5, limitWon: 800_000 },
  { type: '매매', label: '2억원 이상 ~ 9억원 미만', from: 2 * 억, to: 9 * 억, permille: 4, limitWon: null },
  { type: '매매', label: '9억원 이상 ~ 12억원 미만', from: 9 * 억, to: 12 * 억, permille: 5, limitWon: null },
  { type: '매매', label: '12억원 이상 ~ 15억원 미만', from: 12 * 억, to: 15 * 억, permille: 6, limitWon: null },
  { type: '매매', label: '15억원 이상', from: 15 * 억, to: null, permille: 7, limitWon: null },
  { type: '전세', label: '5천만원 미만', from: 0, to: 5000 * 만, permille: 5, limitWon: 200_000 },
  { type: '전세', label: '5천만원 이상 ~ 1억원 미만', from: 5000 * 만, to: 1 * 억, permille: 4, limitWon: 300_000 },
  { type: '전세', label: '1억원 이상 ~ 6억원 미만', from: 1 * 억, to: 6 * 억, permille: 3, limitWon: null },
  { type: '전세', label: '6억원 이상 ~ 12억원 미만', from: 6 * 억, to: 12 * 억, permille: 4, limitWon: null },
  { type: '전세', label: '12억원 이상 ~ 15억원 미만', from: 12 * 억, to: 15 * 억, permille: 5, limitWon: null },
  { type: '전세', label: '15억원 이상', from: 15 * 억, to: null, permille: 6, limitWon: null },
];

/** 요율표 정의 그대로의 기대값: 거래금액 × 요율, 원 미만 절사, 한도액 초과 불가 */
const expected = (price: number, row: Row) => {
  const raw = Math.floor((price * row.permille) / 1000);
  return row.limitWon === null ? raw : Math.min(raw, row.limitWon);
};

describe('법정 중개보수 — 공식 요율표 행별 대조 (2021.12.30 시행)', () => {
  for (const row of OFFICIAL_TABLE) {
    describe(`${row.type} ${row.label} · 1천분의 ${row.permille}${row.limitWon ? ` · 한도 ${row.limitWon / 만}만원` : ''}`, () => {
      // 하한 경계(0원 구간은 1천만원), 구간 중간, 상한 직전(1원 아래)
      const lower = row.from === 0 ? 1000 * 만 : row.from;
      const upper = row.to === null ? 30 * 억 : row.to - 1;
      const middle = Math.round((lower + upper) / 2 / 만) * 만;

      for (const price of [lower, middle, upper]) {
        it(`${price.toLocaleString()}원`, () => {
          const res = calculateLegalCommission(price, row.type);
          expect(res.ratePercent).toBe(row.permille / 10);
          expect(res.limitWon).toBe(row.limitWon);
          expect(res.maxWon).toBe(expected(price, row));
        });
      }
    });
  }

  it('한도액이 있는 구간은 한도에서 멈춘다', () => {
    expect(calculateLegalCommission(1.8 * 억, '매매').maxWon).toBe(800_000); // 90만 → 80만
    expect(calculateLegalCommission(4500 * 만, '매매').maxWon).toBe(250_000); // 27만 → 25만
    expect(calculateLegalCommission(9000 * 만, '전세').maxWon).toBe(300_000); // 36만 → 30만
    expect(calculateLegalCommission(4500 * 만, '전세').maxWon).toBe(200_000); // 22.5만 → 20만
  });

  it('네이버 중개보수 계산기와 1원 단위 일치 (13억 4,000만 매매 → 8,040,000원)', () => {
    expect(calculateLegalCommission(13.4 * 억, '매매').maxWon).toBe(8_040_000);
  });

  it('원 미만은 절사하고 부동소수 오차가 없다', () => {
    // 12억 9,250만 × 0.6% = 7,755,000 (반올림 776만으로 올리지 않음)
    expect(calculateLegalCommission(1_292_500_000, '매매').maxWon).toBe(7_755_000);
    // 3억 3,333만 3,333원 × 0.4% = 1,333,333.332 → 1,333,333
    expect(calculateLegalCommission(333_333_333, '매매').maxWon).toBe(1_333_333);
  });
});

describe('제안 복비·표시가 법정 상한을 넘지 않는다', () => {
  it('할인 0%여도 추천 복비는 상한 이하 (만 원 단위 내림)', () => {
    const cap = calculateLegalCommission(1_292_500_000, '매매').maxWon;
    expect(commissionFromDiscount(1_292_500_000, '매매', 0)).toBe(7_750_000);
    expect(commissionFromDiscount(1_292_500_000, '매매', 0)).toBeLessThanOrEqual(cap);
  });

  it('상한 금액을 그대로 제안하면 절약액 0원', () => {
    const q = computeCommissionQuote({ basisPriceWon: 1_292_500_000, tradeType: '매매', proposedWon: 7_755_000 });
    expect(q.totalWon).toBe(7_755_000);
    expect(q.savedWon).toBe(0);
  });

  it('1억 미만 금액은 반올림 없이 표시한다', () => {
    expect(formatWon(7_755_000)).toBe('775만 5,000원');
    expect(formatWon(8_040_000)).toBe('804만 원');
    expect(formatWon(12_929_500_000 / 10)).toBe('12억 9,295만 원');
  });

  it('부가세는 일반과세 10%, 간이과세 4% (원 미만 절사)', () => {
    // 9억 9,000만 원 매매 → 법정 상한 495만 원
    expect(calculateLegalCommission(990_000_000, '매매').maxWon).toBe(4_950_000);
    expect(commissionVat(4_950_000)).toEqual({ generalWon: 495_000, simplifiedWon: 198_000 });
    expect(commissionVat(2_880_005)).toEqual({ generalWon: 288_000, simplifiedWon: 115_200 });
  });
});

describe('매칭 사례 피드 계약', () => {
  it('예시 금액은 법정 요율 엔진과 일치하고 할인 45% 이하', () => {
    const feed = getMatchCaseFeed();
    expect(feed.source).toBe('EXAMPLE');
    expect(feed.items.length).toBeGreaterThan(0);
    for (const m of feed.items) {
      expect(m.legalCapWon).toBe(calculateLegalCommission(m.dealPriceManwon * 만, m.tradeType).maxWon);
      expect(m.agreedFeeWon + m.savedWon).toBe(m.legalCapWon);
      expect(m.discount).toBeLessThanOrEqual(0.45);
      expect(m.matchedAt).toBeNull();
    }
  });
});
