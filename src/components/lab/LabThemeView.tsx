'use client';

import React from 'react';
import { useLabTheme } from './useLabTheme';

/** design-lab: 레퍼런스 테마면 그 테마 화면, 아니면 원래 화면 (모두 서버에서 만든 요소를 받는다) */
export default function LabThemeView({
  samjeom,
  samjeom2,
  heydealer,
  children,
}: {
  samjeom: React.ReactNode;
  samjeom2: React.ReactNode;
  heydealer: React.ReactNode;
  children: React.ReactNode;
}) {
  const theme = useLabTheme();
  const view = { samjeom, samjeom2, heydealer } as Record<string, React.ReactNode>;
  return <>{theme in view ? view[theme] : children}</>;
}
