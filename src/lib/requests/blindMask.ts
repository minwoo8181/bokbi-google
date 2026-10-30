/**
 * 매칭 전 가려진 상호의 길이 (블라인드 원칙).
 * 실제 상호 글자 수와 상관없이 요청 id로만 3가지 중 하나를 고른다 → 길이로 사무소를 짐작할 수 없고,
 * 같은 요청은 다시 열어도 같은 모양이라 화면이 흔들리지 않는다. 화면에는 실제 상호를 넣지 않는다
 */
export const MASK_VARIANTS = 3;

/** FNV-1a 32비트 해시 → 0 ~ MASK_VARIANTS-1 */
export function maskVariant(offerId: string): number {
  if (!offerId) return 0;
  let h = 0x811c9dc5;
  for (let i = 0; i < offerId.length; i++) {
    h ^= offerId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % MASK_VARIANTS;
}
