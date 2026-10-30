/**
 * design-lab 전용 화면 문구 (레퍼런스 실험 화면). 원본 화면 문구는 siteContent.ts가 그대로 정본이다.
 * 실험이 채택되면 이 문구를 siteContent.ts로 옮긴다.
 * keeps = 대표님이 킵한 조각의 문구 (레퍼런스 테마를 지워도 남긴다, docs/lab/KEEPS.md)
 */
export const LAB_CONTENT = {
  keeps: {
    /** K1 분석 머리 띠 + 근거 목록 (삼쩜삼 리포트) */
    feeReport: {
      heroLead: '적정 복비는',
      heroTail: '이에요',
      /** {deal} 기준 실거래 · {when} 날짜·층 */
      heroBasis: '최근 실거래 {deal}{when} 기준',
      when: ' ({date}{floor})',
      floorSuffix: ' · {n}층',
      rows: {
        deal: '최근 실거래',
        legal: '법정 상한',
        legalSub: '{tradeType} 상한 요율 기준',
        discount: '추천 할인',
        discountSub: '다산동 범위 20~50%',
        fee: '적정 복비',
      },
    },
    /** K2 평균 vs 이 단지 막대 비교 (삼쩜삼 "또래 평균 vs 나") */
    speedCompare: {
      compareAvg: '다산동 평균',
      compareUnit: '{n}배',
      listings: '지금 매물',
      deals: '6개월 거래',
      countUnit: '{n}건',
    },
    /** K3 홈 진행 단계 막대 */
    progress: {
      steps: ['단지 고르기', '복비 확인', '매칭 요청', '계약'],
    },
  },
  samjeom: {
    tabs: { home: '홈', requests: '내 의뢰', broker: '중개사', me: '내 정보' },
    home: {
      /** {n} = 단지 수 (데이터 파일 기준) */
      notice: { label: '다산동 단지 복비', text: '{n}개 단지의 적정 복비를 볼 수 있어요' },
      startTitle: '우리 집 복비 알아보기',
      startLabel: '적정 복비 계산',
      savingsLabel: '예시 단지',
      /** {label} 단지 이름 → 두 줄 문장, 금액만 파랑 */
      savingsLead: '{label} 한 집 평균',
      savingsTail: ' 낮출 수 있어요',
      savingsRows: { cap: '법정 상한 평균', low: '{pct}% 낮게 정하면', cut: '낮아지는 금액' },
      listTitle: '다산동 단지 복비',
      listLabel: '세대 많은 순',
      rowFee: '적정 복비 {amount}',
      showAll: '단지 전체 보기 ({n})',
      showLess: '접기',
      basis: '대표 평형의 가장 최근 실거래 기준 · 매매',
      processLabel: '복비 진행 방식',
      partnerTitle: '다산동 공인중개사인가요?',
      partnerLabel: '파트너 중개사',
    },
    analysis: {
      share: '공유',
      conditionTitle: '조건 바꾸기',
      pyeongLabel: '평형',
    },
  },
} as const;
