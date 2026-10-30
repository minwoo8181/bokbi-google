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
    /** 매칭 요청 창 = 삼쩜삼 신고 흐름 (전체 화면 단계 페이지) */
    flow: {
      back: '이전 단계',
      /** {n}/{total} 단계 */
      progress: '{n} / {total}',
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
  /**
   * 삼쩜삼 심화 (2026-10-30 대표님 "더 심화, 매칭 요청·중개사 가입이 중요"). 삼쩜삼 결과 리포트의 "내 질문 말풍선 → 답 카드" 흐름.
   * 논증 순서 = 화면 순서 (taste copy §1): ① 무엇인가 → ② 결과가 이렇게 나온다(실제 예시) → ③ 집주인이 실제로 묻는 의문 3개 → ④ 행동.
   * 중개사는 따로 한 구획 + 머리줄 오른쪽 입구. 숫자는 모두 데이터·엔진 값, 지어낸 실적 없음
   */
  samjeom2: {
    header: { broker: '중개사라면' },
    home: {
      /** 32자 이하 두 줄 주장 (taste copy §2·§3 "The claim") */
      title: '복비, 미리 정하고\n집을 내놓으세요',
      lead: '단지만 고르면 적정 복비가 나오고, 그 금액에 동의한 중개사만 연락해요.',
      previewTitle: '이런 리포트를 받아요',
      previewCaption: '실제 다산동 실거래로 계산한 예시',
      /** 미리 보기 화면 속 (K1 머리 띠 축소판) */
      previewLead: '{label} 한 집 평균',
      previewCap: '법정 상한',
      previewLow: '{pct}% 낮게 정하면',
      previewCut: '낮아져요',
      previewBasis: '최근 1년 중개 매매 {n}건 평균',
      askTitle: '집주인이 먼저 묻는 것',
      /** 실제로 묻는 의문만 (taste copy "A question the reader did not ask" 금지) */
      qa: [
        {
          q: '중개사가 정말 그 금액에 해 주나요?',
          a: '합의 복비를 보고 동의한 중개사만 요청을 보내요',
          rows: [
            { label: '요청 보내기', value: '동의한 중개사' },
            { label: '고르기', value: '집주인 · 최대 3곳' },
            { label: '요청 기간', value: '48시간' },
          ],
        },
        {
          q: '동·호수가 동네에 알려지지 않나요?',
          a: '고른 중개사에게만 열려요',
          rows: [
            { label: '단지 · 평형', value: '보여요' },
            { label: '동·호수', value: '매칭 후 공개' },
            { label: '연락처', value: '매칭 후 공개' },
          ],
        },
        {
          q: '어떤 중개사가 연락하나요?',
          a: '다산동 등록 명단과 대조해 가입한 공인중개사예요',
          rows: [
            { label: '대조하는 명단', value: '다산동 중개사무소 {offices}곳' },
            { label: '가입 확인', value: '사무소 번호로 확인 전화' },
          ],
        },
      ],
      askCta: '우리 단지 복비 보기',
      /** 중개사 구획 (삼쩜삼 "개인사업자인가요?" 별도 구획) */
      brokerTitle: '다산동 공인중개사인가요?',
      brokerHead: '복비가 정해진 의뢰를\n집주인에게 직접 받아요',
      brokerRows: [
        { label: '의뢰', value: '집주인이 직접 맡긴 매물' },
        { label: '복비', value: '요청 전에 이미 합의' },
        { label: '주변 부동산', value: '내 매칭을 못 봐요' },
      ],
      brokerCta: '파트너 중개사 등록하기',
      brokerMore: '어떻게 받는지 먼저 보기',
    },
    analysis: {
      /** 리포트 질문 말풍선 (내 질문) */
      askWhy: '왜 이 금액인가요?',
      askHow: '할인율은 어떻게 정했나요?',
      askDeal: '실제로 얼마에 거래됐나요?',
      askBroker: '중개사가 이 금액을 받아 줄까요?',
      askPrivacy: '내 정보는 언제 공개되나요?',
      askPoll: '이웃들은 어떻게 생각할까요?',
      brokerAnswer: '합의 복비에 동의한 중개사만 요청을 보내요',
      privacyAnswer: '고른 중개사에게만, 매칭 후에 열려요',
      /** 마지막 요약 = 삼쩜삼 "예상 환급내역" 파랑 카드 */
      summaryLabel: '적정 복비',
      summaryNote: '이 금액을 보고 동의한 중개사만 요청을 보내요',
      summaryRows: { apt: '단지', cond: '조건', legal: '법정 상한' },
      summaryChange: '조건 바꾸기',
      brokerLink: '다산동 공인중개사라면 파트너 등록',
    },
  },
  /** 헤이딜러 레퍼런스 (2026-10-30). 숫자는 모두 기존 계산 결과, 문구만 헤이딜러 말투 */
  heydealer: {
    home: {
      /** 머리줄 글자 탭 (헤이딜러 "내차 팔 때 | 내차 살 때") */
      tabOwner: '집 내놓을 때',
      tabBroker: '중개사라면',
      /** 둥근 판 위 큰 질문 (헤이딜러 "먼저, 내 차 시세를 알아볼까요?") */
      question: '먼저, 우리 집 복비를\n알아볼까요?',
      /** 전광판 (헤이딜러 메인 숫자판). 데이터 파일 사실 숫자만 */
      boardTitle: '복비 엔진이 보는 다산동',
      boardComplexes: '분석 단지',
      boardTrades: '국토부 실거래',
      boardListings: '지금 매물',
      boardOffices: '중개사무소',
      unitComplex: '{n}개',
      unitCount: '{n}건',
      unitOffice: '{n}곳',
      /** 예시 단지 견적 목록 (헤이딜러 "실시간 견적" 펼침 카드) */
      examplesTitle: '단지별 복비 예시',
      examplesNote: '최근 1년 중개 매매 · 법정 상한 평균',
      exampleSub: '실거래 {n}건',
      exampleCapLabel: '상한 평균',
      exampleCut: '{pct}% 낮게 정하면',
      exampleCutValue: '{amount} 낮아져요',
      /** 진행 상황 (헤이딜러 경매 "진행상황" 점선 타임라인) */
      processTitle: '진행 순서',
    },
    menu: {
      open: '메뉴 열기',
      close: '메뉴 닫기',
      requests: '내 의뢰',
      me: '내 정보',
      ownerGuide: '처음이라면? 이용 방법',
      brokerGuide: '파트너 중개사 혜택',
    },
    analysis: {
      share: '공유하기',
      fix: '수정',
      /** 처음 한 번 "수정" 옆 검은 말풍선 (헤이딜러 "실제 주행거리를 입력해보세요") */
      tip: '내 집 평형·층으로 맞춰 보세요',
      tipClose: '말풍선 닫기',
      rowTrade: '거래',
      rowPyeong: '평형',
      rowFloor: '층',
      rowDeal: '기준 실거래',
      rowHouseholds: '세대수',
      rowBuilt: '준공',
      rowSchool: '초등학교',
      rowParking: '주차',
      more: '더보기',
      less: '접기',
      pyeongValue: '{name} · 전용 {area}㎡',
      floorValue: '{band} ({range})',
      householdsValue: '{n}세대',
      builtValue: '{n}년',
      schoolValue: '{name} 도보 {min}분',
      parkingValue: '세대당 {n}대',
      /** 시세 구획 (헤이딜러 "내차 예상시세 210~310만원") */
      estimateTitle: '우리 집 적정 복비',
      estimateSub: '법정 상한 {legal}보다 {pct}% 낮게',
      estimateSame: '법정 상한 그대로',
      /** 곡선 그래프: 할인율 → 복비 (commissionFromDiscount 그대로) */
      curveLabel: '할인율에 따른 복비, 추천 범위 {min}~{max}%, 지금 {pct}%',
      curveBand: '추천 범위 {min}~{max}%',
      curveLegal: '법정 상한',
      curvePin: '추천 {pct}%',
      proofButton: '실거래 근거 보기',
      /** 바닥 바 버튼 위 검은 꼬리표 (헤이딜러 "zero OPEN") — 위 금액이 화면 밖으로 나간 뒤에만 */
      barTag: '적정 복비 {amount}',
    },
  },
} as const;
