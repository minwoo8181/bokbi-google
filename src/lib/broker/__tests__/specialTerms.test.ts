import { describe, expect, it } from 'vitest';
import raw from '@/data/special-terms/terms.json';
import { SITE_CONTENT } from '@/config/siteContent';
import {
  ADDRESS_BLANK,
  AFTER_OPTIONS,
  ATTACHED_MARK,
  END_MARK,
  addRecommended,
  toggleClause,
  NOW_OPTIONS,
  NO_ANSWERS,
  alternatives,
  answersFromListing,
  answersFromType,
  applicableClauses,
  blankKey,
  buildCopyText,
  buildProvisionalText,
  collectBlanks,
  defaultSelection,
  groupTopics,
  nextQuestion,
  provisionalItems,
  splitBlanks,
  templateBlankItems,
  templateLineId,
  typeFromAnswers,
  unfilledCount,
  type Answers,
  type TermsData,
} from '../specialTerms';

const data = raw as unknown as TermsData;
const tpl = SITE_CONTENT.brokerTerms.provisionalTemplate;

describe('특약 데이터 (엑셀 변환 결과)', () => {
  it('유형 9개, 모든 특약에 쓰는 유형이 있고 문구가 "-"로 시작하지 않는다', () => {
    expect(data.types.map((t) => t.code)).toEqual(['1', '2', '3-a', '3-b', '4-a', '4-b', '5', '6', '7']);
    expect(data.clauses.length).toBeGreaterThan(100);
    for (const c of data.clauses) {
      expect(c.types.length, c.id).toBeGreaterThan(0);
      expect(c.text, c.id).not.toMatch(/^-/);
    }
    expect(new Set(data.clauses.map((c) => c.id)).size).toBe(data.clauses.length);
  });

  it('유형마다 처음 담기는 특약이 있고, 필수는 모두 담긴다', () => {
    for (const t of data.types) {
      const sel = defaultSelection(data, t.code);
      expect(sel.length, t.code).toBeGreaterThan(0);
      for (const c of applicableClauses(data, t.code).filter((x) => x.required)) expect(sel).toContain(c.id);
    }
  });
});

describe('상황 질문 → 유형', () => {
  it('모든 답 조합이 유형 9가지에 하나씩 맞는다', () => {
    const codes: string[] = [];
    for (const now of NOW_OPTIONS.매매) for (const after of AFTER_OPTIONS[now as 'OWNER' | 'TENANT']) codes.push(typeFromAnswers({ trade: '매매', now, after })!);
    for (const now of NOW_OPTIONS.전세) codes.push(typeFromAnswers({ trade: '전세', now, after: null })!);
    expect(codes.sort()).toEqual(data.types.map((t) => t.code).sort());
  });

  it('유형 → 답 → 유형이 되돌아온다 (상단 칩 표시용)', () => {
    for (const t of data.types) expect(typeFromAnswers(answersFromType(t.code))).toBe(t.code);
  });

  it('다음 질문: 거래 → 지금 → (매매만) 잔금 후, 맞지 않는 답은 다시 묻는다', () => {
    expect(nextQuestion(NO_ANSWERS)).toBe('trade');
    expect(nextQuestion({ trade: '매매', now: null, after: null })).toBe('now');
    expect(nextQuestion({ trade: '매매', now: 'TENANT', after: null })).toBe('after');
    expect(nextQuestion({ trade: '매매', now: 'TENANT', after: 'SELLER_STAYS' })).toBe('after');
    expect(nextQuestion({ trade: '전세', now: 'TENANT', after: null })).toBeNull();
    expect(nextQuestion({ trade: '매매', now: 'VACANT', after: null })).toBe('now');
  });

  it('매칭 매물에서 열면 거래·지금 사는 사람까지 답해 둔다', () => {
    const sale: Answers = answersFromListing('매매', 'VACANT');
    expect(sale).toEqual({ trade: '매매', now: 'OWNER', after: null });
    expect(nextQuestion(sale)).toBe('after');
    expect(typeFromAnswers(answersFromListing('전세', 'TENANT'))).toBe('7');
  });
});

describe('주제 카드', () => {
  it('같은 구역·주제끼리 묶고, 다른 문구로 바꾸기는 같은 카드 안에서만', () => {
    const groups = groupTopics(applicableClauses(data, '1'));
    const keys = groups.map((g) => g.key);
    expect(new Set(keys).size).toBe(keys.length);
    const c = data.clauses.find((x) => x.topic === '을구 권리' && x.isDefault && x.types.includes('1'))!;
    const card = groups.find((g) => g.clauses.some((x) => x.id === c.id))!;
    expect(alternatives(data, '1', c.id).map((a) => a.id).sort()).toEqual(card.clauses.filter((x) => x.id !== c.id).map((x) => x.id).sort());
  });
});

