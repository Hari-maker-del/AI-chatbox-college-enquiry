import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { suggestions, generateId } from "@/lib/chatResponses";
import { streamChat } from "@/lib/streamChat";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  onBack: () => void;
}

const TypingIndicator = () => (
  <div className="flex items-end gap-3 mb-4">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
      <Bot className="h-4 w-4 text-primary-foreground" />
    </div>
    <div className="chat-bubble-ai rounded-2xl rounded-bl-sm px-4 py-3">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-muted-foreground/50"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  </div>
);

const ChatBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex items-end gap-3 mb-4 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
        {isUser ? <User className="h-4 w-4 text-primary-foreground" /> : <Bot className="h-4 w-4 text-primary-foreground" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser ? "chat-bubble-user rounded-br-sm" : "chat-bubble-ai rounded-bl-sm"}`}>
        {isUser ? (
          <p className="text-sm">{message.content}</p>
        ) : (
          <div className="text-sm prose prose-sm max-w-none prose-headings:text-chat-ai-foreground prose-p:text-chat-ai-foreground prose-li:text-chat-ai-foreground prose-strong:text-chat-ai-foreground prose-td:text-chat-ai-foreground prose-th:text-chat-ai-foreground">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const ChatInterface = ({ onBack }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: generateId(),
      role: "assistant",
      content: "Hello! 👋 I'm your **AI College Enquiry Assistant**. I can help you with information about admissions, courses, fees, hostel facilities, and placements.\n\nWhat would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: ChatMessage = { id: generateId(), role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const assistantId = generateId();

    const chatHistory = [...messages.filter(m => m.role !== "assistant" || messages.indexOf(m) > 0), userMsg]
      .map(m => ({ role: m.role, content: m.content }));

    try {
      await streamChat({
        messages: chatHistory,
        onDelta: (chunk) => {
          assistantSoFar += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last.id === assistantId) {
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
            }
            return [...prev, { id: assistantId, role: "assistant", content: assistantSoFar }];
          });
        },
        onDone: () => {
          setIsLoading(false);
          // Save to DB if user is logged in
          if (user && assistantSoFar) {
            supabase.from("chat_queries").insert({
              user_id: user.id,
              message: text.trim(),
              response: assistantSoFar,
            }).then(({ error }) => {
              if (error) console.error("Failed to save query:", error);
            });
          }
        },
      });
    } catch (e: any) {
      setIsLoading(false);
      toast.error(e.message || "Failed to get AI response");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-[100dvh] bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 glass-card">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0"><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary"><Bot className="h-5 w-5 text-primary-foreground" /></div>
          <div>
            <h2 className="font-semibold font-sans text-foreground">College AI Assistant</h2>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-accent" />
              <span className="text-xs text-muted-foreground">Powered by AI</span>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
        <div className="max-w-3xl mx-auto">
          <AnimatePresence>
            {messages.map((msg) => <ChatBubble key={msg.id} message={msg} />)}
          </AnimatePresence>
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && <TypingIndicator />}
        </div>
      </ScrollArea>

      {messages.length <= 1 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 pb-2">
          <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s.label} onClick={() => sendMessage(s.label)} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                <span>{s.icon}</span>{s.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <div className="border-t border-border px-4 py-3 glass-card">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your question..." className="flex-1 rounded-full bg-secondary border-0 h-12 px-5 focus-visible:ring-primary" disabled={isLoading} />
          <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="h-12 w-12 rounded-full shrink-0"><Send className="h-5 w-5" /></Button>
        </form>
      </div>
    </motion.div>
  );
};

export default ChatInterface;
