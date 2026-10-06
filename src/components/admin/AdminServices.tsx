import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Service = {
  id: string; name: string; service_type: string; description: string | null;
  department: string | null; keywords: string[]; requirements: string[]; active: boolean;
};

const empty = { name:"", service_type:"other", description:"", department:"", keywords:"", requirements:"", active:true };

export default function AdminServices() {
  const { toast } = useToast();
  const [services,setServices]=useState<Service[]>([]);
  const [form,setForm]=useState(empty);
  const [editing,setEditing]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const load=async()=>{ setLoading(true); const {data,error}=await supabase.from("campus_service_catalog").select("*").order("name"); if(error) toast({title:"Could not load services",description:error.message,variant:"destructive"}); setServices((data as Service[])??[]); setLoading(false); };
  useEffect(()=>{void load();},[]);
  const save=async()=>{
    if(!form.name.trim()) return;
    const payload={name:form.name.trim(),service_type:form.service_type.trim()||"other",description:form.description.trim()||null,department:form.department.trim()||null,keywords:form.keywords.split(",").map(x=>x.trim()).filter(Boolean),requirements:form.requirements.split(",").map(x=>x.trim()).filter(Boolean),active:form.active};
    const result=editing ? await supabase.from("campus_service_catalog").update(payload).eq("id",editing) : await supabase.from("campus_service_catalog").insert(payload);
    if(result.error){toast({title:"Could not save service",description:result.error.message,variant:"destructive"});return;}
    toast({title:editing?"Service updated":"Service published"}); setForm(empty);setEditing(null);void load();
  };
  const edit=(s:Service)=>{setEditing(s.id);setForm({name:s.name,service_type:s.service_type,description:s.description??"",department:s.department??"",keywords:s.keywords.join(", "),requirements:s.requirements.join(", "),active:s.active});};
  const remove=async(id:string)=>{const {error}=await supabase.from("campus_service_catalog").delete().eq("id",id);if(error)toast({title:"Delete failed",description:error.message,variant:"destructive"});else void load();};
  return <section className="space-y-6">
    <div className="flex items-end justify-between"><div><div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">CampusOS / Service catalogue</div><h2 className="text-3xl font-semibold mt-2">DYNAMIC SERVICES</h2><p className="text-muted-foreground mt-2">Publish services without changing the student application.</p></div><Button variant="outline" onClick={()=>void load()}><RefreshCw className="h-4 w-4 mr-2"/>Refresh</Button></div>
    <div className="grid lg:grid-cols-[.8fr_1.2fr] gap-5">
      <div className="border bg-card p-6 space-y-4">
        <div className="text-xs uppercase tracking-[0.18em] text-[#2b7a78]">{editing?"Edit service":"Publish service"}</div>
        <Input placeholder="Service name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <Input placeholder="Service type (e.g. bonafide, hostel, id-card)" value={form.service_type} onChange={e=>setForm({...form,service_type:e.target.value})}/>
        <Input placeholder="Department / owner" value={form.department} onChange={e=>setForm({...form,department:e.target.value})}/>
        <Textarea placeholder="Short description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
        <Input placeholder="Keywords, comma separated" value={form.keywords} onChange={e=>setForm({...form,keywords:e.target.value})}/>
        <Input placeholder="Requirements, comma separated" value={form.requirements} onChange={e=>setForm({...form,requirements:e.target.value})}/>
        <div className="flex items-center justify-between border p-3"><span className="text-sm font-medium">Visible to students</span><Switch checked={form.active} onCheckedChange={active=>setForm({...form,active})}/></div>
        <div className="flex gap-2"><Button onClick={()=>void save()}><Plus className="h-4 w-4 mr-2"/>{editing?"Update":"Publish"}</Button>{editing&&<Button variant="outline" onClick={()=>{setEditing(null);setForm(empty)}}>Cancel</Button>}</div>
      </div>
      <div className="space-y-3">{loading?<div className="border p-6 text-muted-foreground">Loading service catalogue...</div>:services.map(s=><div key={s.id} className="border bg-card p-5 flex justify-between gap-4"><div><div className="flex items-center gap-2"><h3 className="font-semibold">{s.name}</h3><span className="text-[10px] uppercase tracking-wider text-[#2b7a78]">{s.active?"Live":"Hidden"}</span></div><p className="text-sm text-muted-foreground mt-1">{s.description||"No description"}</p><div className="mt-3 text-xs text-muted-foreground">{s.department||"Unassigned"} · {s.requirements.length?s.requirements.join(" · "):"No requirements"}</div><div className="mt-2 font-mono text-[10px] text-[#2b7a78]">{s.keywords.join(" · ")}</div></div><div className="flex shrink-0 gap-1"><Button variant="ghost" size="sm" onClick={()=>edit(s)}>Edit</Button><Button variant="ghost" size="icon" onClick={()=>void remove(s.id)}><Trash2 className="h-4 w-4"/></Button></div></div>)}</div>
    </div>
  </section>;
}