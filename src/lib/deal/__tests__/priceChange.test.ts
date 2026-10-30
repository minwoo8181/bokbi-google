import { describe, it, expect } from 'vitest';
import { checkPriceChange, pendingPriceNotices, priceChangePlan } from '../priceChange';
import { feeForPrice, type AgreedFee } from '../dealFee';
import { calculateLegalCommission } from '@/lib/commission';
import type { DealEvent, DealEventBody } from '../deal';

const agreed: AgreedFee = { tradeType: '매매', askingPriceManwon: 139_500, commissionWon: 6_120_000 };
const ev = (id: string, body: DealEventBody): DealEvent => ({ id, at: `2026-10-27T0${id}:00:00Z`, ...body }) as DealEvent;

describe('매칭 뒤 희망가 바꾸기', () => {
  it('복비는 합의 비율 그대로 새 희망가로 다시 계산 (거래금액 규칙과 같음)', () => {
    const p = priceChangePlan(agreed, 135_000);
    expect(p.feeWon).toBe(feeForPrice(agreed, 135_000).feeWon);
    expect(p.legalMaxWon).toBe(calculateLegalCommission(1_350_000_000, '매매').maxWon);
    expect(p.feeWon).toBeLessThanOrEqual(p.legalMaxWon);
    expect(p.fromManwon).toBe(139_500);
    // 할인율은 바꾸기 전과 거의 같다 (천 원 미만 버림 차이만)
    const before = Math.round((1 - 6_120_000 / calculateLegalCommission(1_395_000_000, '매매').maxWon) * 100);
    expect(Math.abs(p.discountPct - before)).toBeLessThanOrEqual(1);
  });

  it('검사: 빈칸·같은 금액·절반~2배 밖은 거절', () => {
    expect(checkPriceChange(null, 139_500)).toBe('EMPTY');
    expect(checkPriceChange(139_500, 139_500)).toBe('SAME');
    expect(checkPriceChange(300_000, 139_500)).toBe('OUT_OF_RANGE');
    expect(checkPriceChange(60_000, 139_500)).toBe('OUT_OF_RANGE');
    expect(checkPriceChange(135_000, 139_500)).toBeNull();
  });

  it('알리지 않은 곳: 마지막 변경 뒤에 같은 금액으로 알렸어요가 없으면', () => {
    const deals = {
      a: [ev('1', { kind: 'PRICE_CHANGED', priceManwon: 135_000, fromManwon: 139_500, feeWon: 5_900_000 })],
      b: [
        ev('1', { kind: 'PRICE_CHANGED', priceManwon: 135_000, fromManwon: 139_500, feeWon: 5_900_000 }),
        ev('2', { kind: 'PRICE_NOTIFIED', priceManwon: 135_000 }),
      ],
      c: [
        ev('1', { kind: 'PRICE_CHANGED', priceManwon: 135_000, fromManwon: 139_500, feeWon: 5_900_000 }),
        ev('2', { kind: 'PRICE_NOTIFIED', priceManwon: 135_000 }),
        ev('3', { kind: 'PRICE_CHANGED', priceManwon: 132_000, fromManwon: 135_000, feeWon: 5_800_000 }),
      ],
      d: [ev('1', { kind: 'OWNER_CHECKED', how: 'CONFIRMED' })],
    };
    expect(pendingPriceNotices(deals, ['a', 'b', 'c', 'd', 'none'])).toEqual([
      { offerId: 'a', priceManwon: 135_000 },
      { offerId: 'c', priceManwon: 132_000 },
    ]);
  });
});
