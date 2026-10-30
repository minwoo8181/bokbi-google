'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase, ClipboardList, Home, UserRound } from 'lucide-react';
import { LAB_CONTENT } from '@/config/labContent';

const t = LAB_CONTENT.samjeom.tabs;
const TABS = [
  { href: '/', label: t.home, Icon: Home },
  { href: '/my-requests', label: t.requests, Icon: ClipboardList },
  { href: '/agent/register', label: t.broker, Icon: Briefcase },
  { href: '/my-info', label: t.me, Icon: UserRound },
] as const;

/** 삼쩜삼 아래 탭 바: 흰 띠 + 아이콘 위·이름 아래, 지금 화면만 검정 */
export default function SamjeomTabBar() {
  const path = usePathname();
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 max-w-[440px] mx-auto bg-surface-card border-t border-border-light pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4">
        {TABS.map(({ href, label, Icon }) => {
          const on = href === '/' ? path === '/' : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? 'page' : undefined}
                className={`h-14 flex flex-col items-center justify-center gap-1 text-[12px] font-medium ${
                  on ? 'text-text-primary' : 'text-text-disabled'
                }`}
              >
                <Icon className="w-6 h-6" strokeWidth={on ? 2.4 : 2} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
