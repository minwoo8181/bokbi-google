import { describe, expect, it } from 'vitest';
import { calculateLegalCommission } from '@/lib/commission';
import { SITE_CONTENT } from '@/config/siteContent';
import { agreedRatioPct, checkDealPrice, dealFeeWon, feeForPrice, FEE_RULE_EXAMPLES, feeRuleExample } from '../dealFee';
import { dealState, type DealEvent, type DealEventBody } from '../deal';

let seq = 0;
const ev = (h: number, body: DealEventBody): DealEvent => ({ id: `e${seq++}`, at: new Date(Date.UTC(2026, 10, 1, h)).toISOString(), ...body }) as DealEvent;
const contractDate = ev(0, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-08' });

const 매매 = (askingPriceManwon: number, commissionWon: number) => ({ tradeType: '매매' as const, askingPriceManwon, commissionWon });
const 전세 = (askingPriceManwon: number, commissionWon: number) => ({ tradeType: '전세' as const, askingPriceManwon, commissionWon });

describe('거래금액이 바뀌면 복비 = 실제 금액의 법정 상한 × 합의 비율', () => {
  it('대표님 예시표 그대로 (매매 9억 9,000만 · 상한의 60%)', () => {
    const a = 매매(99_000, 2_970_000);
    expect(agreedRatioPct(a)).toBe(60);
    expect(feeForPrice(a, 99_000).feeWon).toBe(2_970_000);
    expect(feeForPrice(a, 95_000).feeWon).toBe(2_850_000);
    expect(feeForPrice(a, 90_000).feeWon).toBe(2_700_000);
    expect(feeForPrice(a, 89_900).feeWon).toBe(2_157_000); // 구간 0.5% → 0.4%
    expect(feeForPrice(a, 80_000).feeWon).toBe(1_920_000);
  });

  it('구간이 올라가도 같은 비율 (8억 5,000만 60% → 9억 270만)', () => {
    const a = 매매(85_000, 2_040_000);
    expect(feeForPrice(a, 89_000).feeWon).toBe(2_136_000);
    expect(feeForPrice(a, 90_000).feeWon).toBe(2_700_000);
    expect(feeForPrice(a, 91_000).feeWon).toBe(2_730_000);
  });

  it('전세: 4억 5,000만 상한의 80% → 6억 192만, 희망가 그대로면 1원도 안 바뀜 (비율 반올림 오차 없음)', () => {
    const a = 전세(45_000, 1_080_000);
    expect(feeForPrice(a, 60_000).feeWon).toBe(1_920_000);
    expect(feeForPrice(a, 42_000).feeWon).toBe(1_008_000);
    // 120만 / 135만 = 88.88…% 처럼 나누어떨어지지 않는 비율도 희망가에선 그대로
    expect(feeForPrice(전세(45_000, 1_200_000), 45_000)).toMatchObject({ feeWon: 1_200_000, unchanged: true });
  });

  it('전수: 매매·전세 × 비율 30~100% × 거래금액 5,000만~20억(500만 단위) — 법정 상한 이하, 천 원 단위, 비율 오차 1천 원 미만', () => {
    let checked = 0;
    for (const tradeType of ['매매', '전세'] as const) {
      for (const asking of [30_000, 59_000, 85_000, 99_000, 115_000]) {
        const basisMax = calculateLegalCommission(asking * 10_000, tradeType).maxWon;
        for (const pct of [30, 45, 60, 75, 90, 100]) {
          const a = { tradeType, askingPriceManwon: asking, commissionWon: Math.floor((basisMax * pct) / 100 / 10_000) * 10_000 };
          for (let price = 5_000; price <= 200_000; price += 500) {
            const f = feeForPrice(a, price);
            const max = calculateLegalCommission(price * 10_000, tradeType).maxWon;
            expect(f.legalMaxWon).toBe(max);
            expect(f.feeWon).toBeLessThanOrEqual(max);
            if (!f.unchanged) {
              expect(f.feeWon % 1000).toBe(0);
              const exact = (a.commissionWon * max) / basisMax;
              expect(exact - f.feeWon).toBeGreaterThanOrEqual(0);
              expect(exact - f.feeWon).toBeLessThan(1000);
            }
            checked++;
          }
        }
      }
    }
    expect(checked).toBe(2 * 5 * 6 * 391);
  });

  it('거래 기록: 집주인이 맞다고 한 보고의 금액만 확정, 아니에요면 그대로, 계약 금액이 가계약 금액을 덮어씀', () => {
    const a = 매매(99_000, 2_970_000);
    const reported = [contractDate, ev(1, { kind: 'REPORT', step: 'CONTRACT', priceManwon: 95_000 })];
    expect(dealState(reported)).toMatchObject({ pendingPriceManwon: 95_000, priceManwon: null });
    const yes = dealState([...reported, ev(2, { kind: 'ANSWER', step: 'CONTRACT', ok: true })]);
    expect(yes).toMatchObject({ pendingPriceManwon: null, priceManwon: 95_000 });
    expect(dealFeeWon(a, yes.priceManwon)).toBe(2_850_000);
    const no = dealState([...reported, ev(2, { kind: 'ANSWER', step: 'CONTRACT', ok: false })]);
    expect(no.priceManwon).toBeNull();
    expect(dealFeeWon(a, no.priceManwon)).toBe(2_970_000);
    const twoSteps = dealState([
      ev(1, { kind: 'REPORT', step: 'PROVISIONAL', priceManwon: 97_000 }),
      ev(2, { kind: 'ANSWER', step: 'PROVISIONAL', ok: true }),
      contractDate,
      ev(3, { kind: 'REPORT', step: 'CONTRACT', priceManwon: 96_000 }),
      ev(4, { kind: 'ANSWER', step: 'CONTRACT', ok: true }),
    ]);
    expect(twoSteps.priceManwon).toBe(96_000);
    // 집주인이 직접 알리면 그 금액이 바로 확정, 금액 없이 알리면 희망가 그대로
    expect(dealState([ev(1, { kind: 'OWNER_DECLARED', step: 'CONTRACT', priceManwon: 94_000 })]).priceManwon).toBe(94_000);
    expect(dealState([ev(1, { kind: 'OWNER_DECLARED', step: 'CONTRACT' })]).priceManwon).toBeNull();
    // 잔금 보고에 금액이 붙어 와도 무시
    expect(dealState([...reported, ev(2, { kind: 'ANSWER', step: 'CONTRACT', ok: true }), ev(3, { kind: 'REPORT', step: 'BALANCE', priceManwon: 1 })]).pendingPriceManwon).toBeNull();
  });

  it('약속 화면 예시 표: 대표님이 본 표와 같은 금액', () => {
    expect(FEE_RULE_EXAMPLES.map((x) => [feeRuleExample(x).agreed.commissionWon, feeRuleExample(x).fee.feeWon])).toEqual([
      [2_970_000, 2_850_000],
      [2_970_000, 2_157_000],
      [2_040_000, 2_700_000],
      [1_080_000, 1_920_000],
    ]);
  });

  it('약속 화면 예시 세 줄: 공식 요율표(2021.12.30) 손계산과 같음 — 합의 때 상한·요율, 실제 상한·요율 (대표님 2026-10-28)', () => {
    // 매매 9억 이상 0.5%, 2억~9억 0.4% / 전세 1억~6억 0.3%, 6억~12억 0.4% (legalFeeTable.test.ts OFFICIAL_TABLE)
    expect(
      FEE_RULE_EXAMPLES.map((x) => {
        const e = feeRuleExample(x);
        return [e.basisMaxWon, e.basisRateLabel, e.fee.legalMaxWon, e.fee.rateLabel, e.fee.ratioPct];
      }),
    ).toEqual([
      [4_950_000, '0.5%', 4_750_000, '0.5%', 60], // 9억 9,000만 × 0.5% → 9억 5,000만 × 0.5%
      [4_950_000, '0.5%', 3_596_000, '0.4%', 60], // 8억 9,900만 × 0.4% = 359만 6,000 × 60% = 215만 7,600 → 천 원 미만 버림 215만 7,000
      [3_400_000, '0.4%', 4_500_000, '0.5%', 60], // 8억 5,000만 × 0.4% → 9억 × 0.5%
      [1_350_000, '0.3%', 2_400_000, '0.4%', 80], // 전세 4억 5,000만 × 0.3% → 6억 × 0.4%
    ]);
    // 칩 하나에 예시 하나
    expect(SITE_CONTENT.dealPrice.rule.chips).toHaveLength(FEE_RULE_EXAMPLES.length);
    // 실제 상한 × 비율 = 화면의 복비 (천 원 미만 버림)
    for (const x of FEE_RULE_EXAMPLES) {
      const e = feeRuleExample(x);
      expect(e.fee.feeWon).toBe(Math.floor((e.fee.legalMaxWon * x.ratioPct) / 100 / 1000) * 1000);
    }
  });

  it('거래금액 입력 확인: 비었거나 희망가의 절반~두 배 밖이면 거절', () => {
    expect(checkDealPrice(null, 99_000)).toBe('EMPTY');
    expect(checkDealPrice(0, 99_000)).toBe('EMPTY');
    expect(checkDealPrice(49_000, 99_000)).toBe('OUT_OF_RANGE');
    expect(checkDealPrice(198_001, 99_000)).toBe('OUT_OF_RANGE');
    expect(checkDealPrice(49_500, 99_000)).toBeNull();
    expect(checkDealPrice(95_000, 99_000)).toBeNull();
  });
});
