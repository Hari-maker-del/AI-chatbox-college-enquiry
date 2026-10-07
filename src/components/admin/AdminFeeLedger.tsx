import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Invoice = { id:string; user_id:string; title:string; category:string; amount:number; due_date:string|null; status:string; description:string|null; created_at:string };
type Payment = { id:string; user_id:string; invoice_id:string|null; amount:number; payment_status:string; payment_method:string|null; transaction_ref:string|null; created_at:string; paid_at:string|null };
const label=(s:string)=>s.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());

export default function AdminFeeLedger(){
 const [invoices,setInvoices]=useState<Invoice[]>([]); const [payments,setPayments]=useState<Payment[]>([]); const [loading,setLoading]=useState(true);
 const [userId,setUserId]=useState(""); const [title,setTitle]=useState(""); const [amount,setAmount]=useState(""); const [dueDate,setDueDate]=useState(""); const [saving,setSaving]=useState(false);
 const load=useCallback(async()=>{setLoading(true); const [a,b]=await Promise.all([
   supabase.from("campus_fee_invoices").select("id,user_id,title,category,amount,due_date,status,description,created_at").order("created_at",{ascending:false}),
   supabase.from("campus_fee_payments").select("id,user_id,invoice_id,amount,payment_status,payment_method,transaction_ref,created_at,paid_at").order("created_at",{ascending:false}).limit(50)
 ]); if(a.error||b.error) toast.error((a.error||b.error)?.message||"Could not load fee ledger."); setInvoices((a.data as Invoice[])||[]); setPayments((b.data as Payment[])||[]); setLoading(false)},[]);
 useEffect(()=>{void load()},[load]);
 const create=async()=>{if(!userId.trim()||!title.trim()||Number(amount)<=0){toast.error("Student user ID, title and a valid amount are required.");return} setSaving(true); const {error}=await supabase.from("campus_fee_invoices").insert({user_id:userId.trim(),title:title.trim(),category:"Academic Fee",amount:Number(amount),due_date:dueDate||null}); if(error)toast.error(error.message);else{toast.success("Fee invoice assigned.");setUserId("");setTitle("");setAmount("");setDueDate("");await load()} setSaving(false)};
 const markPaid=async(p:Payment)=>{const {error}=await supabase.from("campus_fee_payments").update({payment_status:"paid",paid_at:new Date().toISOString()}).eq("id",p.id); if(error)toast.error(error.message);else{toast.success("Payment marked paid.");await load()}};
 return <div className="space-y-6">
  <div><h2 className="text-lg font-semibold">Fee & Payment Operations</h2><p className="text-sm text-muted-foreground mt-1">Assign student invoices and reconcile gateway payment results.</p></div>
  <div className="border p-5 bg-card space-y-4"><div className="text-xs uppercase tracking-wider text-muted-foreground">Assign invoice</div><div className="grid md:grid-cols-4 gap-3"><Input placeholder="Student user ID" value={userId} onChange={e=>setUserId(e.target.value)}/><Input placeholder="Fee title" value={title} onChange={e=>setTitle(e.target.value)}/><Input type="number" min="1" placeholder="Amount ₹" value={amount} onChange={e=>setAmount(e.target.value)}/><Input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></div><Button disabled={saving} onClick={()=>void create()}>{saving?"ASSIGNING...":"ASSIGN FEE"}</Button></div>
  <div className="border bg-card"><div className="p-5 border-b"><h3 className="font-semibold">Student invoices</h3></div>{loading?<div className="p-6 text-muted-foreground">Loading...</div>:invoices.length===0?<div className="p-6 text-muted-foreground">No invoices assigned.</div>:<div className="divide-y">{invoices.map(i=><div key={i.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"><div><div className="font-medium">{i.title}</div><div className="text-xs text-muted-foreground">{i.user_id} · {i.due_date?("Due "+new Date(i.due_date).toLocaleDateString()):"No due date"}</div></div><div className="flex items-center gap-3"><b>₹{i.amount.toLocaleString("en-IN")}</b><Badge variant="outline">{label(i.status)}</Badge></div></div>)}</div>}</div>
  <div className="border bg-card"><div className="p-5 border-b"><h3 className="font-semibold">Recent payment attempts</h3></div>{payments.length===0?<div className="p-6 text-muted-foreground">No payment attempts.</div>:<div className="divide-y">{payments.map(p=><div key={p.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"><div><div className="font-medium">{p.transaction_ref||p.id.slice(0,8).toUpperCase()}</div><div className="text-xs text-muted-foreground">{p.user_id} · {new Date(p.created_at).toLocaleString()}</div></div><div className="flex items-center gap-3"><b>₹{p.amount.toLocaleString("en-IN")}</b><Badge variant="outline">{label(p.payment_status)}</Badge>{p.payment_status==="initiated"&&<Button size="sm" variant="outline" onClick={()=>void markPaid(p)}>MARK PAID</Button>}</div></div>)}</div>}</div>
 </div>
}
