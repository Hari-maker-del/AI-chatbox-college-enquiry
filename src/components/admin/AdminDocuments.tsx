import { useEffect, useState } from "react";
import { FileUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Doc={id:string;title:string;file_name:string;category:string;language:string;status:string;file_size_bytes:number|null;created_at:string};

export default function AdminDocuments(){
  const db:any=supabase;
  const [docs,setDocs]=useState<Doc[]>([]);
  const [title,setTitle]=useState("");
  const [category,setCategory]=useState("general");
  const [language,setLanguage]=useState("en");
  const [file,setFile]=useState<File|null>(null);
  const [busy,setBusy]=useState(false);

  const load=async()=>{const {data,error}=await db.from("knowledge_documents").select("*").order("created_at",{ascending:false});if(error)toast.error(error.message);else setDocs(data||[]);};
  useEffect(()=>{load();},[]);

  const upload=async()=>{
    if(!file||!title.trim())return toast.error("Title and PDF are required.");
    if(file.type!=="application/pdf")return toast.error("Only PDF documents are accepted.");
    if(file.size>20*1024*1024)return toast.error("PDF must be 20 MB or smaller.");
    setBusy(true);
    const user=(await supabase.auth.getUser()).data.user;
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=`${user?.id}/${crypto.randomUUID()}-${safeName}`;
    const uploaded=await supabase.storage.from("knowledge-documents").upload(path,file,{contentType:"application/pdf",upsert:false});
    if(uploaded.error){setBusy(false);return toast.error(uploaded.error.message);}
    const inserted=await db.from("knowledge_documents").insert({title:title.trim(),file_name:file.name,storage_path:path,mime_type:file.type,file_size_bytes:file.size,language,category,status:"draft",uploaded_by:user?.id}).select("id").single();
    if(inserted.error){await supabase.storage.from("knowledge-documents").remove([path]);setBusy(false);return toast.error(inserted.error.message);}
    await db.from("admin_audit_logs").insert({admin_user_id:user?.id,action:"upload",entity_type:"knowledge_document",entity_id:inserted.data?.id,metadata:{file_name:file.name}});
    setTitle("");setFile(null);setBusy(false);toast.success("PDF uploaded as a draft source. It is not used by the AI until processed and published.");load();
  };

  const remove=async(doc:Doc)=>{
    if(!confirm(`Delete ${doc.file_name}?`))return;
    if(doc.id){await db.from("knowledge_documents").delete().eq("id",doc.id);}
    if((doc as any).storage_path)await supabase.storage.from("knowledge-documents").remove([(doc as any).storage_path]);
    await load();
  };

  return <div className="space-y-4">
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="font-semibold">Source document intake</h3>
      <p className="text-sm text-muted-foreground">Upload official PDFs here. Documents remain drafts until their text is extracted into verified knowledge chunks and published.</p>
      <div className="grid gap-3 sm:grid-cols-2"><Input placeholder="Document title" value={title} onChange={e=>setTitle(e.target.value)}/><Input type="file" accept="application/pdf,.pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/></div>
      <div className="grid gap-3 sm:grid-cols-2"><select className="h-10 rounded-md border bg-background px-3" value={category} onChange={e=>setCategory(e.target.value)}><option>general</option><option>admissions</option><option>courses</option><option>fees</option><option>scholarships</option><option>hostel</option><option>placements</option><option>departments</option><option>contact</option><option>calendar</option><option>policies</option></select><Input placeholder="Language code" value={language} onChange={e=>setLanguage(e.target.value)}/></div>
      <Button disabled={busy} onClick={upload}><FileUp className="mr-2 h-4 w-4"/>{busy?"Uploading...":"Upload PDF"}</Button>
    </div>
    <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="p-3 text-left">Document</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Size</th><th className="p-3"/></tr></thead><tbody>{docs.map(d=><tr key={d.id} className="border-b last:border-0"><td className="p-3"><div className="font-medium">{d.title}</div><div className="text-xs text-muted-foreground">{d.file_name}</div></td><td className="p-3">{d.category}</td><td className="p-3">{d.status}</td><td className="p-3">{d.file_size_bytes?Math.round(d.file_size_bytes/1024):0} KB</td><td className="p-3 text-right"><Button size="icon" variant="ghost" onClick={()=>remove(d)}><Trash2 className="h-4 w-4"/></Button></td></tr>)}</tbody></table></div>
  </div>;
}
