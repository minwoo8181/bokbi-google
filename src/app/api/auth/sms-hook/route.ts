/**
 * Supabase Send SMS Hook (A1): Supabase Auth가 "이 번호에 이 인증번호를 보내 줘"라고 부르는 경로 → Solapi로 문자.
 * - 서명 확인(Standard Webhooks, SEND_SMS_HOOK_SECRET)을 통과한 요청만 — 아무나 불러 문자 폭탄을 보내지 못하게
 * - Solapi 키(SOLAPI_API_KEY·SOLAPI_API_SECRET·SOLAPI_SENDER)가 없으면 503: 배포 직전까지는 테스트 번호(고정 인증번호)만 쓰므로 여기까지 오지 않음
 * - 응답 형식은 Supabase 훅 규칙: 성공 {} / 실패 { error: { http_code, message } }. 번호·인증번호는 로그에 남기지 않음
 */
import { NextResponse } from 'next/server';
import { SITE_CONTENT } from '@/config/siteContent';
import { sendSolapiSms, solapiConfig } from '@/lib/sms/solapi';
import { parseHookSecrets, verifyWebhook } from '@/lib/sms/webhook';

export const dynamic = 'force-dynamic';

const fail = (status: number, message: string) => NextResponse.json({ error: { http_code: status, message } }, { status });

export async function POST(req: Request) {
  const body = await req.text();
  const check = await verifyWebhook(
    body,
    { id: req.headers.get('webhook-id'), timestamp: req.headers.get('webhook-timestamp'), signature: req.headers.get('webhook-signature') },
    parseHookSecrets(process.env.SEND_SMS_HOOK_SECRET),
    Math.floor(Date.now() / 1000),
  );
  if (!check.ok) return fail(check.error === 'NO_SECRET' ? 503 : 401, `hook ${check.error}`);

  let phone = '';
  let otp = '';
  try {
    const payload = JSON.parse(body) as { user?: { phone?: string }; sms?: { otp?: string } };
    phone = payload.user?.phone ?? '';
    otp = payload.sms?.otp ?? '';
  } catch {
    return fail(400, 'bad payload');
  }
  if (!phone || !/^\d{6}$/.test(otp)) return fail(400, 'bad payload');

  const cfg = solapiConfig(process.env);
  if (!cfg) return fail(503, 'sms provider not configured');

  const sent = await sendSolapiSms(cfg, phone, SITE_CONTENT.sms.otp.replace('{code}', otp));
  if (!sent.ok) {
    console.error('[sms-hook] solapi', sent.error, sent.detail);
    return fail(502, 'sms send failed');
  }
  return NextResponse.json({});
}
