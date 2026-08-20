"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";


export const SIDE_PANEL_HOST_ID = "app-side-panel-host";
// 도킹은 목록과 패널이 나란히 놓일 공간이 필요하다. 이 너비 아래에서는 overlay로 떨어진다.
const DOCKED_MEDIA_QUERY = "(min-width: 1920px)";
// 도킹 패널 너비. 닫힘 상태의 음수 마진과 같은 값을 써야 슬라이드가 어긋나지 않는다.
const DOCKED_PANEL_WIDTH = "clamp(360px, 30vw, 480px)";

/**
 * 우측 상세 패널. 2026-eco-mongolia-front의 RightSidePanel UX를 따른다:
 * - 화면 너비에 따라 두 가지 표현을 쓴다. 1920px 이상이면 콘텐츠 옆에 도킹(비모달,
 *   백드롭 없음, border-left 구분)하고, 그 아래에서는 overlay(모달, 백드롭 + 그림자)로 띄운다.
 * - 도킹 패널은 닫힌 상태에서 전체 너비를 유지한 채 음수 마진으로 레이아웃 밖에 있다가,
 *   열릴 때 마진·transform이 함께 풀리며 내용 재배치 없이 슬라이드해 들어온다.
 * - 300ms ease 전환. 첫 렌더에서 닫힌 상태를 한 번 그린 뒤 열림 상태를 붙여야
 *   진입 전환이 생략되지 않는다(2-frame). 닫기도 300ms 후 언마운트한다.
 * - 백드롭 클릭(overlay만)과 Esc(두 표현 모두)로 닫는다.
 * - dialog 역할 + 제목 라벨. overlay만 aria-modal이다.
 * - 그림자는 overlay 패널에만 쓴다(-12px 0 30px rgba(0,0,0,0.18)).
 */
export function RightSidePanel({
  title,
  onClose,
  children,
  titleId = "right-side-panel-label",
}: {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  titleId?: string;
}) {
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const attachPanelRef = useCallback((node: HTMLElement | null) => {
    panelRef.current = node;
  }, []);
  const wideViewport = useMediaQuery(DOCKED_MEDIA_QUERY);
  const host = useSidePanelHost();
  const docked = wideViewport && Boolean(host);

  const closePanel = useCallback(() => {
    setVisible(false);
    window.setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    let innerFrame = 0;
    const frame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(() => setVisible(true));
    });
    panelRef.current?.focus();
    return () => {
      window.cancelAnimationFrame(frame);
      if (innerFrame) window.cancelAnimationFrame(innerFrame);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      closePanel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closePanel, visible]);

  const header = (
    <header className="flex flex-col items-stretch gap-2 border-b p-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" onClick={closePanel} className="-ml-2 px-2 text-muted-foreground" aria-label="닫기">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true"><path d="M141.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L124.69,128,50.34,53.66A8,8,0,0,1,61.66,42.34l80,80A8,8,0,0,1,141.66,133.66Zm80-11.32-80-80a8,8,0,0,0-11.32,11.32L204.69,128l-74.35,74.34a8,8,0,0,0,11.32,11.32l80-80A8,8,0,0,0,221.66,122.34Z" /></svg>
        </Button>
      </div>
      <h2 id={titleId} className="text-xl font-bold">{title}</h2>
    </header>
  );
  const body = <div className="flex-1 overflow-y-auto overscroll-contain p-6">{children}</div>;

  if (docked) {
    // 도킹 패널은 목록 옆에 놓이므로 모달도 아니고 백드롭도 없다. Esc로는 여전히 닫힌다.
    return createPortal(
      <aside
        ref={attachPanelRef}
        role="dialog"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex h-full flex-col overflow-hidden border-l bg-background outline-none transition-[margin-right,transform] duration-300 ease-in-out motion-reduce:transition-none"
        style={{
          width: DOCKED_PANEL_WIDTH,
          marginRight: visible ? 0 : `calc(-1 * ${DOCKED_PANEL_WIDTH})`,
          transform: visible ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {header}
        {body}
      </aside>,
      host!,
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="상세 패널 닫기"
        onClick={closePanel}
        className={`fixed inset-0 z-40 border-0 bg-black/50 transition-opacity duration-300 ease-in-out motion-reduce:transition-none ${visible ? "opacity-100" : "opacity-0"}`}
      />
      <div
        ref={attachPanelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background outline-none transition-transform duration-300 ease-in-out motion-reduce:transition-none ${visible ? "translate-x-0" : "translate-x-full"}`}
        style={{ boxShadow: "-12px 0 30px rgba(0, 0, 0, 0.18)" }}
      >
        {header}
        {body}
      </div>
    </>
  );
}

// 호스트는 AppShell 안에만 있다. 단독으로 렌더링된 컴포넌트는 포털 대상을 못 찾아
// 실패하는 대신 overlay 표현을 유지한다. 첫 렌더 중에 조회해야 진입 전환이 시작되기
// 전에 포털이 연결되고, 늦게 마운트된 호스트는 effect가 다시 집어 든다.
// The panel mounts on user interaction, long after AppShell has rendered the host,
// so a one-time lookup in the state initializer is sufficient (no late-mount effect).
function useSidePanelHost() {
  const [host] = useState<HTMLElement | null>(() => findSidePanelHost());
  return host;
}

function findSidePanelHost() {
  return typeof document === "undefined" ? null : document.getElementById(SIDE_PANEL_HOST_ID);
}

function useMediaQuery(query: string) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const media = window.matchMedia?.(query);
    if (!media?.addEventListener) return () => {};
    media.addEventListener("change", onStoreChange);
    return () => media.removeEventListener("change", onStoreChange);
  }, [query]);
  const getSnapshot = useCallback(() => Boolean(window.matchMedia?.(query)?.matches), [query]);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
