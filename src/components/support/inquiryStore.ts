'use client';

/** 문의 저장 (목업: 이 브라우저 저장소). Supabase 연결 때 서버 표로 바꾸고 화면은 그대로 */
import { INQUIRIES_KEY, parseInquiries, type Inquiry } from '@/lib/support/inquiries';

export function loadInquiries(): Inquiry[] {
  try {
    return parseInquiries(JSON.parse(localStorage.getItem(INQUIRIES_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

export function saveInquiries(list: Inquiry[]): boolean {
  try {
    localStorage.setItem(INQUIRIES_KEY, JSON.stringify(list));
    // 같은 탭의 관리자 화면도 다시 읽게
    window.dispatchEvent(new StorageEvent('storage', { key: INQUIRIES_KEY }));
    return true;
  } catch {
    return false;
  }
}
