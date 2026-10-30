'use client';

import React from 'react';
import { useLabTheme } from './useLabTheme';

/** design-lab: 삼쩜삼 테마면 samjeom 화면, 아니면 원래 화면 (둘 다 서버에서 만든 요소를 받는다) */
export default function LabThemeView({ samjeom, children }: { samjeom: React.ReactNode; children: React.ReactNode }) {
  return <>{useLabTheme() === 'samjeom' ? samjeom : children}</>;
}
