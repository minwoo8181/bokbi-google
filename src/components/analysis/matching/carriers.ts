import type { TelecomCarrier } from '../types';

/** 매칭 모달 4단계 통신사 (6종) */
export const CARRIERS: { id: TelecomCarrier; label: string }[] = [
  { id: 'SKT', label: 'SKT' },
  { id: 'KT', label: 'KT' },
  { id: 'LGU+', label: 'LG U+' },
  { id: 'SKT_MVNO', label: '알뜰폰 (SKT)' },
  { id: 'KT_MVNO', label: '알뜰폰 (KT)' },
  { id: 'LGU_MVNO', label: '알뜰폰 (LG U+)' },
];
