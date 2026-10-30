import type { Metadata } from 'next';

/** 관리자만의 앱 정보: 아이폰은 "홈 화면에 추가"한 관리자 화면에서만 웹 푸시를 받는다 */
export const metadata: Metadata = {
  title: '복비 관리자',
  manifest: '/admin.webmanifest',
  appleWebApp: { capable: true, title: '복비 관리자', statusBarStyle: 'default' },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
