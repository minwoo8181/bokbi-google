/**
 * 외부 서비스 키 "설정됨 / 없음" (결정론·순수 함수). 서버에서 process.env를 넘겨 존재만 본다.
 * 값은 절대 돌려주지 않는다 (참·거짓만) — 화면·로그·클라이언트 번들에 키 값이 나갈 길이 없게.
 * .env 파일은 읽지 않는다 (대표님이 직접 입력, Claude 읽기 금지)
 */

export type KeyId = 'AI' | 'VWORLD' | 'BUILDING' | 'MOLIT' | 'SOLAPI' | 'PUSH';

/** 코드가 실제로 읽는 환경변수 이름 (Solapi는 연결 전이라 예정 이름, 관리자 웹 푸시는 비밀 키로 판단) */
export const KEY_ENV: Record<KeyId, string> = {
  AI: 'GEMINI_API_KEY',
  VWORLD: 'V_WORLD_MAP_API_KEY',
  BUILDING: 'BUILDING_REGISTER_API_KEY',
  MOLIT: 'MOLIT_APT_RENT_API_KEY',
  SOLAPI: 'SOLAPI_API_KEY',
  PUSH: 'VAPID_PRIVATE_KEY',
};
export const KEY_ORDER: KeyId[] = ['AI', 'VWORLD', 'BUILDING', 'MOLIT', 'SOLAPI', 'PUSH'];

export interface KeyStatus {
  id: KeyId;
  set: boolean;
}

/** 빈 문자열·공백만 있으면 없음 */
export function keyStatus(env: Record<string, string | undefined>): KeyStatus[] {
  return KEY_ORDER.map((id) => ({ id, set: (env[KEY_ENV[id]] ?? '').trim().length > 0 }));
}
