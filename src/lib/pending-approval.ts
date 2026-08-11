"use client";

import { useSyncExternalStore } from "react";

/**
 * 현재 앱 화면에 열린 미결정 승인 요청을 표시하는 인메모리 신호.
 * 승인 비밀값(locator/csrf/challenge)은 클라이언트 상태에 저장할 수 없으므로
 * 요청 ID만 다루고, 페이지를 벗어나면 자동으로 해제된다.
 */
const PENDING_EVENT = "basecamp:pending-approval";
let pendingRequestId: string | null = null;

export function setPendingApproval(requestId: string | null) {
  if (pendingRequestId === requestId) return;
  pendingRequestId = requestId;
  window.dispatchEvent(new Event(PENDING_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(PENDING_EVENT, callback);
  return () => window.removeEventListener(PENDING_EVENT, callback);
}

function getSnapshot() {
  return pendingRequestId;
}

function getServerSnapshot() {
  return null;
}

export function usePendingApproval() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
