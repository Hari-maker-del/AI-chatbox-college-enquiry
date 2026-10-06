import { useEffect, useState } from "react";
import { BriefcaseBusiness, X, ArrowLeft, CheckCircle2 } from "lucide-react";
import { listCampusServices, createServiceRequest, type CampusService } from "@/lib/campusos";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function CampusServiceCatalog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open,setOpen]=useState(false);
  const [services,setServices]=useState<CampusService[]>([]);
  const [loading,setLoading]=useState(false);
  const [selected,setSelected]=useState<CampusService|null>(null);
  const [values,setValues]=useState<Record<string,string>>({});
  const [saving,setSaving]=useState(false);
  const [done,setDone]=useState<string|null>(null);

  const load=async()=>{setLoading(true);try{setServices(await listCampusServices());}catch(error){toast({title:"Could not load services",description:error instanceof Error?error.message:"Please try again.",variant:"destructive"});}finally{setLoading(false);}};
  useEffect(()=>{if(open)void load();},[open]);

  const start=(service:CampusService)=>{
    setSelected(service);
    setDone(null);
    setValues(Object.fromEntries(service.requirements.map(requirement=>[requirement,""])));
  };

  const submit=async()=>{
    if(!user||!selected)return;
    const missing=selected.requirements.find(requirement=>!values[requirement]?.trim());
    if(missing){toast({title:"Requirement needed",description:`Please provide: ${missing}`});return;}
    setSaving(true);
    try{
      const request=await createServiceRequest({
        userId:user.id,
        serviceType:selected.service_type,
        title:selected.name,
        purpose:selected.description??"Student service request",
        details:{serviceId:selected.id,requirements:values,department:selected.department,source:"service_catalog"},
      });
      setDone(request.request_code);
    }catch(error){toast({title:"Request could not be created",description:error instanceof Error?error.message:"Please try again.",variant:"destructive"});}
    finally{setSaving(false);}
  };

  const close=()=>{setOpen(false);setSelected(null);setDone(null);};

  return <>
    <button onClick={()=>setOpen(true)} className="fixed bottom-6 left-6 z-[9998] flex items-center gap-3 border border-[#17252a]/20 bg-white px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[#17252a] shadow-xl transition hover:bg-[#def2f1]"><BriefcaseBusiness className="h-4 w-4 text-[#2b7a78]"/> SERVICES</button>
    {open&&<div className="fixed inset-0 z-[10000] flex items-end justify-start bg-[#0b192c]/40 p-4 md:p-6">
      <section className="w-full max-w-xl border border-[#17252a]/15 bg-[#f7fcfc] shadow-2xl">
        <header className="flex items-start justify-between border-b border-[#17252a]/10 bg-[#def2f1] p-5">
          <div>{selected&&<button onClick={()=>setSelected(null)} className="mb-2 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-[#2b7a78]"><ArrowLeft className="h-3 w-3"/> All services</button>}
            <div className="font-mono text-[10px] tracking-[0.22em] text-[#2b7a78]">CAMPUSOS / SERVICE CATALOG</div>
            <h2 className="mt-1 text-2xl font-black uppercase">{selected?.name??"STUDENT SERVICES"}</h2>
            <p className="mt-1 text-sm text-[#4e6265]">{selected?.description??"Services published by your college administration."}</p>
          </div>
          <button onClick={close} aria-label="Close"><X className="h-5 w-5"/></button>
        </header>

        <div className="max-h-[65vh] overflow-auto p-5">
          {done?<div className="py-10 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-[#2b7a78]"/><h3 className="mt-4 text-xl font-black uppercase">REQUEST SUBMITTED</h3><p className="mt-2 text-sm text-[#4e6265]">Request <b>{done}</b> has been sent to {selected?.department||"the responsible campus team"}.</p><button onClick={close} className="mt-6 bg-[#ff6500] px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white">DONE</button></div>
          :selected?<div className="space-y-5">
            <div className="border border-[#17252a]/10 bg-white p-4"><div className="font-mono text-[10px] uppercase tracking-wider text-[#2b7a78]">REQUEST DETAILS</div><p className="mt-2 text-sm text-[#4e6265]">Complete the information required by the college for this service.</p></div>
            {selected.requirements.length===0?<div className="border border-dashed border-[#17252a]/15 p-5 text-sm text-[#4e6265]">No additional information is required. You can submit this request directly.</div>:selected.requirements.map(requirement=><label key={requirement} className="block text-xs font-bold uppercase tracking-wider text-[#17252a]">{requirement}<input required value={values[requirement]??""} onChange={e=>setValues({...values,[requirement]:e.target.value})} className="mt-2 w-full border border-[#17252a]/20 bg-white px-4 py-3 outline-none focus:border-[#2b7a78]" /></label>)}
            <button disabled={saving||!user} onClick={()=>void submit()} className="w-full bg-[#ff6500] px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50">{saving?"SUBMITTING...":!user?"SIGN IN TO SUBMIT":"SUBMIT REQUEST"}</button>
          </div>
          :loading?<div className="p-8 text-center text-sm text-[#4e6265]">Loading services...</div>
          :services.length===0?<div className="p-8 text-center text-sm text-[#4e6265]">No services are published yet.</div>
          :<div className="space-y-3">{services.map(s=><button key={s.id} onClick={()=>start(s)} className="w-full border border-[#17252a]/10 bg-white p-4 text-left transition hover:border-[#2b7a78]"><div className="flex justify-between gap-4"><div><h3 className="font-black uppercase text-[#17252a]">{s.name}</h3><p className="mt-1 text-sm text-[#4e6265]">{s.description||"Campus service"}</p></div><span className="font-mono text-[9px] uppercase text-[#2b7a78]">{s.department||"Campus"}</span></div>{s.requirements.length>0&&<div className="mt-3 border-t border-[#17252a]/10 pt-3 text-[10px] uppercase tracking-wider text-[#4e6265]">Requirements: {s.requirements.join(" · ")}</div>}<div className="mt-3 text-xs font-bold uppercase tracking-wider text-[#2b7a78]">START REQUEST →</div></button>)}</div>}
        </div>
      </section>
    </div>}
  </>;
}