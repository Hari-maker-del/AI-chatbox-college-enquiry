import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function NotificationBell(){
  const db:any=supabase; const [items,setItems]=useState<any[]>([]);
  const load=async()=>{const {data}=await db.from("notifications").select("*").is("read_at",null).order("created_at",{ascending:false}).limit(5);setItems(data||[]);};
  useEffect(()=>{load();},[]);
  const markRead=async(id:string)=>{await db.from("notifications").update({read_at:new Date().toISOString()}).eq("id",id);setItems(v=>v.filter(x=>x.id!==id));toast.success("Notification marked as read.");};
  return <div className="relative"><Button variant="ghost" size="icon" onClick={()=>items[0]?markRead(items[0].id):toast("No new notifications")} aria-label="Notifications"><Bell className="h-5 w-5"/>{items.length>0&&<span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive"/>}</Button></div>;
}
