'use client';

/** 2단계 점유 상태: 세입자 연락처·안내 서약, 세입자 낀 매매, 방문 주의사항 */
import { Check } from 'lucide-react';
import { formatPriceTenThousand } from '@/lib/utils';
import type { LeaseKind, RenewalRight } from '@/lib/market/leasedSale';
import { OccupancyStatus } from '../types';
import { SITE_CONTENT } from '@/config/siteContent';
import type { MatchingForm } from './useMatchingForm';
import { SEGMENT_ITEM, SEGMENT_TRACK, segmentItemState } from '../segmentStyles';
import { FieldError, errorRing, type MissingGuard } from './missingGuard';

export default function OccupancySection({ form, guard }: { form: MatchingForm; guard: MissingGuard }) {
  const miss = SITE_CONTENT.matchingModal.missing;
  const { occupancy, tenantPhone, setTenantPhone, isTenantNotifiedChecked, setIsTenantNotifiedChecked, visitNoticeMemo, setVisitNoticeMemo, handleSelectOccupancy, isLeasedSale, leasedCopy, leaseKind, setLeaseKind, leaseDepositInput, setLeaseDepositInput, leaseRentInput, setLeaseRentInput, leaseEndDate, setLeaseEndDate, leaseRenewal, setLeaseRenewal, leasedSaleInput, leasedSaleError } = form;

  return (
    <div className="space-y-2">
      <label className="text-[12px] font-bold text-text-secondary block">
        {SITE_CONTENT.matchingModal.step2.occupancyLabel} *
      </label>
      <div className={`${SEGMENT_TRACK} grid-cols-3`}>
        {[
          { id: 'VACANT', label: SITE_CONTENT.matchingModal.step2.occupancyVacant },
          { id: 'OWNER', label: SITE_CONTENT.matchingModal.step2.occupancyOwner },
          { id: 'TENANT', label: SITE_CONTENT.matchingModal.step2.occupancyTenant },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`btn-occupancy-${item.id}`}
            aria-pressed={occupancy === item.id}
            onClick={() => handleSelectOccupancy(item.id as OccupancyStatus)}
            className={`${SEGMENT_ITEM} ${segmentItemState(occupancy === item.id)} px-1 text-[13px] font-bold cursor-pointer`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 세입자 거주 시 펼쳐지는 세입자 연락처 및 안내 서약 */}
      {occupancy === 'TENANT' && (
        <div
          data-testid="tenant-input-container"
          className="p-4 rounded-2xl bg-surface-subtle border border-brand-line space-y-3 animate-slide-up"
        >
          <div data-field="TENANT_PHONE">
            <label className="text-[12px] font-bold text-text-secondary block mb-1">
              {SITE_CONTENT.matchingModal.step2.tenantPhoneLabel} *
            </label>
            <input
              type="tel"
              data-testid="input-tenant-phone"
              value={tenantPhone}
              onChange={(e) => setTenantPhone(e.target.value)}
              placeholder={SITE_CONTENT.matchingModal.step2.tenantPhonePlaceholder}
              className={`w-full h-11 px-4 rounded-xl bg-surface-card border border-border-default font-bold text-[15px] text-text-primary focus:outline-none focus:border-brand ${errorRing(guard.shown('TENANT_PHONE'))}`}
            />
            <FieldError show={guard.shown('TENANT_PHONE')} text={miss.TENANT_PHONE} />
          </div>

          <div data-field="TENANT_PLEDGE">
          <button
            type="button"
            data-testid="chk-tenant-notified"
            onClick={() => setIsTenantNotifiedChecked((prev) => !prev)}
            className={`w-full p-3 rounded-xl border flex items-center gap-2 text-left transition-all cursor-pointer ${errorRing(guard.shown('TENANT_PLEDGE'))} ${
              isTenantNotifiedChecked
                ? 'border-brand bg-brand-subtle text-brand shadow-2xs'
                : 'border-border-default bg-surface-card text-text-secondary hover:border-brand-line-strong'
            }`}
          >
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                isTenantNotifiedChecked ? 'bg-brand border-brand text-white' : 'border-border-default'
              }`}
            >
              {isTenantNotifiedChecked && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <span className="text-[12px] font-extrabold text-text-primary leading-tight">
              {SITE_CONTENT.matchingModal.step2.tenantPledgeLabel}
            </span>
          </button>
          <FieldError show={guard.shown('TENANT_PLEDGE')} text={miss.TENANT_PLEDGE} />
          </div>
        </div>
      )}

      {/* 세입자 낀 매매: 임대 형태·보증금·만료일·갱신요구권 → 매수 필요 금액 */}
      {isLeasedSale && (
        <div
          data-testid="leased-sale-container"
          className="p-4 rounded-2xl bg-surface-subtle border border-brand-line space-y-3 animate-slide-up"
        >
          <div>
            <div className="text-[13px] font-extrabold text-text-primary">{leasedCopy.title}</div>
            <p className="text-[12px] font-medium text-text-tertiary mt-1 leading-snug">{leasedCopy.desc}</p>
          </div>

          <div data-field="LEASE_KIND">
            <label className="text-[12px] font-bold text-text-secondary block mb-1">{leasedCopy.kindLabel} *</label>
            <div className={`${SEGMENT_TRACK} grid-cols-2 ${errorRing(guard.shown('LEASE_KIND'))}`}>
              {([
                { id: 'JEONSE', label: leasedCopy.kindJeonse },
                { id: 'MONTHLY', label: leasedCopy.kindMonthly },
              ] as { id: LeaseKind; label: string }[]).map((k) => (
                <button
                  key={k.id}
                  type="button"
                  data-testid={`btn-lease-kind-${k.id}`}
                  aria-pressed={leaseKind === k.id}
                  onClick={() => setLeaseKind(k.id)}
                  className={`${SEGMENT_ITEM} ${segmentItemState(leaseKind === k.id)} text-[13px] font-bold cursor-pointer`}
                >
                  {k.label}
                </button>
              ))}
            </div>
            <FieldError show={guard.shown('LEASE_KIND')} text={leasedCopy.errors.KIND} />
          </div>

          <div className={`grid gap-2 ${leaseKind === 'MONTHLY' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div data-field="LEASE_DEPOSIT">
              <label className="text-[12px] font-bold text-text-secondary block mb-1">{leasedCopy.depositLabel} *</label>
              <div className={`h-11 rounded-xl bg-surface-card border border-border-default px-3 flex items-center focus-within:border-brand ${errorRing(guard.shown('LEASE_DEPOSIT'))}`}>
                <input
                  type="number"
                  inputMode="numeric"
                  data-testid="input-lease-deposit"
                  value={leaseDepositInput}
                  onChange={(e) => setLeaseDepositInput(e.target.value)}
                  placeholder={leasedCopy.depositPlaceholder}
                  className="w-full min-w-0 bg-transparent font-bold text-[15px] text-text-primary focus:outline-none"
                />
                <span className="text-[12px] font-bold text-text-tertiary ml-1 whitespace-nowrap">{leasedCopy.unit}</span>
              </div>
              {leasedSaleInput.depositManwon > 0 && (
                <p className="text-[12px] font-bold text-brand mt-1 px-1">= {formatPriceTenThousand(leasedSaleInput.depositManwon)}</p>
              )}
              <FieldError show={guard.shown('LEASE_DEPOSIT')} text={leasedCopy.errors.DEPOSIT} />
            </div>
            {leaseKind === 'MONTHLY' && (
              <div data-field="LEASE_RENT">
                <label className="text-[12px] font-bold text-text-secondary block mb-1">{leasedCopy.monthlyRentLabel} *</label>
                <div className={`h-11 rounded-xl bg-surface-card border border-border-default px-3 flex items-center focus-within:border-brand ${errorRing(guard.shown('LEASE_RENT'))}`}>
                  <input
                    type="number"
                    inputMode="numeric"
                    data-testid="input-lease-rent"
                    value={leaseRentInput}
                    onChange={(e) => setLeaseRentInput(e.target.value)}
                    placeholder={leasedCopy.monthlyRentPlaceholder}
                    className="w-full min-w-0 bg-transparent font-bold text-[15px] text-text-primary focus:outline-none"
                  />
                  <span className="text-[12px] font-bold text-text-tertiary ml-1 whitespace-nowrap">{leasedCopy.unit}</span>
                </div>
                <FieldError show={guard.shown('LEASE_RENT')} text={leasedCopy.errors.RENT} />
              </div>
            )}
          </div>

          <div data-field="LEASE_END_DATE">
            <label className="text-[12px] font-bold text-text-secondary block mb-1">{leasedCopy.endDateLabel} *</label>
            <input
              type="date"
              data-testid="input-lease-end"
              min={new Date().toISOString().split('T')[0]}
              value={leaseEndDate}
              onChange={(e) => setLeaseEndDate(e.target.value)}
              className={`w-full h-11 px-3 rounded-xl bg-surface-card border border-border-default font-bold text-[15px] text-text-primary focus:outline-none focus:border-brand cursor-pointer ${errorRing(guard.shown('LEASE_END_DATE'))}`}
            />
            <FieldError show={guard.shown('LEASE_END_DATE')} text={leasedCopy.errors.END_DATE} />
          </div>

          <div data-field="LEASE_RENEWAL">
            <label className="text-[12px] font-bold text-text-secondary block mb-1">{leasedCopy.renewalLabel} *</label>
            <div className={`${SEGMENT_TRACK} grid-cols-3 ${errorRing(guard.shown('LEASE_RENEWAL'))}`}>
              {([
                { id: 'USED', label: leasedCopy.renewalUsed },
                { id: 'NOT_USED', label: leasedCopy.renewalNotUsed },
                { id: 'UNKNOWN', label: leasedCopy.renewalUnknown },
              ] as { id: RenewalRight; label: string }[]).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  data-testid={`btn-lease-renewal-${r.id}`}
                  aria-pressed={leaseRenewal === r.id}
                  onClick={() => setLeaseRenewal(r.id)}
                  className={`${SEGMENT_ITEM} ${segmentItemState(leaseRenewal === r.id)} text-[13px] font-bold cursor-pointer`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {(leaseRenewal === 'NOT_USED' || leaseRenewal === 'UNKNOWN') && (
              <p className="text-[12px] font-medium text-text-tertiary mt-2 leading-snug break-keep">{leasedCopy.renewalNotUsedHint}</p>
            )}
            <FieldError show={guard.shown('LEASE_RENEWAL')} text={leasedCopy.errors.RENEWAL} />
          </div>

          {/* 매수 필요 금액은 중개사 화면(Step 5 미리보기·중개사 피드)에만 보인다 (대표님 지시 2026-10-24) */}
          {/* 보증금 ≥ 희망가는 누르기 전에도 보이는 안내 — 누른 뒤엔 같은 자리를 빨간 줄로 */}
          {guard.shown('LEASE_DEPOSIT_OVER_PRICE') ? (
            <div data-field="LEASE_DEPOSIT_OVER_PRICE">
              <FieldError show text={leasedCopy.errors.DEPOSIT_OVER_PRICE} />
            </div>
          ) : leasedSaleError === 'DEPOSIT_OVER_PRICE' && (
            <p data-field="LEASE_DEPOSIT_OVER_PRICE" className="text-[12px] font-bold text-amber-600 px-1">{leasedCopy.errors.DEPOSIT_OVER_PRICE}</p>
          )}
        </div>
      )}

      {/* 집방문 주의사항: 세입자 거주뿐만 아니라 집주인 거주일 때도 노출 */}
      {(occupancy === 'OWNER' || occupancy === 'TENANT') && (
        <div className="p-4 rounded-2xl bg-surface-subtle border border-border-default space-y-2 animate-slide-up">
          <label className="text-[12px] font-bold text-text-secondary block">
            {SITE_CONTENT.matchingModal.step2.visitMemoLabel}
          </label>
          <input
            type="text"
            data-testid="input-visit-memo"
            value={visitNoticeMemo}
            onChange={(e) => setVisitNoticeMemo(e.target.value)}
            placeholder={SITE_CONTENT.matchingModal.step2.visitMemoPlaceholder}
            className="w-full h-11 px-4 rounded-xl bg-surface-card border border-border-default text-[13px] text-text-primary focus:outline-none focus:border-brand"
          />
        </div>
      )}
    </div>
  );
}
