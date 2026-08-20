"use client";

import { useEffect, useState } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RightSidePanel } from "@/components/right-side-panel";
import { parseContact, studentDetailSchema, type StudentDetail } from "@/lib/official-catalog";

type FetchState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "done"; student: StudentDetail };

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(date);
}

function formatGender(value: string | null | undefined) {
  if (!value) return null;
  if (value === "M" || value === "male") return "남";
  if (value === "F" || value === "female") return "여";
  return value;
}

/** 24px 섹션 리듬 속의 컴팩트 메타데이터 한 줄. */
function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <dt className="w-20 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      <dl className="space-y-2">{children}</dl>
    </section>
  );
}

/** 학생 상세정보 우측 패널. 열리는 즉시 upstream에서 최신 상세를 직접 조회한다. */
export function StudentDetailPanel({ uuid, name, onClose }: { uuid: string; name: string; onClose: () => void }) {
  const [state, setState] = useState<FetchState>({ phase: "loading" });

  // uuid change remounts this component via the parent's key prop, so the
  // initial "loading" state is always correct without a setState in the effect.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/official/students/${encodeURIComponent(uuid)}`, { cache: "no-store" });
        const body = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok) {
          setState({ phase: "error", message: body?.error?.cause || "상세정보를 불러오지 못했습니다." });
          return;
        }
        setState({ phase: "done", student: studentDetailSchema.parse(body.student) });
      } catch {
        if (!cancelled) setState({ phase: "error", message: "서버에 연결하지 못했습니다." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uuid]);

  const student = state.phase === "done" ? state.student : null;
  const groupNames = (student?.groupNames || student?.groupName || "")
    .split(",").map((value) => value.trim()).filter(Boolean);
  const contacts = student
    ? [
        { label: "기본", contact: parseContact(student.primaryContact) },
        { label: "추가 1", contact: parseContact(student.secondContact) },
        { label: "추가 2", contact: parseContact(student.thirdContact) },
      ].filter((entry) => entry.contact)
    : [];
  const schoolLine = student
    ? [
        student.schoolGrade != null && student.schoolGrade !== "" ? `${student.schoolGrade}학년` : null,
        student.schoolClass ? `${student.schoolClass}반` : null,
        student.schoolNumber != null && student.schoolNumber !== "" ? `${student.schoolNumber}번` : null,
      ].filter(Boolean).join(" ")
    : "";

  return (
    <RightSidePanel
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          {name}
          {student?.isSleep ? <Badge variant="outline">휴원</Badge> : null}
        </span>
      }
    >
      {state.phase === "loading" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <LoaderCircle className="size-4 animate-spin" />상세정보를 불러오는 중입니다…
        </p>
      )}
      {state.phase === "error" && (
        <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <CircleAlert className="size-4" />{state.message}
        </p>
      )}
      {student && (
        <div className="space-y-6">
          <Section title="기본 정보">
            <MetaRow label="그룹">
              {groupNames.length > 0
                ? groupNames.map((groupName) => <Badge key={groupName} variant="secondary" className="mr-1">{groupName}</Badge>)
                : <span className="text-muted-foreground">미지정</span>}
            </MetaRow>
            <MetaRow label="학년/반">{schoolLine || <span className="text-muted-foreground">—</span>}</MetaRow>
            {student.extraSchool ? <MetaRow label="학교">{student.extraSchool}</MetaRow> : null}
            {formatDate(student.extraBirthday) ? <MetaRow label="생년월일">{formatDate(student.extraBirthday)}</MetaRow> : null}
            {formatGender(student.extraGender) ? <MetaRow label="성별">{formatGender(student.extraGender)}</MetaRow> : null}
          </Section>

          <Section title="연락처">
            {student.extraPhone ? <MetaRow label="학생">{student.extraPhone}</MetaRow> : null}
            {contacts.map(({ label, contact }) => (
              <MetaRow key={label} label={label}>
                {contact!.name ? `${contact!.name} · ` : ""}{contact!.phone}
              </MetaRow>
            ))}
            {!student.extraPhone && contacts.length === 0 && (
              <p className="text-sm text-muted-foreground">등록된 연락처가 없습니다.</p>
            )}
          </Section>

          {(student.extraAddress || formatDate(student.extraInDate) || formatDate(student.extraOutDate)) && (
            <Section title="등원 정보">
              {student.extraAddress ? <MetaRow label="주소">{student.extraAddress}</MetaRow> : null}
              {formatDate(student.extraInDate) ? <MetaRow label="등원일">{formatDate(student.extraInDate)}</MetaRow> : null}
              {formatDate(student.extraOutDate) ? <MetaRow label="퇴원일">{formatDate(student.extraOutDate)}</MetaRow> : null}
            </Section>
          )}

          {student.memo && (
            <Section title="메모">
              <p className="whitespace-pre-wrap text-sm">{student.memo}</p>
            </Section>
          )}
        </div>
      )}
    </RightSidePanel>
  );
}
