/**
 * 연락처 암호화 (설계 supabase-schema.md §2): 서버가 AES-256-GCM으로 암호화해 암호문만 DB에 둔다. 키는 DB 밖(Cloudflare 비밀값).
 * - WebCrypto만 씀 → Node(시험)와 Cloudflare Workers(운영) 둘 다 같은 코드
 * - 암호문 = IV 12바이트 + 암호문·인증 태그. 추가 인증 데이터(AAD) = "의뢰 id:칸 이름" → 다른 의뢰·다른 칸으로 옮겨 붙이면 복호화 실패
 * - 키 교체: 버전별 키를 함께 들고, 새로 쓰는 것은 현재 버전으로 (행의 key_version으로 옛 키 선택)
 */

export interface ContactCrypto {
  /** 새로 암호화할 때 쓰는 키 버전 */
  version: number;
  encrypt(plain: string, aad: string): Promise<Uint8Array>;
  decrypt(blob: Uint8Array, aad: string, version: number): Promise<string>;
}

const IV_BYTES = 12;
const enc = new TextEncoder();
const dec = new TextDecoder();

export function base64ToBytes(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToBase64(u: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Postgres bytea → 바이트 (PostgREST·PGlite는 '\x…' 16진 문자열) */
export function byteaToBytes(v: unknown): Uint8Array | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Uint8Array) return v;
  const s = String(v);
  if (!s.startsWith('\\x')) throw new Error('BAD_BYTEA');
  const hex = s.slice(2);
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/**
 * 환경변수 값 → 버전별 키. "1:base64,2:base64" 또는 base64 하나(= 버전 1). 키는 32바이트(256비트)여야 한다
 */
export function parseKeys(raw: string | undefined): { keys: Record<number, string>; current: number } {
  if (!raw?.trim()) throw new Error('CONTACT_ENC_KEY 없음');
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  const keys: Record<number, string> = {};
  for (const p of parts) {
    const m = /^(\d+):(.+)$/.exec(p);
    if (m) keys[Number(m[1])] = m[2];
    else if (parts.length === 1) keys[1] = p;
    else throw new Error('CONTACT_ENC_KEY 형식: "1:키,2:키"');
  }
  return { keys, current: Math.max(...Object.keys(keys).map(Number)) };
}

export async function createContactCrypto(keys: Record<number, string>, current: number): Promise<ContactCrypto> {
  const imported = new Map<number, CryptoKey>();
  for (const [v, b64] of Object.entries(keys)) {
    const raw = base64ToBytes(b64);
    if (raw.length !== 32) throw new Error(`연락처 키 ${v}: 32바이트가 아님`);
    imported.set(Number(v), await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']));
  }
  const keyOf = (v: number) => {
    const k = imported.get(v);
    if (!k) throw new Error(`연락처 키 ${v} 없음`);
    return k;
  };
  keyOf(current);
  return {
    version: current,
    async encrypt(plain, aad) {
      const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
      const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(aad) }, keyOf(current), enc.encode(plain)));
      const out = new Uint8Array(IV_BYTES + ct.length);
      out.set(iv);
      out.set(ct, IV_BYTES);
      return out;
    },
    async decrypt(blob, aad, version) {
      const view = new Uint8Array(blob); // WebCrypto 타입은 ArrayBuffer 기반 뷰만 받음
      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: view.subarray(0, IV_BYTES), additionalData: enc.encode(aad) },
        keyOf(version),
        view.subarray(IV_BYTES),
      );
      return dec.decode(plain);
    },
  };
}

/** 칸마다 다른 AAD (의뢰 id + 칸 이름) */
export const contactAad = (requestId: string, field: 'dongHo' | 'ownerName' | 'tenantPhone' | 'memo') => `${requestId}:${field}`;
