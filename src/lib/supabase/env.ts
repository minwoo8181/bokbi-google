/**
 * Supabase 연결 설정 한 곳 (A1·A2). 기능 스위치 NEXT_PUBLIC_DATA_BACKEND=supabase이고 주소·공개 키가 있을 때만 연결.
 * NEXT_PUBLIC_ 값은 빌드 때 박히므로 브라우저·미들웨어·서버 모두 같은 값
 */
export interface SupabaseEnv {
  url: string;
  key: string;
}

export function supabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (process.env.NEXT_PUBLIC_DATA_BACKEND !== 'supabase' || !url || !key) return null;
  return { url, key };
}
