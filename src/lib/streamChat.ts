import { supabase } from "@/integrations/supabase/client";
type Msg={role:"user"|"assistant";content:string};
export async function streamChat({messages,conversationId,onDelta,onDone}:{messages:Msg[];conversationId?:string|null;onDelta:(delta:string)=>void;onDone:()=>void}) {
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token) throw new Error("Please sign in to use the AI assistant.");
  const resp=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${session.access_token}`,"apikey":import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY},
    body:JSON.stringify({messages,conversationId:conversationId||undefined})
  });
  if(resp.status===401)throw new Error("Your session expired. Please sign in again.");
  if(resp.status===429)throw new Error("Rate limit exceeded. Please try again in a minute.");
  if(resp.status===402)throw new Error("AI service credits are unavailable.");
  if(!resp.ok||!resp.body)throw new Error("Failed to connect to AI.");
  const reader=resp.body.getReader();const decoder=new TextDecoder();let buffer="";let done=false;
  while(!done){const {done:readerDone,value}=await reader.read();if(readerDone)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split("\n");buffer=lines.pop()||"";for(let line of lines){line=line.replace(/\r$/,"");if(!line.startsWith("data: "))continue;const payload=line.slice(6).trim();if(payload==="[DONE]"){done=true;break;}try{const parsed=JSON.parse(payload);const content=parsed.choices?.[0]?.delta?.content;if(typeof content==="string")onDelta(content);}catch{} } }
  if(buffer.startsWith("data: ")){try{const parsed=JSON.parse(buffer.slice(6).trim());const content=parsed.choices?.[0]?.delta?.content;if(typeof content==="string")onDelta(content);}catch{}}
  onDone();
}
