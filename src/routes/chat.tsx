import { createFileRoute } from "@tanstack/react-router";
import { Bot, Send, UserRound } from "lucide-react";
import { AppShell } from "@/components/diplolife/AppShell";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "AI 어시스턴트 — DiploLife" }] }),
  component: ChatPage,
});

function ChatPage() {
  return (
    <AppShell eyebrow="AI Assistant" title="체류 생활 상담">
      <div className="max-w-4xl rounded-[20px] border bg-card p-4 shadow-card">
        <div className="space-y-4">
          <Message align="left" icon={Bot} text="체류 국가와 비자 정보를 기준으로 답변합니다." />
          <Message align="right" icon={UserRound} text="현지 긴급 연락처를 확인하고 싶어요." />
          <Message align="left" icon={Bot} text="확실한 정보 없음 항목은 공공데이터 연결 후 표시합니다." />
        </div>
        <div className="mt-6 flex gap-2">
          <input
            aria-label="AI 상담 메시지"
            className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-surface-alt px-4 text-sm"
            placeholder="질문 입력…"
          />
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] bg-primary text-white"
            aria-label="메시지 보내기"
          >
            <Send className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function Message({
  align,
  icon: Icon,
  text,
}: {
  align: "left" | "right";
  icon: typeof Bot;
  text: string;
}) {
  return (
    <div className={`flex items-start gap-2 ${align === "right" ? "justify-end" : ""}`}>
      {align === "left" && <Icon className="mt-2 h-5 w-5 text-primary" aria-hidden="true" />}
      <p
        className={`max-w-[80%] rounded-[18px] px-4 py-3 text-[14px] leading-6 ${
          align === "right"
            ? "rounded-br bg-primary text-white"
            : "rounded-bl bg-surface-alt text-foreground"
        }`}
      >
        {text}
      </p>
      {align === "right" && <Icon className="mt-2 h-5 w-5 text-primary" aria-hidden="true" />}
    </div>
  );
}

