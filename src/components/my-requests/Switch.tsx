'use client';

import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
  testId?: string;
}

/** 토스식 켜기/끄기 스위치 (터치 영역 44px) */
export default function Switch({ checked, onChange, label, disabled = false, testId }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      data-testid={testId}
      className="relative w-[60px] h-11 flex items-center justify-center flex-shrink-0 disabled:cursor-not-allowed"
    >
      <span className={`relative w-[52px] h-8 rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-border-default'} ${disabled ? 'opacity-40' : ''}`}>
        <span
          className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-surface-card shadow-sm transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </span>
    </button>
  );
}
