'use client';

import React, { useEffect } from 'react';

/**
 * GlobalClientErrorGuard
 * 
 * Next.js 개발 모드(Dev Overlay)에서 브라우저 확장 프로그램, 웹소켓(HMR) 일시 연결 단절,
 * 또는 외부 리소스(폰트/이미지) 로드 실패 등 DOM Event 객체가 Promise rejection으로 방출될 때,
 * Next.js 내부 use-error-handler가 이를 비정상 '[object Event]' 런타임 에러로
 * 오인하여 화면 전체에 빨간색 오버레이를 띄우는 현상을 원천 방어합니다.
 * 
 * - DOM Event / ErrorEvent / type 속성만 있는 비-Error 객체의 unhandled rejection을 캡처 단계에서 안전하게 무력화
 * - 정상적인 JavaScript Error 인스턴스는 온전히 보존
 */
export default function GlobalClientErrorGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      
      // reason이 DOM Event(ErrorEvent, CustomEvent 등)이거나 Error 인스턴스가 아닌 경우
      const isDomEvent =
        (typeof Event !== 'undefined' && reason instanceof Event) ||
        (reason && typeof reason === 'object' && ('type' in reason || 'isTrusted' in reason) && !('message' in reason));

      if (isDomEvent) {
        // Next.js dev overlay의 onUnhandledRejection으로 전파 차단
        event.preventDefault();
        event.stopImmediatePropagation();
        console.warn('[GlobalClientErrorGuard] Handled raw DOM Event rejection safely:', reason?.type || reason);
      }
    };

    const handleWindowError = (event: ErrorEvent) => {
      // link, script, img 등 외부 리소스 로드 실패 시 발생하는 DOM ErrorEvent 방어
      if (event.target && event.target !== window && (event.target as HTMLElement)?.tagName) {
        const tagName = (event.target as HTMLElement).tagName.toLowerCase();
        if (tagName === 'link' || tagName === 'script' || tagName === 'img') {
          console.warn(`[GlobalClientErrorGuard] Handled resource load error on <${tagName}>`);
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }
    };

    // capture phase(true)로 등록하여 Next.js dev overlay 기본 리스너보다 먼저 안전하게 가로챔
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);
    window.addEventListener('error', handleWindowError, true);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
      window.removeEventListener('error', handleWindowError, true);
    };
  }, []);

  return <>{children}</>;
}
