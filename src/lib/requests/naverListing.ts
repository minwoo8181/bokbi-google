/**
 * 네이버 부동산 매물 링크 정규화 (중개사가 번호나 링크를 통째로 붙여넣어도 같은 링크로 저장)
 *
 * 확인한 사실 (2026-10-24, curl):
 * - m.land.naver.com/article/info/{번호} → fin.land.naver.com/articles/{번호} 로 네이버가 직접 이동시킨다
 * - 즉 매물번호만 있으면 링크를 만들 수 있고 단지 번호는 필요 없다
 * - new.land.naver.com 은 자동 접속을 막아 서버에서 광고중 여부는 확인할 수 없다 (그래서 링크만 연결)
 *
 * 네이버가 아닌 링크는 받지 않는다 (사기 링크 방지)
 */

const ARTICLE_NO = /^\d{8,12}$/;
const NAVER_LAND_HOST = /(^|\.)land\.naver\.com$/;

export function buildNaverArticleUrl(articleNo: string): string {
  return `https://fin.land.naver.com/articles/${articleNo}`;
}

/** 번호 또는 네이버 부동산 링크에서 매물번호를 뽑는다. 못 뽑으면 null */
export function parseNaverArticleNo(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  if (ARTICLE_NO.test(text)) return text;

  let url: URL;
  try {
    url = new URL(text.startsWith('http') ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (!NAVER_LAND_HOST.test(url.hostname)) return null;

  const fromQuery = url.searchParams.get('articleNo');
  if (fromQuery && ARTICLE_NO.test(fromQuery)) return fromQuery;

  // /articles/{번호} (fin), /article/info/{번호} (m)
  const fromPath = url.pathname.match(/\/articles?\/(?:info\/)?(\d{8,12})(?:\/|$)/);
  return fromPath ? fromPath[1] : null;
}

/** 입력을 저장용 링크로. 매물번호를 못 찾으면 null (화면에서 "네이버 매물 링크나 번호를 넣어 주세요") */
export function normalizeNaverListingInput(input: string): string | null {
  const no = parseNaverArticleNo(input);
  return no ? buildNaverArticleUrl(no) : null;
}
