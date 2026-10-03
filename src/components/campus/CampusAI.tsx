import { FormEvent, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { executeCampusIntent, understandCampusIntent } from "@/lib/campusos-ai";

const CampusAI = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("Tell me what you need. I can start campus services, not just answer questions.");
  const [busy, setBusy] = useState(false);
  const [intent, setIntent] = useState("Ready");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    const value = input.trim();
    const understood = understandCampusIntent(value);
    setIntent(understood.intent.replaceAll("_", " ").toUpperCase());
    setBusy(true);
    try {
      if (!user) {
        setReply(`I understood: ${understood.title}. Sign in to let me execute the service for your student account.`);
      } else {
        const result = await executeCampusIntent(value, user.id);
        setReply(result.message);
      }
    } catch (error) {
      setReply(error instanceof Error ? error.message : "I couldn't complete that workflow. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return <>
    <button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 z-[9000] bg-[#FF6500] px-5 py-3 font-mono text-xs font-black uppercase tracking-[0.12em] text-white shadow-xl transition-transform hover:-translate-y-1" aria-label="Open CampusOS AI">
      ASK CAMPUSOS
    </button>
    {open && <div className="fixed inset-0 z-[10000] flex items-end justify-end bg-[#0B192C]/35 p-4 md:p-8 backdrop-blur-[2px]" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <section className="w-full max-w-xl border border-[#17252A]/15 bg-[#F7FCFC] shadow-2xl">
        <header className="bg-[#17252A] px-6 py-5 text-white">
          <div className="flex items-start justify-between"><div><div className="font-mono text-[10px] tracking-[0.24em] text-[#9BD5D2]">CAMPUSOS / INTENT ENGINE</div><h2 className="mt-2 text-2xl font-black uppercase">JUST SAY WHAT YOU NEED.</h2></div><button onClick={() => setOpen(false)} className="text-2xl text-white/70 hover:text-white" aria-label="Close">×</button></div>
          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3 font-mono text-[10px] uppercase tracking-wider text-white/50"><span>Intent: {intent}</span><span>Voice-ready</span></div>
        </header>
        <div className="space-y-4 p-6">
          <div className="border border-[#2B7A78]/20 bg-white p-5 text-sm leading-6 text-[#17252A]">{reply}</div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#4E6265]">Try</div>
          <div className="grid gap-2 text-xs font-mono uppercase"><button onClick={() => setInput("Enakku bonafide certificate venum scholarship-ku")} className="border border-[#17252A]/10 bg-white p-3 text-left hover:border-[#2B7A78]">“Enakku bonafide certificate venum scholarship-ku.”</button><button onClick={() => setInput("I need to book an appointment with placement") } className="border border-[#17252A]/10 bg-white p-3 text-left hover:border-[#2B7A78]">“I need to book an appointment with placement.”</button><button onClick={() => setInput("Where is the exam cell?")} className="border border-[#17252A]/10 bg-white p-3 text-left hover:border-[#2B7A78]">“Where is the exam cell?”</button></div>
          <form onSubmit={submit} className="flex gap-2"><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Say or type what you need..." className="min-w-0 flex-1 border border-[#17252A]/20 bg-white px-4 py-3 text-sm outline-none focus:border-[#2B7A78]"/><button disabled={busy} className="bg-[#2B7A78] px-5 py-3 font-mono text-xs font-black uppercase text-white disabled:opacity-50">{busy ? "..." : "RUN"}</button></form>
          <p className="text-[11px] leading-5 text-[#4E6265]">CampusOS uses intent detection to route you into real campus workflows. It does not invent a request or submit anything without your signed-in account.</p>
        </div>
      </section>
    </div>}
  </>;
};
export default CampusAI;
