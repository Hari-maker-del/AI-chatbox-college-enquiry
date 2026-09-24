import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isSpeechRecognitionSupported, isSpeechSynthesisSupported, SPEECH_LANGUAGES, speak } from "@/lib/voice";

type Recognition = { lang:string; continuous:boolean; interimResults:boolean; start:()=>void; stop:()=>void; onresult:((event:any)=>void)|null; onerror:((event:any)=>void)|null; onend:(()=>void)|null };

export default function VoiceControls({ onTranscript, language, onLanguageChange, responseText }:{
  onTranscript:(text:string)=>void; language:string; onLanguageChange:(language:string)=>void; responseText:string;
}) {
  const recognitionRef=useRef<Recognition|null>(null);
  const [listening,setListening]=useState(false);
  const [autoSpeak,setAutoSpeak]=useState(false);
  const startListening=()=>{
    if(!isSpeechRecognitionSupported()){toast.error("Voice input is not supported in this browser.");return;}
    const Ctor=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    const recognition:Recognition=new Ctor();
    recognition.lang=language; recognition.continuous=false; recognition.interimResults=false;
    recognition.onresult=(event)=>{const text=event.results?.[0]?.[0]?.transcript?.trim();if(text)onTranscript(text);};
    recognition.onerror=()=>{setListening(false);toast.error("Voice input failed. Please try again.");};
    recognition.onend=()=>setListening(false);
    recognitionRef.current=recognition;setListening(true);recognition.start();
  };
  const stopListening=()=>{recognitionRef.current?.stop();setListening(false);};
  useEffect(()=>{if(autoSpeak&&responseText)speak(responseText,language);},[responseText,autoSpeak,language]);
  return <div className="flex items-center gap-1">
    <select aria-label="Voice language" value={language} onChange={e=>onLanguageChange(e.target.value)} className="h-9 rounded-md border border-border bg-background px-2 text-xs">
      {SPEECH_LANGUAGES.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}
    </select>
    <Button type="button" variant={listening?"default":"outline"} size="icon" onClick={listening?stopListening:startListening} title={listening?"Stop voice input":"Voice input"}>{listening?<MicOff className="h-4 w-4"/>:<Mic className="h-4 w-4"/>}</Button>
    <Button type="button" variant={autoSpeak?"default":"outline"} size="icon" onClick={()=>setAutoSpeak(v=>!v)} title={autoSpeak?"Mute AI voice":"Speak AI responses"} disabled={!isSpeechSynthesisSupported()}>{autoSpeak?<Volume2 className="h-4 w-4"/>:<VolumeX className="h-4 w-4"/>}</Button>
  </div>;
}
