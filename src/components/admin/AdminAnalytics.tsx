import { useEffect, useState } from "react";
import { BarChart3, MessageCircle, Users, AlertTriangle, Clock3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AdminAnalytics() {
  const [stats,setStats]=useState({users:0,messages:0,errors:0,avgLatency:0,today:0});
  useEffect(()=>{const load=async()=>{
    const since=new Date(Date.now()-86400000).toISOString();
    const [{count:users},{count:messages},{count:errors},{data:latency},{count:today}]=await Promise.all([
      supabase.from("profiles").select("*",{count:"exact",head:true}),
      supabase.from("messages").select("*",{count:"exact",head:true}),
      supabase.from("ai_usage_events").select("*",{count:"exact",head:true}).eq("event_type","error"),
      supabase.from("ai_usage_events").select("latency_ms").eq("event_type","response").not("latency_ms","is",null).limit(500),
      supabase.from("ai_usage_events").select("*",{count:"exact",head:true}).eq("event_type","request").gte("created_at",since)
    ]);
    const values=(latency||[]).map(x=>x.latency_ms||0).filter(Boolean);
    setStats({users:users||0,messages:messages||0,errors:errors||0,avgLatency:values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):0,today:today||0});
  };load();},[]);
  const cards=[["Users",stats.users,Users],["Messages",stats.messages,MessageCircle],["AI Requests / 24h",stats.today,BarChart3],["AI Errors",stats.errors,AlertTriangle],["Avg latency",stats.avgLatency?stats.avgLatency+" ms":"—",Clock3]] as const;
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{cards.map(([label,value,Icon])=><div key={label} className="rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-primary"/></div><div className="mt-2 text-2xl font-bold">{value}</div></div>)}</div>;
}