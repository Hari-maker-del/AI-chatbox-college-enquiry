import { useEffect, useState } from "react";
import { BriefcaseBusiness, X } from "lucide-react";
import { listCampusServices, type CampusService } from "@/lib/campusos";

export default function CampusServiceCatalog() {
  const [open,setOpen]=useState(false);
  const [services,setServices]=useState<CampusService[]>([]);
  const [loading,setLoading]=useState(false);
  const load=async()=>{setLoading(true);try{setServices(await listCampusServices());}finally{setLoading(false);}};
  useEffect(()=>{if(open)void load();},[open]);
  return <>
    <button onClick={()=>setOpen(true)} className="fixed bottom-6 left-6 z-[9998] flex items-center gap-3 border border-[#17252a]/20 bg-white px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[#17252a] shadow-xl transition hover:bg-[#def2f1]"><BriefcaseBusiness className="h-4 w-4 text-[#2b7a78]"/> SERVICES</button>
    {open&&<div className="fixed inset-0 z-[10000] flex items-end justify-start bg-[#0b192c]/40 p-4 md:p-6">
      <section className="w-full max-w-xl border border-[#17252a]/15 bg-[#f7fcfc] shadow-2xl">
        <header className="flex items-start justify-between border-b border-[#17252a]/10 bg-[#def2f1] p-5"><div><div className="font-mono text-[10px] tracking-[0.22em] text-[#2b7a78]">CAMPUSOS / SERVICE CATALOG</div><h2 className="mt-1 text-2xl font-black uppercase">STUDENT SERVICES</h2><p className="mt-1 text-sm text-[#4e6265]">Services published by your college administration.</p></div><button onClick={()=>setOpen(false)} aria-label="Close"><X className="h-5 w-5"/></button></header>
        <div className="max-h-[65vh] overflow-auto p-5">{loading?<div className="p-8 text-center text-sm text-[#4e6265]">Loading services...</div>:services.length===0?<div className="p-8 text-center text-sm text-[#4e6265]">No services are published yet.</div>:<div className="space-y-3">{services.map(s=><div key={s.id} className="border border-[#17252a]/10 bg-white p-4"><div className="flex justify-between gap-4"><div><h3 className="font-black uppercase text-[#17252a]">{s.name}</h3><p className="mt-1 text-sm text-[#4e6265]">{s.description||"Campus service"}</p></div><span className="font-mono text-[9px] uppercase text-[#2b7a78]">{s.department||"Campus"}</span></div>{s.requirements.length>0&&<div className="mt-3 border-t border-[#17252a]/10 pt-3 text-[10px] uppercase tracking-wider text-[#4e6265]">Requirements: {s.requirements.join(" · ")}</div>}<div className="mt-3 text-xs text-[#4e6265]">Say <b>"I need {s.name}"</b> to CampusOS AI to start this service.</div></div>)}</div>}</div>
      </section>
    </div>}
  </>;
}