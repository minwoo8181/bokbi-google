/**
 * design-lab 전용 화면 문구 (레퍼런스 실험 화면). 원본 화면 문구는 siteContent.ts가 그대로 정본이다.
 * 실험이 채택되면 이 문구를 siteContent.ts로 옮긴다.
 *
 * 삼쩜삼 레퍼런스 2차 (2026-10-30 대표님): 이용자 순서 그대로 화면을 짠다.
 * 집주인: 홈 검색 → 단지 정보 → 얼마 → 왜 → "실거래 기준 추정"이라 우리 집도 궁금 → 우리 집 기준 계산(희망가·동·호수) → 매칭 요청
 * 중개사: 홈 "중개사" 보기 → 어떤 의뢰가 오나 → 먼저 묻는 것 → 등록
 * 숫자는 모두 데이터·엔진 값. 지어낸 실적·확률 없음
 */
export const LAB_CONTENT = {
  samjeom: {
    /** 홈 맨 위 보기 바꾸기 (삼쩜삼 상단 탭) */
    audience: { owner: '집주인', broker: '중개사', label: '누구신가요' },
    tabs: { home: '홈', requests: '내 의뢰', me: '내 정보' },
    /** 단계 이름 = 분석 화면 구획 순서 (홈 진행 막대·분석 진행 표시 공용) */
    steps: ['단지 고르기', '복비 확인', '우리 집 계산', '매칭 요청'],
    owner: {
      title: '복비, 미리 정하고\n집을 내놓으세요',
      lead: '단지만 고르면 적정 복비가 나오고, 그 금액에 동의한 중개사만 연락해요.',
      previewTitle: '이런 리포트를 받아요',
      previewCaption: '실제 다산동 실거래로 계산한 예시',
      previewLead: '{label} 한 집 평균',
      previewCut: '낮아져요',
      previewCap: '법정 상한',
      previewLow: '{pct}% 낮게 정하면',
      previewBasis: '최근 1년 중개 매매 {n}건 평균',
      askTitle: '집주인이 먼저 묻는 것',
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
          a: '고른 중개사에게만, 매칭 후에 열려요',
          rows: [
            { label: '단지 · 평형', value: '보여요' },
            { label: '동·호수', value: '매칭 후 공개' },
            { label: '연락처', value: '매칭 후 공개' },
          ],
        },
      ],
      askCta: '우리 단지 복비 보기',
      brokerCard: '다산동 공인중개사인가요?',
      brokerCardLink: '중개사 화면 보기',
    },
    broker: {
      title: '복비가 정해진 의뢰를\n집주인에게 직접 받아요',
      lead: '집주인이 복비를 먼저 정해 요청하면, 그 금액에 동의하는 중개사가 매칭을 요청해요.',
      cta: '파트너 중개사 등록하기',
      login: '이미 등록했어요',
      sampleTitle: '이런 의뢰가 와요',
      sampleBadge: '예시 화면',
      sampleFee: '합의 복비',
      sampleUnit: '동·호수',
      sampleUnitValue: '매칭 후 공개',
      sampleTrade: '매매',
      sampleCaption: '복비는 예시 단지의 법정 상한 평균에서 {pct}% 낮춘 값',
      askTitle: '중개사가 먼저 묻는 것',
      qa: [
        {
          q: '복비는 어떻게 정해지나요?',
          a: '법정 상한 안에서, 실거래와 매물 흐름으로 계산해요',
          rows: [
            { label: '기준', value: '국토부 실거래 · 지금 매물' },
            { label: '추천 범위', value: '법정 상한에서 20~50% 낮게' },
            { label: '요청', value: '동의할 때만 보내요' },
          ],
        },
        {
          q: '주변 부동산이 내 매칭을 알 수 있나요?',
          a: '매칭된 중개사에게만 동·호수·연락처가 열려요',
          rows: [
            { label: '매칭된 중개사', value: '정보 열림' },
            { label: '주변 부동산', value: '계속 가림' },
          ],
        },
        {
          q: '누가 고르나요?',
          a: '집주인이 최대 3곳을 골라요',
          rows: [
            { label: '요청 보내기', value: '중개사' },
            { label: '고르기', value: '집주인 · 최대 3곳' },
            { label: '요청 기간', value: '48시간' },
          ],
        },
      ],
      joinTitle: '등록은 이렇게 해요',
      joinSteps: [
        { title: '사무소 확인', desc: '등록번호·대표자·상호를 다산동 명단과 대조해요' },
        { title: '휴대폰 인증', desc: '휴대폰 번호로 인증하고 약관에 동의해요' },
        { title: '강점·약속', desc: '강점을 최대 3개 고르고 파트너 약속을 확인해요' },
        { title: '확인 전화 후 승인', desc: '48시간 안에 등록된 사무소 번호로 확인 전화를 드려요' },
      ],
    },
    analysis: {
      share: '공유',
      /** 단지 정보 줄 */
      meta: '{dong} · {households}세대',
      built: ' · {year}년 준공',
      factListings: '지금 매물 {n}건',
      factSchool: '{name} 도보 {min}분',
      factParking: '세대당 주차 {n}대',
      /** 조건 칩 → 시트 */
      conditionOpen: '조건 바꾸기: {value}',
      conditionTitle: '계산 조건',
      conditionDone: '이 조건으로 보기',
      pyeongLabel: '평형',
      floorLabel: '층',
      tradeLabel: '거래',
      /** ② 얼마 */
      heroLead: '적정 복비는',
      heroTail: '이에요',
      heroBasis: '최근 실거래 {deal}{when} 기준',
      when: ' ({date}{floor})',
      floorSuffix: ' · {n}층',
      capLabel: '법정 상한',
      fairLabel: '적정 복비',
      capDiff: '법정 상한보다 {amount} 낮아요',
      capSame: '법정 상한 그대로예요',
      /** ③ 왜 */
      askWhy: '왜 이 금액인가요?',
      compareAvg: '다산동 평균',
      compareUnit: '{n}배',
      listings: '지금 매물',
      deals: '6개월 거래',
      countUnit: '{n}건',
      /** ④ 실거래 기준 추정 → 우리 집 궁금 */
      askMine: '우리 집도 이 금액인가요?',
      mineAnswer: '이 금액은 최근 실거래 한 건 기준이에요',
      mineBody: '같은 단지·평형이라도 층·향·수리 상태에 따라 거래가가 달라요. 아래는 이 조건의 실제 거래와 지금 매물이에요.',
      /** ⑤ 우리 집 기준 */
      mineTitle: '우리 집 기준으로\n다시 계산해 볼까요?',
      mineSteps: [
        { label: '희망가', value: '내가 받고 싶은 가격' },
        { label: '복비', value: '희망가로 다시 계산' },
        { label: '동·호수', value: '매칭 전엔 비공개' },
      ],
      mineCta: '우리 집 복비 계산하기',
      mineNote: '마지막 확인 화면에서 매칭 요청 여부를 정해요',
      /** ⑥ */
      askPoll: '이웃들은 어떻게 생각할까요?',
      brokerLink: '다산동 공인중개사라면 파트너 등록',
    },
  },
} as const;
