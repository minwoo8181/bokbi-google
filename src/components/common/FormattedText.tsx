'use client';

import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
  highlightClassName?: string;
}

/**
 * 텍스트 내의 \n (줄바꿈)과 **강조단어** (마크다운 볼드)를 감지하여
 * 선명한 브랜드 컬러(토스블루) 하이라이트로 렌더링하는 컴포넌트입니다.
 */
export default function FormattedText({
  text,
  className = '',
  highlightClassName = 'text-brand font-extrabold',
}: FormattedTextProps) {
  if (!text) return null;

  // 1. 줄바꿈(\n) 단위로 분리
  const lines = text.split('\n');

  return (
    <span className={className}>
      {lines.map((line, lineIndex) => {
        // 2. **강조단어** 단위로 분리
        const parts = line.split(/(\*\*[^*]+\*\*)/g);

        return (
          <React.Fragment key={lineIndex}>
            {parts.map((part, partIndex) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                const cleanWord = part.slice(2, -2);
                return (
                  <span key={partIndex} className={highlightClassName}>
                    {cleanWord}
                  </span>
                );
              }
              return <React.Fragment key={partIndex}>{part}</React.Fragment>;
            })}
            {lineIndex < lines.length - 1 && <br />}
          </React.Fragment>
        );
      })}
    </span>
  );
}
