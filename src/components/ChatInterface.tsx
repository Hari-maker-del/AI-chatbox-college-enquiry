import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { suggestions, generateId } from "@/lib/chatResponses";
import { streamChat, type ChatSource } from "@/lib/streamChat";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import VoiceControls from "@/components/VoiceControls";
import MessageFeedback from "@/components/MessageFeedback";

interface ChatMessage { id:string; role:"user"|"assistant"; content:string; sources?:ChatSource[]; }
interface ChatInterfaceProps { onBack:()=>void; }

const ChatBubble=({message}:{message:ChatMessage})=>{
  const isUser=message.role==="user";
  return <motion.div initial={{opacity:0,y:10,scale:.97}} animate={{opacity:1,y:0,scale:1}} transition={{duration:.3}} className={`flex items-end gap-3 mb-4 ${isUser?"flex-row-reverse":""}`}>
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">{isUser?<User className="h-4 w-4 text-primary-foreground"/>:<Bot className="h-4 w-4 text-primary-foreground"/>}</div>
    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${isUser?"chat-bubble-user rounded-br-sm":"chat-bubble-ai rounded-bl-sm"}`}>
      {isUser?<p className="text-sm whitespace-pre-wrap">{message.content}</p>:<div className="text-sm prose prose-sm max-w-none prose-headings:text-chat-ai-foreground prose-p:text-chat-ai-foreground prose-li:text-chat-ai-foreground prose-strong:text-chat-ai-foreground"><ReactMarkdown>{message.content}</ReactMarkdown></div>}
      {!isUser&&message.sources?.length ? <div className="mt-2 border-t border-border/60 pt-2"><p className="text-[11px] font-medium text-muted-foreground mb-1">Verified sources</p><div className="flex flex-wrap gap-2">{message.sources.map((source,index)=>source.url?<a key={`${source.title}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="text-[11px] text-primary underline underline-offset-2">{source.title}</a>:<span key={`${source.title}-${index}`} className="text-[11px] text-muted-foreground">{source.title}</span>)}</div></div>:null}
    </div>
  </motion.div>;
};

export default function ChatInterface({onBack}:ChatInterfaceProps){
  const {user}=useAuth();
  const [messages,setMessages]=useState<ChatMessage[]>([{id:generateId(),role:"assistant",content:"Hello! 👋 I'm your **AI College Enquiry Assistant**. Ask me about verified admissions, courses, fees, scholarships, hostel, placements, or college policies."}]);
  const [input,setInput]=useState(""); const [isLoading,setIsLoading]=useState(false); const [conversationId,setConversationId]=useState<string|null>(null); const [voiceLanguage,setVoiceLanguage]=useState("en-IN");
  const scrollRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight;},[messages,isLoading]);

  const sendMessage=async(text:string)=>{
    const trimmed=text.trim(); if(!trimmed||isLoading)return;
    if(!user){toast.error("Please sign in to use the AI assistant.");return;}
    const userMsg={id:generateId(),role:"user" as const,content:trimmed};
    const history=[...messages.filter(m=>m.id!==messages[0].id),userMsg].map(m=>({role:m.role,content:m.content}));
    setMessages(prev=>[...prev,userMsg]);setInput("");setIsLoading(true);
    let assistantSoFar="";const assistantId=generateId();
    try{
      let activeConversation=conversationId;
      if(!activeConversation){
        const db:any=supabase;
        const {data,error}=await db.from("conversations").insert({user_id:user.id,title:trimmed.slice(0,80),language:voiceLanguage}).select("id").single();
        if(error)throw error; activeConversation=data.id; setConversationId(data.id);
      }
      await streamChat({messages:history,conversationId:activeConversation,onDelta:(chunk)=>{
        assistantSoFar+=chunk;
        setMessages(prev=>{const last=prev[prev.length-1];if(last?.role==="assistant"&&last.id===assistantId)return prev.map(m=>m.id===assistantId?{...m,content:assistantSoFar}:m);return [...prev,{id:assistantId,role:"assistant",content:assistantSoFar}];});
      },onSources:(items)=>setMessages(prev=>prev.map(m=>m.id===assistantId?{...m,sources:items}:m)),onDone:()=>setIsLoading(false)});
    }catch(error:any){setIsLoading(false);toast.error(error?.message||"Failed to get AI response");}
  };

  return <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="flex flex-col h-[100dvh] bg-background">
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 glass-card">
      <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5"/></Button>
      <div className="flex items-center gap-3 mr-auto"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary"><Bot className="h-5 w-5 text-primary-foreground"/></div><div><h2 className="font-semibold text-foreground">College AI Assistant</h2><div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-accent"/><span className="text-xs text-muted-foreground">Verified knowledge mode</span></div></div></div>
      <VoiceControls language={voiceLanguage} onLanguageChange={setVoiceLanguage} onTranscript={sendMessage} responseText={messages[messages.length-1]?.role==="assistant"?messages[messages.length-1].content:""}/>
    </div>
    <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}><div className="max-w-3xl mx-auto"><AnimatePresence>{messages.map(msg=><ChatBubble key={msg.id} message={msg}/>)}</AnimatePresence>{isLoading&&<div className="text-xs text-muted-foreground py-2">AI is thinking…</div>}</div></ScrollArea>
    {messages.length<=1&&<div className="px-4 pb-2"><div className="max-w-3xl mx-auto flex flex-wrap gap-2">{suggestions.map(s=><button key={s.label} onClick={()=>sendMessage(s.label)} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"><span>{s.icon}</span>{s.label}</button>)}</div></div>}
    <div className="border-t border-border px-4 py-3 glass-card"><form onSubmit={e=>{e.preventDefault();sendMessage(input)}} className="max-w-3xl mx-auto flex gap-2"><Input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about admissions, courses, fees..." className="flex-1 rounded-full bg-secondary border-0 h-12 px-5" disabled={isLoading}/><Button type="submit" size="icon" disabled={!input.trim()||isLoading} className="h-12 w-12 rounded-full shrink-0"><Send className="h-5 w-5"/></Button></form></div>
  </motion.div>;
}
