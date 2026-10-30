/**
 * 세션 새로 고침 + 로그인 필요 화면 막기 (A1, @supabase/ssr 공식 패턴).
 * Supabase 스위치가 꺼져 있으면(지금 기본값) 아무것도 하지 않고 통과 → 화면 동작 그대로
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { LOGIN_PATH, needsLogin } from '@/lib/auth/routes';
import { supabaseEnv } from '@/lib/supabase/env';

export async function middleware(request: NextRequest) {
  const env = supabaseEnv();
  if (!env) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  // getUser: 토큰을 Supabase에 확인 (getSession은 쿠키만 믿어서 위조 가능)
  const { data } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  if (!data.user && needsLogin(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // 정적 파일·이미지·공개 집계·문자 훅(Supabase가 서명으로 부름)은 건너뜀
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/|api/public-stats|api/auth/sms-hook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
