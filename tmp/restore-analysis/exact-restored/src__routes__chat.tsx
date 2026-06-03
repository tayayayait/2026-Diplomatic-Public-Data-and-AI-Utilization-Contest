import { useEffect, useRef, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bot, Send, UserRound, Sparkles } from "lucide-react";
import { AppShell } from "@/components/diplolife/AppShell";
import { useDiploLifeStore, type ChatMessage } from "@/lib/diplolife/state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "AI 肄뷀뙆?쇰읉 ??DiploLife" }] }),
  component: ChatPage,
});

const SUGGESTIONS = [
  "?꾩? 湲닿툒 ?곕씫泥??뚮젮以?",
  "??鍮꾩옄 ?몄젣 媛깆떊?댁빞 ??",
  "?대쾲 二쇰쭚 ?좎뵪 ?대븣?",
  "?멸탳遺 理쒓렐 怨듭??ы빆 ?붿빟??以?",
];

function ChatPage() {
  const inputValue = useDiploLifeStore((state) => state.chat.inputValue);
  const messages = useDiploLifeStore((state) => state.chat.messages);
  const setChatInput = useDiploLifeStore((state) => state.setChatInput);
  const addChatMessage = useDiploLifeStore((state) => state.addChatMessage);
  const profile = useDiploLifeStore((state) => state.userProfile);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message if empty
  useEffect(() => {
    if (messages.length === 0) {
      const country = profile?.country === "JP" ? "?쇰낯" : profile?.country === "US" ? "誘멸뎅" : "?댁쇅";
      const purpose = profile?.stayPurpose === "STUDY" ? "?좏븰" : "泥대쪟";
      
      addChatMessage({
        id: `msg_welcome`,
        role: "assistant",
        content: `?섏쁺?⑸땲?? ${country} ${purpose} ?앺솢???꾩슂??紐⑤뱺 寃껋쓣 臾쇱뼱蹂댁꽭?? ?멸탳遺 ?곗씠?곗? ?꾩? ?뺣낫瑜?湲곕컲?쇰줈 ?듬????쒕┰?덈떎.`,
        timestamp: new Date().toISOString(),
        status: "sent",
      });
    }
  }, [messages.length, profile, addChatMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    const content = text.trim();
    if (!content) return;

    addChatMessage({
      id: `msg_${Date.now().toString(36)}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
      status: "sent",
    });
    setChatInput("");

    // Create placeholder for assistant response
    const assistantMsgId = `msg_ai_${Date.now().toString(36)}`;
    addChatMessage({
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      status: "sending",
    });

    try {
      const { streamChatResponse } = await import("@/lib/diplolife/api/gemini");
      const { dashboard } = useDiploLifeStore.getState();
      
      const stream = await streamChatResponse({
        profile,
        dashboard,
        history: messages,
        newUserMessage: content,
      });

      let accumulatedContent = "";
      for await (const chunk of stream) {
        accumulatedContent += chunk;
        // Update message directly via Zustand
        useDiploLifeStore.setState((state) => ({
          chat: {
            ...state.chat,
            messages: state.chat.messages.map((m) =>
              m.id === assistantMsgId ? { ...m, content: accumulatedContent } : m
            )
          }
        }));
      }
      
      // Mark as sent
      useDiploLifeStore.getState().updateChatMessageStatus(assistantMsgId, "sent");

    } catch (err) {
      console.error("Gemini Error:", err);
      useDiploLifeStore.setState((state) => ({
        chat: {
          ...state.chat,
          messages: state.chat.messages.map((m) =>
            m.id === assistantMsgId ? { ...m, content: "二꾩넚?⑸땲?? ?쒕쾭 ?듭떊 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.", status: "error" } : m
          )
        }
      }));
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(inputValue);
  };

  return (
    <AppShell eyebrow="AI Copilot" title="臾댁뾿???꾩??쒕┫源뚯슂?">
      <div className="flex h-[calc(100vh-140px)] max-w-4xl flex-col overflow-hidden rounded-[24px] border border-border bg-surface shadow-card">
        
        {/* Chat Header */}
        <div className="flex items-center gap-3 border-b border-border bg-surface-alt px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-foreground">Text</h2>
            <p className="text-[12px] text-muted-foreground">Text</p>
          </div>
        </div>

        {/* Message List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="flex flex-col gap-6">
            {messages.map((message) => (
              <Message
                key={message.id}