describe('특약 버튼 넣고 빼기', () => {
  const card = groupTopics(applicableClauses(data, '1')).find((g) => g.topic === '을구 권리')!;
  const [a, b] = card.clauses;

  it('누르면 넣고 다시 누르면 빠진다, 같은 주제는 하나만 (자리 바꿈)', () => {
    let s = toggleClause(data, [], a.id);
    expect(s).toEqual([a.id]);
    s = toggleClause(data, s, b.id);
    expect(s).toEqual([b.id]);
    expect(toggleClause(data, s, b.id)).toEqual([]);
  });

  it('기타 구역(신탁·계약갱신)은 추천 표시가 없다', () => {
    expect(data.clauses.filter((c) => c.section === '기타' && c.required)).toEqual([]);
  });

  it('추천 한 번에 넣기: 이미 고른 주제는 건드리지 않고 한 주제에 하나씩', () => {
    const s = addRecommended(data, '1', [b.id]);
    expect(s).toContain(b.id);
    expect(s).not.toContain(a.id);
    const topics = s.map((id) => data.clauses.find((c) => c.id === id)!).map((c) => `${c.section}·${c.topic}`);
    expect(new Set(topics).size).toBe(topics.length);
    expect(addRecommended(data, '1', s)).toEqual(s);
  });

  it('추천 한 번에 넣기는 추천(엑셀 필수) 표시만, [기본]만 붙은 문구는 넣지 않는다', () => {
    for (const id of addRecommended(data, '1', [])) expect(data.clauses.find((c) => c.id === id)!.required, id).toBe(true);
  });
});

describe('빈칸', () => {
  it('날짜·금액·괄호 빈칸을 찾고, 단어에 붙은 "금"은 빈칸에 넣지 않는다', () => {
    const segs = splitBlanks('잔금일은 20  년 월 일로 하되 보증금 원(₩ ,000,000)과 금 원을 순위번호 ( )번에');
    expect(segs.filter((s) => s.kind === 'blank').map((b) => (b.kind === 'blank' ? [b.blank, b.original] : null))).toEqual([
      ['DATE', '20  년 월 일'],
      ['MONEY', '원(₩ ,000,000)'],
      ['MONEY', '금 원'],
      ['TEXT', '( )'],
    ]);
  });

  it('빈칸 입력 목록: 칸마다 앞 문장 끝부분이 라벨(앞 빈칸은 ○○), 번호·별표는 뺀다', () => {
    const fields = collectBlanks([{ id: 'a', text: '* 가계약금: 금 원 (20  년 월 일 입금 계좌: (     ) 매도인 ( ))' }]);
    expect(fields.map((f) => f.kind)).toEqual(['MONEY', 'DATE', 'TEXT', 'TEXT']);
    expect(fields[0].label).toBe('가계약금:');
    expect(fields[1].label).toBe('가계약금: ○○ (');
    expect(fields[2].label).toMatch(/입금 계좌:$/);
    expect(fields[3].label).toMatch(/매도인$/);
    for (const f of fields) expect(f.label.replace('…', '').length).toBeLessThanOrEqual(16);
    expect(fields[0].key).toBe(blankKey('a', 0));
  });

  it('계좌·이름·회사·전화 자리도 빈칸 (매도인 계좌 :, 000님, 00신탁, 000-0000), 금액 속 000은 빼고', () => {
    const account = data.clauses.find((c) => c.topic === '계좌' && c.types.includes('1'))!;
    expect(collectBlanks([{ id: account.id, text: account.text }]).map((f) => f.label)).toEqual(['매도인 계좌 :']);
    const kinds = (s: string) => splitBlanks(s).flatMap((x) => (x.kind === 'blank' ? [`${x.blank}:${x.original}`] : []));
    expect(kinds('공동명의인 중 000님의 계좌로')).toEqual(['TEXT:000']);
    expect(kinds('수탁자 00신탁주식회사이나 (전화 수탁자 000-0000)')).toEqual(['TEXT:00', 'TEXT:000-0000']);
    expect(kinds('금 원(₩ ,000,000)은 민법 580조와 5%이내')).toEqual(['MONEY:금 원(₩ ,000,000)']);
    expect(kinds('만기 00년00월00일)에')).toEqual(['DATE:00년00월00일']);
  });

  it('원문 특약 중 빈칸이 있는 것이 20개 이상 잡힌다 (대리 지표)', () => {
    expect(data.clauses.filter((c) => splitBlanks(c.text).some((s) => s.kind === 'blank')).length).toBeGreaterThanOrEqual(20);
  });
});

