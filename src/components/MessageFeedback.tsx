import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function MessageFeedback({messageId}:{messageId:string}){
  const [rating,setRating]=useState<number|null>(null);
  const [saving,setSaving]=useState(false);
  const submit=async(next:number)=>{
    if(saving)return;
    setSaving(true);
    const db:any=supabase;
    const {error}=await db.from("message_feedback").upsert(
      {message_id:messageId,user_id:(await supabase.auth.getUser()).data.user?.id,rating:next},
      {onConflict:"message_id,user_id"}
    );
    setSaving(false);
    if(error) toast.error("Could not save feedback.");
    else {setRating(next);toast.success("Thanks for the feedback.");}
  };
  return <div className="mt-2 flex items-center gap-1">
    <Button aria-label="Helpful" variant={rating===1?"secondary":"ghost"} size="icon" className="h-7 w-7" disabled={saving} onClick={()=>submit(1)}><ThumbsUp className="h-3.5 w-3.5"/></Button>
    <Button aria-label="Not helpful" variant={rating===-1?"secondary":"ghost"} size="icon" className="h-7 w-7" disabled={saving} onClick={()=>submit(-1)}><ThumbsDown className="h-3.5 w-3.5"/></Button>
  </div>;
}
