import { createFileRoute } from "@tanstack/react-router";
import { Bot, Send, UserRound, Loader2 } from "lucide-react";
import { AppShell } from "@/components/diplolife/AppShell";
import { useState, useRef, useEffect } from "react";
import { chatFn } from "@/lib/gemini";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "AI 어시스턴트 — DiploLife" }] }),
  component: ChatPage,
});

type MessageType = {
  id: string;
  role: "user" | "model";
  text: string;
};

function ChatPage() {
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: "init-1",
      role: "model",
      text: "안녕하세요! 체류 국가와 비자 정보를 기준으로 답변해 드립니다. 무엇이 궁금하신가요?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: MessageType = { id: Date.now().toString(), role: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages.filter(m => m.id !== "init-1").map((m) => ({ role: m.role, text: m.text }));
      const response = await chatFn({ data: { history, message: userMsg.text } });
      
      const modelMsg: MessageType = { id: Date.now().toString() + "-model", role: "model", text: response.text };
      setMessages((prev) => [...prev, modelMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: MessageType = { id: Date.now().toString() + "-err", role: "model", text: "오류가 발생했습니다. 다시 시도해주세요." };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AppShell eyebrow="AI Assistant" title="체류 생활 상담">
      <div className="flex h-[calc(100vh-200px)] max-h-[800px] flex-col max-w-4xl rounded-[20px] border bg-card p-4 shadow-card">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((msg) => (
            <Message
              key={msg.id}
              align={msg.role === "user" ? "right" : "left"}
              icon={msg.role === "user" ? UserRound : Bot}
              text={msg.text}
            />
          ))}
          {isLoading && (
            <div className="flex items-start gap-2">
              <Bot className="mt-2 h-5 w-5 text-primary" aria-hidden="true" />
              <div className="flex h-10 items-center justify-center rounded-[18px] rounded-bl bg-surface-alt px-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="mt-4 flex gap-2 shrink-0">
          <input
            aria-label="AI 상담 메시지"
            className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-surface-alt px-4 text-sm"
            placeholder="질문 입력…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-primary text-white disabled:opacity-50 transition-opacity"
            aria-label="메시지 보내기"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
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
  const cleanText = text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/#/g, "");
  
  return (
    <div className={`flex items-start gap-2 ${align === "right" ? "justify-end" : ""}`}>
      {align === "left" && <Icon className="mt-2 h-5 w-5 text-primary shrink-0" aria-hidden="true" />}
      <p
        className={`max-w-[80%] rounded-[18px] px-4 py-3 text-[14px] leading-6 whitespace-pre-wrap ${
          align === "right"
            ? "rounded-br bg-primary text-white"
            : "rounded-bl bg-surface-alt text-foreground"
        }`}
      >
        {cleanText}
      </p>
      {align === "right" && <Icon className="mt-2 h-5 w-5 text-primary shrink-0" aria-hidden="true" />}
    </div>
  );
}

