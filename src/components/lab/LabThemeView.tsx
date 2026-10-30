'use client';

import React from 'react';
import { useLabTheme } from './useLabTheme';

/** design-lab: 레퍼런스 테마면 그 테마 화면, 아니면 원래 화면 (모두 서버에서 만든 요소를 받는다) */
export default function LabThemeView({
  samjeom,
  heydealer,
  children,
}: {
  samjeom: React.ReactNode;
  heydealer: React.ReactNode;
  children: React.ReactNode;
}) {
  const theme = useLabTheme();
  return <>{theme === 'samjeom' ? samjeom : theme === 'heydealer' ? heydealer : children}</>;
}
