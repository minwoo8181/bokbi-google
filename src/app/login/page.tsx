import React, { Suspense } from 'react';
import HomeHeader from '@/components/home/HomeHeader';
import PhoneLoginCard from '@/components/auth/PhoneLoginCard';

/** 로그인 (A1): 로그인이 필요한 화면에서 미들웨어가 ?next=와 함께 보냄 — Supabase 스위치가 켜졌을 때만 */
export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-surface-page">
      <HomeHeader />
      <main className="flex-1 px-5 pt-8 pb-12">
        <Suspense>
          <PhoneLoginCard />
        </Suspense>
      </main>
    </div>
  );
}
