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
      startTitle: '우리 집 복비 알아보기',
      /** 2026-10-30 다시 디자인: 두 막대(법정 상한 평균 vs n% 낮게) + 그 차이. 카드 위 작은 회색 라벨은 스킬 점검으로 뺌 */
      /** {josa} = 이름 끝 받침에 따라 은/는 */
      savingsLead: '{label}{josa} 한 집 평균',
      savingsTail: ' 낮아져요',
      barCap: '법정 상한 평균',
      barLow: '{pct}% 낮게 정하면',
      cutLabel: '낮아지는 만큼',
      savingsCta: '우리 단지 복비 보기',
      partnerTitle: '다산동 공인중개사인가요?',
    },
    analysis: {
      share: '공유',
      /** 머리 띠 조건 칩 → 시트 (2026-10-30 CTA 재배치: 조건을 금액 바로 위로) */
      conditionOpen: '조건 바꾸기: {value}',
      conditionTitle: '내 집 조건',
      conditionDone: '이 조건으로 보기',
      pyeongLabel: '평형',
      floorLabel: '층',
      tradeLabel: '거래',
      barFee: '적정 복비',
      barLegal: '법정 상한 {amount}',
    },
  },
} as const;
