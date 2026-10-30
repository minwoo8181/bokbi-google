/**
 * ============================================================================
 * 🏢 복비 (Bokbi) V2 - 전역 문구 & 카피라이팅 통합 관리 설정 파일
 * ============================================================================
 * 
 * [관리자 / 대표님 필독 가이드]
 * 서비스 내의 모든 버튼 텍스트, 헤드라인, 안내 문구, 고지 사항을 한곳에서 수정할 수 있는 통합 파일입니다.
 * 
 * 💡 수정 방법:
 * 1. 수정하고 싶은 섹션(예: home.hero, analysis.customizer 등)을 찾습니다.
 * 2. 따옴표(" " 또는 ' ') 안의 한글 문구를 원하는 텍스트로 자유롭게 변경하고 저장합니다.
 * 3. 줄바꿈이 필요한 경우 \n 을 입력하시면 화면에서 자연스럽게 줄이 바뀝니다.
 * 4. 각 속성마다 상세한 한글 주석으로 [노출 위치]와 [설명]이 작성되어 있습니다.
 * 
 * 📌 매핑 가이드 문서: docs/CONTENT_MAP.md 를 확인하시면 각 화면 캡처 위치와
 *                     속성명이 1:1로 매핑되어 있어 훨씬 쉽게 찾으실 수 있습니다.
 */

/**
 * 🏛️ [회사·법적 표시 정보 단일 관리] — 배포 전 이 블록만 실제 값으로 교체하면
 * 푸터 사업자 정보, 면책 고지, 이용약관, 개인정보 처리방침에 일괄 반영됩니다.
 * 체크리스트: docs/PREDEPLOY_CHECKLIST.md
 */
export const COMPANY_INFO = {
  /** true인 동안 푸터 사업자 정보에 '예시 정보' 배지가 표시됩니다. 실제 값 입력 후 false로 변경 */
  isPlaceholder: true,
  /** [서비스명]: 약관에서 "회사"로 지칭되는 서비스 브랜드 */
  serviceName: '복비',
  /** [법인 상호]: 사업자등록증상의 상호 */
  legalName: '(주)복비',
  ceo: '대표자명',
  businessNumber: '000-00-00000',
  ecommerceNumber: '제0000-경기남양주-0000호',
  address: '경기도 남양주시 다산동 (상세 주소)',
  phone: '000-0000-0000',
  email: 'help@bokbi.kr',
  /** [호스팅 서비스 제공자]: 전자상거래 사업자 표시 항목 (Cloudflare Workers 배포) */
  hostingProvider: 'Cloudflare, Inc.',
  /**
   * [카카오톡 문의 채널 주소]: 배포 직전 채널 개설 뒤 입력 (예: https://pf.kakao.com/_xxxx/chat, 대표님 2026-10-29).
   * 비어 있으면 문의 버튼은 개인정보 보호책임자 이메일(mailto)로 연결된다 (lib/support/inquiry.ts)
   */
  kakaoChannelUrl: '',
  /** [개인정보 보호책임자]: 개인정보 보호법 제31조 */
  privacyOfficer: {
    name: '개인정보 보호책임자명',
    email: 'privacy@bokbi.kr',
  },
  /** [데이터베이스 보관 국가]: Supabase 프로젝트 리전 (새 프로젝트 생성 후 확정) */
  dataRegion: 'Supabase 리전 확정 전',
  /** [매칭 미성사 의뢰 보관 기간]: 회사 정책 (확정 전) */
  requestRetention: '의뢰 종료 후 30일',
  /** [개인정보 처리 위탁·국외 이전]: 수탁자, 위탁 업무, 처리 국가 */
  privacyProcessors: [
    { name: 'Supabase Inc.', task: '데이터베이스 및 회원 인증 서버 운영', country: '{company.dataRegion}' },
    { name: 'Cloudflare, Inc.', task: '웹 서비스 호스팅 및 전송', country: '미국 등 Cloudflare 전 세계 서버' },
    { name: '(주)솔라피', task: '휴대전화 인증번호 및 알림 문자 발송', country: '대한민국' },
  ],
  /** [약관·방침 시행일] */
  policyEffectiveDate: '2026년 10월 24일',
  copyrightYear: 2026,
  /**
   * [배포 전 교체 목록]: 아직 실제 값이 아닌 항목. 문구에서 {company.키}로 쓰인 자리가 화면에 빨간 글씨 + "수정 필요"로 표시된다.
   * 실제 값을 넣은 항목은 이 목록에서 지운다 (목록이 비면 표시가 모두 사라진다)
   */
  pendingFields: [
    'legalName',
    'ceo',
    'businessNumber',
    'ecommerceNumber',
    'address',
    'phone',
    'privacyOfficerName',
    'dataRegion',
    'requestRetention',
  ],
} as const;

/**
 * 문구 속 {company.키} 자리표시 값. 법적 고지·하단 문구는 회사 값을 이 자리표시로 참조하고,
 * 화면은 LegalText가 치환하면서 pendingFields 항목을 빨간 글씨로 표시한다
 */
export const COMPANY_TOKENS = {
  serviceName: COMPANY_INFO.serviceName,
  legalName: COMPANY_INFO.legalName,
  ceo: COMPANY_INFO.ceo,
  businessNumber: COMPANY_INFO.businessNumber,
  ecommerceNumber: COMPANY_INFO.ecommerceNumber,
  address: COMPANY_INFO.address,
  phone: COMPANY_INFO.phone,
  email: COMPANY_INFO.email,
  hostingProvider: COMPANY_INFO.hostingProvider,
  privacyOfficerName: COMPANY_INFO.privacyOfficer.name,
  privacyOfficerEmail: COMPANY_INFO.privacyOfficer.email,
  dataRegion: COMPANY_INFO.dataRegion,
  requestRetention: COMPANY_INFO.requestRetention,
  policyEffectiveDate: COMPANY_INFO.policyEffectiveDate,
} as const;
export type CompanyTokenKey = keyof typeof COMPANY_TOKENS;

/** 법적 고지 본문 블록: 문단 / 목록(두 번째 줄 들여쓰기) / 표(모바일에서는 항목별 카드로 표시) */
export type LegalBlock =
  | { p: string }
  | { ul: readonly string[] }
  | { table: { head: readonly string[]; rows: readonly (readonly string[])[] } };
export interface LegalSection {
  heading: string;
  blocks: readonly LegalBlock[];
}

