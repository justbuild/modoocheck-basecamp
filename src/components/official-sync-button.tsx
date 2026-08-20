"use client";

import { useEffect, useRef } from "react";
import { OfficialStatusLine } from "@/components/official-status-line";
import { useOfficialRequest, type OfficialLoad } from "@/components/use-official-request";

/** 페이지를 열 때 필요한 목록들을 순서대로 불러와 스냅샷을 갱신한다. */
export function OfficialListLoader({ loads }: { loads: OfficialLoad[] }) {
  const { state, runAll } = useOfficialRequest();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void runAll(loads);
    // loads는 매 렌더 새 배열이지만 started ref가 한 번만 실행을 보장한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runAll]);

  const status = state.phase === "running"
    ? { ...state, message: "최신 목록을 불러오는 중입니다…" }
    : state;

  return <OfficialStatusLine state={status} />;
}