describe('본계약 특약 복사', () => {
  const sel = defaultSelection(data, '1');
  const withBlank = sel.find((id) => splitBlanks(data.clauses.find((c) => c.id === id)!.text).some((s) => s.kind === 'blank'))!;

  it('엑셀 순서·번호·이하여백, 채운 빈칸은 값으로, 직접 쓴 특약은 끝에', () => {
    const text = buildCopyText(data, { selected: [...sel].reverse(), fills: { [blankKey(withBlank, 0)]: '2026년 12월 20일' }, custom: ['직접 쓴 특약'], attached: false });
    const lines = text.split('\n');
    expect(lines.at(-1)).toBe(END_MARK);
    expect(lines.at(-2)).toBe(`${sel.length + 1}. 직접 쓴 특약`);
    expect(text).toContain('2026년 12월 20일');
    const firstInExcel = data.clauses.find((c) => sel.includes(c.id))!;
    if (firstInExcel.id !== withBlank) expect(lines[0]).toBe(`1. ${firstInExcel.text}`);
  });

  it('별지로 이어 쓰면 맨 위에 별지기재 표시, 남은 빈칸 수는 채우면 줄어든다', () => {
    expect(buildCopyText(data, { selected: sel, fills: {}, custom: [], attached: true }).split('\n')[0]).toBe(ATTACHED_MARK);
    const before = unfilledCount(data, sel, {});
    expect(unfilledCount(data, sel, { [blankKey(withBlank, 0)]: 'x' })).toBe(before - 1);
  });
});

describe('가계약 문자', () => {
  const sale = data.types.find((t) => t.code === '1')!;

  it('대표님 틀: 매매·전세 단어가 맞고 위약금 문구 없음, 동의 회신으로 끝난다', () => {
    expect(tpl.매매.join('\n')).toMatch(/매도인 \( \) \/ 매수인/);
    expect(tpl.전세.join('\n')).toMatch(/임대인 \( \) \/ 임차인/);
    for (const t of [tpl.매매, tpl.전세]) {
      expect(t.join('')).not.toMatch(/배액|위약금/);
      expect(t.at(-1)).toMatch(/위 내용에 모두 동의합니다/);
    }
  });

  it('주소는 붙여 넣은 값(없으면 빈칸), 고른 특약이 없으면 [특약] 줄도 없다', () => {
    const empty = buildProvisionalText({ template: tpl.매매, address: '', terms: [], fills: {}, termsHeader: tpl.termsHeader });
    expect(empty).toContain(`1. 부동산 표시: ${ADDRESS_BLANK}`);
    expect(empty).not.toContain(tpl.termsHeader);
    expect(empty).not.toContain('{terms}');

    const items = provisionalItems(data, sale);
    const fills = { [blankKey(templateLineId(3), 0)]: '홍길동' };
    const text = buildProvisionalText({ template: tpl.매매, address: '경기도 남양주시 다산동 0000', terms: [items[0].text, '직접 쓴 줄'], fills, termsHeader: tpl.termsHeader });
    expect(text).toContain('1. 부동산 표시: 경기도 남양주시 다산동 0000');
    expect(text).toContain('매도인 홍길동 / 매수인 ( )');
    expect(text).toContain(`${tpl.termsHeader}\n1. ${items[0].text}\n2. 직접 쓴 줄`);
  });

  it('틀의 빈칸 입력 목록에는 주소·특약 자리 표시가 들어가지 않는다', () => {
    const fields = collectBlanks(templateBlankItems(tpl.매매));
    expect(fields.length).toBeGreaterThanOrEqual(12);
    expect(fields.some((f) => f.label.includes('{'))).toBe(false);
  });

  it('엑셀 가계약 특약은 거래에 맞는 줄만 후보로', () => {
    const lease = provisionalItems(data, data.types.find((t) => t.code === '7')!);
    expect(provisionalItems(data, sale).length).toBeGreaterThan(0);
    expect(lease.length).toBeGreaterThan(0);
    expect(new Set([...provisionalItems(data, sale), ...lease].map((x) => x.id)).size).toBe(provisionalItems(data, sale).length + lease.length);
  });
});
