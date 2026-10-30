import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CURRENT_THEME } from '@/theme/themeConfig';
import GlobalClientErrorGuard from '@/components/shared/GlobalClientErrorGuard';
import PageVisitTracker from '@/components/shared/PageVisitTracker';
import ThemeLabSwitcher, { THEME_BOOT_SCRIPT } from '@/components/lab/ThemeLabSwitcher';

export const metadata: Metadata = {
  title: '복비 - 데이터로 합의하는 새로운 복비',
  description: '실거래와 매물 흐름으로 정한 복비를 블라인드 매칭으로 내가 고른 중개사에게만. 다산동 아파트 복비 합의 플랫폼.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FFFFFF',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-theme={CURRENT_THEME} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>
        <GlobalClientErrorGuard>
          <PageVisitTracker />
          <div className="mobile-app-frame">
            {children}
          </div>
          <ThemeLabSwitcher />
        </GlobalClientErrorGuard>
      </body>
    </html>
  );
}