export const SITE_CONTENT = {
  // ==========================================================================
  // 1. 공통 (전역 브랜딩 & 네비게이션)
  // ==========================================================================
  common: {
    /** 모든 시트·창의 오른쪽 위 X 읽기 이름 (2026-10-27: 닫기는 X 하나로 통일) */
    close: '닫기',
    /** [서비스 브랜드명]: 헤더 및 로고에 표시되는 텍스트 */
    brandName: '복비',
    /** [서비스 지역 배지]: 로고 옆에 붙는 지역 알약 배지 */
    regionBadge: '다산동',
    /** [공통 슬로건 한 줄 요약]: 브라우저 탭 타이틀 및 메인 카피 */
    catchphrase: '데이터로 합의하는 새로운 복비',
    /** [GNB 내 의뢰 버튼]: 상단 헤더 우측 '내 의뢰' 이동 버튼 라벨 */
    navMyRequests: '집주인',
    /** [GNB 중개사 버튼]: 상단 헤더 우측 '중개사' 등록 이동 버튼 라벨 */
    navBroker: '중개사',
  },

  // ==========================================================================
  // 2. 메인 랜딩 화면 (app/page.tsx 및 src/components/home/)
  // ==========================================================================
  home: {
    /** [상단 히어로 섹션] */
    hero: {
      /**
       * 헤이딜러 첫 화면 화법 (대표님 2026-10-28 A안, heydaler-ux): 무엇을 넣으면 무엇을 알려 주는지 + 문턱 낮추는 한 줄.
       * 파란 머리는 "너무 튄다"로 탈락 → 흰 띠, 강조는 **적정 복비** 글자만. 블라인드 매칭은 아래 "복비는 이렇게 달라요" 2번 줄.
       * 2026-10-29 대표님: "실거래·매물 흐름" 빼고 2줄 (버튼 "우리 집 복비 얼마?"에 답하는 말투)
       */
      title: '단지 이름만 입력하면,\n**적정 복비**를 알려 드릴게요',
      subTitle: '복비에서 거래하지 않아도 분명 도움이 될 거예요.',
      /** [진행 중인 의뢰가 있을 때만] 다시 들어온 집주인이 한 번에 내 의뢰로 (헤이딜러 "이어하기") */
      resumeLabel: '진행 중인 의뢰',
      resumeValue: '{apt} {pyeong} {trade}',
      resumeButton: '이어보기',
      /** [검색창 아래 왼쪽] 안심 한 줄 (자물쇠 아이콘은 컴포넌트에서, 이모지 금지) */
      safeNote: '개인정보 없이 단지명만',
      /** [검색창 아래 오른쪽] 처음 쓰는 사람용 이용 방법 시트 열기 */
      guideLink: '처음이라면? 이용 방법',
    },

    /**
     * [이용 방법 시트] 첫 방문에 저절로 뜨지 않고 검색창 아래 링크로만 연다 (검색을 가리지 않게, 대표님 2026-10-28).
     * 세 장 넘기기, 마지막 장 버튼은 검색창으로. 화면 조각은 실제 화면 모양을 줄인 것 (금액은 법정 상한 예시만 — 가짜 실적 금지)
     */
    guide: {
      next: '다음',
      prev: '이전',
      /** 마지막 장 버튼 = 홈 주 버튼과 같은 말 (대표님 2026-10-28) */
      done: '우리 집 복비 얼마?',
      close: '닫기',
      pageOf: '{n} / {total}',
      /**
       * 설명은 문장마다 한 줄 (대표님 2026-10-28 "줄내림 정렬"), 아래 칸(화면 조각)은 설명과 같은 내용.
       * 칸 줄: icon check = 됨 / hide = 매칭 전엔 가림, brand = 파란 글자. {cap}은 법정 상한 예시 계산값(commission.ts)
       */
      pages: [
        {
          title: '단지만 고르면\n복비가 먼저 나와요',
          lines: ['실거래와 매물 흐름으로 복비를 추천받고,', '그 금액으로 미리 합의해요.'],
          sample: {
            caption: '예시 · {price} 매매',
            rows: [
              { label: '법정 상한', value: '{cap}' },
              { label: '복비 엔진 추천', value: '데이터로 계산', brand: true },
              { label: '합의', value: '계약 전에 확정', icon: 'check', brand: true },
            ],
          },
        },
        {
          title: '내 정보는\n매칭된 중개사에게만',
          lines: ['내 정보는 매칭이 된 중개사에게만 보여요.', '철저한 정보 보호, 복비의 장점이에요.'],
          sample: {
            rows: [
              { label: '단지 · 평형', value: '보여요', icon: 'check' },
              { label: '동·호수', value: '매칭 후 공개', icon: 'hide', brand: true },
              { label: '연락처', value: '매칭 후 공개', icon: 'hide', brand: true },
            ],
          },
        },
        {
          title: '응답한 중개사 중\n내가 골라요',
          lines: ['지역 인증 대표 공인중개사만 응답해요.', '최대 3곳까지 선택 가능해요.', '집 보는 시간도 앱으로 정해요.'],
          sample: {
            rows: [
              { label: '지역 인증 대표 공인중개사', value: '', icon: 'check', brand: true },
              { label: '중개사 선택', value: '최대 3곳까지', brand: true },
              { label: '집 보는 시간', value: '앱으로 정해요', icon: 'check', brand: true },
            ],
          },
        },
      ],
    },

    /**
     * [다산동 실시간 복비 계산 중] 홈 1·2 섹션 사이 작은 띠 (분석 화면 "매칭 사례"에서 옮김, 대표님 2026-10-28).
     * 대표님 결정: 실제 매칭이 쌓이기 전까지 목업 사례(getMatchCaseFeed, 법정 요율 엔진 계산)를 배지 없이 돌리고,
     * 실데이터가 생기면 getMatchCaseFeed 안만 바꿔 대체한다. 금액 뒤는 "절약" (대표님 2026-10-29, "낮게"에서 되돌림)
     */
    matchTicker: {
      title: '다산동 실시간 복비 계산 중',
      /** {discount} = 법정 상한 대비 낮춘 비율 */
      discountLabel: '상한 -{discount}%',
      /** {amount} = 법정 상한 대비 낮아진 금액 */
      savedLabel: '{amount} 절약',
      /** 검색 카드 아래 알약 한 줄 (2026-10-29 캔버스). title은 화면 읽기용 이름으로만 */
      pill: '{complex} {pyeong} {trade} · {amount} 절약',
    },

    /** [단지 검색창 섹션] */
    search: {
      /** [검색창 입력 힌트]: 모바일 360px 해상도에서도 잘리지 않는 반응형 안내 텍스트 */
      placeholder: '단지 이름 (예: 다산자이)',
      /** [검색 버튼] 검색창 자체가 홈의 CTA — 버튼이 질문 (대표님 2026-10-28 "우리 집 복비 얼마?가 더 직관적") */
      submit: '우리 집 복비 얼마?',
      /** [추천 검색어 타이틀]: 검색창 밑 '추천 단지' 라벨 */
      recommendedLabel: '다산동 추천 단지',
      /** [검색 결과 없음 멘트]: 다산동 외 다른 단지 입력 시 */
      emptyResultText: '현재는 남양주시 다산동 아파트 단지만 지원합니다.',
    },

    /**
     * [숫자 카드 = 상황별 전광판] (대표님 확정 2026-10-26, 계산 lib/home/homeStats.ts)
     * 1단계 매칭 0건: 분석 사실 숫자 / 2단계 매칭 1건부터: 매칭마다 바로 올라가는 실적 (● LIVE).
     * 가짜 숫자 금지 — 조회 수는 "집주인 n명"이 아니라 "n회", 매칭 시점은 계약 전이라 "아꼈다" 대신 "낮게 정한"
     */
    stats: {
      facts: {
        title: '복비 엔진이 분석한 다산동 아파트',
        big: '{complexes}개 단지 · 실거래 {trades}건',
        sub: '매물 {listings}건 흐름까지 함께 봐요',
      },
      live: {
        title: '집주인과 중개사가 함께 정한 복비',
        big: '한 집 평균 {average} 낮게',
        sub: '현재까지 총 {total} · 법정 상한 기준',
        badge: 'LIVE',
      },
      calcLabel: '복비 계산',
      /** 들어온 수를 그대로 센다 (대표님 2026-10-28 "MVP니 n명 계산 중"). MIN_CALC_SHOWN보다 작으면 숨김 */
      calcValue: '{n}명 계산 중',
      /** 전광판 (헤이딜러 메인 숫자판 방식: 큰 숫자 2칸 + 월별 막대 + 아이콘 숫자 3칸, lib/home/homeMarket.ts) */
      /** 2026-10-29 대표님 캔버스: 큰 숫자(단지 예시 절약액)를 바로 설명하는 제목. "아낄"은 절약 금지 규칙을 없앤 뒤 */
      sectionTitle: '우리 단지 복비, 이만큼 아낄 수 있어요',
      /**
       * 큰 숫자 = 최근 1년 중개 매매의 법정 상한 합계 (대표님 2026-10-28 "더 어그로 끌 숫자").
       * 법 계산이라 사실, 집주인 쪽 한 번만 (사는 쪽까지 더한 2배는 집주인 화면에 맞지 않아 뺐다). "아낀 금액"은 매칭 1건부터 LIVE 줄
       */
      capSumLead: '최근 1년 다산동 매매 복비, 법정 상한으로 내면',
      capSumValue: '최대 {amount}',
      capSumBasis: '중개 거래 {n}건 · 집주인 쪽 기준',
      /** 가정 한 줄 (연한 초록 = 이득 색, 대표님 2026-10-28). "절약·아낀" 대신 "낮아져요", 사람이 아니라 "한 집" */
      scenario: '{pct}% 낮게 정하면 한 집 평균 {amount} 낮아져요',
      avgLabel: '한 집 평균',
      maxLabel: '한 집 최고',
      /**
       * 단지 예시 칩 (대표님 2026-10-29 C안, 시험 중 — 되돌릴 수 있어 위 107억·가정 줄 문구는 남겨 둠).
       * 큰 숫자 = 칩 단지의 최근 1년 중개 매매 법정 상한 평균 × 가정 할인율 (lib/home/homeMarket.ts homeComplexExamples)
       */
      exampleChipsLabel: '예시 단지',
      /** 큰 숫자 옆 아래 화살표 (화면 읽기용), 그 아래 연한 초록 상자 (대표님 2026-10-29 캔버스) */
      exampleArrowLabel: '낮아짐',
      exampleUnit: '{pct}% 낮게 정하면 한 집 평균 이만큼 절약',
      exampleLow: '{pct}% 낮게 정하면',
      exampleCap: '법정 상한 {amount}',
      /** "가정" 표기는 대표님이 뺌 (2026-10-29) — 막대 아래 "n% 낮게 정하면"과 초록 상자가 가정임을 말한다.
       *  "AI 분석"은 쓰지 않는다 (이 숫자는 법정 상한 × 엔진 추천 범위 30%, AI 계산 아님) */
      exampleBasis: '최근 1년 실거래 {n}건 · 복비 엔진 기준',
      chartCaption: '월별 실거래',
      /** 아래 스케일 3칸 (천 단위 숫자로 — 58·336은 작아 보여 아래 한 줄로, 대표님 2026-10-28) */
      tradesShort: '매매 실거래',
      jeonseShort: '전세 계약',
      listingsShort: '지금 매물',
      scaleNote: '다산동 {complexes}개 단지 · 중개사무소 {offices}곳 분석',
      /** 숫자판 제목 오른쪽 (A7 행동 기록 전·10 미만이면 숨김) */
      calcShortValue: '{n}명 계산 중',
      officesLabel: '다산동 중개사무소',
      officesValue: '{n}곳',
      officesNote: '등록 명단 기준',
    },

    /**
     * [복비는 이렇게 달라요] 진행 3단계 + 다른 이유를 한 섹션으로 (대표님 2026-10-28: "진행상황과 다른 이유는 겹친다").
     * 단계마다 다른 점 한 줄. 예전 강점 4장(블라인드·확인된 중개사·합의 그대로·내 시간 집보기)은 이 줄들에 들어갔다.
     * 모두 지금 있는 기능만: 매물 흐름 계산 / 동·호수·연락처 가림 / 명단 대조 가입 + 최대 3곳 + 방문 가능 시간(showing.ts)
     */
    process: {
      /** 2026-10-29 대표님 A안: 질문형 제목 + 제목 옆 칩. "검증된"은 근거가 약해 "지역 인증"으로 */
      sectionTitle: '복비, 왜 다를까요?',
      /** 홈에선 단계마다 한 줄 + 제목 옆 칩만 (화면 조각은 "자세히 보기" → 이용 방법 시트, 대표님 2026-10-28 "너무 길다") */
      steps: [
        { title: '복비부터 정하고 시작', desc: '실거래를 기준으로 미리 합의해, 계약 날 흥정할 필요가 없어요.', chip: '상한 안에서' },
        { title: '내 정보는 안전하게', desc: '정확한 동·호수는 내가 고른 중개사에게만 보여요.', chip: '안심 매칭' },
        { title: '내가 직접 골라요', desc: '지역 인증 공인중개사 중 마음에 드는 곳을 골라요.', chip: '최대 3곳' },
      ],
      more: '자세히 보기',
    },

    /** [파트너 중개사 배너 섹션] */
    partnerBanner: {
      /**
       * 홈 맨 아래 중개사 띠 (대표님 2026-10-28): 집주인도 읽으니 영업 말투("매물 확보") 대신 장점 네 줄 아이콘 목록.
       * 비용 표현(광고비·0원·무료·크레딧) 금지, "선착순"·"하루 3건"도 사실 아닌 약속이라 쓰지 않는다
       */
      badge: '다산동 공인중개사인가요?',
      title: '합리적인 복비로\n다산동 집주인을 만나보세요',
      /** 2026-10-29 대표님 시안부터 홈 카드에선 안 씀 (버튼 → 중개사용 이용 방법 시트가 혜택을 보여 줌). 다른 곳에서 쓸 때를 위해 남김 */
      items: [
        { icon: 'direct', title: '집주인 다이렉트 매칭', desc: '집주인이 직접 맡긴 의뢰' },
        { icon: 'fair', title: '합리적인 복비', desc: '실거래·매물 흐름으로 추천된 금액' },
        { icon: 'agreed', title: '흥정 없는 합의', desc: '복비가 정해진 뒤 연결돼요' },
        { icon: 'blind', title: '주변 부동산 블라인드', desc: '서로의 정보는 오직 매칭된 중개사와 집주인만' },
      ],
      guideLink: '처음이라면? 이용 방법',
      /** 카드의 버튼 하나 = 처음 오는 중개사의 입구: 혜택 시트 → 마지막에 가입 (대표님 2026-10-29 시안) */
      buttonText: '파트너 중개사 혜택 보기',
    },

    /**
     * [중개사용 이용 방법 시트] 홈 중개사 띠의 "처음이라면?" (집주인용 guide와 같은 부품 HomeGuideSheet, 대표님 2026-10-28).
     * 크레딧 얘기는 넣지 않는다 (대표님: "크레딧 삭제"). 3장은 블라인드 설명 — e2e blind-guard가 지키는 사실
     */
    brokerGuide: {
      next: '다음',
      prev: '이전',
      done: '파트너 중개사 등록하기',
      close: '닫기',
      pageOf: '{n} / {total}',
      pages: [
        {
          title: '복비 합의\n요청이 와요',
          lines: ['단지·평형·합의 복비만 보고 매칭을 시작해요.'],
          sample: {
            rows: [
              { label: '단지 · 평형', value: '보여요', icon: 'check' },
              { label: '합의 복비', value: '보여요', icon: 'check', brand: true },
              { label: '동·호수 · 연락처', value: '매칭 후 공개', icon: 'hide', brand: true },
            ],
          },
        },
        {
          title: '집주인이\n최대 3곳을 골라요',
          lines: ['고르는 건 집주인이에요.'],
          sample: {
            rows: [
              { label: '요청 보내기', value: '중개사', icon: 'check' },
              { label: '고르기', value: '집주인 · 최대 3곳', icon: 'check', brand: true },
            ],
          },
        },
        {
          title: '주변 부동산도\n몰라요',
          lines: ['매칭된 중개사에게만 동·호수·연락처가 열려요.', '선택받지 못한 곳은 끝까지 못 봐요.'],
          sample: {
            rows: [
              { label: '매칭된 중개사', value: '정보 열림', icon: 'check', brand: true },
              { label: '주변 부동산', value: '계속 가림', icon: 'hide' },
            ],
          },
        },
      ],
    },

    /** [파트너 서약 모달] 2026-10-25 삭제: 가입 화면 약속 단계(brokerSignup.promise)와 겹쳐 배너에서 바로 가입으로 */

    /** [하단 푸터 섹션] */
    footer: {
      /**
       * [공인중개사법·전자상거래법상 통신판매중개 고지] 바닥글엔 한 줄만 (대표님 2026-10-29 바닥글 A안: "글이 너무 많다").
       * 개업공인중개사가 아니라는 점과 거래 당사자가 아니라는 점은 빼지 않는다. 책임 범위 전문은 약관 창 "책임의 한계" 탭
       */
      disclaimer: `${COMPANY_INFO.serviceName}는 개업공인중개사가 아닌 통신판매중개자이며, 거래의 당사자가 아닙니다.`,
      /** [약관 및 정책 바로가기 라벨] */
      termsLabel: '이용약관',
      privacyLabel: '개인정보 처리방침',
      disclaimerLabel: '책임의 한계 및 법적고지',
      /** [사업자 정보 토글 라벨] */
      businessInfoToggle: '{company.legalName} 사업자 정보',
      /** [사업자 정보 예시 배지]: COMPANY_INFO.isPlaceholder가 true일 때만 노출 */
      placeholderBadge: '예시 정보',
      /** [배포 전 교체 항목 표시]: pendingFields에 남은 값 옆에 붙는 작은 배지 */
      pendingBadge: '수정 필요',
      /** [사업자 정보 항목 라벨] — 값은 상단 COMPANY_INFO에서 관리 */
      businessInfoLabels: {
        legalName: '상호',
        ceo: '대표자',
        businessNumber: '사업자등록번호',
        ecommerceNumber: '통신판매업신고',
        address: '주소',
        phone: '전화',
        email: '고객문의',
        hostingProvider: '호스팅 제공',
      },
      /** [카피라이트]: 저작권 표기 */
      copyright: `© ${COMPANY_INFO.copyrightYear} Bokbi Platform. All rights reserved.`,
    },
  },

  // ==========================================================================
  // 3. AI 정밀 분석 화면 (app/analysis/[id]/ 및 src/components/analysis/)
  // ==========================================================================
  analysis: {
    /** [상단 아파트 배지 & 조회수 영역] */
    heroBadge: {
      /** [대장 아파트 배지]: 대장 단지 진입 시 왕관 아이콘과 함께 표기되는 심플 라벨 */
      leaderBadge: '대장',
      /** [진성 조회수 라벨 앞단]: 실제 오늘 누적 카운트 안내 */
      viewCounterPrefix: '오늘 다산동 집주인 조회',
      /** [진성 조회수 라벨 뒷단]: 조회 횟수 단위 */
      viewCounterSuffix: '회',
    },

    /** [거래유형 스위처] */
    tradeType: {
      /** [매매 라벨]: 매매 탭 텍스트 */
      sale: '매매',
      /** [매매 상한 요율 안내]: 매매 법정 상한 (구간별 0.4%~0.5%) */
      saleRateHint: '법정 상한 0.4%~0.5%',
      /** [전세 라벨]: 전세 탭 텍스트 */
      jeonse: '전세',
      /** [전세 상한 요율 안내]: 전세 법정 상한 (구간별 0.3%~0.4%) */
      jeonseRateHint: '법정 상한 0.3%~0.4%',
    },

    /** [평형대 칩 선택기] */
    pyeongSelector: {
      /** [영역 타이틀]: 평형 선택기 상단 라벨 */
      /** 평형·층을 흰 카드 한 장에 (대표님 2026-10-29 캔버스 1번 "테두리 카드") */
      title: '평형·층 고르기',
      // 보조 문구 "(실거래가 연동)"·"총 n개 타입"은 반복 정보라 삭제 (대표님 승인 2026-10-24 디자인 grill)
    },

    /** [층수 구간 칩 선택기] */
    floorSelector: {
      /** [영역 타이틀]: 층수 선택기 상단 라벨 */
      title: '층수 구간',
      /** [서브 설명]: 구간마다 가장 최근 실거래를 기준점으로 쓴다 (예상가 없음, 대표님 결정 2026-10-23) */
      subTitle: '· 12개월 실거래',
      /** [층 구간 정의]: 저층 1~3층 · 중층 4~14층 · 고층 15층 이상. 판정 함수는 src/lib/market/floorBand.ts */
      bands: {
        low: { label: '저층', range: '1~3층' },
        mid: { label: '중층', range: '4~14층' },
        high: { label: '고층', range: '15층 이상' },
      },
      /** [세그먼트 칸 안 가격 아래]: 그 구간 12개월 거래 수 (구간끼리 거래량 비교, 2026-10-27 대표님 A안). {count} */
      chipCount: '{count}건',
      /** [세그먼트 칸 안, 구간 12개월 거래 0건] */
      chipNoTrade: '거래 없음',
      /**
       * [세그먼트 아래 한 줄]: 고른 구간의 가장 최근 실거래 1건만. 날짜·층·가격 (2026-10-27 대표님 A안).
       * "최근 3건 범위" 줄은 삭제 — 범위 끝값이 최신가로 읽혀 "왜 최신가를 안 쓰냐"는 오해를 부름. {date}, {floor}, {price}
       */
      bandLine: '가장 최근 {date} · {floor}층',
      /** [층 칸 아래 한 줄 앞]: 고른 구간 거래 수 — 칸에서 뺀 "n건"을 여기로 (대표님 2026-10-29). {band}, {count} */
      bandCountLine: '{band} 최근 1년 실거래 {count}건',
      /** [세그먼트 아래 한 줄, 구간에 12개월 거래가 없을 때]: 다른 층 거래를 기준으로 썼음을 밝힌다 ("거래 없음"은 칸 안에 있어 반복하지 않음, 360px 한 줄). {date}, {floor}, {price} */
      bandLineOther: '다른 층 가장 최근 {date} · {floor}층 · {price}',
    },

    /** [호갱노노 스타일 2년 차트 & 실거래 계약 테이블] */
    chartCard: {
      /** [최근 시세 배지]: 카드 상단 우측 배지 */
      recentTradeBadge: '국토부 실거래가 연동',
      /** [차트 서브타이틀]: 2년 시세 추세 안내 */
      chartSubTitle: '최근 2개년 실거래 추이 & 거래량',
      /** [차트 조건 칩]: 지금 그래프가 어떤 조건인지 (대표님 승인 2026-10-24). 선은 이 평형 전 층, 달마다 그달 마지막 실거래 */
      chartConditionChip: '{pyeong} · 전용 {area}㎡ · {tradeType} · 최근 2년',
      /** [선 범례]: 중간값은 실제 거래가가 아니라 쓰지 않는다 — 끝점이 계약 목록 맨 위 거래와 같다 (대표님 결정 2026-10-27) */
      chartLegendPrice: '매월 마지막 거래가격',
      /** [점 눌렀을 때 상자]: 그 거래의 계약일·층. {date}, {floor} */
      chartTooltipTrade: '{date} 계약 · {floor}층',
      /** [점 눌렀을 때 상자]: 그 달 거래 수 ("그달" 대신 몇 월인지 바로, 대표님 2026-10-27). {month}, {count} */
      chartTooltipVolume: '{month}월 거래 총 {count}건',
      chartLegendVolume: '거래량(건)',
      /** [제목 아래 범위 라벨]: 제목은 "{tradeType} 실거래", 범위는 12개월 (차트는 2년) */
      rangeLabel: '최근 12개월 거래 범위',
      /**
       * [실거래 · 호가 카드] (2026-10-27 대표님 A안): 실거래 실선 + 매월 호가 최저 점선 + 거래량, 층 탭, 계약 최근 3건.
       * 호가는 평형·층별 수집 전이라 자리만 (가짜 숫자 금지). 수집되면 askingPending 대신 "{min} ~ {max}" + 매물 수·기준일
       */
      /**
       * 제목·줄 이름 (대표님 2026-10-27): "팔린 값 vs 부르는 값" — 사실 그대로(누가 불렀는지는 말하지 않음, "입주민 호가" 금지).
       * 매매/전세는 아래 조건 칩에 있어 제목에서 뺌
       */
      cardTitle: { 매매: '팔린 값 vs 부르는 값', 전세: '계약된 값 vs 부르는 값' },
      tradeRangeLabel: { 매매: '최근 12개월 팔린 값', 전세: '최근 12개월 계약된 값' },
      askingLabel: '지금 부르는 값',
      askingPending: '준비 중이에요',
      /**
       * [호가 줄 아래] (lib/market/askingPrice.ts, 2026-10-27): {scope} = 층 탭이면 '고층 ', 전체면 '', {n} 매물 수, {date} 수집일.
       * "실제 거래가가 아니에요"는 뺌(제목 "부르는 값"이 이미 말함). 수집처(네이버) 이름은 화면에 쓰지 않음 (대표님 2026-10-27)
       */
      askingMeta: '{scope}매물 {n}건 · {date} 기준',
      /** 고른 층 구간에 지금 나온 매물이 없을 때 (층 표기만 있어 구간을 확실히 알 수 없는 매물은 전체 탭에만) */
      askingNone: '지금 나온 매물이 없어요',
      /** 층 구간 탭인데 저·중·고 표기만 있어 구간을 확실히 모르는 매물이 있을 때 (없다고 하지 않는다) */
      askingNoneUnknown: '층이 확인된 매물이 없어요',
      askingUnknownNote: '층이 저·중·고로만 표시된 매물 {n}건은 전체 탭에만 있어요',
      /** [띠 범례]: 달마다 그달 수집한 매물 호가 최저~최고 */
      chartLegendAsking: '호가 범위',
      /** [띠 눌렀을 때 상자] {month}, {min}, {max} */
      chartTooltipAsking: '{month}월 호가 {min} ~ {max}',
      /** [층 탭] 첫 칸 = 이 평형 전 층 (나머지는 floorSelector.bands 라벨) */
      floorTabAll: '전체',
      /** 고른 층 구간에 2년간 거래가 없을 때 */
      emptyBand: '이 층 구간은 최근 2년 거래가 없어요',
      /** [계약 목록 오른쪽] {n}건, {band} 층 구간 (전체면 band 없이) */
      contractsCount: '최근 {n}건',
      /** [선택 층 기준 실거래 라벨]: '{층 구간} 최근 실거래: 가격 (층 · 날짜)' — 예상 시세를 만들지 않는다 */
      referenceLabel: '최근 실거래',
      /** [선택 층수 범례]: 파란색 핀 범례 텍스트 */
      selectedFloorLegend: '● 내 아파트 선택층',
      /** [실거래 계약 목록 헤더]: 테이블 상단 제목 */
      // 360px 한 줄 (최근순은 목록 순서로 드러난다, 2026-10-24)
      tableHeaderTitle: '국토부 실거래 계약',
    },

    /** [복비 커스터마이저 카드] */
    customizer: {
      /** [카드 타이틀]: 복비 시뮬레이터 상단 제목 */
      cardTitle: '데이터로 계산한 추천 복비',
      /** [기준 거래가 접두사]: 선택한 평형·층 구간의 가장 최근 실거래, 예상가를 만들지 않는다 (모달은 희망가 기준) */
      dealPricePrefix: '최근 실거래 {tradeType}가',
      /**
       * [기준가 출처 보조 문구] {band} = '중층', {floor} = 층, {date} = 'YY.MM.DD'
       * OTHER_FLOOR: 선택 구간에 최근 12개월 거래가 없어 이 평형의 가장 최근 거래를 쓴 경우
       */
      dealPriceBasis: {
        // 층 구간 이름은 바로 위 층 칩에 있어 뺀다 (대표님 승인 2026-10-24). {band}는 다른 출처 문구에서만 쓴다
        FLOOR: '{floor}층 · {date} 계약',
        OTHER_FLOOR: '{band} 최근 1년 거래가 없어 {floor}층 거래 기준 · {date} 계약',
        COMPLEX_M2: '이 평형 최근 1년 거래가 없어 단지 ㎡당 실거래로 환산',
        DONG_M2: '단지 최근 1년 거래가 없어 다산동 ㎡당 실거래로 환산',
      },
      /**
       * [매칭 유도 (정보 공백 넛지, RULES 행동경제학 1)]: 희망가 입력을 이 화면에서 받지 않는다 (이탈 방지, 대표님 2026-10-23).
       * 내 집 기준 확정은 매칭 요청 흐름에서 한다
       */
      /**
       * [카드 버튼 밑 한 줄] (2026-10-27 대표님 최종 시안): 카드 버튼 문구는 아래 고정 바(stickyBar.cta*)와 같은 값을 쓴다.
       * 금액 조절·더 빠른 매칭 옵션·부가세 자세히는 매칭 요청 창 "복비 정하기" 단계로 옮김
       */
      ctaSubLine: '우리 집 확정 복비는 매칭 요청에서 정해요',
      /**
       * [분석 카드 금액 라벨] (2026-10-27 대표님: 분석 화면은 "제안"이 아니라 추천을 보여 주는 곳).
       * {range} = 초록(추천) 구간의 할인 범위. 추천이 20%라 초록 구간이 없으면 범위 없이 라벨만. 부가세는 매칭 요청 창 복비 정하기에서
       */
      analysisFeeLabel: '추천 {tradeType} 복비',
      analysisFeeRange: '할인 {min}~{max}% 구간',
      /** [구간 막대 ▼ 위 글자]: 금액 대신 "추천" */
      analysisMarkerLabel: '추천',
      /** [법정 상한 복비 접두사] */
      legalMaxPrefix: '법정 상한',
      /** [부가세 안내]: 법정 상한·제안 복비 모두 부가세 별도. 사무소 유형별 금액을 행으로 나눠 표시 */
      vatTitle: '부가세 별도 (중개사무소 과세 유형에 따라)',
      /** [부가세 접힘 한 줄]: {amount} = 일반과세 10% 금액 (만 원 단위 내림). 누르면 사무소 유형별 두 줄 (대표님 승인 2026-10-24) */
      vatSummary: '부가세 별도 · 최대 +{amount}',
      vatGeneralLabel: '일반과세 사무소 10%',
      vatSimplifiedLabel: '간이과세 사무소 4%',
      /** [제안 복비 라벨]: 내 복비 금액 윗단 텍스트 */
      proposedFeeLabel: '내가 제안하는 {tradeType} 복비',
      /** [법정 상한보다 낮은 금액 배지]: 금액과 할인율 ("아껴요" → "낮아요", 대표님 2026-10-29) */
      savingsBadgeText: '{saved} 낮아요 · {rate}%↓',
      /** 법정 상한 그대로 제안할 때 ("0원 낮아요 · 0%↓" 대신) */
      savingsZeroText: '법정 상한 그대로 제안',
      /**
       * [데이터 부족 30% 안내]: 사실 그대로 밝히고 부드럽게 매칭을 권한다 (대표님 2026-10-24).
       * {n} = 단지 최근 12개월 거래 수
       */
      defaultReasonText: {
        NO_DATA: '최근 1년 거래가 {n}건이라 매물 소화 속도를 계산하기 어려워요. 다산동 평균 단지와 같은 30%로 매칭을 요청해 보세요',
      },

      /** [슬라이더 양 끝 라벨]: 트랙은 0원~법정 상한 */
      sliderZeroLabel: '0원',
      /** [하한 표시]: 트랙 아래 빗금 구간 설명 */
      sliderFloorLabel: '최소 30% ({amount}) 아래는 제안할 수 없어요',

      /**
       * [슬라이더 4색 구간 문구] (대표님 제안 2026-10-22, 중개사 관심도 표기 대체)
       * 중개사를 깎아내리는 표현 금지 (RULES): 상생 관계 기준으로 쓴다
       */
      zoneText: {
        WIDE: '많은 중개사의 요청을 받을 수 있어요',
        RECOMMENDED: '집주인과 중개사 모두 납득할 수 있는 추천 구간이에요',
        CAUTION: '요청하는 중개사가 줄어들 수 있어요',
        RISK: '매칭이 어려울 수 있어요. 48시간 안에 응답이 없으면 다시 조정해 보세요',
      },

      /**
       * [협의 복비 약속]: 제안 금액 바로 아래 강조 박스 (2026-10-24 대표님 승인: "보장" 배지 삭제, 법적 보장처럼 읽히지 않게).
       * 매칭 모달 Step 5 feeGuarantee와 같은 약속
       */
      guaranteeText: '매칭이 확정되면 이 금액으로 계약해요. 계약 당일 다시 흥정하지 않아요',

      /** [하한선 안내]: 법정 상한의 30% 도달 시 (오류가 아닌 정상 안내) */
      minFloorWarning: '법정 상한의 30%가 최소 제안 금액이에요',
      /** [법정 최고 초과 차단 고지] */
      maxCeilingWarning: '공인중개사법상 법정 상한 요율({rate})을 넘을 수 없어요',
      /** [보너스 상한 캡 안내] */
      bonusCappedNotice: '보너스를 더해도 법정 상한까지만 제안돼요',
      /** [보너스 합계 줄]: 금액 아래, 보너스를 켰을 때만 (대표님 승인 2026-10-24) */
      bonusSumLine: '{base} + 보너스 {bonus} = {total}',
      /** [보너스 상한 초과 안내]: 슬라이더 바로 아래 */
      bonusCapSliderNotice: '법정 상한({max})을 넘을 수 없어 보너스는 {applied}까지만 반영돼요',
      bonusCapSliderNoticeNone: '이미 법정 상한({max})이라 보너스는 반영되지 않아요',

      /** [금액 미세 조절 스텝퍼 라벨] */
      /** [추천가 되돌리기 버튼] */
      aiResetButtonLabel: '추천가로 되돌리기',
      /** [스텝퍼 버튼 라벨 4종] */
      stepperLabels: {
        minus10: '-10만',
        minus1: '-1만',
        plus1: '+1만',
        plus10: '+10만',
      },

      /** [더 빠른 매칭 옵션 아코디언] */
      fasterMatchingTitle: '더 빠른 매칭 옵션 (선택)',
      fasterMatchingSubTitle: '도배 협의, 빠른 잔금 등 보너스로 매칭을 가속해요',
      appliedBonusSuffix: '+{amount} 적용 중',

      /** [집주인 직접 협의조건 인풋 라벨 및 플레이스홀더] */
      customConditionLabel: '집주인 희망 협의조건 직접 입력',
      customConditionSubLabel: '선택 사항',
      customConditionPlaceholder: '예: 도배 50%만 지원, 1달이내 잔금 협의 등',
      bonusAmountChoiceLabel: '보너스 금액 선택:',

      /** [기본 복비 + 특별 보너스 합계 라벨] */
      totalWithBonusLabel: '기본 복비 + 특별 보너스 합계',
    },

    /**
     * [단지별 주민 투표] (대표님 승인 2026-10-24 디자인 grill)
     * 주제는 단지 실데이터로 코드가 만든다 (src/lib/market/debateTopics.ts). Supabase 이후 AI가 주 1회 문장을 새로 쓰는 구조로 이어진다.
     * 자극적 주제 허용, 단 금지 3가지: ① 가격 담합 유도(공인중개사법 제33조 제2항) ② 특정 단지·주민 비하 ③ 데이터에 없는 숫자.
     * 실제 집계 전까지 결과(퍼센트·표수)를 보여주지 않는다 (가짜 표수 금지).
     */
    debates: {
      /** 이름 "주민 투표" → "끝장 투표" (대표님 2026-10-27) */
      /** [카드 제목]: 단지 짧은 이름 + 끝장 투표 (대표님 2026-10-29). {name} */
      cardTitle: '{name} 끝장 투표',
      blindResultNotice: '참여가 모이면 결과 공개',
      votedNotice: '선택 완료 · 결과는 참여가 모이면 공개돼요',
      statusOpen: '투표 진행 중',
      statusVoted: '내 선택 완료',
      myChoiceBadge: '내 선택',
      /** 투표 전 칸 아래 작은 안내 (VS 대결형, 2026-10-27) */
      voteHint: '눌러서 투표',
      openModalButtonText: '끝장 투표 {count}개 주제 모두 보기',
      modalHeaderTitleSuffix: '끝장 투표',
      /** 투표 창 머리 (2026-10-27): 아이콘·파란 상자 없이 제목 + 부제 + 회색 점 한 줄 */
      modalHeaderSubTitle: '{count}개 주제 · 참여가 모이면 결과 공개',
      aiUpdateNotice: '숫자는 국토부 실거래·지금 매물 그대로예요. 시세 전망이 아니에요',

      /** [투표 전 가려진 게이지] (A안, 대표님 승인 2026-10-24): 결과 숫자 없이 움직임으로 시선만 끈다 */
      hiddenGaugeHint: '투표하면 내 선택이 표시돼요',
      /** [실데이터 비교 막대] (B안) 제목 */
      compareTitle: '데이터로 보면',

      /**
       * [주제 틀 5가지] 계기가 없는 단지는 그 틀을 건너뛴다. {placeholder}는 debateTopics.ts가 실데이터로 채운다
       * compareA/compareB: 비교 막대 라벨 (B안). 값은 모두 실거래·매물 데이터
       */
      templates: {
        RECORD: {
          badge: '신고가 논쟁',
          question: '{pyeong} {price} 찍었다, 또 넘는다 vs 여기가 꼭대기',
          description: '최근 1년 최고 실거래 {price} ({date} · {floor}층)',
          optionA: '또 넘는다',
          optionB: '여기가 꼭대기',
          compareA: '이번 최고가',
          compareB: '1년 전 최고가',
        },
        LEADER: {
          badge: '대장 단지 배틀',
          // 2026-10-27 대표님: ㎡당 → 평형대 실거래 중간값 (debateTopics.ts LEADER_BANDS), 질문은 짧게
          question: '다산 {band} 대장은?',
          description: '{band} 최근 1년 실거래 중간값 다산동 {rankA}위 vs {rankB}위',
          // 투표 칸·막대는 짧은 이름 (src/data/complexShortNames.ts)
          optionA: '{aBtn}',
          optionB: '{bBtn}',
          compareA: '{aBtn}',
          compareB: '{bBtn}',
        },
        SUPPLY: {
          badge: '매도 타이밍',
          question: '매물 {listings}건, 6개월 거래 {deals}건… 지금 팔면 손해 vs 지금이 적기',
          description: '매매 매물 {observedAt} 기준 · 국토부 중개거래 최근 6개월',
          optionA: '지금 팔면 손해',
          optionB: '지금이 적기',
          compareA: '지금 매물',
          compareB: '6개월 거래',
        },
        JEONSE: {
          badge: '전세가 체감',
          question: '{pyeong} 전세 {price}, 비싸다 vs 이 정도면 싸다',
          description: '최근 신규 전세 실거래 ({date} · {floor}층)',
          optionA: '비싸다',
          optionB: '이 정도면 싸다',
          compareA: '이번 전세',
          compareB: '다산동 {band} 전세 중위',
        },
        UPGRADE: {
          badge: '평수 갈아타기',
          question: '{small} → {large} 갈아타기, 차이 {diff}이면 간다 vs 안 간다',
          description: '최근 1년 실거래 중위가 {small} {smallPrice} · {large} {largePrice}',
          optionA: '간다',
          optionB: '안 간다',
          compareA: '{small} 중위가',
          compareB: '{large} 중위가',
        },
      },
    },

    /** [특별 보너스 옵션 목록 - 집주인 실익 중심 당근 옵션] */
    bonuses: [
      {
        id: 'bonus_repair_agree',
        title: '도배·장판 임차인 부담 협의 성사',
        amountWon: 200000,
        amountText: '+20만 원',
        desc: '임차인이 도배·장판 비용을 직접 부담하도록 협의 성사 시 (집주인 지출 약 150~200만 원이 줄어요)',
        isCustom: false,
      },
      {
        id: 'bonus_quick_30d',
        title: '30일 이내 급매·잔금 계약 성사',
        amountWon: 300000,
        amountText: '+30만 원',
        desc: '30일 이내에 진성 매수인과 빠른 계약 및 잔금 일정 협의 완료 시',
        isCustom: false,
      },
      {
        id: 'bonus_custom_input',
        title: '집주인 특별 협의조건 및 보너스 (직접 입력)',
        amountWon: 200000,
        amountText: '+20만 원',
        desc: '도배 지원, 입주청소 완료, 빠른 잔금 등 집주인 희망 조건을 직접 입력합니다.',
        isCustom: true,
      },
    ],

    /** [내 집 맞춤 진단 배너]: 복비 시뮬레이터 바로 아래, 매칭 모달 열기 */
    precisionBanner: {
      badge: '내 집 맞춤 진단',
      title: '지금 결과는 최근 실거래 기준이에요',
      /** 모달에서 희망가를 입력하면 법정 상한·절약액을 그 금액으로 다시 계산한다 */
      desc: '매칭을 요청하면 내 집 희망가로 법정 상한과 복비를 확정해 드려요.',
      buttonText: '내 집 확인',
    },

    /**
     * [중개사가 받는 금액 카드] 중개사 플로우 전용 (Phase 5 /agent/feed 매칭 매물 상세에서 사용 예정).
     * 집주인 분석 화면에서는 "내가 제안하는 복비"와 같은 숫자라 내렸다 (대표님 지적 2026-10-22)
     */
    brokerPayout: {
      title: '중개사가 받는 금액',
      desc: '내 제안대로 계약하면 중개사가 받는 중개보수예요',
      /** {ref} = 다산동 거래 1건 법정 상한 보수 중위, {pct} = 비율 */
      compareText: '다산동 거래 1건 법정 상한 보수 중위 {ref}의 {pct}%',
      /** {amount} = 집주인이 더한 추가 보수 */
      bonusIncluded: '추가 보수 {amount} 포함',
      bonusHint: '추가 보수를 제안하면 중개사가 받는 금액이 늘어나요',
      points: ['집주인이 직접 맡긴 매물', '매칭은 최대 3곳까지', '합의한 보수 그대로 계약'],
      /** {kind} = 중개거래/신규 계약, {deals} = 건수 */
      basisNote: '국토부 실거래 최근 6개월 {kind} {deals}건 · 법정 상한 기준이라 실제 받은 보수와 다를 수 있어요',
      kindLabel: { 매매: '중개거래', 전세: '전세 신규 계약' },
    },

    /**
     * [추천 근거 카드: 우리 아파트 시장 분석] 집주인 분석 플로우의 핵심 (대표님 지시 2026-10-22)
     * "왜 이 추천 금액인가"를 수요·공급(매물 vs 거래) → AI 분석 요약 → 추천 할인 계산 순서로 설명한다.
     * 중개사 수입(다산동 중개보수 중위 등)과 비교하는 문장은 쓰지 않는다 (대표님: 중개사 반발)
     */
    recommendationReason: {
      /**
       * 펼침 안 출처 배지. AI 설명이 실패해 템플릿이 나와도 표기는 항상 같게 (대표님 2026-10-26:
       * 이용자가 헷갈리지 않게 통일, 템플릿 품질은 우리가 고친다). 버튼·출처 줄도 같은 원칙
       */
      title: 'AI 분석',
      /** 분석 데이터 규모 (단지 판단은 다산동 전체와 비교해서 나온다). {complexes}·{trades}·{listings} */
      subTitle: '다산동 {complexes}개 단지 실거래 {trades}건과 현재 매물 {listings}건을 바탕으로 복비 분석 엔진과 AI가 우리 아파트를 분석했어요',
      aiLoading: 'AI가 분석 내용을 정리하고 있어요',
      /**
       * [접힌 요약] (대표님 승인 2026-10-24 디자인 grill, 시험 적용): 헤드라인 + 숫자 한 줄 + 위치 한 줄만 먼저 보이고
       * 시장 스펙트럼·AI 본문·계산표·출처는 펼치기 안에. 정보는 지우지 않는다
       */
      headlineFallback: '{position}, 추천 할인 {pct}%',
      /** [카드 제목] 질문형 + 이 평형 숫자 (대표님 승인 2026-10-24, "AI/데이터로 분석한 추천 이유"는 펼침 안 출처 표시로) */
      titleQuestion: '왜 {pct}% 할인일까요?',
      /**
       * [카드 제목 B안] (대표님 승인 2026-10-24): 작은 회색 라벨 + 결론 문장 제목 (색 없음).
       * 결론은 계산표 아래 한 줄(positionNote)과 같은 판정. {verb} = 매매 "팔려요" / 전세 "나가요"
       */
      /** 2026-10-27 대표님: "추천 할인 {pct}%의 이유" → 누가 추천했는지 밝히는 라벨 */
      titleLabel: 'AI와 복비 엔진의 추천 이유',
      titleConclusion: {
        FASTER: '매물이 평균보다 빨리 {verb}',
        SLOWER: '매물이 평균보다 천천히 {verb}',
        EQUAL: '다산동 평균만큼 {verb}',
        MAX: '매물이 아주 빨리 {verb}',
        MIN: '매물이 많이 쌓여 있어요',
        NO_DATA: '거래가 적어 평균 30%를 적용했어요',
      },
      titleVerb: { 매매: '팔려요', 전세: '나가요' },
      tileListings: '지금 매물',
      tileDeals: '6개월 거래',
      tileSpeed: '소화 속도',
      rangeAvgLabel: '평균 30%',
      summaryLine: '매물 {listings}건 · 6개월 거래 {deals}건 · 소화 속도 {ratio}배',
      summaryLineNoRatio: '매물 {listings}건 · 6개월 거래 {deals}건',
      expandButton: 'AI 분석 자세히 보기',
      collapseButton: '접기',
      /** 시장 위치 판정 (엔진 grade). 전세는 임대인/임차인 */
      positionLabels: {
        매매: { FAST: '매도자 우위 시장', BALANCED: '균형 시장', SLOW: '매수자 우위 시장', UNKNOWN: '판단 보류' },
        전세: { FAST: '임대인 우위 시장', BALANCED: '균형 시장', SLOW: '임차인 우위 시장', UNKNOWN: '판단 보류' },
      },
      /** 스펙트럼 양 끝 라벨 */
      spectrumLeft: { 매매: '매수자 우위', 전세: '임차인 우위' },
      spectrumRight: { 매매: '매도자 우위', 전세: '임대인 우위' },
      metricListings: '지금 나와 있는 매물',
      /** 매물·거래는 이 평형이 속한 면적대 기준 (엔진 v4, 6개월 중개거래) */
      metricDeals: '최근 6개월 거래',
      /** {band} = 소형/중형/대형, {range} = 면적 범위 */
      metricScope: '{band} 평형({range}) 기준',
      bandLabels: { SMALL: '소형', MEDIUM: '중형', LARGE: '대형' },
      bandRanges: { SMALL: '전용 60㎡ 이하', MEDIUM: '전용 60~86㎡', LARGE: '전용 86㎡ 초과' },
      /** 시장 위치별 설명: 매물 소화 속도가 협상력을 어떻게 바꾸는지 */
      positionDesc: {
        FAST: '매물이 적고 거래가 활발해 다산동 평균보다 매물이 빨리 소화돼요. 중개사들이 매물을 확보하려는 단지라 집주인 협상력이 커요.',
        BALANCED: '매물과 거래가 다산동 평균 수준이에요. 추천 할인도 평균 단지와 비슷해요.',
        SLOW: '거래보다 매물이 많이 쌓여 있어 중개사가 고를 집이 많아요. 그래서 추천 할인을 작게 잡았어요.',
        UNKNOWN: '최근 거래가 적어 매물 소화 속도를 계산하기 어려워요.',
      },
      /**
       * 계산 흐름 (대표님 확정 2026-10-24): 추천 범위 → 매물 소화 속도 → 결과 + 범위의 의미 한 줄.
       * 기준값("복비가 정한 출발점" 등)을 세우지 않는다 — 범위 끝의 의미와 데이터 위치로만 설명
       */
      stepsTitle: '추천 할인 계산',
      /** 2026-10-27 대표님: 아래 "선택한 평형 추천 할인 구간"과 헷갈리지 않게 (예전 "추천 범위") */
      stepRange: '할인 범위 (다산동 전체)',
      stepRangeValue: '20% ~ 50%',
      stepSpeed: '매물 소화 속도',
      /** {ratio} = 다산동 중앙 단지 대비 배수 (소수 1자리) */
      stepSpeedValue: '다산동 평균의 {ratio}배',
      /** {band}·{range} 면적대, {total}곳 중 {position}위 */
      stepSpeedSub: '{band} 평형({range}) 다산동 {total}곳 중 {position}위',
      /** 이 면적대에 매물·거래가 없어 단지 전체 속도를 쓴 경우 */
      stepSpeedSubComplex: '{band} 평형 매물·거래가 없어 단지 전체 기준',
      stepLimit: { MIN: ' · 범위 최소', MAX: ' · 범위 최대' },
      stepSpeedUnknown: '계산 어려움',
      /** {n} = 단지 최근 12개월 거래 수 */
      stepSpeedUnknownSub: '최근 1년 거래 {n}건 · 다산동 평균 단지와 같은 30%',
      /** 2026-10-27 대표님: 범위로 보여 주므로 "구간"까지 명확하게 */
      stepResult: '선택한 평형 추천 할인 구간',
      /**
       * [이 평형 추천 할인 값] 한 점이 아니라 추천(초록) 구간으로 (2026-10-27 대표님): 할인 20% ~ 이 평형 추천값.
       * 분석 카드 "할인 20~27% 구간"과 같은 범위. 추천이 20%면 한 값. {min}, {max}
       */
      stepResultRange: '{min}~{max}%',
      /**
       * 계산표 아래 한 줄: 이 평형이 범위 안 어디에 왜 있는지 (대표님 2026-10-24, 단지별로 달라야 한다).
       * 30%는 곡선에서 다산동 평균 속도 단지가 받는 값. {diff} = 30%와의 차이(%p). 범위 끝의 뜻은 끝에 닿았을 때만
       */
      stepNotes: {
        FASTER: '매물이 다산동 평균보다 빨리 소화돼 평균 단지(30%)보다 {diff}%p 높아요.',
        SLOWER: '매물이 다산동 평균보다 천천히 소화돼 평균 단지(30%)보다 {diff}%p 낮아요.',
        EQUAL: '매물 소화 속도가 다산동 평균 단지와 같아 30%예요.',
        MAX: '매물이 아주 빨리 소화되지만, 50%보다 크면 중개사가 맡기 어려워 50%에서 멈췄어요.',
        MIN: '매물이 많이 쌓여 있지만, 20%보다 적으면 할인 효과가 없어 20%를 추천해요.',
      },
      /** 출처: 표시광고법 대응 */
      basisNote: '국토부 실거래 {start}~{end} 중개거래 · 매물 {observedAt} 기준',
      /** 출처 줄 끝. 모델 이름은 쓰지 않는다 (대표님 2026-10-26: 모델 이름이 불만 거리가 됨) */
      basisNoteAi: ' · 복비 자체 분석 엔진 + AI 분석',
    },

    /** [다산동 현장 수급 및 시장 진단] (화면에서 내림 2026-10-22 — 계산 근거로만 유지) */
    marketDiagnostic: {
      /** [카드 제목]: {tradeType} = 매매/전세 */
      title: '{tradeType} 시장 진단',
      /** [판정 라벨]: 분석 엔진 등급 (src/lib/analysis/marketEngine.ts) */
      gradeLabels: { FAST: '빨리 팔리는 단지', BALANCED: '보통 속도', SLOW: '매물이 많은 단지', UNKNOWN: '판정 데이터 부족' },
      /** [판정 설명]: 복비 제안 근거를 한 줄로 */
      gradeDesc: {
        FAST: '다산동 평균보다 매물이 빨리 소화돼요. 중개사가 매물을 확보하려는 단지라 복비를 더 낮춰 제안할 수 있어요.',
        BALANCED: '다산동 평균 수준으로 거래되고 있어요. 추천 복비 구간이 가장 무난한 선택이에요.',
        SLOW: '매물이 쌓여 있어 중개사가 고를 매물이 많아요. 할인 폭을 작게 잡는 게 매칭에 유리해요.',
        UNKNOWN: '최근 거래가 적어 판정하지 않았어요. 다산동 일반 기준으로 추천해요.',
      },
      metricListings: '현재 매물',
      metricDeals: '최근 3개월 거래',
      metricInventory: '매물 소화 기간',
      inventoryUnit: '개월치',
      momentumLabel: '최근 6개월 ㎡당 가격 흐름',
      /** [출처 표기]: 표시광고법 대응 — 기준일과 출처를 항상 함께 표시 */
      basisNote: '국토부 실거래 {start}~{end} · 매물 {observedAt} 기준',
      /** [권역 환경 정보]: 판정 점수에는 쓰지 않는다 */
      regionContext: '{region} 매수 문의 지수 {value} ({ym}, 한국부동산원)',
      jeonseNote: '전세 매물은 수가 적어 판정 변동이 커요 (참고용).',
    },

    /** [매칭 사례 티커] 2026-10-28 홈 1·2 섹션 사이로 옮김 → home.matchTicker */

    /** [하단 고정 안심 보증 스티키 바] */
    stickyBar: {
      /** [안심 엠블럼 문구]: CTA 바로 위에 상시 고정되는 안심 카피 */
      securityGuarantee: '매칭 전까지 동·호수·전화번호 비공개',
      /** [법정 상한 라벨]: 취소선 금액 앞 (B안, 2026-10-23) */
      legalMaxLabel: '법정 상한',
      /** [법정 상한 그대로 제안 시]: 할인이 없으면 취소선 대신 */
      legalMaxSameText: '그대로 제안',
      /** [할인율]: 빨간 취소선 옆 작게 (대표님 2026-10-29 앵커링, 복비 카드 "{rate}%↓"와 같은 계산) */
      discountRate: '{rate}%↓',
      /**
       * [CTA 버튼]: 아래 고정 바와 복비 카드 버튼이 같은 문구 (2026-10-27 대표님: 행동 문구 통일 + "무료").
       * "무료"는 집주인이 복비 서비스에 돈을 내지 않는 사실 (대표님 확인 2026-10-27). "최소"는 쓰지 않는다 — 희망가·복비를 바꾸면 줄 수 있어 "약"
       */
      ctaDefaultText: '무료로 매칭 요청하기',
      ctaWithSavingsText: '약 {amount} 아끼고 무료 매칭',
    },
  },

  // ==========================================================================
  // 4. 토스식 6단계 매칭 바텀시트 모달 (MatchingBottomSheetModal.tsx)
  // ==========================================================================
  matchingModal: {
    /** [공통 모달 헤더] */
    headerTitle: '매칭 요청',
    /**
     * [진행 표시] 단계 이름 동그라미 6개 (2026-10-27 대표님 최종 시안). 360px에 맞게 2~4글자. 완료 화면은 칸에 넣지 않는다
     * 순서는 lib/requests/modalStep.ts STEP_INDEX와 같아야 한다
     */
    stepperLabels: ['평형', '희망가', '복비', '동·호수', '인증', '확인'],
    /** 화면 읽기용: {n}/{total} 단계 */
    stepperAria: '{total}단계 중 {n}단계',
    closeButton: '닫기',
    nextButton: '다음으로',
    prevButton: '이전',
    /** [다시 요청] 내 의뢰에서 "수정"으로 들어온 단계의 다음 버튼 → 5단계 확인 화면으로 바로 */
    resumeNextButton: '수정 완료 · 확인하기',
    /** 다음 버튼을 눌렀는데 빠진 칸이 있을 때: 칸 아래 빨간 한 줄 + 버튼 위 남은 개수 (2026-10-27). 임대·근저당은 각 errors 문구 */
    missing: {
      remaining: '{n}개 더 채우면 넘어갈 수 있어요',
      TYPE: '타입을 골라 주세요',
      TENANT_PHONE: '세입자 연락처를 입력해 주세요',
      TENANT_PLEDGE: '세입자에게 알렸는지 체크해 주세요',
      MOVE_IN_DATE: '입주 날짜를 골라 주세요',
      DONG: '동을 입력해 주세요',
      HO: '호수를 입력해 주세요',
      OWNER_NAME: '이름을 입력해 주세요',
      SMS_VERIFY: '휴대폰 인증을 마쳐 주세요',
      OWNER_PLEDGE: '소유자 확인에 체크해 주세요',
      LEGAL_PLEDGE: '책임 서약에 체크해 주세요',
    },

    /** [Step 1: 거래유형 & 평형 확인 및 모달 내 수정] */
    step1: {
      title: '거래 유형과 평형을 확인해 주세요',
      subTitle: '터치하여 모달 안에서 조건을 바로 변경하실 수 있어요.',
      tradeTypeLabel: '거래 유형 선택',
      pyeongLabel: '평형대 선택',
      /** [타입 선택]: 같은 평형에 구조 타입(33A·33B 등)이 2개 이상인 단지만 노출 */
      typeLabel: '타입 선택',
      typeHint: '분양 계약서나 등기부의 타입을 골라 주세요. 중개사가 구조를 미리 알 수 있어요.',
      typeUnknown: '잘 모르겠어요',
      typeUnknownSummary: '타입 미확인',
      summaryType: '타입',
      summaryTradeType: '거래 유형',
      summaryApt: '단지명',
      summaryPyeong: '평형 / 공급면적',
      summaryFloor: '층수 구간',
      /** 복비는 3단계 "복비 정하기"에서 조절 (2026-10-27). 1단계 요약의 "집주인 제안 복비" 줄은 대표님 지시로 삭제 */
      summaryNotice: '복비는 3단계에서 조절할 수 있어요',
      nextStepButton: '다음: 희망 금액 및 점유 상태',
    },

    /** [Step 2: 희망가 & 점유 상태(공실/세입자) & 입주일] */
    step2: {
      /** [희망가 ↔ 최근 실거래] 판단 없이 사실만 (대표님 승인 2026-10-25). {band} 층 구간, {date} 계약일, {diff} 차이 */
      priceVsTrade: {
        HIGHER: '최근 실거래({band}, {date})보다 {diff} 높아요',
        LOWER: '최근 실거래({band}, {date})보다 {diff} 낮아요',
        SAME: '최근 실거래({band}, {date})와 같아요',
      },
      title: '희망 금액과 점유 상태를 알려주세요',
      subTitle: '희망 금액으로 법정 상한과 복비를 바로 계산해요',
      askingPriceLabel: '희망 {tradeType} 금액',
      /** 점 + 첫 줄, 둘째 줄은 기준·상한 (2026-10-27 대표님: "매칭되면" 조건을 붙여 사실대로, 이모지·느낌표 없음) */
      savingsBadgeText: '매칭되면 복비가 법정 상한보다 약 {amount} 낮아요',
      savingsBadgeZero: '제안하신 복비 조건으로 안전하게 매칭됩니다',
      savingsBadgeSub: '희망 {tradeType}가 기준 · 법정 상한 {max} · {rate}',
      stepperMinus5000: '-5천만',
      stepperMinus1000: '-1천만',
      stepperPlus1000: '+1천만',
      stepperPlus5000: '+5천만',
      directEditButton: '직접 입력',
      directEditConfirm: '확인',
      directEditCancel: '취소',
      directEditUnit: '만 원',
      directEditPlaceholder: '희망 금액 입력 (단위: 만 원)',
      occupancyLabel: '현재 집의 점유 상태',
      occupancyVacant: '공실 (즉시 방문)',
      occupancyOwner: '집주인 거주',
      occupancyTenant: '세입자 거주',
      tenantPhoneLabel: '세입자 연락처 (중개사 방문 조율용)',
      tenantPhonePlaceholder: '010-0000-0000',
      tenantPledgeLabel: '[필수] 세입자에게 부동산에 매물 내놓았음을 미리 안내했습니다.',
      /**
       * [세입자 낀 매매]: 매매 + 세입자 거주일 때만 펼친다. "갭투자" 표현은 쓰지 않는다 (중개사 화면 배지는 step5.leasedSaleBadge)
       * 매수 필요 금액 = 희망가 − 보증금 (src/lib/market/leasedSale.ts)
       */
      leasedSale: {
        title: '세입자 낀 매매 정보',
        desc: '중개사가 투자 매수자와 실거주 매수자 중 누구에게 소개할지 정하는 데 써요.',
        kindLabel: '임대 형태',
        kindJeonse: '전세',
        kindMonthly: '월세',
        depositLabel: '보증금',
        monthlyRentLabel: '월세',
        /** 입력칸 안내 (예시 숫자는 입력된 값처럼 보여 쓰지 않는다). 월세일 때 칸이 반으로 줄어 360px에서 7자 이내 */
        depositPlaceholder: '계약서 보증금',
        monthlyRentPlaceholder: '매월 금액',
        unit: '만 원',
        endDateLabel: '임대 만료일',
        renewalLabel: '세입자의 계약갱신요구권',
        renewalUsed: '사용함',
        renewalNotUsed: '안 씀',
        renewalUnknown: '모름',
        renewalNotUsedHint: '세입자가 만료 전에 갱신을 요구하면 2년 더 살 수 있어요. 매수자에게 이 점을 함께 안내해요.',
        errors: {
          KIND: '임대 형태를 골라 주세요',
          DEPOSIT: '보증금을 입력해 주세요',
          DEPOSIT_OVER_PRICE: '보증금이 희망 매매가보다 같거나 커요. 금액을 다시 확인해 주세요',
          RENT: '월세를 입력해 주세요',
          END_DATE: '임대 만료일을 골라 주세요',
          RENEWAL: '계약갱신요구권 사용 여부를 골라 주세요',
        },
        moveInAuto: '임대 만료일 이후 입주 ({date})',
      },
      /** [근저당(융자)]: 매매·전세 공통. 처리 계획 라벨은 src/lib/market/mortgage.ts (거래 유형별) */
      mortgage: {
        label: '근저당(융자) 설정',
        none: '없음',
        exists: '있음',
        amountLabel: '채권최고액 (등기부등본 을구, 선택)',
        /** 입력칸 안내 (0원 표시는 "근저당 있음"과 모순이라 쓰지 않는다) */
        amountPlaceholder: '모르면 비워 두셔도 돼요',
        unit: '만 원',
        planLabel: '잔금 때 처리 계획',
        jeonseKeepHint: '근저당이 남아 있으면 세입자의 전세보증보험 가입이 제한될 수 있어 중개사가 미리 확인해요.',
        errors: {
          STATUS: '근저당 설정 여부를 골라 주세요',
          PLAN: '잔금 때 처리 계획을 골라 주세요',
        },
      },
      visitMemoLabel: '집 방문 시 주의사항 (선택)',
      visitMemoPlaceholder: '예: 평일 오후 7시 이후 가능, 온순한 반려견 있음',
      moveInDateLabel: '입주 가능 시기',
      moveInImmediate: '즉시 입주',
      moveInNegotiable: '입주 협의',
      moveInSpecificDate: '날짜 지정',
      nextStepButton: '다음: 복비 정하기',
    },

    /**
     * [복비 정하기] 2026-10-27 대표님 최종 시안: 분석 카드에 있던 금액 조절·구간 안내·더 빠른 매칭 옵션·부가세를 이 단계로 옮김.
     * 계산은 예전 분석 카드와 같다 (기준 = 선택 층 구간 최근 실거래, 법정 상한·하한 30%·옵션 하드캡)
     */
    stepFee: {
      title: '중개사에게 제안할 복비를 정해 주세요',
      /** {price} 기준 실거래, {max} 법정 상한 */
      subTitle: '최근 실거래 {price} 기준 · 법정 상한 {max}',
      /** 약속은 짧게 한 줄 (비율·다시 계산 설명은 확인 단계 feeGuaranteeDesc) */
      promise: '계약 날 다시 흥정하지 않아요',
      /** 처음 한 번만 뜨는 안내 (막대를 만지거나 확인을 누르면 사라지고 다시 안 뜸) */
      coach: '막대를 끌거나 아래 버튼으로 금액을 바꿀 수 있어요',
      coachOk: '확인',
      /** 누르면 사무소 유형별 금액 말풍선 */
      vatPill: '부가세 별도 · 4~10%',
      vatNote: '어느 쪽인지는 매칭된 중개사가 알려 줘요',
      nextStepButton: '다음: 상세 동·호수 입력',
    },

    /** [Step 3: 상세 동·호수 입력 & 옵션/특이사항] */
    step3: {
      title: '정확한 동·호수를 입력해 주세요',
      /** 동·호수를 받는 실제 이유(건축물대장 실존 확인). 복비 계산에는 쓰이지 않음 (대표님 승인 2026-10-24) */
      subTitle: '허위 매물 없는 매칭을 위해 확인해요',
      dongLabel: '동',
      dongPlaceholder: '예: 104',
      /** 다시 요청: 서버에서 동·호수를 불러오지 못했을 때만 (휴대폰에는 개인정보를 남기지 않음) */
      refillFailed: '개인정보는 이 휴대폰에 남기지 않아요. 동·호수를 다시 입력해 주세요.',
      hoLabel: '호수',
      hoPlaceholder: '예: 1802',
      /** [동 선택 기본값]: 건축물대장 동 목록 드롭다운 */
      dongSelectPlaceholder: '동 선택',
      /** [이름 없는 단일 건물 단지]: 동 입력 대신 표시 */
      singleBuildingLabel: '단일 건물',
      /**
       * [동·호수 실존 확인 결과] 건축물대장 기준 (등기 소유자 확인 아님). {floors} = 그 동 지상 층수, {date} = 수집일
       * UNKNOWN은 데이터가 없는 단지: 막지 않고 안내만
       */
      unitCheck: {
        /** 통과는 박스 없이 체크 한 줄 (오류만 박스) */
        OK: '실제 있는 호수예요',
        NO_DONG: '이 단지에 없는 동이에요',
        FLOOR_OVER: '이 동은 {floors}층까지 있어요. 호수를 다시 확인해 주세요',
        NO_HO: '이 동에 등록된 호수가 아니에요',
        UNKNOWN: '이 단지는 동·호수 자동 확인을 지원하지 않아요. 정확히 입력해 주세요',
      },
      /** [블라인드 미리보기]: 입력칸 바로 아래 한 곳에서만 안내 ("100%"·"절대" 금지, 별도 안심 카드 삭제 2026-10-24) */
      livePreviewLabel: '🔒 중개사에게는 이렇게 보여요',
      livePreviewNote: '매칭이 확정되면 공개돼요',
      optionsSectionTitle: '옵션 및 특이사항 (선택)',
      optionsSectionSubTitle: '중개사에게 전달되어 더욱 정확하고 빠른 매물 상담이 진행됩니다.',
      optionAirconLabel: '시스템에어컨',
      optionMidDoorLabel: '중문 설치',
      optionClosetLabel: '붙박이장',
      airconUnits: ['2대', '3대', '4대', '5대 이상'],
      optionEtcPlaceholder: '기타 옵션이나 특이사항을 입력해 주세요 (예: 올수리 인테리어, 줄눈/탄성 시공, 뷰 트임 등)',
      nextStepButton: '다음: 소유주 본인 인증',
    },

    /** [Step 4: 소유주 성함 & 통신사 선택 (네이버 확인매물 연동) + SMS 인증] */
    step4: {
      title: '소유주 성함과 본인 인증을 진행해 주세요',
      subTitle: '네이버 부동산 집주인 확인매물 등록을 위해 명의 정보가 반드시 일치해야 합니다.',
      ownerNameLabel: '소유주 성명 (등기 명의자)',
      ownerNamePlaceholder: '등기부등본상 소유주 성함 입력',
      carrierSectionTitle: '소유주 명의 통신사 (알뜰폰 포함)',
      phoneLabel: '휴대폰 번호 (본인 명의)',
      phonePlaceholder: '010-1234-5678',
      sendCodeButton: '인증번호 발송',
      resendCodeButton: '재발송',
      codePlaceholder: '6자리 인증번호 입력',
      confirmCodeButton: '인증 확인',
      testAutoFillButton: '⚡ [테스트] 인증번호 자동완성 (123456)',
      verifiedBadge: '✓ 소유주 휴대전화 인증 완료',
      timerPrefix: '남은 시간',
      codeSentNotice: '입력하신 번호로 6자리 인증번호를 전송했습니다.',
      invalidCodeError: '인증번호 6자리가 일치하지 않습니다. (테스트용: 123456)',
      nextStepButton: '다음: 블라인드 확인 & 서약',
      /**
       * [동의 묶음] 휴대폰 번호가 처음 밖(문자 발송)으로 나가는 4단계 인증 전에 받는다 (대표님 승인 2026-10-25).
       * 제3자 제공은 법상 따로 동의. 내용은 처리방침·약관 제9조와 같아야 한다 (배포 전 변호사 검토)
       */
      consents: {
        all: '전체 동의',
        required: '필수 동의를 모두 체크해야 인증번호를 보낼 수 있어요',
        refusal: '동의하지 않을 수 있어요. 다만 동의하지 않으면 매칭 요청을 할 수 없어요.',
        viewFull: '전문 보기',
        close: '닫기',
        items: [
          {
            key: 'TERMS',
            label: '[필수] 서비스 이용약관',
            title: '서비스 이용약관',
            legal: 'terms',
            rows: [
              ['매칭 전', '언제든 취소할 수 있어요'],
              ['매칭 후 7일', '취소·일시 중지·매물 회수를 할 수 없어요'],
              ['광고', '중개사가 48시간 안에 광고를 올리지 않으면 매칭을 해제할 수 있어요'],
              ['복비', '매칭 때 합의한 복비로 계약해요'],
            ],
          },
          {
            key: 'COLLECT',
            label: '[필수] 개인정보 수집·이용',
            title: '개인정보 수집·이용',
            legal: 'privacy',
            rows: [
              ['목적', '매칭 요청 접수, 본인·소유 확인, 허위 매물 방지, 민원 처리'],
              ['항목', '성명, 휴대전화번호, 통신사, 단지·평형·동·호수, 희망 금액, 점유·임대 현황, 근저당, 입주 시기, 옵션'],
              ['보유 기간', '매칭이 안 된 의뢰는 정해진 기간 뒤 파기, 계약 기록은 법정 기간(5년) 보관'],
            ],
          },
          {
            key: 'PROVIDE',
            label: '[필수] 매칭 확정 시 중개사에게 제공',
            title: '개인정보 제3자 제공',
            legal: 'privacy',
            rows: [
              ['받는 곳', '내가 고른 파트너 중개사 (최대 3곳)'],
              ['목적', '중개 업무 (매물 확인·방문 일정 조율)'],
              ['항목', '성명, 연락처, 동·호수, 방문 가능 시간, 세입자 연락처(세입자 거주 시)'],
              ['보유 기간', '중개 업무가 끝날 때까지'],
              ['시점', '매칭을 확정할 때만. 그 전에는 누구에게도 제공하지 않아요'],
            ],
          },
        ],
      },
    },

    /** [Step 5: 스마트폰 블라인드 프리뷰 & 소유주 권리 서약] */
    step5: {
      title: '중개사에게 이렇게 보여요',
      /** [가려진 값 옆 태그]: 블라인드 안내는 동·호수·연락처 줄에만 (제목 아래·배지·카드 아래 문구 삭제 2026-10-24) */
      previewUnlockTag: '🔒 매칭 후 공개',
      previewAptLabel: '단지/평형',
      previewDongHoLabel: '동·호수',
      previewPhoneLabel: '연락처',
      previewAskingPriceLabel: '희망가',
      previewProposedFeeLabel: '제안 복비',
      previewOptionsLabel: '옵션/특이사항',
      previewLeaseLabel: '임대 현황',
      previewMortgageLabel: '근저당',
      previewBuyerCashLabel: '매수 필요 금액',
      leasedSaleBadge: '투자 매물 가능',
      /** 5단계 미리보기 복비 줄 아래 ("절감·절약" → "낮게", 대표님 2026-10-29). 계산은 StepFinalPledge 그대로 */
      previewDiscountTag: '(법정 상한보다 {percent}% · {saved} 낮게)',

      /** [협의 복비 보장]: 파트너 중개사 가입 약속(brokerSignup.promise)과 같은 약속을 집주인에게 알린다 */
      feeGuaranteeTitle: '합의한 복비로 계약해요',
      feeGuaranteeDesc: '매칭이 확정되면 합의한 중개보수로 계약해요. 계약 당일 다시 흥정하지 않아요. 거래금액이 바뀌면 법정 상한의 같은 비율로 다시 계산해요. 파트너 중개사 모두 이 조건에 서약했어요.',
      /**
       * [합의 기록 확인서 안내] 배포 전 약관에 "합의 기록 보관·제공" 조항 필요 (docs/PREDEPLOY_CHECKLIST.md).
       * "법적 효력 보장"류 표현 금지 (과장 광고), 중개사를 의심하는 어조 금지
       */
      feeGuaranteeSupport: '합의한 복비와 다르게 요구받으면 고객센터로 알려 주세요. 매칭 때 중개사가 동의한 복비 기록을 확인서로 보내드리고, 약관에 따라 조치해요.',

      /** [소유주 권리 확인 체크박스 1] */
      soleOwnerCardTitle: '[필수] 본인은 해당 부동산의 100% 단독 소유주이거나 50:50 공동명의자 중 1인임을 확인합니다.',
      /** [허위매물 법적 책임 체크박스 2] */
      legalPledgeCardTitle: '[필수] 타인 명의 도용 등 허위 매물 등록 시 발생하는 모든 민·형사상 법적 책임은 본인에게 있음을 명시하고 동의합니다.',
      /** [최종 등록 완료 버튼 텍스트] */
      submitButtonText: '안심 매칭 의뢰 등록 완료 ✓',
      /** 서버에 의뢰를 만들지 못했을 때 (Supabase 모드) */
      submitError: '요청을 보내지 못했어요. 잠시 뒤 다시 눌러 주세요.',
    },

    /**
     * [Step 6: 매칭 요청 완료] A안 (대표님 승인 2026-10-24): 요청서 전체·도배 방지 룰·48시간 카드·안내 4줄을
     * 요약 박스 + 진행 순서 3줄로 압축. 상세 요약·수정·취소는 내 의뢰 화면 담당.
     * 취소 안내 한 줄은 내 의뢰에 취소 기능이 생긴 뒤 추가 ("100% 무료 취소"·"인근 3km"는 사실 아님)
     */
    step6: {
      title: '매칭 요청을 보냈어요',
      subTitle: '48시간 동안 중개사 요청을 받아요',
      /** 영수증 (2026-10-27): 법정 상한 − 할인 + 옵션 = 내가 제안한 복비 (lib/requests/feeReceipt) */
      receipt: {
        number: '접수번호 {no}',
        askingPrice: '희망 {tradeType}가',
        legalMax: '법정 상한 ({rate})',
        discount: '할인 ({pct}%)',
        bonus: '더 빠른 매칭 옵션',
        bonusNone: '없음',
        total: '내가 제안한 복비',
        vat: '부가세 별도',
      },
      timelineTitle: '앞으로 이렇게 진행돼요',
      /** 내 의뢰에 취소 기능이 생겨 사실이 됨 (2026-10-25) */
      cancelNote: '매칭 전까지 내 의뢰에서 언제든 취소할 수 있어요',
      timelineSteps: [
        '중개사 요청이 오면 문자로 알려드려요',
        '마음에 드는 곳을 최대 3곳 골라요',
        '고른 중개사에게만 동·호수가 공개돼요',
      ],
      homeButtonText: '홈으로 가기',
      myRequestsButtonText: '내 의뢰 확인하기',
    },
  },

  // ==========================================================================
  // 5. 내 의뢰 확인 및 매칭 확정 화면 (app/my-requests/ 및 src/components/my-requests/)
  // ==========================================================================
  myRequests: {
    /**
     * 한 화면 + 상태 3단계 + 종료 (대표님 합의 2026-10-24~25, 데이터 모델 src/lib/requests/types.ts)
     * 매칭 전 중개사는 익명(가려진 이름 + 1·2·3): 상호·대표 이름·전화·주소·사진 비공개.
     * 신뢰 숫자는 확인된 것만, 사무소를 알아볼 수 있는 값은 구간으로만 (개설 연도·인원)
     */
    headerTitle: '내 의뢰',

    /** [위쪽 큰 제목] 상태마다 바뀐다 */
    hero: {
      receivingWaiting: '중개사 요청을\n기다리고 있어요',
      receivingWithOffers: '중개사 {count}곳이\n요청했어요',
      hoursLeft: '{hours}시간 남음',
      /** 진행 중 현황판 (2026-10-27 대표님): "부동산" + 칩, 제목은 한 줄로 보임 */
      inProgress: '부동산 {count}곳과\n진행 중이에요',
      inProgressNoAd: '광고가 올라오면 알려드려요',
      /** 현황판 칩 = 점 알약, 누르면 그 섹션으로 (2026-10-27). 방문은 가장 가까운 날짜·시각을 붙임 */
      chips: { ads: '광고 {n}곳', visits: '방문 {n}건 · {date} {hour}시', news: '새 소식 {n}' },
      paused: '잠시 멈췄어요',
      pausedSub: '다시 시작하면 중개사들이 48시간 안에 광고를 다시 올려요',
      contracted: '계약을 마쳤어요',
      ended: {
        EXPIRED: '요청 시간이\n끝났어요',
        CANCELLED: '요청을 취소했어요',
        WITHDRAWN: '매물을 거둬들였어요',
        SOLD_ELSEWHERE: '다른 곳에서\n계약하셨어요',
        RELEASED: '매칭이 모두\n해제됐어요',
        DEAL_BROKEN: '거래가\n해제됐어요',
        FAKE_CONFIRMED: '소유자 확인이\n필요해요',
      },
      endedSub: {
        EXPIRED_NO_OFFER: '복비를 조금 올리면 중개사 요청이 더 빨리 올 수 있어요',
        EXPIRED_WITH_OFFER: '다시 요청하면 새 중개사의 요청도 받을 수 있어요',
        CANCELLED: '동·호수와 연락처는 누구에게도 공개되지 않았어요',
        /** 복비가 네이버 광고를 내릴 수 없어 "광고가 내려갔어요"는 사실이 아님 (2026-10-26) → 중개사에게 알렸다는 사실만 */
        WITHDRAWN: '매칭된 중개사에게 의뢰가 끝났다고 알렸어요',
        SOLD_ELSEWHERE: '매칭된 중개사에게 의뢰가 끝났다고 알렸어요',
        RELEASED: '같은 조건으로 다시 요청할 수 있어요',
        DEAL_BROKEN: '기록은 그대로 남아요. 같은 조건으로 다시 요청할 수 있어요',
        /** 약관: 운영팀 확인 전까지 같은 집 다시 요청은 공개되지 않을 수 있음 → 다시 요청 버튼 숨김 */
        FAKE_CONFIRMED: '운영팀 확인 결과 소유자 확인이 더 필요해요. 운영팀이 연락드려요',
      },
      progress: '{step}/{total} {label}',
      progressLabels: ['매칭 요청', '매칭 확정', '광고·방문', '계약', '잔금·후기'],
      /** 동그라미 아래 한 줄 (2026-10-27): 진행 중 카드는 할 일·새 소식 순으로 정렬 */
      orderHint: '가장 먼저 확인할 일이 맨 위로 올라와요',
    },

    /** [나의 매칭 요청] 접기/펴기: 요청 받는 중엔 펼침, 그 뒤엔 접힘 */
    summary: {
      title: '나의 매칭 요청',
      askingPrice: '희망가',
      commission: '제안 복비',
      /** "아껴요" 대신 "낮아요" (대표님 2026-10-29) */
      savedLine: '법정 상한보다 {amount} 낮아요',
      expand: '펼치기',
      collapse: '접기',
    },

    /** [① 요청 받는 중] 익명 요청 카드 */
    receiving: {
      sectionTitle: '도착한 요청',
      selectHint: '3곳까지 고를 수 있어요',
      empty: '아직 도착한 요청이 없어요',
      emptySub: '요청이 오면 문자로 알려드려요',
      maskedName: '공인중개사사무소',
      /**
       * 블러로 가리는 가짜 글자 (실제 상호 아님). blindMask.maskVariant가 요청마다 3가지 길이 중 하나를 고른다.
       * 화면에는 흐릿하게만 보이고 스크린리더·복사에는 잡히지 않는다
       */
      maskFillers: ['가나', '가나다', '가나다라'],
      maskedNameSr: '가려진 상호',
      strengthsTitle: '잘하는 점',
      lockedNote: '🔒 매칭 후 공개',
      ageBand: { UNDER_3: '개설 3년 미만', FROM_3_TO_10: '개설 3~10년', OVER_10: '개설 10년 이상' },
      agentBand: { ONE: '중개사 1명', TWO_PLUS: '중개사 2명 이상' },
      /** 단지 ↔ 사무소 직선거리 구간 (lib/geo/distance, 대표님 2026-10-29 A안). 걸어서 걸리는 거리가 아니라 "n 안"으로만 */
      distanceBand: { M500: '단지에서 500m 안', KM1: '단지에서 1km 안', KM2: '단지에서 2km 안', FAR: '단지에서 2km 넘게' },
      firstDeal: '복비 첫 거래',
      /** 약속 레벨 칩(common/PromiseLevel) 뒤에 붙는 건수. 0건(레벨 1)은 칩 없음 — "복비 첫 거래"가 대신 (대표님 2026-10-29) */
      promise: '{kept}건',
      reviewCount: '후기 {count}건',
      reviewAverage: '후기 ★{average} ({count})',
      /** 카드 안 펼치기: 후기 칩 많이 고른 순 5개, 위 "잘하는 점"과 겹치는 칩 제외 (대표님 2026-10-29, ownerEndorsedChips) */
      endorsedTitle: '집주인이 인정한 장점 {n}개',
      endorsedExpand: '펼치기',
      endorsedCollapse: '접기',
      selectButton: '선택',
      selectedButton: '선택됨',
      confirmCta: '{count}곳 골랐어요 · 다음',
      confirmCtaEmpty: '중개사를 골라 주세요',
      /** 희망가도 여기서 바꾼다는 걸 이름에 (대표님 2026-10-27: 숨어 있는 것 같다) */
      changeFee: '희망가·복비 바꿔서 다시 요청',
      cancelRequest: '요청 취소하기',
    },

    /** [후기 요약 시트] 글 없이 칩별 개수만 (누군지 드러나지 않게) */
    reviewSheet: {
      title: '후기 {count}건',
      average: '평균 ★{average}',
      averageHidden: '평균은 후기 3건부터 보여드려요',
      close: '닫기',
    },

    /** [확정 확인 시트] 되돌릴 수 없는 동작이라 한 번 더 묻는다 */
    confirmSheet: {
      title: '{count}곳과 매칭을 확정할까요?',
      lines: [
        '고른 중개사에게만 동·호수와 연락처가 공개돼요',
        /** 줄내림이 어색해 한 문장으로 (멈추기·거둬들이기 안내는 판매 상태 카드에 있음) */
        '확정 후 7일 동안은 취소할 수 없어요',
      ],
      /**
       * 마지막 줄: 합의하는 건 금액이 아니라 할인율 (대표님 2026-10-26, "그대로예요"는 금액이 바뀌면 사실이 아니라 바꿈).
       * 거래금액이 바뀔 때의 계산은 매칭 모달 5단계 표에서 보여 준다
       */
      feeLine: '복비는 법정 상한에서 {pct}% 할인으로 합의돼요 (희망가 기준 {fee})',
      feeLineNoPct: '복비는 희망가 기준 {fee}로 합의돼요',
      confirm: '확정하기',
      cancel: '다시 볼게요',
    },

    /** [요청 취소 시트] 매칭 전에는 언제든 취소 */
    cancelSheet: {
      title: '요청을 취소할까요?',
      body: '아직 아무에게도 동·호수와 연락처가 공개되지 않았어요.',
      confirm: '요청 취소',
      cancel: '닫기',
    },

    /** [복비 바꿔서 다시 요청 시트] 매칭 전 변경 = 취소하고 다시 등록 (동·호수·인증·서약은 그대로) */
    /**
     * [다시 요청 요약 시트] A안 (대표님 승인 2026-10-25): 요청서를 한눈에 보고 대부분은 "이대로 다시 요청".
     * 바뀐 항목만 "수정" → 분석 화면 매칭 모달의 그 단계로 (값 채워진 채, 수정 후 5단계 확인으로 바로).
     * 동·호수·소유주가 바뀌면 다른 매물이라 처음부터
     */
    feeSheet: {
      titleChange: '희망가·복비 바꿔서 다시 요청',
      titleRetry: '같은 집 다시 요청',
      feeLabel: '복비',
      base: '처음 제안 {fee} · 법정 상한 {max}',
      sectionTitle: '요청서',
      rows: { PRICE: '희망가', OCCUPANCY: '점유', MOVE_IN: '입주', MORTGAGE: '근저당', OPTIONS: '옵션' },
      occupancy: { VACANT: '공실', OWNER: '집주인 거주', TENANT: '세입자 거주' },
      noOptions: '없음',
      edit: '수정',
      noDraft: '이 요청은 요청서가 저장되지 않아 복비만 바꿀 수 있어요',
      noticeChange: '지금 요청은 취소되고 새로 요청돼요. 도착한 요청의 중개사에게는 취소 알림이 가요.',
      noticeRetry: '바뀐 게 있으면 수정을 눌러 주세요. 본인 인증은 다시 하지 않아요.',
      restartLine: '동·호수나 소유주가 바뀌었나요?',
      restartLink: '처음부터 새로 요청',
      submitChange: '취소하고 이대로 다시 요청',
      submitRetry: '이대로 다시 요청',
      cancel: '닫기',
    },

    /** [매칭 확정 순간] 한 번만 보여주는 화면 */
    celebration: {
      title: '중개사 {count}곳과\n매칭됐어요',
      body: '이제 이 중개사들만\n동·호수와 연락처를 볼 수 있어요',
      button: '확인',
    },

    /** [② 진행중] */
    inProgress: {
      /** 카드 정리 (2026-10-27 대표님): 섹션 이름 "부동산", 이름 옆 위치 아이콘, 광고는 상태 알약, 주 버튼 하나 */
      brokersTitle: '진행 중인 부동산',
      brokersCount: '{n}',
      call: '전화하기',
      adLive: '광고 중 · {day}일째',
      /** 광고 중 알약 뒤에 붙는 링크 표시 (알약 전체가 네이버 광고 링크) */
      adView: '네이버에서 보기',
      adPending: '광고 준비 중 · {hours}시간 남음',
      dealButton: '거래 진행 상황',
      /** 해제할 수 있다는 걸 기한 전에 미리 알린다 (대표님 승인 2026-10-25) */
      adPendingNote: '기한 안에 안 올리면 매칭을 해제할 수 있어요',
      detail: '사무소 정보',

      /** [사무소 상세 시트] 매칭 확정 뒤에만. 지도는 서버(/api/office-map)를 거쳐 키를 숨긴다 */
      officeSheet: {
        ceo: '{name} 대표',
        mapAlt: '{office} 위치',
        mapError: '지도를 불러오지 못했어요',
        call: '전화하기',
        sms: '문자 보내기',
        close: '닫기',
        /** 지도 아래 글자로 보이는 주소·전화 + 복사 (2026-10-27) */
        addressLabel: '주소',
        phoneLabel: '전화',
        copy: '{label} 복사',
        copied: '복사했어요',
      },
      adOverdue: '광고가 올라오지 않았어요',
      /** 중개사가 고른 늦어진 이유 (brokerAgent.listing.delay.reasons) */
      delayNote: '중개사: {reason}',
      adPaused: '광고 멈춤',
      /** 이 중개사가 허위 매물로 알려 운영팀이 확인 중 (광고 시간 멈춤, 해제 버튼 없음, 대표님 시안 2026-10-26) */
      adChecking: '소유자 확인 중 · 광고 시간 멈춤',
      /** 맨 위 안내 (의뢰 전체는 멈추지 않음) */
      ownerCheckBanner: {
        title: '운영팀이 소유자 확인 중이에요',
        body: '중개사 한 곳이 등기부 소유자 확인을 요청했어요. 확인 전화가 갈 수 있어요. 다른 중개사와는 그대로 진행돼요.',
      },
      release: '매칭 해제',
      releaseSheet: {
        title: '이 중개사와 매칭을 해제할까요?',
        body: '48시간 안에 광고를 올리지 않았어요.\n나머지 중개사와는 계속 진행해요.',
        confirm: '해제하기',
        cancel: '닫기',
        /** 해제 전에 전화로 사정 묻기 (2026-10-27 대표님) */
        callHint: '해제하기 전에 전화로 사정을 물어볼 수 있어요',
        call: '전화해 보기',
      },

      /**
       * [방문 가능 시간] (대표님 결정 2026-10-25: "집 보여주기" 대신, 전체 끄기 스위치 없음)
       * 언제 볼 수 있는지가 항상 남게: 매주 방문 시간은 최소 1칸, 안 되는 날은 기간 최대 7일
       */
      /** 2026-10-27 대표님: 섹션 "우리 집 방문 설정" — 시간 범위 칩 + 안 되는 날은 한 줄(누르면 펼침) */
      showingTitle: '우리 집 방문 설정',
      showingSub: '열어 둔 시간을 보고 부동산이 전화로 방문을 정해요',
      visitsTitle: '잡힌 방문',
      visitsEmpty: '아직 방문 일정이 없어요',
      visitCancel: '취소',
      /** ⑤ 방문 일정 (대표님 2026-10-25): 중개사가 전화로 정해 저장, 취소는 전화로 알리면서, 기록은 남김 */
      visitHistory: '지난·취소된 일정 {n}건',
      visitCanceled: '취소됨',
      visitPast: '지난 방문',
      visitCanceledBy: { OWNER: '내가 취소', BROKER: '중개사가 취소', SYSTEM: '다른 곳과 진행해 취소' },
      /** 시스템 취소 중 거둬들이기 (cancelReason WITHDRAWN) */
      visitCanceledWithdrawn: '거둬들여 취소',
      visitCanceledPaused: '잠시 멈춰 취소',
      visitCanceledNotice: '취소된 일정이에요. 휴대폰 캘린더에서도 지워 주세요',
      visitAck: '확인',
      visitCancelSheet: {
        title: '취소는 전화로 알려 주세요',
        body: '전화를 걸면 이 일정은 취소돼요.\n휴대폰 캘린더에 저장했다면 거기서도 지워 주세요',
        confirm: '전화하고 취소하기',
        close: '닫기',
      },
      weeklyTitle: '방문 가능 시간',
      /** 칩: "평일 · 저녁 6~9시", "주말 · 오전 10시~오후 6시" (시각은 lib/requests/showing partHourRanges) */
      weeklyChip: '{days} · {range}',
      hourPeriod: { AM: '오전', NOON: '낮', PM: '오후', EVENING: '저녁' },
      blockedRow: '빼 둔 날 {n}건',
      weeklyEdit: '바꾸기',
      weeklyDone: '완료',
      weeklyLastSlot: '최소 1칸은 열어 두어야 해요',
      weekdaysLabel: '평일',
      weekendLabel: '주말',
      dayParts: { MORNING: '오전', AFTERNOON: '오후', EVENING: '저녁' },
      dayPartHours: { MORNING: '10~12시', AFTERNOON: '13~18시', EVENING: '18~21시' },
      weekdays: ['일', '월', '화', '수', '목', '금', '토'],
      blockedTitle: '안 되는 날 설정',
      blockedStart: '시작',
      blockedEnd: '끝',
      blockedAdd: '기간 추가',
      blockedEmpty: '빼 둔 날이 없어요',
      blockedHint: '한 번에 7일까지 뺄 수 있어요. 기간이 끝나면 저절로 다시 열려요',
      blockedErrors: {
        PAST: '지난 날짜는 뺄 수 없어요',
        END_BEFORE_START: '끝 날짜가 시작보다 빨라요',
        TOO_LONG: '7일이 넘으면 판매 상태에서 잠시 멈춰 주세요',
      },
      blockedHasVisit: '빼 둔 기간에 방문 일정이 {count}건 있어요. 필요하면 위에서 취소해 주세요.',
      tenantNotice: '세입자가 살고 있어 방문 일정은 중개사가 세입자분과 직접 정해요',
      tenantSub: '세입자 연락처는 매칭된 중개사에게만 전달돼요',
      tenantPhoneLabel: '전달된 세입자 번호',

      /** [계약했어요] 집주인이 알리면 다른 중개사 광고는 자동으로 내려간다 */
      contractButton: '가계약·계약 알리기',
      contractSheet: {
        title: '어디서 진행하셨나요?',
        elsewhere: '다른 곳에서 계약했어요',
        /** 중개사를 고르면: 가계약 / 계약 (대표님 2026-10-26, 실제 순서 방문 → 가계약 → 계약) */
        stepTitle: '무엇을 알릴까요?',
        steps: { PROVISIONAL: '가계약했어요', CONTRACT: '계약했어요' },
        /** 플랫폼이 네이버 광고를 내릴 수 없어 "자동으로 내려가요"는 사실이 아님 → 직접 알려 달라고 안내 */
        notice: '이 의뢰는 끝나요. 매칭된 중개사에게 광고를 내려 달라고 알려 주세요.',
        confirm: '알리기',
        cancel: '닫기',
      },

      /** [판매 상태] 확정 후 7일 뒤부터. 멈추기·거둬들이기는 사유를 버튼으로 */
      /** 섹션 제목 (2026-10-27): 희망가 · 판매 상태 · 계약 알리기를 한 곳에 */
      saleSectionTitle: '우리 집 판매 설정',
      saleTitle: '판매 상태',
      /** 매칭 뒤 희망가 바꾸기 (2026-10-27): 복비는 합의 비율 그대로, 광고 가격은 부동산마다 직접 알리기 */
      priceSheet: {
        row: '희망가',
        rowEdit: '바꾸기',
        title: '희망가를 바꿀까요?',
        current: '지금 {price}',
        unit: '만 원',
        feeLine: '합의한 할인 {pct}% 그대로',
        feeLabel: '복비',
        next: '바꾸고 부동산에 알리기',
        cancel: '닫기',
        errors: { EMPTY: '금액을 넣어 주세요', SAME: '지금 희망가와 같아요', OUT_OF_RANGE: '지금 희망가와 너무 달라요. 금액을 다시 확인해 주세요' },
        failed: '바꾸지 못했어요. 잠시 뒤 다시 해 주세요',
        notifyTitle: '부동산 {n}곳에 알려 주세요',
        notifySub: '광고 가격은 부동산이 바꿔야 해서 직접 알려야 해요. 앱 기록에도 남았어요',
        call: '전화',
        sms: '문자',
        done: '알렸어요',
        smsBody: '[복비] 희망가를 {price}으로 바꿨어요. 복비는 합의한 할인 {pct}% 그대로 {fee}이에요. 광고 가격도 바꿔 주세요.',
        later: '나중에 알리기',
        finish: '다 알렸어요',
      },
      saleOn: '판매 중',
      salePaused: '잠시 멈춤',
      saleLocked: '{date}부터 바꿀 수 있어요',
      saleSheet: {
        title: '판매를 어떻게 할까요?',
        /** 멈추기 전에 상담 (대표님 2026-10-26): 가격·일정 고민은 중개사가 함께 풀 수 있게 */
        callTitle: '멈추기 전에 중개사와 통화해 볼까요?',
        callSub: '가격·일정 고민은 중개사가 함께 풀 수 있어요',
        call: '{office} 전화',
        pause: '잠시 멈추기',
        /** 복비가 광고를 직접 내릴 수 없어 "광고만 내리고"는 사실이 아님 (2026-10-26) → 중개사에게 알린다는 사실만 */
        pauseDesc: '중개사에게 광고를 내려 달라고 알려요. 의뢰는 그대로고 언제든 다시 시작할 수 있어요',
        withdraw: '매물 거둬들이기',
        withdrawDesc: '중개사에게 광고를 내려 달라고 알리고 의뢰를 끝내요',
        /** 확인 창: 앞으로 잡힌 방문이 있을 때만 (deal.pauseCancelVisitIds) */
        visitsCanceled: '잡힌 방문 {n}건도 취소돼요',
        reasonTitle: '이유를 골라 주세요',
        /** 순서 = SaleStatusCard PAUSE_CODES·WITHDRAW_CODES (행동 기록 sale_change reasonChip) */
        pauseReasons: ['이사 일정이 바뀌었어요', '가격을 다시 생각 중이에요', '잠시 쉬고 싶어요', '기타'],
        /** "다른 방법으로 팔기로 했어요"는 팔렸는지 애매 → "다른 곳에서 계약했어요"(고르면 다른 곳 계약으로 끝냄, 2026-10-27) */
        withdrawReasons: ['팔지 않기로 했어요', '다른 곳에서 계약했어요', '가격이 맞지 않아요', '기타'],
        /** 두 카드 나란히 비교 (2026-10-27 대표님). 마지막 줄은 강조 (멈추기 파랑·거둬들이기 빨강) */
        compare: {
          PAUSE: ['의뢰는 그대로', '광고를 내려 달라고 알려요', '잡힌 방문은 취소돼요', '언제든 다시 시작'],
          WITHDRAW: ['의뢰가 끝나요', '광고를 내려 달라고 알려요', '잡힌 방문은 취소돼요', '되돌릴 수 없어요'],
        },
        /** 다른 곳에서 계약했을 때만 한 칸 더 (건너뛰어도 됨). 중개사에게 안 보이고 행동 기록(sale_change lostReason)에만 */
        lostTitle: '어떤 점이 아쉬웠나요?',
        lostSub: '복비를 더 좋게 만드는 데만 써요. 부동산에는 보이지 않아요',
        lostReasons: {
          LOWER_FEE: '복비가 더 낮은 곳이 있었어요',
          KNOWN_BROKER: '원래 아는 중개사가 있었어요',
          SLOW_CONTACT: '연락이 늦었어요',
          FEW_VISITS: '광고·방문이 적었어요',
          OTHER: '기타',
        },
        confirmPause: '잠시 멈추기',
        confirmWithdraw: '거둬들이기',
        cancel: '닫기',
      },
      resume: '다시 시작',
      /** 잠시 멈춘 동안 광고 내림 확인 카드 아래 한 줄 */
      pauseRemovalSub: '잠시 멈춰서 중개사에게 광고를 내려 달라고 했어요',
    },

    /** [③ 계약 완료] 계약 확인 1번 + 잔금 후 후기 1번, 탭만으로 */
    /** 계약 뒤 (⑥ 2026-10-25: 예전 계약 완료 카드는 거래 페이지로 합침, 복비 확인·날짜는 myRequests.deal.next) */
    contracted: {
      feeNoNotice: '고객센터로 알려 주세요. 매칭 때 중개사가 동의한 복비 기록을 확인서로 보내드려요.',
      reviewTitle: '중개 어떠셨어요?',
      reviewChipsTitle: '좋았던 점',
      /**
       * 초안 2026-10-25 (글 없이 칩만, 여러 개 선택). 묶음 제목과 함께 보여준다.
       * 근거: docs/handover/broker-chips-research.md §4
       */
      reviewChipGroups: [
        // 강점 칩과 짝: 권리관계·전세 계약·세입자 조율·세입자 낀 집 4개 추가 (2026-10-25, brokerStrengths.endorsedBy)
        {
          label: '설명·전문성',
          chips: ['시세를 잘 알아요', '설명이 친절해요', '어려운 말 없이 쉬워요', '세금·대출까지 알려줘요', '권리관계를 꼼꼼히 봐줬어요', '전세 계약을 꼼꼼히 챙겨줘요'],
        },
        { label: '소통', chips: ['연락이 빨라요', '진행 상황을 자주 알려줘요', '부담 없이 편했어요'] },
        { label: '판매 활동', chips: ['손님을 잘 데려와요', '사진을 잘 찍어요', '광고를 정성껏 올려요', '집 장점을 잘 살려요', '세입자 낀 집도 잘 팔았어요'] },
        { label: '방문 안내', chips: ['일정을 잘 맞춰줘요', '방문 전 꼭 연락해요', '손님 반응을 알려줘요', '세입자와 잘 조율해줬어요'] },
        { label: '협상·계약', chips: ['가격 조율을 잘해요', '내 입장에서 협상해요', '계약이 빨랐어요', '서류를 꼼꼼히 챙겨요', '잔금까지 챙겨줘요'] },
        { label: '신뢰', chips: ['복비 약속을 지켰어요', '정직하게 말해줘요', '재촉하지 않아요', '다음에도 맡길래요', '주변에 추천할래요'] },
      ],
      reviewSubmit: '후기 남기기',
      /** ①안 (대표님 2026-10-29): 중개사가 이 요청에 실어 보낸 강점의 짝 후기 칩을 먼저, 나머지는 접기 (stage.reviewChipSplit) */
      claimedTitle: '이 중개사가 잘한다고 한 것, 맞았나요?',
      claimedSub: '맞았던 것만 눌러 주세요',
      moreOpen: '다른 좋았던 점 더 고르기',
      moreClose: '접기',
    },

    /** [종료] */
    ended: {
      /** 다른 곳에서 팔았어요·거둬들이기 뒤 광고 내림 확인 카드 아래 한 줄 */
      adRemovalSub: '광고를 올린 중개사에게 내려 달라고 했어요',
      retryNoOffer: '복비 조절하고 다시 요청',
      retry: '같은 집 다시 요청',
      pastTitle: '지난 의뢰',
      pastResult: {
        CONTRACTED: '계약 완료',
        EXPIRED: '시간 만료',
        CANCELLED: '취소',
        WITHDRAWN: '거둬들임',
        SOLD_ELSEWHERE: '다른 곳 계약',
        RELEASED: '매칭 해제',
        DEAL_BROKEN: '거래 해제',
        FAKE_CONFIRMED: '소유자 확인 필요',
      },
    },

    /**
     * [중개사별 거래 페이지] (④, 그릴링 2026-10-25, 규칙 src/lib/deal/deal.ts)
     * 목록 카드 색 띠 → 누르면 그 중개사와의 기록 + 지금 할 일. 확인 창 줄은 brokerDeal.consequences 재사용
     */
    deal: {
      open: '거래 기록 보기',
      officeDetail: '사무소 정보 보기',
      call: '전화',
      adRemoval: '광고 내림 확인 {done}/{total}',
      adRemovalSub: '다른 곳과 진행해서 나머지 중개사에게 광고를 내려 달라고 했어요',
      winnerTitle: '계약한 중개사',
      next: {
        CONFIRM: {
          kicker: '확인해 주세요',
          title: { PROVISIONAL: '중개사가 가계약을 알렸어요', CONTRACT: '중개사가 계약 완료를 알렸어요', BALANCE: '중개사가 잔금 완료를 알렸어요', BROKEN: '중개사가 해제를 알렸어요' },
          dates: '계약일 {contract} · 잔금일 {balance}',
          yes: '맞아요',
          no: '아니에요',
        },
        SAVE_CALENDAR: { kicker: '날짜가 정해졌어요', sub: '캘린더에 저장해 두면 잊지 않아요' },
        UNTIL_CONTRACT: '계약일 {date}',
        UNTIL_BALANCE: '잔금일 {date}',
        CONTRACT_DAY: { 0: '오늘 계약하는 날이에요', 1: '내일 계약하는 날이에요', passed: '계약일이 지났어요' },
        BALANCE_DAY: { 0: '오늘 잔금 날이에요', 1: '내일 잔금 날이에요', passed: '잔금일이 지났어요' },
        dayRemind: '잊지 않으셨죠?',
        dayPassedSub: '끝났다면 중개사가 알려 줄 거예요',
        IN_PROGRESS: { title: '중개사가 진행하고 있어요', sub: '광고·방문·가계약이 생기면 여기 기록돼요' },
        FEE_CHECK: { kicker: '한 가지만 알려 주세요', title: '합의한 복비 {fee}\n그대로 계약하셨나요?', yes: '네, 그대로예요', no: '아니에요' },
        FEE_THANKS: '고마워요. 중개사의 약속 이행 기록이 돼요',
        /** 아니에요 → 사유 (대표님 2026-10-26): 칩 3개, 기타만 짧은 글 */
        FEE_REASON: {
          title: '어떻게 달라졌나요?',
          sub: '하나만 골라 주세요',
          options: { AGREED: '서로 합의해서 조정했어요', OVERCHARGED: '중개사가 합의보다 더 요구했어요', OTHER: '기타' },
          notePlaceholder: '짧게 적어 주세요 (80자)',
          submit: '알리기',
          cancel: '닫기',
          thanks: '알려 주셔서 고마워요',
        },
        /** 집주인이 날짜를 대신 넣었거나 계약을 직접 알린 거래는 약속 이행 기록에 안 쌓임 */
        FEE_THANKS_NO_RECORD: '확인했어요. 고마워요',
        OWNER_SET_DATES: { kicker: '중개사가 날짜를 아직 안 알렸어요', title: '계약일·잔금일을 직접 넣을 수 있어요', button: '날짜 넣기' },
        WRITE_REVIEW: { kicker: '거래 완료', title: '후기를 남겨 주세요', sub: '별점과 칩만 골라요. 중개사 이름 옆 "인정"에 쓰여요' },
        REVIEW_DONE: { title: '후기 고마워요', sub: '거래가 모두 끝났어요' },
        CLOSED: { title: '다른 곳과 진행했어요', sub: '이 중개사에게 광고를 내려 달라고 했어요' },
        RELEASED: { title: '매칭을 해제했어요', sub: '기록은 그대로 남아요' },
        ENDED_BROKEN: { title: '거래가 해제됐어요', sub: '같은 조건으로 다시 요청할 수 있어요' },
      },
      answerSheet: {
        title: { PROVISIONAL: '가계약이 맞나요?', CONTRACT: '계약이 맞나요?', BALANCE: '잔금이 끝났나요?', BROKEN: '해제가 맞나요?' },
        noTitle: '아니라고 알릴까요?',
        yes: '맞아요',
        no: '아니라고 알리기',
        cancel: '닫기',
      },
      calendarTitle: '{field} · {office} · 복비',
      calendarMemo: '{complex}\n중개사 {phone}',
    },

    newRequest: '다른 아파트 복비 제안하기',

    /** [맨 위 할 일] 집주인은 막지 않고 크게 안내 (대표님 2026-10-26). 부딪히는 버튼은 먼저 확인으로 보냄 */
    todo: {
      /** "지금 확인할 일" 섹션 (2026-10-27): 빨강 지금 · 노랑 되도록 빨리 (lib/deal/ownerTodo) */
      /** 빨강 = 긴급 알림 상자 (UrgentAlert, 2026-10-27). 집주인은 막는 규칙이 없어 잠금 문구 없이 */
      urgentTitle: '지금 확인할 일이 {n}건 있어요',
      urgentReason: '누르면 바로 확인할 수 있어요',
      urgentGo: '지금 하기',
      /** 노랑 = 아래 흰 줄 섹션 */
      sectionTitle: '곧 확인할 일',
      sectionCount: '{n}',
      /** 확인할 보고가 있을 때 판매 상태·계약 알리기를 누르면 */
      confirmFirst: '중개사가 알린 내용을 먼저 확인해 주세요',
    },

    /** [빈 상태] 한 번도 요청하지 않은 사람 */
    empty: {
      title: '아직 의뢰가 없어요',
      subTitle: '우리 아파트 복비를 데이터로 정해 보세요',
      searchButtonText: '아파트 찾기',
    },

    /** [화면 검수용 테스트 스위처] 배포 전 제거 */
    qa: {
      title: '🧪 테스트 스위처 (배포 전 제거)',
      receivingEmpty: '요청 대기',
      receiving: '요청 도착',
      receivingRecord: '실적 있는 예시',
      inProgress: '진행중',
      inProgressAdOverdue: '광고 기한 지남',
      inProgressUnlocked: '7일 지남',
      inProgressTenant: '세입자',
      inProgressBrokerReported: '중개사가 계약 알림',
      paused: '잠시 멈춤',
      contractedDatesPending: '계약(날짜 대기)',
      contractedDatesOverdue: '계약(날짜 기한 지남)',
      contracted: '계약 완료',
      contractedReview: '잔금 후',
      expiredNoOffer: '만료(요청 0)',
      expired: '만료',
      empty: '빈 화면',
    },
  },

  /** 휴대폰 인증 공통 (A1, lib/auth/phone.ts AuthError). 화면별 문구가 따로 있는 오류는 그 화면 것을 먼저 씀 */
  auth: {
    errors: {
      BAD_PHONE: '휴대폰 번호를 다시 확인해 주세요',
      RATE_LIMITED: '잠시 뒤에 다시 받아 주세요',
      WRONG_CODE: '인증번호가 맞지 않아요',
      EXPIRED: '시간이 지났어요. 다시 받아 주세요',
      NO_ACCOUNT: '이 번호로 시작한 의뢰나 가입이 없어요',
      FAILED: '문자를 보내지 못했어요. 잠시 뒤 다시 해 주세요',
    },
  },

  /** 문자 (A1, Solapi — /api/auth/sms-hook). 단문 90바이트 안에 */
  sms: {
    otp: '[복비] 인증번호 {code}\n3분 안에 입력해 주세요',
  },

  /** 로그인 화면 /login (A1): 기존 회원만, 로그인이 필요한 화면에서 넘어옴. 처음이면 복비 계산·중개사 가입으로 */
  login: {
    title: '휴대폰 번호로 이어서 볼게요',
    sub: '처음 인증한 번호를 넣어 주세요',
    phoneLabel: '휴대폰 번호',
    placeholder: '010-1234-5678',
    send: '인증번호 받기',
    resend: '다시 받기',
    sentNotice: '인증번호를 보냈어요',
    codePlaceholder: '인증번호 6자리',
    confirm: '확인',
    testFill: '테스트 인증번호 채우기',
    newOwner: '처음이라면 우리 집 복비부터 계산해 보세요',
    newOwnerLink: '복비 계산하기',
    newBroker: '중개사라면 가입부터 해 주세요',
    newBrokerLink: '중개사 가입하기',
  },

  /**
   * 내 정보 관리 /my-info (A안, 대표님 2026-10-29): 본인 확인 → 내 정보 · 고쳐 주세요 · 탈퇴하기 한 화면.
   * 처리방침 8조와 같은 기준 (본인 확인 뒤 10일 안, lib/privacy/myInfo.ts). 홈 맨 아래·내 의뢰·내 사무소에서 링크
   */
  myInfo: {
    link: '내 정보 관리',
    headerTitle: '내 정보 관리',
    backLabel: '뒤로',
    verifyTitle: '본인 확인부터 할게요',
    verifySub: '복비에서 인증한 휴대폰 번호를 넣어 주세요',
    noData: '이 번호로 남은 정보가 없어요',
    infoTitle: '내 정보',
    rows: {
      name: '이름',
      phone: '휴대폰',
      dongHo: '동·호수',
      consents: '동의',
      consentsValue: '{n}개 · {date}',
      requests: '진행 중 의뢰',
      requestsValue: '{n}건',
      office: '사무소',
      signup: '가입 상태',
    },
    signupStatus: { PENDING: '확인 대기', APPROVED: '승인', REJECTED: '반려' },
    /**
     * 정정·삭제는 문의 한 줄 (대표님 2026-10-29): 동·호수·이름이 틀린 의뢰는 요청 단계(건축물대장)와 매칭 뒤 중개사 등기부 확인·허위 신고가 막고,
     * 남는 건 휴대폰 변경과 법에 따른 정정·삭제 요구라 운영팀 문의로 (처리방침 8조)
     */
    inquiryTitle: '정보를 바꾸거나 지우고 싶어요',
    inquirySub: '운영팀이 본인 확인 뒤 {days}일 안에 도와드려요',
    inquiryButton: '문의하기',
    withdrawLink: '탈퇴하기',
    withdrawSheetTitle: '탈퇴할까요?',
    withdrawLines: ['운영팀이 본인 확인 뒤 {days}일 안에 처리해요', '계약 기록은 법에 따라 5년 보관해요'],
    withdrawConfirm: '탈퇴 요청하기',
    withdrawDone: '탈퇴 요청을 받았어요. {date}까지 처리해요',
    blockedTitle: '진행 중인 의뢰가 있어요',
    blockedBody: '의뢰를 먼저 취소해야 탈퇴할 수 있어요',
    blockedConfirm: '내 의뢰로 가기',
    close: '닫기',
  },

  // ==========================================================================
  // 6. 공인중개사 등록 화면 (app/agent/register/ 및 src/components/agent/)
  // ==========================================================================
  /**
   * 가입: 명단 대조 → 휴대폰 인증 → 강점 칩 → 약속 → 확인 코드 (2026-10-25, 서류 3종 업로드 대체)
   * 소유 확인은 브이월드·네이버 부동산에 등록된 사무소 번호로 확인 전화 + 코드 (안내는 한 가지로 통일). 설계: docs/handover/phase5-broker-signup.md
   */
  brokerSignup: {
    headerTitle: '파트너 중개사 가입',
    backLabel: '뒤로',
    /** 대표님 2026-10-28: 사무소 확인 + 휴대폰 인증을 한 단계로 (사무소가 맞다고 하면 같은 화면 아래에 인증) */
    steps: ['사무소·본인 확인', '잘하는 점', '약속', '신청 완료'],
    /** 사무소 확인 카드·신청 완료 화면에 함께 (대표님 2026-10-28) */
    auditNotice: '복비 운영팀에서 전화와 실사가 나갈 수 있어요',
    office: {
      title: '사무소 정보를 알려 주세요',
      sub: '브이월드에 등록된 정보와 맞춰 봐요.\n대표 공인중개사만 가입할 수 있어요.',
      regNoLabel: '중개사무소 등록번호',
      regNoPlaceholder: '41360202460048',
      regNoHint: '- 없이 숫자만 입력해도 돼요',
      ceoLabel: '대표 공인중개사 이름',
      ceoPlaceholder: '홍길동',
      officeLabel: '상호',
      officePlaceholder: '다산OO공인중개사사무소',
      submit: '확인하기',
      checking: '확인하는 중',
      /** 비슷한 상호가 많아 지도·주소로 한 번 더 확인 */
      confirmTitle: '이 사무소가 맞나요?',
      mapAlt: '{office} 위치 지도',
      mapError: '지도를 불러오지 못했어요. 주소로 확인해 주세요',
      nameClose: '상호는 확인 전화 때 한 번 더 여쭤볼게요',
      /** 실제 거는 번호 순서(브이월드 → 포털 광고 번호 → 문자)는 관리자 화면에만. 가입 화면은 "공개된 번호"까지만 (대표님 2026-10-29) */
      callPreview: '가입 신청 후 48시간 안에 브이월드 등 공개된 사무소 번호로 확인 전화를 드려요',
      confirmNo: '아니에요',
      confirmYes: '네, 맞아요',
      notMine: '등록번호를 다시 확인해 주세요.\n이름이 비슷한 사무소가 많아요',
      errors: {
        NOT_FOUND: '다산동 명단에서 이 등록번호를 찾지 못했어요.\n등록증의 번호를 확인해 주세요',
        CEO_MISMATCH: '대표 공인중개사 이름이 등록 정보와 달라요.\n대표 공인중개사만 가입할 수 있어요',
        OFFICE_MISMATCH: '상호가 등록 정보와 달라요.\n등록증의 상호를 확인해 주세요',
        SUSPENDED: '휴업 중인 사무소로 등록되어 있어요.\n영업을 다시 시작한 뒤 가입해 주세요',
        ALREADY_JOINED: '이미 가입 신청된 사무소예요',
        LOCKED: '여러 번 맞지 않았어요.\n10분 뒤에 다시 시도해 주세요',
        EMPTY: '세 칸을 모두 입력해 주세요',
        // A4 서버 저장 (2026-10-29): 신청 버튼을 눌렀을 때만 나옴
        NOT_SIGNED_IN: '휴대폰 인증이 풀렸어요.\n아래에서 다시 인증해 주세요',
        NOT_CONFIGURED: '지금은 신청을 받을 수 없어요.\n잠시 뒤 다시 시도해 주세요',
      },
    },
    phone: {
      title: '휴대폰으로 인증해 주세요',
      sub: '요청 알림과 가입 승인 결과를 이 번호로 보내드려요',
      label: '휴대폰 번호',
      placeholder: '010-1234-5678',
      send: '인증번호 받기',
      resend: '다시 받기',
      codePlaceholder: '인증번호 6자리',
      confirm: '확인',
      sentNotice: '인증번호를 보냈어요',
      wrongCode: '인증번호 6자리를 입력해 주세요',
      expired: '시간이 지났어요. 다시 받아 주세요',
      verified: '인증됐어요',
      testFill: '테스트 인증번호 채우기',
      next: '다음',
    },
    consents: {
      all: '전체 동의',
      required: '필수 동의를 모두 체크해야 인증번호를 보낼 수 있어요',
      refusal: '동의하지 않을 수 있어요. 다만 동의하지 않으면 가입할 수 없어요.',
      viewFull: '전문 보기',
      close: '닫기',
      items: [
        {
          key: 'TERMS',
          label: '[필수] 서비스 이용약관',
          title: '서비스 이용약관',
          legal: 'terms',
          rows: [
            ['매칭 후', '48시간 안에 광고를 올리고, 계약하면 48시간 안에 계약일·잔금일을 알려요'],
            ['복비', '매칭 때 합의한 복비로 계약해요'],
            ['블라인드', '매칭 전에는 연락처·상호를 집주인에게 알리지 않아요'],
          ],
        },
        {
          key: 'COLLECT',
          label: '[필수] 개인정보 수집·이용',
          title: '개인정보 수집·이용',
          legal: 'privacy',
          rows: [
            ['목적', '가입 확인(명단 대조·확인 전화), 요청 알림, 민원 처리'],
            ['항목', '대표 공인중개사 성명, 휴대전화번호, 중개사무소 등록번호·상호·주소·전화번호'],
            ['보유 기간', '탈퇴할 때까지, 계약 기록은 법정 기간(5년) 보관'],
          ],
        },
        {
          key: 'PROVIDE',
          label: '[필수] 매칭 확정 시 집주인에게 제공',
          title: '개인정보 제3자 제공',
          legal: 'privacy',
          rows: [
            ['받는 곳', '나를 고른 집주인'],
            ['목적', '중개 의뢰 연락·방문 일정 조율'],
            ['항목', '상호, 대표 공인중개사 성명, 사무소 전화번호·주소'],
            ['보유 기간', '중개 업무가 끝날 때까지'],
            ['시점', '집주인이 매칭을 확정할 때만. 그 전에는 제공하지 않아요'],
          ],
        },
      ],
    },
    strengths: {
      title: '잘하는 것을 골라 주세요',
      sub: '매칭 전 집주인에게 사무소 이름 없이\n이 칩만 보여요. 최대 {max}개',
      endorseNote: '계약한 집주인이 후기에서 같은 칩을 고르면 "인정"이 쌓여요',
      counter: '{count}/{max}',
      conditionsTitle: '가능한 것 (여러 개 골라도 돼요)',
      next: '다음',
    },
    /**
     * 약속 화면 (C안, 대표님 2026-10-25): 위 "복비가 지켜드려요"(블라인드·직접 맡긴 매물) → 아래 "지켜 주세요"(약속 4개).
     * 불이익은 부드럽게, 지켰을 때 좋은 점을 먼저. "법적 효력"류 과장·중개사를 의심하는 어조 금지.
     * 확인서·매칭 취소는 집주인 화면 문구(feeGuaranteeSupport·광고 48시간)와 같은 사실
     */
    promise: {
      title: '복비 파트너 약속',
      sub: '서로 지킬 때 집주인이 믿고 맡겨요',
      protectTitle: '복비가 지켜드려요',
      protectItems: [
        {
          title: '매칭 전에는 아무도 몰라요',
          desc: '사무소 이름·연락처는 집주인과 매칭된 중개사만 서로 알아요.\n주변 부동산도 어느 사무소가 맡았는지 몰라요.',
        },
        { title: '집주인이 직접 맡긴 매물을 받아요', desc: '한 집은 최대 3곳만 맡아요.' },
      ],
      keepTitle: '지켜 주세요',
      items: [
        {
          title: '합의한 복비로 계약해요',
          desc: '합의 금액은 기록으로 남아요. 거래금액이 바뀌면 법정 상한의 같은 비율로 다시 계산해요.\n지키면 약속 이행 배지가 쌓여 다음 집주인에게 보여요.\n다르게 요구하면 합의 기록이 집주인에게 확인서로 제공되고,\n다음 매칭이 어려울 수 있어요.',
        },
        { title: '매칭 후 48시간 안에 광고를 올려요', desc: '올리지 않으면 집주인이 매칭을 취소할 수 있어요.' },
        {
          title: '계약 후 48시간 안에 계약일·잔금일을 알려요',
          desc: '직접 알려 주신 계약만 약속 이행 기록에 쌓여요.\n집주인이 대신 입력하면 쌓이지 않아요.',
        },
        { title: '매칭 전에는 연락처·상호를 알리지 않아요', desc: '서로 지킬 때 블라인드가 유지돼요.' },
      ],
      /** 약속 레벨 미리보기 (stage.ts PROMISE_TIER_MIN → 레벨 2·3·4, common/PromiseLevel) */
      tierPreview: '이렇게 쌓여요',
      tierStep: '{count}건부터',
      /** 첫 약속 아래 링크 → 거래금액이 바뀔 때 예시 표 시트 (A안 2026-10-28) */
      feeExamplesLink: '거래금액이 바뀌면? 예시 보기',
      feeExamplesTitle: '거래금액이 바뀌면',
      required: '모두 확인해야 신청할 수 있어요',
      warning: '다른 사람 명의로 신청하면\n가입이 취소되고 법적 책임을 질 수 있어요',
      submit: '가입 신청하기',
    },
    done: {
      title: '신청을 받았어요',
      codeLabel: '확인 코드',
      /** 모든 신청자에게 같은 안내. 어느 번호로 걸지는 관리자가 정한다 (브이월드 → 없으면 네이버 부동산 광고 번호, 등록번호 일치 확인) */
      callNotice: '48시간 안에 사무소 번호로 확인 전화를 드려요',
      callHow: '브이월드 등 공개된 사무소 번호로 전화해요.\n전화를 받으면 이 코드를 불러 주세요',
      approvedNotice: '승인되면 인증한 휴대폰으로 알려드려요.\n그때부터 바로 집주인 의뢰를 보고 요청할 수 있어요',
      revisit: '이 화면은 다시 들어와도 볼 수 있어요',
      // 다른 휴대폰·저장을 지운 경우 (대표님 2026-10-29 A안): 서버엔 코드 해시만 있어 원문을 다시 보여 줄 수 없음
      codeMissingTitle: '이 휴대폰에는 확인 코드가 없어요',
      codeMissingBody: '처음 신청한 휴대폰에서 보거나, 여기서 새 코드를 받아 주세요',
      codeReissue: '새 확인 코드 받기',
      codeReissueNote: '새로 받으면 예전 코드는 쓸 수 없어요',
      codeReissueFailed: '새 코드를 받지 못했어요. 잠시 뒤 다시 눌러 주세요',
      approvedTitle: '가입이 승인됐어요',
      approvedSub: '지금부터 집주인 의뢰를 보고 요청할 수 있어요',
      goFeed: '새 의뢰 보러 가기',
      rejectedTitle: '가입을 승인하지 못했어요',
      rejectedReason: '사유: {reason}',
      retry: '다시 신청하기',
      office: '사무소',
      home: '처음으로',
    },
    /** [화면 검수용 테스트 스위처] 배포 전 제거. 예시 사무소는 명단의 1등이편한공인중개사사무소 */
    qa: {
      title: '🧪 테스트 스위처 (배포 전 제거)',
      officeEmpty: '사무소 확인',
      officeMatched: '사무소 맞음',
      officeError: '대표자 다름',
      phone: '휴대폰 인증',
      strengths: '잘하는 점',
      promise: '약속',
      pending: '신청 완료',
      codeMissing: '다른 휴대폰(코드 없음)',
      approved: '승인됨',
      rejected: '반려됨',
      admin: '관리자 화면 ›',
    },
  },

  /**
   * 관리자: 중개사 가입 확인 (/admin/brokers). 목업 단계라 배포 빌드에서는 열리지 않는다 (Supabase 관리자 인증 연결 전)
   * 확인 전화 순서: 브이월드 번호 → 없으면 네이버 부동산에서 등록번호가 같은 광고의 번호 → 둘 다 없으면 신청 휴대폰으로 문자
   */
  adminBrokers: {
    headerTitle: '중개사 가입 확인',
    mockNotice: '개발용 화면이에요. 이 브라우저에서 한 가입 신청만 보여요',
    empty: '확인할 신청이 없어요',
    /** 관리자 중개사 탭 가입 목록 (A2'', 2026-10-29) */
    listTitle: '가입 신청',
    back: '목록',
    submitted: '{date} 신청',
    status: { PENDING: '확인 대기', APPROVED: '승인', REJECTED: '반려' },
    elapsed: '신청 {hours}시간째',
    overdue: '48시간 지남',
    dueSoon: '{hours}시간 남음',
    regNo: '등록번호',
    ceo: '대표 공인중개사 (명단)',
    applicantPhone: '신청 휴대폰',
    address: '주소',
    strengths: '잘하는 점',
    callTitle: '확인 전화',
    vworldPhone: '브이월드 번호',
    altPhones: '명단의 다른 번호',
    phoneInName: '상호 안 번호',
    naverGuide: '브이월드 번호가 없어요.\n네이버 부동산에서 등록번호 {regNo}가 같은 광고를 찾아 그 번호로 전화해 주세요',
    smsGuide: '네이버에도 없으면 신청 휴대폰으로 문자를 보내 주세요',
    codeLabel: '신청자가 불러 준 확인 코드',
    codePlaceholder: '4자리',
    yearLabel: '개설 연도 (브이월드 등록일)',
    yearPlaceholder: '예: 2008',
    yearFromRegistry: '개설 연도 {year} (등록번호에서 확인)',
    approve: '승인',
    reject: '반려',
    rejectReasons: ['전화 연결 안 됨', '코드 불일치', '대표 공인중개사 아님', '사무소 확인 안 됨'],
    rejectTitle: '반려 사유',
    cancel: '취소',
    errors: {
      CODE_MISMATCH: '코드가 달라요. 다시 확인해 주세요',
      YEAR_REQUIRED: '개설 연도를 입력해 주세요',
      YEAR_INVALID: '개설 연도를 4자리로 입력해 주세요 (1980~올해)',
      NOT_PENDING: '이미 처리한 신청이에요',
      LOCKED: '코드를 5번 틀려 잠겼어요. 반려하고 다시 신청받아 주세요',
      REASON_REQUIRED: '반려 사유를 골라 주세요',
      NOT_FOUND: '신청을 찾을 수 없어요. 목록을 새로 불러 주세요',
    },
    reset: '신청 지우기 (테스트)',
  },

  /**
   * 알림 문자 6가지 (B2, 대표님 2026-10-29 "핵심 6개"). 규칙 lib/notify/notices.ts, 보내기는 Solapi 키를 꽂으면 (배포 직전).
   * 짧게: 길면 장문 문자라 비용이 늘어요. {complex} = "단지 평형 거래" (동·호수 없음)
   */
  notify: {
    FIRST_OFFER: '[복비] {complex}에 첫 중개사 요청이 왔어요. 내 의뢰에서 확인해 주세요.',
    RECEIVING_ENDED: '[복비] {complex} 요청 받는 시간이 끝났어요. 요청한 {n}곳 중 최대 3곳을 골라 주세요.',
    SIGNUP_APPROVED: '[복비] 파트너 중개사 가입이 승인됐어요. 지금부터 집주인 의뢰를 보고 요청할 수 있어요.',
    SIGNUP_REJECTED: '[복비] 파트너 중개사 가입을 승인하지 못했어요. 사유는 가입 화면에서 확인해 주세요.',
    MATCHED: '[복비] {complex} 집주인이 내 요청을 골랐어요. 48시간 안에 광고를 올려 주세요.',
    AD_DEADLINE_SOON: '[복비] {complex} 광고 올리기 기한이 6시간 남았어요.',
    FAKE_CONFIRMED: '[복비] {complex} 신고하신 매물이 허위로 확인돼 의뢰가 끝났어요. 쓴 크레딧 1개를 돌려드렸어요.',
    FAKE_REJECTED: '[복비] {complex} 확인 결과 허위 매물이 아니에요. 소유자 확인부터 다시 진행해 주세요.',
  },

  /**
   * 문의하기 시트 (대표님 2026-10-29): 자주 묻는 질문(3개 + 더 보기) → 내 문의(답 포함) → 양식. 카카오톡 문의는 나중에 결정.
   * 집주인: 내 의뢰·내 정보 관리, 중개사: 내 사무소에서 연다. 규칙 lib/support/inquiries.ts
   */
  support: {
    title: '문의하기',
    entry: '문의하기',
    entrySub: '자주 묻는 질문을 먼저 보고, 없으면 바로 물어보세요',
    faqTitle: '자주 묻는 질문',
    faqMore: '질문 {n}개 더 보기',
    faqLess: '접기',
    faqShown: 3,
    faq: {
      OWNER: [
        { q: '복비 추천은 어떻게 정하나요?', a: '먼저 거래 금액으로 법이 정한 복비 상한을 계산해요. 그다음 우리 단지 같은 면적대의 최근 6개월 실거래와 지금 나와 있는 매물 수를 다산동 다른 단지와 비교해요. 매물이 빨리 팔리는 단지는 더 낮게, 매물이 쌓이는 단지는 덜 낮게 추천해요. 분석 화면에 데이터 기준 날짜를 함께 적어 둬요.' },
        { q: '정한 복비가 법정 상한을 넘을 수 있나요?', a: '아니요. 법정 상한보다 높게 정할 수 없고, 상한의 30% 아래로도 내려가지 않아요. 예: 매매 10억 원이면 상한 500만 원, 정할 수 있는 복비는 150만~500만 원이에요.' },
        { q: '가격이나 정보를 고치려면 처음부터 다시 해야 하나요?', a: '아니요. 매칭 전에는 내 의뢰에서 고칠 단계만 고치면 바로 확인 단계로 가요. 매칭 뒤에는 희망가는 내 의뢰에서 바꾸고, 다른 정보는 문의로 알려 주세요.' },
        { q: '매칭된 뒤 희망가를 바꾸면 복비는요?', a: '처음 합의한 비율 그대로, 바뀐 금액의 법정 상한에 맞춰 다시 계산돼요. 예: 상한의 60%로 합의했다면 금액이 바뀌어도 60%예요.' },
        { q: '중개사는 어떻게 고르나요?', a: '요청한 부동산 중 최대 3곳을 고르면, 그곳에서 광고를 올리고 연락해 와요. 계약은 그중 1곳과 하고, 복비도 그 1곳에만 내요.' },
        { q: '동·호수와 연락처는 언제 보이나요?', a: '매칭이 확정된 뒤, 고른 부동산에만 보여요. 고르지 않은 곳에는 끝까지 보이지 않아요.' },
        { q: '요청한 부동산이 없으면 어떻게 하나요?', a: '요청은 48시간 동안 받아요. 그 안에 요청이 없으면 내 의뢰에서 복비를 조금 올려 다시 요청할 수 있어요.' },
        { q: '부동산이 정한 복비보다 더 달라고 하면요?', a: '합의한 복비보다 더 낼 필요는 없어요. 계약 뒤 거래 페이지에서 "합의한 복비 그대로 계약하셨나요?"에 \'아니에요\' → \'중개사가 합의보다 더 요구했어요\'를 골라 주세요. 운영팀이 확인해요. 계약 전이라면 문의하기로 알려 주세요.' },
        { q: '다른 곳에서 팔리면 어떻게 하나요?', a: '내 의뢰 → 판매 설정 → 매물 거둬들이기에서 이유로 \'다른 곳에서 계약했어요\'를 골라 주세요. 매칭된 중개사에게 의뢰가 끝났다고 알려요.' },
        { q: '내 정보를 지우거나 탈퇴하려면요?', a: '내 정보 관리에서 탈퇴를 요청하면 10일 안에 처리해요. 계약 기록은 법이 정한 기간만큼 보관해요.' },
      ],
      BROKER: [
        { q: '크레딧은 어떻게 쓰나요?', a: '요청 1번에 크레딧 1개를 써요. 매주 월요일에 3개로 다시 채워져요. 남은 개수에 더하지 않고 3개로 맞춰요.' },
        { q: '크레딧을 돌려받을 수 있나요?', a: '두 경우에 1개를 돌려받아요. ① 복비로 계약하고 집주인이 후기를 남기면 ② 매칭된 의뢰가 허위 매물로 확인되면. 선택받지 못한 요청은 돌려받지 않아요.' },
        { q: '집주인 동·호수와 연락처는 언제 보이나요?', a: '집주인이 내 요청을 고른 뒤 거래 페이지에서 보여요.' },
        { q: '광고는 언제까지 올려야 하나요?', a: '매칭된 뒤 48시간 안에 올리고 매물번호나 링크를 남겨 주세요. 올리지 않으면 집주인이 매칭을 해제할 수 있어요.' },
        { q: '등기부 소유자와 집주인이 다르면요?', a: '거래 페이지에서 집주인에게 전화로 확인했다고 남기거나, 허위 매물로 알려 주세요. 운영팀이 24시간 안에 판정해요.' },
      ],
    },
    mineTitle: '내 문의',
    mineWaiting: '답변 기다리는 중 · {date}까지',
    mineAnswer: '운영팀 답변',
    formTitle: '물어보기',
    topicTitle: '어떤 일인가요?',
    topics: { CORRECTION: '내 정보 정정', REQUEST: '의뢰·매칭', FEE: '복비·계약', OTHER: '그 외' },
    attached: '같이 보내는 의뢰',
    bodyLabel: '내용',
    bodyPlaceholder: '예: 희망가를 13억으로 잘못 넣었어요. 12억 5천으로 고쳐 주세요.',
    bodyCount: '{n}/{max}',
    note: '동·호수와 전화번호는 적지 않아도 돼요. 답은 이 화면 "내 문의"에 10일 안에 드려요.',
    errors: { TOO_SHORT: '{min}자 이상 적어 주세요', TOO_LONG: '{max}자까지 적을 수 있어요', NO_PHONE: '본인 확인한 휴대폰이 없어요. 의뢰나 가입을 먼저 해 주세요' },
    send: '보내기',
    sent: '보냈어요. 10일 안에 답해 드릴게요',
    close: '닫기',
  },

  /**
   * 관리자 콘솔 /admin (시안 승인 2026-10-26, 설계 phase5-broker-matching.md 5-3). 운영자가 매일 여는 오늘 할 일 + VC 미팅 지표 근거.
   * 가짜 숫자 금지: 지표는 데이터 전 "—". 배포 빌드에서는 404 (관리자 인증은 Supabase 때)
   */
  adminConsole: {
    title: '관리자',
    mockNotice: '개발용 화면이에요. 이 브라우저 저장소의 기록만 보여요',
    /** 탭 (대표님 2026-10-29 A안): 가입 확인 → 중개사, 신고 → 의뢰 */
    tabs: { today: '오늘', brokers: '중개사', requests: '의뢰', metrics: '지표', system: '시스템' },
    today: {
      empty: '오늘 처리할 일이 없어요',
      summary: '처리할 일 {total}건',
      overdueCount: '기한 지남 {n}건',
      kinds: {
        SIGNUP: '가입 확인 대기',
        FAKE_REPORT: '허위 매물 신고',
        FEE_OVERCHARGED: '복비 "중개사가 더 요구"',
        INQUIRY: '문의 · 답변 기다림',
        WITHDRAW: '탈퇴 요청 · 본인 확인 뒤 처리',
        REMOVE_AD_LATE: '광고 내림 기한 지남',
        NO_OFFERS: '24시간째 요청 0곳',
      },
      /** 종류별 오른쪽 작은 글 */
      hint: {
        SIGNUP: '신청 {hours}시간째 · 48시간 안에 확인 전화',
        FAKE_REPORT: '신고 {hours}시간째 · 24시간 안에 판정',
        FEE_OVERCHARGED: '답한 지 {hours}시간째',
        INQUIRY: '받은 지 {hours}시간째 · 10일 안에 답변',
        WITHDRAW: '요청 {hours}시간째 · 10일 안에 처리',
        REMOVE_AD_LATE: '기한 지나고 {hours}시간째 · 중개사 새 요청 잠김',
        NO_OFFERS: '등록 {hours}시간째',
      },
      open: '열기',
      /** 지금 현황 카드 */
      nowTitle: '지금 현황',
      asOf: '{time} 기준',
      visits: '오늘 방문',
      visitsLater: '방문 기록은 서버 연결 뒤',
      waiting: '매칭 기다리는 의뢰',
      inDeal: '진행 중 거래',
      brokers: '승인된 중개사',
      brokersOf: '다산동 {total}곳 중',
      contracted: '계약 {n}건',
      /** 빨강 긴급 알림 (기한 지난 일) */
      urgentTitle: '기한이 지난 일이 있어요',
      urgentReason: '처리해야 집주인·중개사 쪽 흐름이 다시 움직여요',
      urgentGo: '먼저 처리하기',
      soonTitle: '곧 할 일',
      watchTitle: '지켜볼 것',
      daysLeft: '{n}일 남음',
      hoursLeft: '{n}시간 남음',
      serviceTitle: '서비스 상태',
      serviceOk: '문제 없어요',
      serviceNote: '문제 있는 것만 보여요 · 전체는 시스템 탭',
      issue: { KEY_MISSING: '{name} 키 없음', DATA_STALE: '{name} {days}일 지남', DATA_STALE_NONE: '{name} 파일 없음', DATA_PENDING: '{name} 새 파일 반영 전' },
      issueTone: { KEY_MISSING: '없음', DATA_STALE: '지남', DATA_PENDING: '반영 전' },
    },
    /** 중개사 탭: 확인 대기(가입 확인) + 가입 현황 */
    brokersTab: {
      pendingTitle: '가입 확인',
      joinedTitle: '가입한 중개사',
      joinedValue: '{n} / {total}곳',
      joinedRate: '다산동 개설 사무소의 {pct}%',
      listLater: '서버(Supabase)로 바꾸면 모든 사무소의 신청이 여기 모여요. 지금(목업)은 이 브라우저의 신청 1건만 보여요. 크레딧 주기는 다음 단계.',
    },
    /** 의뢰 탭: 신고 / 문의 / 모든 의뢰 */
    requestsTab: {
      segments: { reports: '신고', inquiries: '문의', all: '모든 의뢰' },
      inquiriesEmpty: '들어온 문의가 없어요',
      inquiries: {
        openTitle: '답할 문의',
        answeredTitle: '답한 문의',
        role: { OWNER: '집주인', BROKER: '중개사' },
        received: '{date} 받음',
        answeredAt: '{date} 답함',
        quickTitle: '자주 쓰는 답',
        quick: ['고쳐 드렸어요. 내 의뢰에서 바뀐 값을 확인해 주세요.', '본인 확인이 필요해요. 가입한 휴대폰으로 연락드릴게요.', '내 의뢰 → 수정에서 직접 바꿀 수 있어요.'],
        answerLabel: '답변',
        send: '답변 보내기',
        sendNote: '답은 보낸 사람의 "내 문의"에 남고 처리 기록이 돼요. 알림은 서버 연결 뒤.',
        viewRequest: '{id} 거래 기록 보기',
      },
      search: '찾기',
      searchPlaceholder: '단지 이름 또는 의뢰번호',
      empty: '의뢰가 없어요',
      noMatch: '찾는 의뢰가 없어요',
      stage: { RECEIVING: '매칭 대기', IN_PROGRESS: '진행 중', CONTRACTED: '계약', ENDED: '끝남' },
      offers: '요청 {n}곳',
      back: '목록',
      registered: '등록',
      timelineEmpty: '매칭 전이라 거래 기록이 없어요',
      privacyNote: '동·호수·연락처는 이 화면에 나오지 않아요',
    },
    reports: {
      empty: '들어온 신고가 없어요',
      pending: '처리할 신고',
      done: '처리한 신고',
      kinds: { FAKE_REPORT: '허위 매물 신고', FEE_OVERCHARGED: '복비 "중개사가 더 요구"' },
      office: '중개사',
      complex: '단지',
      reportedAt: '신고 시각',
      timelineTitle: '그 거래 기록',
      actionsTitle: '처리',
      historyTitle: '처리 기록',
      /** 판정 버튼 (허위 매물 / 복비) */
      actions: {
        FAKE_REPORT: { CONFIRMED: '허위 매물 맞음', REJECTED: '허위 매물 아님', CONTACTED: '중개사에게 연락함' },
        FEE_OVERCHARGED: { CONFIRMED: '더 요구한 게 맞음', REJECTED: '문제 없음', CONTACTED: '중개사에게 연락함' },
      },
      /** 판정 전 결과 안내 (확인 창 대신 버튼 위에 사실대로) */
      effects: {
        FAKE_REPORT: {
          CONFIRMED: '의뢰가 끝나고 매칭된 중개사 모두 크레딧 1개씩 돌려받아요. 광고를 올린 곳에는 24시간 안에 내려 달라고 알려요.',
          REJECTED: '신고한 중개사는 소유자 확인부터 다시 하고, 기다린 시간만큼 광고 시간이 늘어나요. 크레딧은 돌려주지 않아요.',
        },
        FEE_OVERCHARGED: {
          CONFIRMED: '처리 기록으로 남아요. 이용 제한(약관 제8·11조) 반영은 서버 연결 뒤에 해요.',
          REJECTED: '오늘 할 일에서 빠지고 처리 기록으로 남아요.',
        },
      },
      status: { PENDING: '처리 전', CONFIRMED: '확인', REJECTED: '반려', CONTACTED: '연락함' },
      decided: '판정했어요',
      close: '닫기',
    },
    metrics: {
      notice: '실제 숫자는 서버(Supabase) 연결 뒤 쌓인 기록으로 계산해요. 계산 규칙은 테스트로 고정돼 있어요.',
      empty: '—',
      /** PC 대시보드 v2 (2026-10-29): 비교 기준·한눈에·다산동 침투·단지 순위·개선 제안 */
      real: '실제',
      realNote: '표시는 지금 데이터 그대로예요. "—"는 서버 기록이 쌓이면 채워져요.',
      compare: { DAY: '전일 대비', WEEK: '지난주 대비', MONTH: '지난달 대비' },
      compareNote: '비교는 기록이 쌓이면 보여요 · 개수는 차이와 %, 비율은 %p · 표본 10건 미만이면 비교하지 않아요',
      glanceTitle: '한눈에',
      glance: ['방문자', '새 의뢰', '의뢰 → 매칭률', '첫 요청까지', '요청 중 선택된 비율', '활동 중개사'],
      reachTitle: '다산동에 얼마나 퍼졌나',
      joined: '가입한 중개사',
      joinedValue: '{n} / {total}곳',
      complexes: '의뢰가 들어온 단지',
      complexesValue: '{n} / {total}단지',
      ofTotal: '{pct}%',
      dataTitle: '분석에 쓰는 데이터',
      data: { trades: '실거래 {n}건', sale: '매매 매물 {n}건', jeonse: '전세 매물 {n}건', complexes: '단지 {n}곳', observed: '화면 반영 기준일 {date}' },
      whereTitle: '어느 단지에서 일어나나',
      rankSearched: '가장 많이 검색한 단지',
      rankSearchedLater: '검색 기록은 서버 연결 뒤',
      rankRequests: '의뢰가 가장 많은 단지',
      rankMatched: '매칭이 가장 많은 단지',
      rankEmpty: '아직 없어요',
      rankRequestsUnit: '{n}건',
      rankMatchRate: '매칭 {pct}%',
      laterTitle: '기록이 쌓이면 보이는 지표',
      suggestTitle: '개선 제안',
      suggestEmpty: '표본이 20건을 넘으면 정해 둔 규칙에 걸린 것만 근거 숫자와 함께 떠요.',
      items: [
        { key: 'firstOffer', label: '첫 요청까지 시간', rule: '의뢰별 첫 중개사 요청까지 걸린 시간의 중앙값' },
        { key: 'matchByDiscount', label: '할인율 구간별 매칭률', rule: '할인율 10%p 구간마다 매칭 확정된 의뢰 비율 (정책값 보정 근거)' },
        { key: 'feeKept', label: '합의 복비 유지율', rule: '계약 뒤 "합의한 복비 그대로" 답한 비율' },
        { key: 'adOnTime', label: '광고 48시간 준수율', rule: '매칭 뒤 48시간 안에 광고를 올린 비율' },
        { key: 'funnel', label: '이용 흐름', rule: '분석 → 의뢰 → 매칭 확정 → 후기, 앞 단계를 거친 사람 기준' },
        { key: 'retention', label: '중개사 주차별 리텐션', rule: '처음 활동한 주별로 n주 뒤에도 활동한 중개사 비율' },
        { key: 'savedFee', label: '집주인이 아낀 복비 합계', rule: '계약 뒤 복비 답에 담긴 법정 상한 대비 아낀 금액 합' },
        { key: 'share', label: '다산동 매매 점유율', rule: '복비로 끝난 매매 ÷ 국토부 월 거래량' },
        { key: 'fakeDoor', label: '크레딧 더 받기 클릭률', rule: '피드를 본 중개사 중 "크레딧 더 받기"를 누른 비율' },
      ],
    },
    system: {
      keysTitle: '외부 서비스 키',
      keysNote: '서버에서 있는지만 확인해요. 값은 보이지 않아요.',
      keys: { AI: 'AI 설명 (Gemini)', VWORLD: '사무소 지도 (VWorld)', BUILDING: '건축물대장 (건축HUB)', MOLIT: '국토부 실거래', SOLAPI: '문자 알림 (Solapi)', PUSH: '관리자 웹 푸시 (VAPID)' },
      set: '설정됨',
      missing: '없음',
      dataTitle: '데이터 갱신',
      dataNote: '7일이 넘으면 빨강이에요. 화면 반영(data:build)은 배포 직전에만 해요.',
      sources: { SCREEN: '화면 반영 기준일', LISTINGS: '네이버 매물 CSV', TRADES: '국토부 실거래', RONE: 'R-ONE 지수', UNITS: '건축물대장 호수' },
      daysAgo: '{days}일 전',
      today: '오늘',
      noFile: '파일 없음',
      pending: '반영 전',
      laterTitle: '서버 연결 뒤',
      later: 'AI 설명 실패율·응답 시간, 한도 초과 횟수, 외부 서비스 오류는 서버 기록이 쌓이면 보여요.',
      /** 개인정보 열람 기록 (A5): 누가 언제 어느 의뢰의 연락처를 열었는지 + 관리자 처리. 지울 수 없음 */
      log: {
        title: '개인정보 열람 기록',
        note: '누가 언제 어느 의뢰의 연락처를 열었는지 남아요. 지울 수 없어요.',
        segments: { ACCESS: '열람', ACTION: '관리자 처리' },
        who: { OWNER_VIEW: '집주인 본인', MATCHED_BROKER: '매칭 중개사', ADMIN_REVIEW: '관리자' },
        what: { OWNER_VIEW: '내 의뢰 다시 요청', MATCHED_BROKER: '매칭 확정 후 연락처', ADMIN_REVIEW: '확인 사유: {reason}' },
        target: { FAKE_REPORT: '허위 매물 신고', FEE_OVERCHARGED: '복비 초과 신고' },
        result: { CONFIRMED: '맞음', REJECTED: '아님', CONTACTED: '연락함' },
        unknownRequest: '지금 목록에 없는 의뢰',
        empty: '아직 기록이 없어요',
        more: '더 보기',
      },
    },
    /** 관리자 웹 푸시 (대표님 2026-10-29 "관리자 알림" 시안: 문자 대신 무료 웹 푸시). 알림 문구 + 시스템 탭 받기 설정 */
    push: {
      morningTitle: '[복비] 오늘 할 일 {n}건',
      morningTitleOverdue: '[복비] 오늘 할 일 {n}건 (기한 지남 {m})',
      morningBody: '어제 새 의뢰 {requests} · 매칭 {matched}',
      overdueTitle: '[복비 긴급] {kind}',
      overdueBody: '{title} · 기한이 지났어요',
      serviceTitle: '[복비] 서비스 확인 필요 {n}건',
      signupTitle: '[복비] 새 가입 신청',
      signupBody: '{office} · 48시간 안에 확인 전화',
      testTitle: '[복비] 시험 알림',
      testBody: '이 기기로 관리자 알림이 와요',
      cardTitle: '알림 받기',
      cardNote: '이 기기로 관리자 알림을 받아요. 밤 10시~아침 8시엔 긴급만, 같은 일은 하루 한 번만 알려요.',
      kinds: { MORNING: '아침 9시 요약', OVERDUE: '기한 지남 바로', SERVICE: '서비스 오류', SIGNUP: '새 가입 신청' },
      turnOn: '이 기기로 알림 받기',
      turnOff: '이 기기 알림 끄기',
      test: '시험 알림 보내기',
      testSent: '보냈어요. 몇 초 안에 와요',
      on: '이 기기로 받고 있어요',
      states: {
        UNSUPPORTED: '이 브라우저는 웹 푸시를 지원하지 않아요.',
        IOS_HOME: '아이폰은 공유 버튼 → "홈 화면에 추가"로 관리자 화면을 추가한 뒤 거기서 켜 주세요.',
        DENIED: '알림이 차단돼 있어요. 브라우저 설정에서 이 사이트 알림을 허용해 주세요.',
        NO_KEY: '웹 푸시 키가 없어요. 시스템 탭 키 목록을 확인해 주세요.',
        FAILED: '잠시 연결이 안 돼요. 다시 시도해 주세요.',
      },
      laterNote: '자동 발송(10분마다 확인)은 Supabase를 켤 때 연결돼요. 지금은 시험 알림만 보내요.',
    },
    /** 관리자 2단계 인증 (A5, 대표님 2026-10-29 C안): 휴대폰은 인증 앱 열기 버튼, PC는 QR. 등록 뒤엔 들어올 때마다 6자리 */
    mfa: {
      enrollTitle: '관리자 2단계 인증 등록',
      enrollSubPhone: '버튼을 누르면 인증 앱이 열리고 복비가 바로 추가돼요. 앱이 없으면 먼저 받아 주세요.',
      enrollSubWide: '휴대폰 인증 앱으로 QR을 찍고, 앱에 나온 6자리를 넣어 주세요.',
      openApp: '인증 앱에 추가하기',
      keyLabel: '앱이 안 열리면 키 입력',
      copy: '복사',
      copied: '복사했어요',
      qrAlt: '인증 앱 등록 QR',
      apps: 'Google Authenticator, Microsoft Authenticator 같은 무료 인증 앱',
      codeLabel: '앱에 나온 6자리',
      verifyTitle: '인증 앱의 6자리를 넣어 주세요',
      autoCheck: '6자리를 다 넣으면 바로 확인해요',
      checking: '확인하고 있어요',
      errors: {
        WRONG_CODE: '숫자가 달라요. 앱에 지금 보이는 숫자로 다시 넣어 주세요.',
        FAILED: '잠시 연결이 안 돼요. 다시 시도해 주세요.',
        NO_FACTOR: '등록된 인증 앱을 찾지 못했어요. 새로 고쳐 주세요.',
      },
      retry: '다시 시도',
      lost: '휴대폰을 바꾸거나 잃어버렸으면 Supabase 관리 화면에서 인증을 지운 뒤 다시 등록해요.',
      previewNotice: '개발 미리보기예요. 123456을 넣으면 통과해요',
    },
  },

  /**
   * 복비 특약 만들기 /agent/terms (대표님 엑셀 기반, 그릴링 2026-10-25 2차): 4단계
   * ① 무엇을 만들까요(본계약 특약 / 가계약 문자) → ② 어떤 상황인가요(버튼 2~3번) → ③ 특약 고르기(고른 특약 위에, 빼기 버튼,
   * 빈 상태로 시작, 주제마다 짧은 이름 버튼을 눌러 넣고 빼기, 같은 주제는 하나만, 추천은 표시 + 한 번에 넣기) → ④ 빈칸 채우고 복사. 저장은 특약 선택·자주 쓰는 특약만 (이름·계좌·주소·동호수·빈칸 값은 저장 안 함)
   */
  brokerTerms: {
    title: '복비 특약 만들기',
    back: '뒤로',
    prev: '이전',
    stepOf: '{n}/4 단계 {label}',
    /** 머리 카드 이름 동그라미 (TermsHero, 2026-10-27 A안) */
    stepLabels: ['종류', '상황', '특약', '복사'],
    situation: '내 상황',
    /** 참고용 안내: 화면 맨 위와 복사 버튼 위 (약관 제12조 책임의 한계와 같은 취지) */
    notice: '참고용으로 만든 문구예요. 실제 계약에 맞게 확인하고 고쳐 쓰는 일은 담당 공인중개사의 몫이에요.',
    step1: {
      title: '무엇을 만들까요?',
      MAIN: { title: '본계약 특약', sub: '계약서 특약란에 붙여 넣는 문구' },
      PROVISIONAL: { title: '가계약 문자', sub: '가계약금을 보내기 전 양쪽에 보내는 문자' },
      resume: '이어서 만들기',
      resumeSub: '{kind} · {situation} · 특약 {n}개',
    },
    step2: {
      title: '어떤 상황인가요?',
      trade: { q: '어떤 거래인가요?', 매매: '매매', 전세: '전세' },
      now: { q: '지금 누가 살아요?', OWNER_SALE: '집주인 (또는 빈집)', OWNER: '집주인', TENANT: '세입자', VACANT: '빈집' },
      after: { q: '잔금 후엔요?', BUYER: '매수인이 들어와요', TENANT_STAYS: '세입자가 계속 살아요', NEW_TENANT: '새 세입자를 구해요', SELLER_STAYS: '매도인이 세입자로 계속 살아요' },
    },
    step3: {
      title: '특약 고르기',
      selected: '고른 특약',
      sectionCount: '{n}',
      /** 고른 특약 제목 줄 오른쪽 끝 (2026-10-27) → 확인 창 */
      clearAll: '전부 빼기',
      clearSheet: { title: '고른 특약 {n}개를\n모두 뺄까요?', body: '채운 빈칸도 함께 지워져요', confirm: '전부 빼기', cancel: '닫기' },
      selectedEmpty: '아래 버튼을 누르면 여기에 쌓여요',
      /** 빈 상태로 시작 (대표님 2026-10-25): 추천 특약은 표시만, 한 번에 넣기 버튼 */
      addRecommended: '추천 특약 한 번에 넣기',
      remove: '빼기',
      favorites: '자주 쓰는 특약',
      candidates: '넣을 수 있는 특약',
      added: '담김',
      add: '넣기',
      favoriteOn: '자주 쓰는 특약에 넣기',
      favoriteOff: '자주 쓰는 특약에서 빼기',
      defaultTag: '기본',
      /** 엑셀 "필수" 표시. 참고용 도구라 "추천"으로 보여 준다 (대표님 2026-10-25) */
      recommendedTag: '추천',
      provisionalCandidates: '가계약 특약 (엑셀)',
      write: '직접 쓰기',
      writePlaceholder: '넣을 특약을 써 주세요',
      writeAdd: '넣기',
      custom: '직접 쓴 특약',
      next: '빈칸 채우기',
      changeSheet: { cancel: '닫기' },
    },
    step4: {
      title: '빈칸 채우고 복사',
      address: '부동산 표시 (등기부등본 소재지를 붙여 넣어 주세요)',
      addressPlaceholder: '예: 경기도 남양주시 다산동 0000 제000동 제00층 제0000호',
      addressRef: '참고: {ref} (복비 정보)',
      blanksTitle: '빈칸 {n}곳',
      blanksSub: '비워 두면 원문 빈칸 그대로 복사돼요',
      noBlanks: '채울 빈칸이 없어요',
      notSaved: '이름·계좌·주소·빈칸에 넣은 값은 저장되지 않아요',
      placeholder: { DATE: '예: 2026년 12월 20일', MONEY: '예: 5,000만 원', TEXT: '직접 입력' },
      preview: '완성본',
      attached: '별지로 이어 쓰기 (맨 위에 "이어서 별지기재")',
      copy: '복사하기',
      copied: '복사했어요',
      copiedWithBlanks: '복사했어요. 빈칸 {b}곳이 남아 있어요',
      copyFailed: '복사하지 못했어요. 완성본을 길게 눌러 직접 복사해 주세요',
    },
    /**
     * 가계약 문자 틀 (대표님 문구 2026-10-25, 매매·전세 두 벌). {address} = 붙여 넣은 등기부 소재지, {terms} = 고른 가계약 특약 자리.
     * 빈칸 표기는 엑셀과 같게(금 원 / 20  년 월 일 / ( )). 해제·위약금 문구는 넣지 않는다
     */
    provisionalTemplate: {
      termsHeader: '[특약]',
      매매: [
        '[부동산 가계약 내용 안내 및 동의 확인]',
        '본 문자는 당사자 간 합의된 조건으로 본계약 체결 전 계약금 일부(가계약금)를 입금하기 위한 안내문입니다.',
        '1. 부동산 표시: {address}',
        '2. 계약 당사자: 매도인 ( ) / 매수인 ( )',
        '3. 거래 금액 및 지급 일정',
        '* 총 거래금액(매매가): 금 원',
        '* 가계약금: 금 원 (20  년 월 일 입금 계좌: (          ) 매도인 ( ))',
        '* 본계약금(잔여): 금 원 (본계약 체결 시 지급)',
        '* 중도금/잔금: 20  년 월 일 금 원 (상호 협의 가능)',
        '4. 본계약 체결일: 20  년 월 일 ( )시 (          )',
        '현 시설물 상태 기준이며, 권리관계(등기부등본 확인) 변동 시 계약은 무효로 하고 수령금은 즉시 반환합니다.',
        '{terms}',
        '',
        '위 내용에 동의하시면 본 문자에 "위 내용에 모두 동의합니다"라고 회신해 주시기 바랍니다.',
      ],
      전세: [
        '[부동산 가계약 내용 안내 및 동의 확인]',
        '본 문자는 당사자 간 합의된 조건으로 본계약 체결 전 계약금 일부(가계약금)를 입금하기 위한 안내문입니다.',
        '1. 부동산 표시: {address}',
        '2. 계약 당사자: 임대인 ( ) / 임차인 ( )',
        '3. 거래 금액 및 지급 일정',
        '* 총 거래금액(보증금): 금 원',
        '* 가계약금: 금 원 (20  년 월 일 입금 계좌: (          ) 임대인 ( ))',
        '* 본계약금(잔여): 금 원 (본계약 체결 시 지급)',
        '* 잔금: 20  년 월 일 금 원 (상호 협의 가능)',
        '4. 본계약 체결일: 20  년 월 일 ( )시 (          )',
        '현 시설물 상태 기준이며, 권리관계(등기부등본 확인) 변동 시 계약은 무효로 하고 수령금은 즉시 반환합니다.',
        '{terms}',
        '',
        '위 내용에 동의하시면 본 문자에 "위 내용에 모두 동의합니다"라고 회신해 주시기 바랍니다.',
      ],
    },
    gate: '가입이 승인된 중개사만 쓸 수 있어요',
    gateCta: '가입 상태 보기',
    officeMenu: '복비 특약 만들기',
    /** 숫자는 terms.json과 같아야 함 (specialTermsCopy.test가 확인, 엑셀을 고치면 같이) */
    officeMenuSub: '9가지 상황별 특약 문구 136개 총정리',
    listingShortcut: '이 매물로 특약 만들기',
  },

  /**
   * "잘해요" 강점 칩 (2026-10-25 개편, 대표님 A안): 중개사가 최대 3개 고르고, 계약한 집주인이 후기에서
   * 짝이 되는 후기 칩(endorsedBy)을 고르면 "인정 n"이 쌓인다. 누구나 하는 조건(주말 안내 가능 등)은 conditions로 따로.
   * 요청 시트 "이 매물에 추천"은 lib/broker/feed.ts recommendedStrengths 고정 규칙.
   * 자유 글 없음(연락처를 숨겨 넣지 못하게), 사람 속성·확인 배지와 겹치는 사실·단지명 금지 (근거: docs/handover/broker-chips-research.md §3)
   */
  brokerStrengths: {
    max: 3,
    groups: [
      { label: '판매·홍보', chips: ['시세를 잘 알아요', '손님을 잘 데려와요', '사진을 잘 찍어요', '집 장점을 잘 살려요', '광고를 정성껏 올려요'] },
      {
        label: '협상·계약',
        chips: ['가격 조율을 잘해요', '집주인 편에서 협상해요', '계약을 빨리 끝내요', '서류를 꼼꼼히 챙겨요', '잔금까지 챙겨요', '권리관계 꼼꼼히 봐요'],
      },
      { label: '소통', chips: ['연락이 빨라요', '진행 상황 자주 알려요', '손님 반응을 알려줘요', '쉽게 설명해요', '정직하게 말해요'] },
      { label: '방문·일정', chips: ['일정을 잘 맞춰요', '방문 전 꼭 연락해요', '세입자와 잘 조율해요'] },
      { label: '잘 아는 분야', chips: ['세금·대출까지 알려줘요', '세입자 낀 매매 잘해요', '전세 계약 꼼꼼해요'] },
    ],
    /** 강점 칩 → 짝이 되는 후기 칩 (myRequests.contracted.reviewChipGroups). 집주인이 이 후기 칩을 고르면 "인정" */
    endorsedBy: {
      '시세를 잘 알아요': '시세를 잘 알아요',
      '손님을 잘 데려와요': '손님을 잘 데려와요',
      '사진을 잘 찍어요': '사진을 잘 찍어요',
      '집 장점을 잘 살려요': '집 장점을 잘 살려요',
      '광고를 정성껏 올려요': '광고를 정성껏 올려요',
      '가격 조율을 잘해요': '가격 조율을 잘해요',
      '집주인 편에서 협상해요': '내 입장에서 협상해요',
      '계약을 빨리 끝내요': '계약이 빨랐어요',
      '서류를 꼼꼼히 챙겨요': '서류를 꼼꼼히 챙겨요',
      '잔금까지 챙겨요': '잔금까지 챙겨줘요',
      '권리관계 꼼꼼히 봐요': '권리관계를 꼼꼼히 봐줬어요',
      '연락이 빨라요': '연락이 빨라요',
      '진행 상황 자주 알려요': '진행 상황을 자주 알려줘요',
      '손님 반응을 알려줘요': '손님 반응을 알려줘요',
      '쉽게 설명해요': '어려운 말 없이 쉬워요',
      '정직하게 말해요': '정직하게 말해줘요',
      '일정을 잘 맞춰요': '일정을 잘 맞춰줘요',
      '방문 전 꼭 연락해요': '방문 전 꼭 연락해요',
      '세입자와 잘 조율해요': '세입자와 잘 조율해줬어요',
      '세금·대출까지 알려줘요': '세금·대출까지 알려줘요',
      '세입자 낀 매매 잘해요': '세입자 낀 집도 잘 팔았어요',
      '전세 계약 꼼꼼해요': '전세 계약을 꼼꼼히 챙겨줘요',
    } as Record<string, string>,
    /** 가능한 것 (조건, 여러 개): 강점과 따로 한 줄로 보여 준다 */
    conditions: ['주말 안내 가능', '저녁 안내 가능', '집주인 없이 안내 가능', '전자계약 가능', '카톡 상담 가능', '영상 촬영 가능'],
    /** 집주인 익명 카드 */
    card: { selfNote: '중개사가 고른 잘하는 점이에요', endorsed: '인정 {n}', conditions: '가능' },
  },

  /**
   * 실제 거래금액과 다시 계산한 복비 (lib/deal/dealFee.ts, 대표님 확정 2026-10-26):
   * 복비 = 실제 거래금액의 법정 상한 × 합의 비율. 중개사가 가계약·계약을 알릴 때 넣고 집주인이 맞아요로 확인
   */
  dealPrice: {
    label: '실제 거래금액',
    unit: '만 원',
    asking: '희망가 {price}',
    preview: '법정 상한 {max}({rate})의 {pct}% → 복비 {fee}',
    same: '희망가 그대로예요 · 합의 복비 {fee}',
    errors: { EMPTY: '거래금액을 넣어 주세요', OUT_OF_RANGE: '희망가와 차이가 너무 커요. 금액을 다시 확인해 주세요' },
    /** 집주인 확인 카드·거래 페이지 집 정보 한 줄 */
    confirmLine: '거래금액 {price} → 복비 {fee} (법정 상한의 {pct}%)',
    infoLine: '거래금액 {price} · 복비 {fee}',
    /** 약속·동의 화면 예시 표 (dealFee.ts FEE_RULE_EXAMPLES, 금액은 계산) */
    rule: {
      /**
       * [중개사 가입 약속 시트] 예시 하나를 세 줄로 + 칩 4개로 바꿔 보기 (대표님 2026-10-28: 표 대신 직관적으로).
       * chips 순서 = dealFee.FEE_RULE_EXAMPLES 순서. 금액은 모두 feeRuleExample 계산값
       */
      headline: '금액이 아니라 비율을 지켜요',
      chips: ['값이 내려가면', '9억 아래로 팔리면', '9억 넘게 팔리면', '전세'],
      agreedLine: '{type} {price} 집을\n상한 {max}의 {pct}%로 합의 = {fee}',
      actualLine: '실제로는 {price}에 {verb}',
      verb: { 매매: '팔렸어요', 전세: '계약했어요' },
      resultLine: '상한 {max}의 {pct}% = {fee}',
      rateLine: '법정 요율이 {from}에서 {to}로 바뀌어 상한도 바뀌어요. {pct}%는 그대로예요',
      note: '천 원 미만은 버려요.',
      /**
       * [집주인 매칭 모달] 내 요청으로 계산한 표 (대표님 2026-10-26: 고정 예시 대신 내 집 숫자로).
       * 할인율은 분석 화면·미리보기와 같은 discountPct. 줄은 dealFee.personalFeeScenarios
       */
      personal: {
        title: '다른 금액에 팔려도 할인율 {pct}%는 그대로예요',
        /**
         * 칩 + 세 줄 (대표님 2026-10-28: 가입 예시와 같은 틀). 할인율은 반올림 표시라 셋째 줄은 "같은 할인율로" —
         * 금액은 personalFeeScenarios 계산값 그대로 (화면 숫자로 다시 곱하지 않음)
         */
        askingChip: '희망가',
        line1: '희망가 {price} · 상한 {max}\n제안한 복비 {fee} (할인율 {pct}%)',
        line2: { 매매: '실제로 {price}에 팔리면', 전세: '실제로 {price}에 계약하면' },
        line2Asking: { 매매: '희망가 그대로 팔리면', 전세: '희망가 그대로 계약하면' },
        line3: '상한 {max}에서 같은 할인율로 = {fee}',
        /** 희망가 ±15% 안에 요율 경계가 있을 때만 (nearestBracketShift) */
        shiftDown: '{price}보다 낮게 팔리면 법정 요율이 {from}에서 {to}로 바뀌어요. 할인율 {pct}%는 그대로 두고 바뀐 요율로 다시 계산해요.',
        shiftUp: '{price} 이상에 팔리면 법정 요율이 {from}에서 {to}로 바뀌어요. 할인율 {pct}%는 그대로 두고 바뀐 요율로 다시 계산해요.',
        note: '천 원 미만은 버려요.',
      },
    },
  },

  /**
   * 휴대폰 캘린더에 저장 (⑤ 방문 일정, ⑥ 계약일·잔금일도 같이 씀, 대표님 2026-10-25)
   * 푸시·문자가 없어 알림은 휴대폰 캘린더가 대신한다. 구글 링크에는 제목·시간만 (주소창에 실려 구글로 넘어감)
   */
  calendar: {
    button: '캘린더에 저장',
    sheetTitle: '어디에 저장할까요?',
    /** 구글 링크는 알림을 넣을 수 없어 그 캘린더 기본 알림을 따른다 → 휴대폰 캘린더만 1시간 전이라고 쓴다 */
    sheetSub: '휴대폰 캘린더는 1시간 전에 알려 줘요',
    /** 계약일·잔금일 같은 하루 종일 일정 (calendar.ts DEAL_DATE_ALARM_MIN) */
    sheetSubDay: '휴대폰 캘린더는 전날 오전 9시에 알려 줘요',
    saveAll: '캘린더에 모두 저장',
    phone: '휴대폰 캘린더',
    phoneSub: '아이폰 캘린더 · 삼성 캘린더',
    google: '구글 캘린더',
    close: '닫기',
    ownerVisitTitle: '{office} 방문 · 복비',
    brokerVisitTitle: '{complex} {pyeong} 방문 · 복비',
    ownerVisitMemo: '{complex} 방문\n중개사 {phone}',
    brokerVisitMemo: '{dongHo}\n집주인 {phone}',
  },

  /**
   * 중개사 승인 후 화면 /agent (Phase 5 ③, 2026-10-25). 하단 탭 3개: 새 의뢰 / 내 매물 / 내 사무소
   * 설계: docs/handover/phase5-broker-matching.md. 비용 표현(무료·0원·광고비) 금지 — brokerCopy.test.ts
   * 크레딧: 요청 1번에 1개, 매주 월요일 3개까지 채워짐, 결제 없음. "크레딧 더 받기"는 페이크 도어(한 문항 투표만, "준비 중" 표시 없이 누르게 — 대표님 2026-10-26)
   */
  brokerAgent: {
    tabs: { feed: '새 의뢰', listings: '내 매물', office: '내 사무소' },
    navLabel: '중개사 메뉴',
    gate: {
      NONE: { title: '가입한 중개사만 볼 수 있어요', body: '대표 공인중개사 확인을 마치면\n집주인이 직접 맡긴 매물을 받아요', cta: '가입하기' },
      PENDING: { title: '가입을 확인하고 있어요', body: '사무소 번호로 확인 전화를 드려요.\n승인되면 바로 의뢰를 볼 수 있어요', cta: '가입 상태 보기' },
      REJECTED: { title: '가입이 승인되지 않았어요', body: '사유를 확인하고 다시 신청해 주세요', cta: '가입 상태 보기' },
    },
    /** 맨 위는 크레딧 한 줄만. 하루 요청 제한은 없음 (대표님 2026-10-29, 크레딧 주 3개만) */
    /** 상단 크레딧 칩 (누르면 크레딧 시트) */
    summary: { credits: '크레딧' },
    /** 크레딧 칩을 누르면 뜨는 시트 (대표님 2026-10-26) */
    creditSheet: {
      title: '크레딧 {n}개',
      perRequest: '요청 1번에 1개 써요',
      refill: '{date}에 다시 {n}개가 돼요',
      /** 돌려받아 이미 3개 이상일 때 (채움은 3개보다 적을 때만) */
      refillFull: '{n}개보다 적으면 {date}에 {n}개로 채워져요',
      history: '내역 보기 · 내 사무소',
      close: '닫기',
    },
    feed: {
      title: '새 의뢰',
      sub: '동·호수와 연락처는 매칭된 뒤에 서로 공개돼요',
      /** 필터 칩 (거래 종류) */
      filters: { ALL: '전체', 매매: '매매', 전세: '전세' },
      filterCount: '{label} {n}',
      /** 섹션 (feed.ts groupFeed, 대표님 2026-10-27). 개수는 제목 옆 무채색 칩 */
      sections: { open: '요청 가능한 매물', sent: '요청 보낸 매물' },
      sectionCount: '{n}',
      /** 맨 위 회색 점 안내 */
      notice: '남은 시간이 짧은 매물이 위로 올라와요',
      /** 요청 보낸 매물 오른쪽 아래: 집주인이 고르는 기간이 끝나는 때 */
      resultIn: '{h}시간 뒤 결과',
      filterEmpty: '이 종류의 의뢰가 지금은 없어요',
      empty: '지금 받는 의뢰가 없어요',
      emptySub: '새 의뢰가 들어오면 여기에 보여요',
      hoursLeft: '{h}시간 남음',
      noCredit: { title: '크레딧이 없어요', body: '{date}에 다시 {n}개가 돼요' },
    },
    detail: {
      payoutTitle: '이 집 계약하면',
      /** 계약하면 받는 금액 (feed.ts dealEarnings, 대표님 2026-10-26 A안: 합계 + 같은 크기 두 칸). 상대방 쪽은 법정 상한이라 "최대"만 */
      earnings: {
        totalValue: '최대 {won}',
        owner: '집주인 (합의)',
        ownerRatio: '법정 상한의 {pct}%',
        other: { 매매: '매수인 (협의)', 전세: '세입자 (협의)' },
        otherValue: '최대 {won}',
        otherSub: '법정 상한까지',
        note: { 매매: '매수인 쪽은 희망가 기준 법정 상한이에요. 실제 금액은 협의로 정해요', 전세: '세입자 쪽은 희망 보증금 기준 법정 상한이에요. 실제 금액은 협의로 정해요' },
      },
      gapTitle: '갭 (매수에 필요한 금액)',
      houseTitle: '집 정보',
      moveIn: { IMMEDIATE: '즉시 입주', NEGOTIABLE: '입주 협의', DATE: '{date} 입주' },
      aircon: '시스템에어컨 {n}',
      midDoor: '중문',
      closet: '붙박이장',
      mortgageNone: '근저당 없음',
      mortgagePlan: '근저당 {plan}',
      rows: { asking: '희망가', occupancy: '점유', floor: '층', left: '요청 마감' },
      strengthsTitle: '보낼 잘하는 점',
      strengthsSub: '최대 {max}개, 집주인이 고를 때 보는 내용이에요',
      slotEmpty: '빈칸',
      removeChip: '빼기',
      fullHint: '{max}칸이 다 찼어요. 하나를 빼면 다른 칩으로 바꿀 수 있어요',
      recommendTitle: '이 매물에 추천',
      /** 분야별 접기: 여기서 칩을 바꾼다는 게 보이게 (대표님 2026-10-26) */
      allTitle: '다른 잘하는 점으로 바꾸기',
      allSub: '분야를 눌러 펼치고, 칩을 누르면 위 칸에 들어가요',
      notes: ['요청하면 크레딧 1개가 쓰이고, 선택되지 않아도 돌아오지 않아요', '선택되면 동·호수와 집주인 연락처가 공개돼요'],
      send: '요청 보내기',
      close: '닫기',
      blocked: {
        ALREADY_SENT: '이미 요청을 보냈어요',
        CLOSED: '요청 받기가 끝난 의뢰예요',
        TODO_FIRST: '먼저 끝내야 할 일을 마치면 보낼 수 있어요',
        NO_CREDIT: '크레딧이 없어요. 월요일에 3개 채워져요',
      },
      sentToast: '요청을 보냈어요. 집주인이 고르면 내 매물에서 알려 드려요',
    },
    listings: {
      /** 맨 위 고정 안내 두 줄 (대표님 2026-10-27: TODO_FIRST 잠금을 잠기기 전에 미리 알림) */
      notice: ['지금 할 일이 맨 위로 올라와요', '할 일을 마치지 않으면 새 요청을 잠시 보낼 수 없어요'],
      /** 빨강 할 일 = 긴급 알림 상자, 노랑 = 아래 흰 줄 섹션 (2026-10-27) */
      urgentTitle: '지금 할 일이 {n}건 있어요',
      /** 상자 이유 줄: 기한 지난 일(새 요청 잠금 대상)이 있을 때만 */
      urgentLock: '마치지 않으면 새 요청을 잠시 보낼 수 없어요',
      urgentGo: '지금 하기',
      todoTitle: '곧 할 일',
      progressTitle: '진행 중 매물',
      sectionCount: '{n}',
      /** 진행 중 카드 광고 상태 알약 (집주인 카드와 같은 모양, 문구만 중개사 쪽) */
      adPill: {
        LIVE: '광고 중 · {day}일째',
        PENDING: '광고 등록 · {h}시간 남음',
        OVERDUE: '광고 기한이 지났어요',
        PAUSED: '집주인이 판매를 잠시 멈췄어요',
        CHECKING: '소유자 확인 중 · 광고 시간 멈춤',
      },
      dealButton: '거래 진행 상황',
      /** 집주인이 고르는 중인 요청만 (끝난 요청은 내 사무소 "지난 요청", 2026-10-27) */
      sentTitle: '결과 기다리는 요청',
      pastHint: "끝난 요청은 내 사무소 '지난 요청'에서 30일 동안 볼 수 있어요",
      empty: '아직 보낸 요청이 없어요',
      /** 보낸 적은 있지만 모두 끝났을 때 */
      waitingEmpty: '결과를 기다리는 요청이 없어요',
      emptySub: '새 의뢰에서 요청을 보내 보세요',
      status: {
        WAITING: '기다리는 중',
        SELECTED: '선택됐어요',
        NOT_SELECTED: '선택되지 않았어요',
        CLOSED: '마감됐어요',
        STOPPED: '의뢰가 멈췄어요',
        RELEASED: '매칭이 해제됐어요',
      },
      releasedSub: '광고 기한을 넘겨 집주인이 해제했어요',
      waitingSub: '집주인이 고르는 중 · {h}시간 남음',
      stoppedSub: '허위 매물로 확인돼 크레딧 1개를 돌려받았어요',
      sentAt: '{date} 요청',
    },
    /** 선택된 매물 관리 (Phase 5 ④): 공개 정보 → 소유자 확인 → 광고 링크 48시간 */
    listing: {
      back: '뒤로',
      revealedTitle: '공개된 정보',
      revealedSub: '이 정보는 집주인이 고른 중개사만 볼 수 있어요',
      dongHo: '동·호수',
      owner: '집주인',
      tenant: '세입자',
      call: '전화',
      visitMemo: '방문 안내',
      optionMemo: '옵션 메모',
      deadline: { PENDING: '광고 등록 {h}시간 남음', OVERDUE: '광고 기한이 지났어요. 집주인이 매칭을 해제할 수 있어요', PAUSED: '집주인이 판매를 잠시 멈췄어요', LIVE: '광고 중 · {day}일째' },
      ownerCheck: {
        title: '소유자 확인',
        notice: '광고 시작 전에 등기부등본으로 소유자 확인을 먼저 진행해 주세요.',
        confirm: '소유자 확인했어요',
        differ: '소유자가 달라요',
        callGuide: '집주인에게 전화로 확인해 주세요',
        callOwner: '집주인에게 전화',
        callDone: '확인됐어요',
        fake: '허위 매물 같아요',
        done: { CONFIRMED: '소유자 확인 완료', CALL_CONFIRMED: '집주인 전화 확인 완료' },
      },
      ad: {
        title: '광고 등록',
        sub: '네이버 부동산 매물 링크나 매물번호를 붙여 넣어 주세요',
        placeholder: '예: https://fin.land.naver.com/articles/…',
        submit: '광고 등록',
        invalid: '네이버 부동산 매물 링크나 8~12자리 매물번호를 넣어 주세요',
        live: '광고 중',
        openLink: '광고 보기',
        change: '링크 바꾸기',
        lockedHint: '소유자 확인을 마치면 등록할 수 있어요',
      },
      /** 광고 기한을 넘겼을 때: 정해진 칩으로 늦어진 이유를 알림 (자유 글 없음, 집주인 해제 버튼 옆에 보임) */
      delay: {
        title: '집주인에게 늦어진 이유 알리기',
        sub: '집주인 화면의 해제 버튼 옆에 보여요',
        reasons: { PHOTO: '사진 촬영 일정 잡는 중', TODAY: '오늘 안에 올릴게요', OWNER_CHECK: '소유자 확인 중' },
        sent: '집주인 화면에 보이고 있어요',
      },
      fakeSheet: {
        title: '허위 매물로 알릴까요?',
        /** 사실대로 (fakeReport.ts): 이 집 일만 멈춤 + 광고 시간 멈춤, 확인되면 환불, 아니면 남은 시간부터 다시 */
        body: '운영팀이 집주인에게 확인할 때까지 이 집 일과 광고 시간이 멈춰요. 허위 매물로 확인되면 크레딧 1개를 돌려드려요. 아니면 남은 시간부터 다시 시작하고, 크레딧은 돌려드리지 않아요.',
        confirm: '알리기',
        cancel: '취소',
      },
      reported: {
        PENDING: '허위 매물로 알렸어요. 운영팀이 확인하고 있어요',
        pendingSub: '확인하는 동안 광고 시간은 멈춰 있어요',
        CONFIRMED: '의뢰가 멈췄어요. 크레딧 1개를 돌려받았어요',
        /** 반려 뒤 소유자 확인 카드 위 한 줄 */
        REJECTED: '운영팀 확인 결과 거래할 수 있는 매물이에요',
      },
      /** ⑤ 방문 일정 (대표님 2026-10-25): 전화로 정한 시간을 저장 → 집주인 화면에 보임. 다른 중개사 일정은 누구인지 숨김 */
      visit: {
        title: '방문 일정',
        availability: '방문 가능 시간',
        availabilityEmpty: '집주인이 아직 방문 가능 시간을 정하지 않았어요',
        guide: '통화로 정한 시간을 저장하면 집주인 화면에 보여요',
        callOwner: '집주인에게 전화',
        callTenant: '세입자에게 전화',
        tenantGuide: '세입자가 살고 있어요. 세입자에게 연락해 정해 주세요',
        tenantSaveGuide: '정한 시간을 저장하면 내 캘린더에 넣을 수 있어요',
        add: '방문 일정 저장',
        pickDate: '날짜',
        pickHour: '시간',
        today: '오늘',
        ownerOpen: '방문 가능',
        taken: '다른 방문',
        mine: '내 방문',
        save: '{date} {hour}시로 저장',
        cancelPick: '닫기',
        errors: {
          PAST: '지난 시간은 저장할 수 없어요',
          TOO_FAR: '오늘부터 7일 안의 날짜만 저장할 수 있어요',
          CLOSED_HOUR: '10시~21시 사이로 골라 주세요',
          TAKEN: '그 시간에는 다른 방문이 있어요',
          LIMIT: '앞으로 잡아 둘 수 있는 방문은 2개까지예요',
        },
        paused: '집주인이 판매를 잠시 멈춰서 지금은 저장할 수 없어요',
        mineTitle: '내 방문',
        empty: '아직 저장한 방문 일정이 없어요',
        history: '지난·취소된 일정 {n}건',
        canceled: '취소됨',
        past: '지난 방문',
        canceledBy: { OWNER: '집주인이 취소', BROKER: '내가 취소', SYSTEM: '집주인이 다른 곳과 진행해 취소' },
        /** 시스템 취소 중 거둬들이기 (cancelReason WITHDRAWN) */
        canceledWithdrawn: '집주인이 매물을 거둬들여 취소',
        canceledPaused: '집주인이 판매를 잠시 멈춰 취소',
        canceledNotice: '취소된 일정이에요. 휴대폰 캘린더에서도 지워 주세요',
        ack: '확인',
        cancel: '취소',
        cancelSheet: {
          title: '취소는 전화로 알려 주세요',
          body: '전화를 걸면 이 일정은 취소돼요.\n휴대폰 캘린더에 저장했다면 거기서도 지워 주세요',
          confirm: '전화하고 취소하기',
          close: '닫기',
        },
      },
    },
    office: {
      regNo: '등록번호 {regNo}',
      creditsTitle: '크레딧',
      creditsBalance: '{n}개',
      /** 채움 안내 (대표님 2026-10-26: 날짜가 박힌 문구) */
      creditsRule: '요청 1번에 1개 · {date}에 다시 {n}개가 돼요',
      /** 돌려받아 이미 3개 이상일 때 (채움은 3개보다 적을 때만, credits.ts refillWeekly) */
      creditsRuleFull: '요청 1번에 1개 · {n}개보다 적으면 {date}에 {n}개로 채워져요',
      historyEmpty: '아직 내역이 없어요',
      history: { WEEKLY: '매주 채움', SPEND: '요청 보냄', REFUND: '돌려받음' },
      /** 돌려받은 이유 (credits.ts CreditEvent.reason). 이유가 없는 예전 기록은 history.REFUND */
      refundReason: { FAKE: '허위 매물 확인으로 돌려받음', DEAL: '거래 완료로 돌려받음' },
      /** 내역 아랫줄: 어느 의뢰였는지 (보낸 요청 기록에서) */
      historyDetail: '{complex} {pyeong} · {won}',
      /** 내역은 기본으로 접혀 있고 이 줄을 눌러 펼친다 */
      historyMore: '내역 {n}건',
      /** 끝난 보낸 요청 (선택 안 됨·마감·허위 매물 멈춤·해제), 보낸 날부터 30일 (lib/broker/pastRequests, 2026-10-27) */
      pastNote: '끝난 요청은 보낸 날부터 30일 동안 보여요',
      pastEmpty: '끝난 요청이 아직 없어요',
      pastSent: '{date} 요청',
      ceo: '대표 {name}',
      strengthsTitle: '잘하는 점',
      strengthsEdit: '수정',
      /** 후기 10개 전: 잠긴 칸 (strengthSlots.ts BONUS_SLOT_REVIEWS) */
      strengthsLocked: '후기 {n}개면 1칸 더',
      conditionsTitle: '가능',
      /**
       * 약속 레벨 (2026-10-27 대표님: "약속 이행"은 올드 → 레벨). 규칙은 그대로 stage.ts promiseLevel = promiseTier(0~3) + 1 = 레벨 1~4.
       * 칩 글자는 이 키 하나로 세 화면(내 사무소·집주인 익명 카드·가입 약속)이 같이 쓴다 (common/PromiseLevel, 2026-10-29 A안)
       */
      level: '약속 레벨 {lv}',
      /** 다음 레벨까지 남은 거래 수. 최고 레벨이면 levelMax */
      levelNext: '거래 {n}건을 합의한 복비로 마치면 약속 레벨 {lv}',
      levelMax: '가장 높은 약속 레벨이에요',
      /** 레벨이 오르는 기준 (막대 아래 작은 글자) */
      levelRule: '합의한 복비로 계약하고 계약일·잔금일을 직접 알린 거래 {kept}건',
      /** 내 사무소 섹션 제목 (2026-10-27) */
      sections: { performance: '이번 달 내 성과', terms: '복비 특약', credits: '크레딧', past: '지난 요청' },
      /** 이번 달 내 성과 + 집주인이 인정한 장점 (대표님 2026-10-29 중개사 화면 A안) */
      performance: { sent: '요청 보냄', picked: '집주인이 고름', contracted: '계약', fee: '계약 보수 {won}', feeNone: '계약하면 보수가 여기 모여요' },
      endorsedTitle: '집주인이 인정한 장점',
      endorsedEmpty: '계약한 집주인이 후기를 남기면 고른 장점이 여기 모여요',
      endorsedCount: '{n}',
      rating: '별점 {avg} · 후기 {n}개',
      ratingNone: '후기 아직 없어요',
      /** 잘하는 점 고치기 시트 */
      edit: {
        title: '잘하는 점 고치기',
        sub: '최대 {max}개, 요청을 보낼 때 먼저 채워져요. 보낸 요청은 바뀌지 않아요',
        save: '저장',
        close: '닫기',
        saved: '저장했어요',
      },
    },
    moreCredits: {
      button: '크레딧 더 받기',
      title: '어떤 방법이 좋으세요?',
      sub: '크레딧을 더 받는 방법을 준비하고 있어요',
      options: { WATCH_AD: '광고 보고 받기', REFER_OFFICE: '사무소 소개하고 받기', ENOUGH: '지금도 충분해요' },
      submit: '보내기',
      close: '닫기',
      thanks: '의견 고마워요. 열리면 알려 드릴게요',
    },
    /** [새 의뢰 맨 위] 기한 지난 할 일이 있으면 요청 보내기만 잠금 (대표님 2026-10-26, deal.isBlocking) */
    /** 새 의뢰 맨 위 긴급 알림 상자 (UrgentAlert, 대표님 2026-10-27: 급해 보여야 흐름이 돈다) */
    todoFirst: {
      title: '먼저 끝내야 할 일이 {n}건 있어요',
      sub: '끝내면 새 의뢰에 요청을 보낼 수 있어요',
      go: '지금 하기',
    },
    /** 테스트 스위처 (배포 전 제거) */
    qa: {
      title: '테스트용 화면 바꾸기 (배포 전 삭제)',
      approve: '승인된 예시로 보기',
      noCredit: '크레딧 0개',
      ownerPicksMe: '집주인이 내 요청 고름',
      ownerPicksOther: '집주인이 다른 곳 고름',
      nextWeek: '다음 주 채움',
      reset: '저장소 비우기',
      ownerScreen: '집주인 내 의뢰 화면',
      signup: '가입 화면',
      noWaiting: '기다리는 요청이 없어요. 먼저 요청을 보내 주세요',
      adOverdue: '광고 기한 지남',
      adminConfirmFake: '운영팀: 허위 매물 맞음',
      adminRejectFake: '운영팀: 허위 매물 아님',
      ownerReleases: '집주인이 매칭 해제',
      noReport: '신고한 매물이 없어요',
      otherVisit: '다른 중개사 방문 일정 있음',
      ownerCancelsVisit: '집주인이 방문 취소',
      noVisit: '저장한 방문 일정이 없어요',
      ownerYes: '집주인 맞아요',
      ownerNo: '집주인 아니에요',
      datesToday: '날짜를 오늘로',
      elsewhere: '다른 곳 가계약 확인',
      ownerSoldElsewhere: '집주인이 다른 곳에서 팔았어요',
      ownerWithdraws: '집주인이 거둬들임',
      ownerPauses: '집주인이 잠시 멈춤',
      ownerPausedLate: '멈춘 지 하루 지남',
      ownerResumes: '집주인이 다시 시작',
      noPending: '확인을 기다리는 보고가 없어요',
      noDeal: '선택된 매물이 없어요',
      ownerReview: '집주인 후기 등록',
      noDone: '잔금까지 끝난 거래가 없어요',
    },
  },

  /**
   * 거래 페이지 (그릴링 2026-10-25, 규칙 src/lib/deal/deal.ts). 집 하나 × 중개사 하나 = 페이지 하나:
   * 맨 위 집 정보 한 줄 → 기록 → 지금 할 일 카드 → 바로가기. 목록 카드엔 색 띠.
   * 중개사가 알리고 집주인이 맞아요/아니에요. 금지어 검사 대상 (brokerCopy.test.ts)
   */
  brokerDeal: {
    info: { more: '집 정보·메모 펼치기', less: '접기' },
    /** 목록 카드 "새 소식" 줄 (마지막으로 거래 페이지를 연 뒤 상대가 남긴 기록, 대표님 2026-10-26) */
    news: { badge: '새 소식', badgeCount: '새 소식 {n}' },
    timelineTitle: '기록',
    /** 거래 페이지 머리 카드 (대표님 2026-10-27 A안, lib/deal/dealStep.ts): 집주인·중개사 같은 틀 */
    hero: {
      stepLabels: ['매칭', '광고', '계약', '잔금', '후기'],
      stepOf: '거래 {n}단계 {label}',
      hint: { OWNER: '중개사가 알린 일은 내가 확인해야 기록이 확정돼요', BROKER: '알린 일은 집주인이 확인해야 기록이 확정돼요' },
    },
    /** 합의 확인서 (영수증 모양, lib/deal/dealFee.ts로 계산) */
    receipt: {
      title: '합의 확인서',
      asking: '희망가',
      legalMax: '법정 상한 ({rate})',
      ratio: '합의 비율',
      ratioValue: '법정 상한의 {pct}%',
      fee: '합의 복비',
      rule: '거래금액이 바뀌면 같은 비율로 다시 계산해요',
      actual: '실제 거래금액 {price}',
      pending: '알린 거래금액 {price} · 확인 전',
      example: '예: {price}에 거래되면',
      feeArrow: '복비 {fee}',
    },
    timeline: {
      MATCHED: '매칭됐어요',
      OWNER_CHECKED: { CONFIRMED: '소유자 확인 완료', CALL_CONFIRMED: '집주인 전화로 소유자 확인' },
      AD_POSTED: '광고 올렸어요',
      adLink: '광고 보기',
      VISIT: '방문 {date} {hour}시',
      visitCanceled: '취소됨',
      visitDone: '끝남',
      REPORTED: { PROVISIONAL: '가계약을 알렸어요', CONTRACT: '계약 완료를 알렸어요', BALANCE: '잔금 완료를 알렸어요', BROKEN: '해제를 알렸어요' },
      ANSWERED_YES: {
        PROVISIONAL: '집주인이 가계약을 확인했어요',
        CONTRACT: '집주인이 계약을 확인했어요',
        BALANCE: '집주인이 잔금 완료를 확인했어요',
        BROKEN: '집주인이 해제를 확인했어요',
      },
      ANSWERED_NO: '집주인이 아니라고 했어요',
      DATE_SET: '{field} {to}',
      DATE_CHANGED: '{field} {from} → {to}',
      DATE_CLEARED: '{field} 없음',
      AD_REMOVED: '광고 내렸어요',
      OWNER_DECLARED: { PROVISIONAL: '집주인이 가계약을 알렸어요', CONTRACT: '집주인이 계약을 알렸어요' },
      /** 복비 안 다른 중개사 계약·집주인이 "다른 곳에서 팔았어요" 모두 이 한 줄 (블라인드: 어디인지 구별하지 않음) */
      CLOSED_ELSEWHERE: '집주인이 다른 곳과 진행했어요',
      OWNER_WITHDRAWN: '집주인이 매물을 거둬들였어요',
      OWNER_PAUSED: '집주인이 판매를 잠시 멈췄어요',
      OWNER_RESUMED: '집주인이 판매를 다시 시작했어요',
      /** 매칭 뒤 희망가 바꾸기 (2026-10-27): 복비는 합의 비율 그대로 다시 계산 → 광고 가격도 바꿔야 함 */
      PRICE_CHANGED: '집주인이 희망가를 {price}으로 바꿨어요 · 복비 {fee} (합의 비율 그대로). 광고 가격도 바꿔 주세요',
      /** 허위 매물 신고 (fakeReport.ts): 양쪽 화면 같은 말 */
      OWNER_CHECK_ASKED: '운영팀이 소유자 확인을 시작했어요',
      OWNER_CHECK_OK: '운영팀 확인 결과 거래할 수 있는 매물이에요',
      FAKE_CONFIRMED: '운영팀이 허위 매물로 확인해 의뢰가 끝났어요',
      FEE_ANSWER: { true: '집주인: 합의한 복비 그대로 계약했어요', false: '집주인: 복비가 합의와 달라졌어요' },
      /** 복비가 달라진 사유 (집주인이 고른 칩, 기타 글은 중개사에게 안 보임) */
      feeReason: { AGREED: '서로 합의해 조정', OVERCHARGED: '합의보다 더 요구', OTHER: '기타' },
      REVIEW: '집주인이 후기를 남겼어요',
    },
    /** 집주인 화면 기록: 같은 사실을 집주인 쪽 말로 (없는 키는 위 timeline 문구) */
    timelineOwner: {
      AD_POSTED: '중개사가 광고를 올렸어요',
      OWNER_CHECKED: { CONFIRMED: '중개사가 소유자 확인을 마쳤어요', CALL_CONFIRMED: '중개사가 전화로 소유자를 확인했어요' },
      REPORTED: {
        PROVISIONAL: '중개사가 가계약을 알렸어요',
        CONTRACT: '중개사가 계약 완료를 알렸어요',
        BALANCE: '중개사가 잔금 완료를 알렸어요',
        BROKEN: '중개사가 해제를 알렸어요',
      },
      ANSWERED_YES: { PROVISIONAL: '가계약을 확인했어요', CONTRACT: '계약을 확인했어요', BALANCE: '잔금 완료를 확인했어요', BROKEN: '해제를 확인했어요' },
      ANSWERED_NO: '아니라고 알렸어요',
      AD_REMOVED: '중개사가 광고를 내렸어요',
      OWNER_DECLARED: { PROVISIONAL: '가계약을 알렸어요', CONTRACT: '계약을 알렸어요' },
      CLOSED_ELSEWHERE: '다른 곳과 진행했어요',
      OWNER_WITHDRAWN: '매물을 거둬들였어요',
      OWNER_PAUSED: '판매를 잠시 멈췄어요',
      OWNER_RESUMED: '판매를 다시 시작했어요',
      PRICE_CHANGED: '희망가를 {price}으로 바꿨어요 · 복비 {fee}',
      FEE_ANSWER: { true: '합의한 복비 그대로라고 답했어요', false: '복비가 달라졌다고 답했어요' },
      REVIEW: '후기를 남겼어요',
    },
    fields: { CONTRACT: '계약일', MIDDLE: '중도금일', BALANCE: '잔금일' },
    nextLabel: '지금 할 일',
    next: {
      POST_AD: {
        title: '네이버 광고 등록',
        left: '{h}시간 남음',
        OVERDUE: '광고 기한이 지났어요',
        PAUSED: '집주인이 판매를 잠시 멈췄어요',
        pausedSub: '다시 시작하면 그때부터 48시간 안에 광고를 올려 주세요',
      },
      VISITS_AND_DEAL: { title: '방문 후 가계약을 알려 주세요', sub: '방문 일정은 전화로 정한 뒤 저장해요' },
      WAIT_OWNER: {
        title: { PROVISIONAL: '가계약을 알렸어요', CONTRACT: '계약 완료를 알렸어요', BALANCE: '잔금 완료를 알렸어요', BROKEN: '해제를 알렸어요' },
        sub: '집주인 확인을 기다리고 있어요',
      },
      CALL_OWNER: { title: '집주인이 아니라고 했어요', sub: '전화로 확인한 뒤 다시 알려 주세요' },
      SET_DATES: {
        title: '날짜를 넣어 주세요',
        sub: '한 번에 넣어도 되고, 정해지는 대로 하나씩 넣어도 돼요',
        declared: { PROVISIONAL: '집주인이 가계약을 알렸어요', CONTRACT: '집주인이 계약을 알렸어요' },
      },
      SAVE_CALENDAR: { title: '날짜가 정해졌어요', sub: '캘린더에 저장해 두면 잊지 않아요' },
      CONTRACT_DAY: { 0: '오늘 계약하는 날이에요', 1: '내일 계약하는 날이에요', passed: '계약일이 지났어요' },
      BALANCE_DAY: { 0: '오늘 잔금 날이에요', 1: '내일 잔금 날이에요', passed: '잔금일이 지났어요' },
      dayPassedSub: '끝났다면 알려 주세요. 날짜가 바뀌었다면 날짜를 바꿔 주세요',
      UNTIL_CONTRACT: { title: '계약일 {date}', sub: '계약하는 날 챙길 서류를 미리 알려 드릴게요' },
      UNTIL_BALANCE: { title: '잔금일 {date}', sub: '잔금 날 챙길 서류를 미리 알려 드릴게요' },
      WAIT_REVIEW: { title: '거래가 끝났어요', sub: '집주인 후기가 등록되면 크레딧 1개를 돌려받아요' },
      CREDIT_RETURNED: { title: '크레딧 1개를 돌려받았어요', sub: '집주인 후기가 등록됐어요. 수고하셨어요' },
      /**
       * 광고 내려 주세요 (다른 곳과 진행·집주인이 끝냄·잠시 멈춤). 기한 24시간(deal.REMOVE_AD_HOURS)과 이유를 처음부터.
       * 이유는 사실만 (공인중개사법 부당 표시·광고, 네이버 허위 매물 신고) — 조항·금액은 화면에 쓰지 않음
       */
      REMOVE_AD: {
        title: '집주인이 다른 곳과 진행했어요',
        pausedTitle: '집주인이 판매를 잠시 멈췄어요',
        left: '{h}시간 남음',
        late: '광고 내림 기한이 지났어요',
        why: '24시간 안에 네이버 광고를 내려 주세요. 거래할 수 없는 매물을 광고에 두면 허위 매물로 신고될 수 있어요.',
        lockNote: '기한이 지나면 광고를 내릴 때까지 새 요청을 보낼 수 없어요.',
      },
      CLOSED: { title: '다른 곳과 진행된 매물이에요', sub: '광고를 내렸다면 더 할 일은 없어요' },
      /** 운영팀이 허위 매물로 확인해 끝난 의뢰 (매칭된 곳 모두 크레딧 1개씩 돌려받음) */
      CLOSED_FAKE: { title: '허위 매물로 확인돼 의뢰가 끝났어요', sub: '이 의뢰에 쓴 크레딧 1개를 돌려받았어요' },
      RELEASED: { title: '매칭이 해제됐어요', sub: '광고 기한을 넘겨 집주인이 해제했어요' },
      ENDED_BROKEN: { title: '거래가 해제됐어요', sub: '기록은 그대로 남아요' },
    },
    dday: 'D-{n}',
    buttons: {
      visit: '방문 일정 저장',
      provisional: '가계약 했어요',
      contractDirect: '가계약 없이 계약했어요',
      contract: '계약 완료했어요',
      balance: '잔금 끝났어요',
      broken: '해제됐어요',
      setDates: '날짜 넣기',
      changeDates: '날짜 바꾸기',
      adRemoved: '광고 내렸어요',
      callOwner: '집주인에게 전화',
      reportAgain: { PROVISIONAL: '가계약 다시 알리기', CONTRACT: '계약 완료 다시 알리기', BALANCE: '잔금 완료 다시 알리기', BROKEN: '해제 다시 알리기' },
    },
    shortcuts: { title: '자주 쓰는 것', visits: '방문 일정', dates: '날짜', terms: '특약 만들기', adLink: '광고 링크' },
    reportSheet: {
      title: { PROVISIONAL: '가계약을 알릴까요?', CONTRACT: '계약 완료를 알릴까요?', BALANCE: '잔금 완료를 알릴까요?', BROKEN: '해제를 알릴까요?' },
      confirm: '알리기',
      cancel: '닫기',
    },
    /** 확인 창 줄 (deal.ts consequences 키). 집주인용은 ④에서 씀 */
    consequences: {
      OWNER_WILL_CONFIRM: '집주인이 확인하면 기록이 확정돼요',
      DATES_LATER_OK: '날짜는 지금 넣어도 되고 나중에 넣어도 돼요',
      CHECK_DATES: '날짜를 확인해 주세요: 계약일 {contract} · 잔금일 {balance}',
      CHECK_DATES_NO_BALANCE: '날짜를 확인해 주세요: 계약일 {contract} (잔금일은 나중에 넣어도 돼요)',
      AFTER_CONFIRM_DONE: '집주인이 확인하면 거래가 끝나요',
      AFTER_CONFIRM_ENDS: '집주인이 확인하면 이 거래는 끝나요',
      OTHERS_CLOSED: '함께 진행하던 다른 중개사 {n}곳은 정리돼요',
      ADS_STOP: '다른 중개사 {n}곳에 광고 중지 요청이 가요',
      VISITS_CANCELED: '다른 중개사와 잡힌 방문 {n}건은 취소돼요',
      BREAK_NEEDS_REPORT: '나중에 해제되면 중개사가 알리고 다시 확인해요',
      STAGE_CONTRACTED: '거래가 계약 단계로 바뀌어요',
      DEAL_DONE: '거래가 완료돼요',
      REVIEW_OPEN: '후기를 남길 수 있어요',
      DEAL_ENDED: '이 거래는 끝나요',
      REREQUEST: '다시 매칭 요청을 할 수 있어요',
      RECORD_KEPT: '기록은 그대로 남아요',
      BROKER_WILL_CALL: "중개사 화면에 '전화로 확인해 주세요'가 떠요",
      BROKER_SETS_DATES: '계약일·잔금일은 중개사가 넣어요',
    },
    /** 목록 카드 색 띠 (deal.ts cardStrip 키) */
    strip: {
      /** 남은 시간은 띠 오른쪽에 따로 ({h}시간) */
      AD_LEFT: '아직 광고 전이에요',
      AD_SOON: '아직 광고 전이에요',
      AD_OVERDUE: '광고 기한이 지났어요',
      DATE_PASSED: '{field}이 지났어요 · 알려 주세요',
      CONFIRM: '{step} 확인해 주세요',
      /** 집주인 "지금 확인할 일" 전용 (2026-10-27) */
      PRICE_NOTIFY: '바뀐 희망가 {price} 알려 주세요',
      CALL_OWNER:'집주인이 아니라고 했어요 · 전화해 주세요',
      REMOVE_AD: '광고를 내려 주세요 · 다른 곳과 진행',
      REMOVE_AD_PAUSED: '광고를 내려 주세요 · 집주인이 잠시 멈춤',
      /** 내려 달라고 한 지 24시간 지남 (deal.REMOVE_AD_HOURS) → 새 요청 보내기 잠금 */
      REMOVE_AD_LATE: '광고 내림 기한이 지났어요',
      /** 집주인·중개사 화면 공통이라 누가 멈췄는지 쓰지 않음 */
      PAUSED: '판매 잠시 멈춤',
      SAVE_CALENDAR: '날짜를 캘린더에 저장해 주세요',
      SET_DATES: '날짜를 넣어 주세요',
      OWNER_CHECK: '소유자 확인을 해 주세요',
      /** 허위 매물 신고 확인 중 (집주인·중개사 공통, 광고 시간 멈춤) */
      OWNER_CHECKING: '소유자 확인 중 · 광고 시간 멈춤',
      WAIT_OWNER: '집주인 확인을 기다리고 있어요',
      VISIT_SOON: '방문 {date} {hour}시',
      VISIT_ON: '방문 {date} {hour}시',
      CONTRACT_DAY: '계약하는 날 {date}',
      BALANCE_DAY: '잔금 날 {date}',
      CONTRACT_ON: '계약일 {date}',
      BALANCE_ON: '잔금일 {date}',
      AD_LIVE: '광고 중 · {day}일째',
      PROVISIONAL: '가계약 중',
      IN_PROGRESS: '진행 중',
      FEE_CHECK: '복비 확인 한 가지만 알려 주세요',
      WRITE_REVIEW: '후기를 남겨 주세요',
      CREDIT_RETURNED: '거래 완료 · 크레딧 1개 돌려받음',
      DONE: '거래 완료',
      BROKEN: '해제됨',
      CLOSED: '다른 곳과 진행됨',
      RELEASED: '매칭 해제됨',
      hours: '{h}시간',
      today: '오늘',
      tomorrow: '내일',
      /** 내가 할 일(파랑) 띠 오른쪽 동작 이름 (목록 카드에서만) */
      cta: {
        CONFIRM: '확인하기',
        FEE_CHECK: '답하기',
        WRITE_REVIEW: '후기 쓰기',
        SAVE_CALENDAR: '저장하기',
        SET_DATES: '넣기',
        OWNER_CHECK: '확인하기',
        CALL_OWNER: '보기',
        REMOVE_AD: '확인하기',
        REMOVE_AD_PAUSED: '확인하기',
        default: '열기',
      },
    },
    steps: { PROVISIONAL: '가계약', CONTRACT: '계약', BALANCE: '잔금', BROKEN: '해제' },
    dates: {
      title: '거래 날짜',
      sub: '정해진 날짜만 넣어도 돼요',
      needFirst: '알리기 전에 {field}을 먼저 넣어 주세요',
      none: '없어요',
      save: '저장',
      cancel: '닫기',
      errors: {
        PAST: '지난 날짜는 넣을 수 없어요',
        BALANCE_BEFORE_CONTRACT: '잔금일이 계약일보다 빨라요',
        MIDDLE_OUT: '중도금일은 계약일과 잔금일 사이여야 해요',
        NO_CHANGE: '바뀐 날짜가 없어요',
      },
    },
    calendar: { title: '{complex} {pyeong} {field} · 복비', memo: '{dongHo}\n집주인 {phone}' },
    /**
     * 챙길 서류 (③, 대표님 검수 완료 2026-10-25, docs/handover/deal-documents.md). 중개사 화면에만 — 집주인 화면엔 없음.
     * tell: 집주인에게 알려 줄 것 / check: 내가 확인할 것. 대리인 등 드문 경우는 넣지 않음
     */
    docs: {
      title: '챙길 서류',
      note: '참고용이에요. 거래마다 다를 수 있어요',
      tell: '집주인에게 알려 줄 것',
      check: '내가 확인할 것',
      매매: {
        CONTRACT: {
          tell: ['신분증', '도장', '계약금 받을 통장'],
          check: ['등기부등본 당일 발급', '건축물대장', '토지이용계획확인서', '중개대상물 확인·설명서', '공제증서'],
        },
        BALANCE: {
          tell: ['등기권리증(등기필증)', '매도용 인감증명서', '인감도장', '주민등록초본(주소 이력)', '신분증', '관리비·공과금 정산 자료', '근저당 상환 자료', '열쇠·현관 비밀번호'],
          check: ['등기부등본 당일 재확인', '선수관리비·장기수선충당금 정산'],
        },
      },
      전세: {
        CONTRACT: {
          tell: ['신분증', '도장', '계약금 받을 통장'],
          check: ['등기부등본 당일 발급', '건축물대장', '중개대상물 확인·설명서', '공제증서', '임대인 국세·지방세 완납 확인 안내'],
        },
        BALANCE: {
          tell: ['신분증', '근저당 처리 자료(조건부일 때)', '관리비 정산', '열쇠·현관 비밀번호'],
          check: ['등기부등본 재확인', '임차인 전입신고·확정일자 안내'],
        },
      },
    },
  },

  // ==========================================================================
  // 7. 법적 약관 및 정책 (통합 관리 센터에서 대표님이 직접 수정 가능)
  // ==========================================================================
  /**
   * 회사 값은 {company.키} 자리표시로 쓴다 (COMPANY_TOKENS). 배포 전 교체 항목은 화면에 빨간 글씨로 표시된다.
   * 조항 구성 기준: 개인정보 처리방침은 개인정보 보호법 제30조·시행령 제31조와 kimlawtech/korean-privacy-terms(Apache-2.0)
   * 한국 템플릿의 조항 목록을 체크리스트로 사용(문장은 직접 작성). 약관은 공정위 통신판매중개 표준약관 구성 기준.
   * 배포 전 변호사 검토 필수 (docs/PREDEPLOY_CHECKLIST.md)
   */
  legal: {
    /** [약관 모달 UI 문구] */
    modal: {
      effectiveDatePrefix: '시행일자',
      tabs: { terms: '이용약관', privacy: '개인정보 처리방침', disclaimer: '책임의 한계' },
      disclaimerBannerTitle: '공인중개사법상 법적 지위 고지',
      disclaimerBannerBody: '{company.serviceName}는 개업공인중개사가 아니며, 중개계약 체결 및 중개대상물 확인·설명의 의무는 거래 당사자인 개업공인중개사와 소유주에게 있습니다.',
      /** [초안 고지]: COMPANY_INFO.pendingFields가 남아 있는 동안 본문 위에 표시 */
      draftNotice: '배포 전 초안입니다. 빨간 글씨는 실제 값으로 바꿔야 하는 항목이에요.',
      closeButton: '내용을 확인했습니다',
      closeAriaLabel: '닫기',
    },

    /** [서비스 이용약관] */
    termsOfService: {
      title: '서비스 이용약관',
      lastUpdated: COMPANY_INFO.policyEffectiveDate,
      sections: [
        {
          heading: '제1조 (목적)',
          blocks: [{ p: '이 약관은 {company.legalName}(이하 "회사")가 운영하는 {company.serviceName} 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자의 권리, 의무 및 책임 사항을 정합니다.' }],
        },
        {
          heading: '제2조 (용어의 정의)',
          blocks: [
            {
              ul: [
                '"서비스"란 집주인이 실거래·매물 데이터를 바탕으로 중개보수를 미리 제안하고, 파트너 중개사가 이를 확인해 매칭을 요청할 수 있도록 연결하는 온라인 플랫폼을 말합니다.',
                '"집주인"이란 본인 소유 아파트의 매도 또는 임대 의뢰 정보를 등록하는 이용자를 말합니다.',
                '"파트너 중개사"란 회사의 자격 확인을 거쳐 매칭 요청 권한을 받은 개업공인중개사를 말합니다.',
                '"크레딧"이란 파트너 중개사가 매칭 요청에 사용하는 서비스 내 이용권을 말합니다.',
              ],
            },
          ],
        },
        {
          heading: '제3조 (약관의 게시와 변경)',
          blocks: [
            {
              ul: [
                '회사는 이 약관을 서비스 초기 화면 하단에서 언제든 확인할 수 있도록 게시합니다.',
                '회사는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 내용과 시행일을 시행 7일 전부터(이용자에게 불리한 변경은 30일 전부터) 서비스에 공지합니다.',
                '이용자가 변경된 약관에 동의하지 않으면 이용을 중단할 수 있습니다. 시행일 이후에도 계속 이용하면 변경에 동의한 것으로 봅니다.',
              ],
            },
          ],
        },
        {
          heading: '제4조 (회사의 지위)',
          blocks: [
            {
              ul: [
                '회사는 통신판매중개자로서 집주인과 파트너 중개사의 매칭을 위한 정보 시스템을 제공하며, 공인중개사법상 개업공인중개사가 아닙니다.',
                '중개계약, 계약서 작성, 중개대상물 확인·설명 등 중개 행위와 그 책임은 거래 당사자인 집주인과 파트너 중개사에게 있습니다.',
              ],
            },
          ],
        },
        {
          heading: '제5조 (서비스의 내용)',
          blocks: [
            {
              ul: [
                '국토교통부 실거래 자료와 공개 매물 통계를 바탕으로 한 추천 중개보수 제시 (참고용이며 법정 상한 요율 이내)',
                '집주인 의뢰 등록과 파트너 중개사의 매칭 요청 연결',
                '매칭 확정 전 집주인의 동·호수와 연락처 비공개',
              ],
            },
          ],
        },
        {
          heading: '제6조 (집주인의 의무)',
          blocks: [
            {
              ul: [
                '집주인은 본인이 소유하거나 처분 권한을 가진 부동산만 등록해야 합니다.',
                '사실과 다른 매물, 거래 의사가 없는 매물, 타인의 정보를 등록해서는 안 됩니다.',
              ],
            },
          ],
        },
        {
          heading: '제7조 (파트너 중개사의 의무)',
          blocks: [
            {
              ul: [
                '파트너 중개사는 개업공인중개사 등록과 사무소 정보를 사실대로 제출하고, 변경이 있으면 즉시 알려야 합니다.',
                '매칭으로 알게 된 집주인 정보는 해당 중개 업무에만 사용해야 합니다.',
              ],
            },
          ],
        },
        {
          heading: '제8조 (중개보수 사전 합의의 준수)',
          blocks: [
            {
              ul: [
                '매칭이 확정되면 파트너 중개사는 집주인이 제안하고 합의한 중개보수로 계약하며, 계약 당일 추가 보수를 요구하지 않습니다.',
                '실제 거래금액이 희망가와 다르면, 중개보수는 실제 거래금액의 법정 상한에 합의 때의 비율(합의한 중개보수 ÷ 희망가 기준 법정 상한)을 곱해 다시 정하고 천 원 미만은 버립니다. 법정 요율 구간이 바뀌어도 같은 비율을 적용합니다. 실제 거래금액은 파트너 중개사가 알리고 집주인이 확인하거나, 집주인이 직접 알립니다.',
                '합의한 중개보수는 공인중개사법상 법정 상한을 넘을 수 없으며, 부가가치세는 별도입니다.',
                '파트너 중개사가 합의와 다른 중개보수를 요구한 사실이 확인되면, 회사는 합의 기록을 확인서로 집주인에게 제공하고, 그 파트너 중개사의 서비스 이용을 중단하거나 매칭 요청을 일정 기간 제한할 수 있습니다.',
                '정당한 사유 없이 합의를 지키지 않는 파트너 중개사는 자격이 정지될 수 있습니다.',
              ],
            },
          ],
        },
        {
          heading: '제9조 (매칭 규칙)',
          blocks: [
            {
              ul: [
                '파트너 중개사는 매칭 요청에 잘하는 점을 최대 3개까지 보여 줄 수 있으며, 받은 후기가 10개 이상이면 1개를 더 보여 줄 수 있습니다. 이 기준은 서비스 운영에 따라 바뀔 수 있으며, 바뀌면 제3조에 따라 미리 알립니다.',
                '집주인은 도착한 요청 중 최대 3곳만 선택해 중개를 진행할 수 있으며, 중개보수는 실제 계약한 1곳만 받습니다.',
                '의뢰는 등록 후 48시간이 지나면 자동으로 종료됩니다.',
                '집주인은 매칭을 확정하기 전에는 언제든 의뢰를 취소할 수 있으며, 확정 후 7일 동안은 취소·일시 중지·매물 회수를 할 수 없습니다.',
                '매칭이 확정된 파트너 중개사가 48시간 안에 광고를 등록하지 않으면 집주인은 그 중개사와의 매칭을 해제할 수 있습니다.',
                '계약이 체결되면 집주인 또는 파트너 중개사가 이를 알리며, 중개사가 48시간 안에 계약일·잔금일을 알리지 않으면 집주인이 입력한 날짜를 기준으로 합니다.',
                '집주인이 일시 중지나 매물 회수를 하는 경우 그 사유를 선택해야 하며, 회사는 이를 서비스 개선과 분쟁 대응에만 이용합니다.',
              ],
            },
          ],
        },
        {
          heading: '제10조 (크레딧의 구매·사용·환불)',
          blocks: [
            {
              ul: [
                '파트너 중개사는 매칭 요청 1건마다 크레딧을 사용합니다. 크레딧 가격과 구성은 구매 화면에 표시합니다.',
                '매칭 요청에 사용한 크레딧은 집주인에게 선택받지 못하거나 계약에 이르지 못해도 환불되지 않습니다. 이 내용은 구매 전과 요청 직전에 다시 안내합니다.',
                '사용하지 않은 크레딧은 구매일로부터 7일 이내에 청약을 철회하고 환불받을 수 있습니다.',
                '회사의 귀책 사유로 매칭 요청이 전달되지 않은 경우 사용한 크레딧을 돌려드립니다.',
                '매칭 후 등기 확인에서 집주인이 소유자가 아닌 등 허위 매물로 확인된 경우, 해당 매칭에 사용한 크레딧을 돌려드립니다.',
              ],
            },
          ],
        },
        {
          heading: '제11조 (이용의 정지)',
          blocks: [
            { p: '허위 매물 등록, 허위 자격 서류 제출, 합의한 중개보수 위반, 타인 정보 도용이 확인되면 회사는 사전 통지 후 서비스 이용을 정지할 수 있습니다. 긴급한 경우 먼저 정지하고 사후에 알립니다.' },
            { p: '허위 매물로 확인된 경우 같은 휴대폰 번호 또는 같은 동·호수로 다시 등록한 의뢰는 회사가 확인하기 전까지 파트너 중개사에게 공개되지 않을 수 있습니다. 이용자는 소유 관계를 증명하는 서류로 이의를 신청할 수 있습니다.' },
          ],
        },
        {
          heading: '제12조 (책임의 한계)',
          blocks: [
            {
              ul: [
                '추천 중개보수와 시장 분석은 공개 자료에 근거한 참고 정보이며, 거래 결과를 보장하지 않습니다.',
                '회사는 이용자 간 거래에서 발생한 분쟁에 대해 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.',
              ],
            },
          ],
        },
        {
          heading: '제13조 (분쟁 해결과 관할)',
          blocks: [
            {
              ul: [
                '회사는 이용자의 불만을 {company.email}로 접수하고 지체 없이 처리 결과를 알립니다.',
                '서비스 이용과 관련한 분쟁의 소송은 민사소송법에 따른 관할 법원에 제기합니다.',
              ],
            },
          ],
        },
        {
          heading: '부칙',
          blocks: [{ p: '이 약관은 {company.policyEffectiveDate}부터 시행합니다.' }],
        },
      ],
    },

    /** [개인정보 처리방침] 개인정보 보호법 제30조 */
    privacyPolicy: {
      title: '개인정보 처리방침',
      lastUpdated: COMPANY_INFO.policyEffectiveDate,
      sections: [
        {
          heading: '1. 개인정보의 처리 목적',
          blocks: [
            {
              ul: [
                '집주인 의뢰 접수와 파트너 중개사 매칭, 매칭 확정 시 연락처 연결',
                '본인 확인과 소유 여부 확인, 허위 매물 방지',
                '파트너 중개사의 개업공인중개사 자격 확인',
                '민원 처리와 부정 이용 방지',
              ],
            },
          ],
        },
        {
          heading: '2. 처리하는 개인정보의 항목',
          blocks: [
            {
              table: {
                head: ['구분', '항목'],
                rows: [
                  ['집주인 (필수)', '성명, 휴대전화번호, 통신사, 단지명·평형·동·호수, 희망 금액, 점유 상태, 입주 가능 시기'],
                  ['집주인 (해당 시)', '세입자 연락처, 임대 현황(보증금·월세·만료일·갱신요구권), 근저당 여부·채권최고액·상환 계획, 옵션·특이사항, 방문 가능 시간·방문 예약, 후기(별점·선택 항목), 판매 중지·회수 사유'],
                  ['파트너 중개사 (필수)', '사무소명, 대표 공인중개사 성명, 등록번호, 사업자등록번호, 사무소 소재지, 연락처, 자격 확인 서류 사진'],
                  ['자동 수집', '접속 일시, IP 주소, 브라우저 정보, 이용 기록'],
                ],
              },
            },
          ],
        },
        {
          heading: '3. 개인정보의 처리 및 보유 기간',
          blocks: [
            { p: '목적을 달성하면 지체 없이 파기합니다. 다만 아래의 경우에는 해당 기간 동안 보관합니다.' },
            {
              table: {
                head: ['보관 정보', '기간', '근거'],
                rows: [
                  ['매칭이 성사되지 않은 의뢰', '{company.requestRetention}', '재등록 편의와 민원 대응'],
                  ['계약 또는 청약철회 기록', '5년', '전자상거래법'],
                  ['대금 결제와 재화 공급 기록 (크레딧)', '5년', '전자상거래법'],
                  ['소비자 불만·분쟁 처리 기록', '3년', '전자상거래법'],
                  ['접속 기록', '3개월', '통신비밀보호법'],
                ],
              },
            },
          ],
        },
        {
          heading: '4. 개인정보의 제3자 제공',
          blocks: [
            { p: '매칭이 확정되기 전에는 집주인의 동·호수와 연락처를 중개사에게 제공하지 않습니다. 집주인이 파트너 중개사를 선택해 매칭을 확정한 경우에만 아래와 같이 제공합니다.' },
            {
              table: {
                head: ['제공받는 자', '목적', '항목', '보유 기간'],
                rows: [['집주인이 선택한 파트너 중개사 (최대 3곳)', '중개 업무 수행 (매물 확인·방문 일정 조율)', '성명, 연락처, 동·호수, 방문 가능 시간, 세입자 연락처(세입자 거주 시)', '중개 업무 종료 시까지 (관련 법령상 보존 기간 별도)']],
              },
            },
          ],
        },
        {
          heading: '5. 개인정보 처리의 위탁',
          blocks: [
            { p: '서비스 제공을 위해 아래 업무를 위탁합니다. 위탁 계약 시 개인정보 보호 의무를 정하고 관리·감독합니다.' },
            {
              table: {
                head: ['수탁자', '위탁 업무', '처리 국가'],
                rows: COMPANY_INFO.privacyProcessors.map((p) => [p.name, p.task, p.country]),
              },
            },
          ],
        },
        {
          heading: '6. 개인정보의 국외 이전',
          blocks: [
            { p: '서비스 운영을 위해 아래와 같이 개인정보가 국외에서 처리될 수 있습니다.' },
            {
              table: {
                head: ['이전받는 자', '국가', '항목', '시기·방법', '목적', '보유 기간'],
                rows: [
                  ['Cloudflare, Inc.', '미국 등', '접속 기록, 서비스 이용 중 전송되는 정보', '서비스 이용 시 네트워크로 전송', '웹 서비스 호스팅 및 전송', '위탁 계약 종료 시까지'],
                  ['Supabase Inc.', '{company.dataRegion}', '2항의 항목', '서비스 이용 시 네트워크로 전송', '데이터베이스 및 회원 인증', '위탁 계약 종료 시까지'],
                ],
              },
            },
            { p: '국외 이전을 원하지 않으시면 개인정보 보호책임자에게 거부를 요청할 수 있습니다. 다만 이 경우 서비스 이용이 어려울 수 있습니다.' },
          ],
        },
        {
          heading: '7. 개인정보의 파기 절차 및 방법',
          blocks: [
            {
              ul: [
                '보유 기간이 끝나거나 목적을 달성한 개인정보는 지체 없이 파기합니다.',
                '법령에 따라 보관하는 정보는 다른 정보와 분리해 보관합니다.',
                '전자 파일은 복구할 수 없는 방법으로 삭제하고, 종이 문서는 분쇄하거나 소각합니다.',
              ],
            },
          ],
        },
        {
          heading: '8. 정보주체의 권리와 행사 방법',
          blocks: [
            {
              ul: [
                '이용자는 언제든 개인정보의 열람, 정정, 삭제, 처리 정지와 동의 철회를 요구할 수 있습니다.',
                '{company.privacyOfficerEmail}로 요청하시면 본인 확인 후 10일 이내에 조치합니다.',
                '대리인을 통해서도 요청할 수 있으며, 이 경우 위임장을 제출해야 합니다.',
              ],
            },
          ],
        },
        {
          heading: '9. 자동 수집 장치의 설치·운영 및 거부',
          blocks: [
            {
              ul: [
                '회사는 광고·분석 목적의 쿠키를 사용하지 않습니다.',
                '이용 편의를 위해 브라우저 저장소에 투표 기록과 진행 중인 의뢰 요약을 저장합니다. 이 정보는 이용자의 기기에만 남고 회사 서버로 전송되지 않습니다.',
                '브라우저 설정에서 사이트 데이터를 삭제하면 언제든 지울 수 있습니다.',
              ],
            },
          ],
        },
        {
          heading: '10. 개인정보의 안전성 확보 조치',
          blocks: [
            {
              ul: [
                '관리적 조치: 개인정보 취급자 최소화와 정기 교육',
                '기술적 조치: 전송 구간 암호화(HTTPS), 데이터베이스 행 단위 접근 통제, 접속 기록 보관',
                '서비스 설계: 매칭 확정 전 동·호수와 연락처 비공개',
              ],
            },
          ],
        },
        {
          heading: '11. 개인정보 보호책임자',
          blocks: [
            {
              table: {
                head: ['구분', '내용'],
                rows: [
                  ['성명', '{company.privacyOfficerName}'],
                  ['이메일', '{company.privacyOfficerEmail}'],
                ],
              },
            },
          ],
        },
        {
          heading: '12. 해당 없음 사항',
          blocks: [
            {
              ul: [
                '만 14세 미만 아동의 개인정보는 수집하지 않습니다.',
                '추천 중개보수는 참고용 제안이며 이용자가 직접 결정하므로, 개인정보 보호법상 자동화된 결정에 해당하지 않습니다.',
                '회사는 국내 사업자로 국내대리인을 지정하지 않습니다.',
              ],
            },
          ],
        },
        {
          heading: '13. 권익침해 구제 방법',
          blocks: [
            {
              ul: [
                '개인정보분쟁조정위원회: 1833-6972 (www.kopico.go.kr)',
                '개인정보침해신고센터: 118 (privacy.kisa.or.kr)',
                '대검찰청: 1301 (www.spo.go.kr)',
                '경찰청: 182 (ecrm.police.go.kr)',
              ],
            },
          ],
        },
        {
          heading: '14. 개인정보 처리방침의 변경',
          blocks: [
            { p: '이 방침을 바꾸는 경우 시행 7일 전부터(중요한 변경은 30일 전부터) 서비스에 공지합니다.' },
            { ul: ['{company.policyEffectiveDate}: 최초 시행'] },
          ],
        },
      ],
    },

    /** [책임의 한계 및 법적 고지] */
    disclaimerPolicy: {
      title: '책임의 한계 및 법적 고지',
      lastUpdated: COMPANY_INFO.policyEffectiveDate,
      sections: [
        {
          heading: '1. 통신판매중개자 고지',
          blocks: [{ p: '{company.legalName}는 공인중개사법에 따른 개업공인중개사가 아니며 이용자 간 부동산 거래를 직접 중개하지 않습니다. {company.serviceName}는 집주인의 중개보수 제안과 파트너 중개사의 매칭 요청을 연결하는 통신판매중개 플랫폼이며, 통신판매의 당사자가 아닙니다.' }],
        },
        {
          heading: '2. 거래 당사자 책임 원칙',
          blocks: [{ p: '매물 정보와 희망 거래 조건은 이용자가 직접 입력한 것으로, 회사는 그 정확성을 보증하지 않습니다. 매매·임대차 계약 체결과 권리 분석의 책임은 거래 당사자인 집주인과 파트너 중개사에게 있습니다.' }],
        },
        {
          heading: '3. 데이터와 추천 금액의 성격',
          blocks: [
            {
              ul: [
                '실거래가는 국토교통부 실거래가 공개 자료, 시장 지표는 한국부동산원 자료를 바탕으로 합니다. 신고 지연이나 해제로 실제와 다를 수 있습니다.',
                '추천 중개보수는 공개 자료로 계산한 참고값이며 법정 상한 요율 이내입니다. 실제 중개보수는 당사자의 합의로 정합니다.',
              ],
            },
          ],
        },
        {
          heading: '4. 허위 매물 및 부정 행위 금지',
          blocks: [{ p: '타인의 부동산 정보를 무단으로 등록하거나 허위 자격 서류를 제출하면 서비스 이용이 정지되며, 공인중개사법과 형법상 업무방해 등 민·형사상 책임을 질 수 있습니다.' }],
        },
      ],
    },
  },
} as const;

export type SiteContent = typeof SITE_CONTENT;
