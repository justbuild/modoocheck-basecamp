import { ApprovalReview } from "@/components/approval-review";

export const metadata = { title: "AI 작업 승인" };

export default function ApprovalsPage() {
  return (
    <div className="space-y-8">
      <header><p className="text-sm font-medium text-muted-foreground">원장 승인</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">AI 작업 승인</h1><p className="mt-2 text-muted-foreground">등록·수정·삭제·발송처럼 중요한 작업은 원장님이 내용을 확인한 뒤에만 실행됩니다.</p></header>
      <ApprovalReview />
    </div>
  );
}
