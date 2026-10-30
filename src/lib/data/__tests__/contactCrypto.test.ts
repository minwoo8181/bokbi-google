/**
 * 연락처 암호화 (lib/data/supabase/crypto.ts): 되돌리기, 다른 의뢰·칸으로 옮겨 붙이기 실패, 변조 실패, 키 교체
 */
import { describe, expect, it } from 'vitest';
import { base64ToBytes, byteaToBytes, bytesToBase64, contactAad, createContactCrypto, parseKeys } from '../supabase/crypto';

const key = () => bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));

describe('연락처 암호화', () => {
  it('암호화 → 복호화로 원문이 돌아오고, 같은 값도 매번 다른 암호문', async () => {
    const c = await createContactCrypto({ 1: key() }, 1);
    const aad = contactAad('r1', 'ownerName');
    const a = await c.encrypt('홍길동', aad);
    const b = await c.encrypt('홍길동', aad);
    expect(bytesToBase64(a)).not.toBe(bytesToBase64(b));
    expect(await c.decrypt(a, aad, 1)).toBe('홍길동');
  });

  it('다른 의뢰·다른 칸으로 옮겨 붙이거나 한 바이트라도 바꾸면 복호화 실패', async () => {
    const c = await createContactCrypto({ 1: key() }, 1);
    const blob = await c.encrypt('010-0000-0000', contactAad('r1', 'tenantPhone'));
    await expect(c.decrypt(blob, contactAad('r2', 'tenantPhone'), 1)).rejects.toThrow();
    await expect(c.decrypt(blob, contactAad('r1', 'ownerName'), 1)).rejects.toThrow();
    const bad = blob.slice();
    bad[bad.length - 1] ^= 1;
    await expect(c.decrypt(bad, contactAad('r1', 'tenantPhone'), 1)).rejects.toThrow();
  });

  it('키 교체: 새 글은 새 버전, 옛 글은 옛 키로 읽음, 다른 키로는 실패', async () => {
    const k1 = key();
    const old = await createContactCrypto({ 1: k1 }, 1);
    const blob = await old.encrypt('101동 1203호', contactAad('r1', 'dongHo'));
    const rotated = await createContactCrypto({ 1: k1, 2: key() }, 2);
    expect(rotated.version).toBe(2);
    expect(await rotated.decrypt(blob, contactAad('r1', 'dongHo'), 1)).toBe('101동 1203호');
    await expect(rotated.decrypt(blob, contactAad('r1', 'dongHo'), 2)).rejects.toThrow();
  });

  it('환경변수 형식·키 길이 검사', async () => {
    const k = key();
    expect(parseKeys(k)).toEqual({ keys: { 1: k }, current: 1 });
    expect(parseKeys(`1:${k},3:${k}`)).toEqual({ keys: { 1: k, 3: k }, current: 3 });
    expect(() => parseKeys('')).toThrow();
    await expect(createContactCrypto({ 1: bytesToBase64(new Uint8Array(16)) }, 1)).rejects.toThrow('32바이트');
    await expect(createContactCrypto({ 1: k }, 2)).rejects.toThrow('키 2 없음');
  });

  it("DB bytea('\\x…') ↔ 바이트", () => {
    expect(Array.from(byteaToBytes('\\x01ff')!)).toEqual([1, 255]);
    expect(byteaToBytes(null)).toBeNull();
    expect(Array.from(base64ToBytes(bytesToBase64(new Uint8Array([0, 128, 255]))))).toEqual([0, 128, 255]);
  });
});
