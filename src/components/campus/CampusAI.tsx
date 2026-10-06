import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  detectCampusLanguage,
  executeCampusIntent,
  understandCampusIntent,
} from "@/lib/campusos-ai";
import {
  getStudentProfile,
  updateStudentProfile,
  type StudentProfile,
} from "@/lib/campusos";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

type VoiceLanguage = "en-IN" | "ta-IN";
type PendingIntent = "eligibility" | null;

const emptyProfile: StudentProfile = {
  user_id: "",
  full_name: "",
  email: "",
  phone: "",
  roll_number: "",
  department: "",
  year_level: null,
  section: "",
  interests: "",
};

const CampusAI = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("Tell me what you need. I can start campus services, not just answer questions.");
  const [busy, setBusy] = useState(false);
  const [intent, setIntent] = useState("Ready");
  const [language, setLanguage] = useState<VoiceLanguage>("en-IN");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<"en" | "ta">("en");
  const [pendingIntent, setPendingIntent] = useState<PendingIntent>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<StudentProfile>(emptyProfile);
  const [profileSaving, setProfileSaving] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileDraft(emptyProfile);
      return;
    }
    getStudentProfile(user.id)
      .then((data) => {
        setProfile(data);
        if (data) setProfileDraft(data);
      })
      .catch(() => undefined);
  }, [user]);

  const selectedLanguage = detectedLanguage === "ta" ? "ta" : "en";
  const localized = (en: string, ta: string) => (selectedLanguage === "ta" ? ta : en);

  const speak = (message: string, responseLanguage: "en" | "ta" = selectedLanguage) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = responseLanguage === "ta" ? "ta-IN" : "en-IN";
    utterance.rate = language === "ta-IN" ? 0.92 : 0.98;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const startVoice = () => {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      const message = localized(
        "Voice input is not available in this browser. Please use Chrome or Edge, or type your request.",
        "இந்த உலாவியில் குரல் உள்ளீடு கிடைக்கவில்லை. Chrome அல்லது Edge பயன்படுத்தவும், இல்லையெனில் உங்கள் கோரிக்கையை தட்டச்சு செய்யவும்."
      );
      setReply(message);
      speak(message);
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) transcript += event.results[i][0].transcript;
      setInput(transcript);
      setDetectedLanguage(detectCampusLanguage(transcript));
    };
    recognition.onerror = () => {
      setListening(false);
      const message = localized(
        "I couldn't hear that clearly. Please try again or type your request.",
        "தெளிவாக கேட்கவில்லை. மீண்டும் முயற்சிக்கவும் அல்லது உங்கள் கோரிக்கையை தட்டச்சு செய்யவும்."
      );
      setReply(message);
      speak(message);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    setReply(localized("Listening... tell me what you need.", "கேட்கிறேன்... உங்கள் தேவையை சொல்லுங்கள்."));
    recognition.start();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;

    const value = input.trim();
    const workflowInput = pendingIntent ? `${pendingIntent} ${value}` : value;
    const understood = understandCampusIntent(workflowInput);
    setIntent(understood.intent.replaceAll("_", " ").toUpperCase());
    setBusy(true);

    try {
      if (!user) {
        const message = language === "ta-IN"
          ? `நான் புரிந்துகொண்டேன்: ${understood.title}. உங்கள் மாணவர் கணக்கில் சேவையை இயக்க முதலில் உள்நுழையுங்கள்.`
          : `I understood: ${understood.title}. Sign in to let me execute the service for your student account.`;
        setReply(message);
        speak(message);
      } else {
        const result = await executeCampusIntent(workflowInput, user.id, {
          language: selectedLanguage,
          profile,
        });
        setReply(result.message);
        speak(result.message, result.language);
        if (result.intent === "eligibility" && result.data?.eligibility === undefined) {
          setPendingIntent("eligibility");
        } else {
          setPendingIntent(null);
        }
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : localized(
            "I couldn't complete that workflow. Please try again.",
            "இந்த செயல்முறையை முடிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."
          );
      setReply(message);
      speak(message);
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setProfileSaving(true);
    try {
      const saved = await updateStudentProfile(user.id, {
        full_name: profileDraft.full_name,
        phone: profileDraft.phone,
        roll_number: profileDraft.roll_number,
        department: profileDraft.department,
        year_level: profileDraft.year_level,
        section: profileDraft.section,
        interests: profileDraft.interests,
      });
      setProfile(saved);
      setProfileDraft(saved);
      setProfileOpen(false);
      const message = selectedLanguage === "ta"
        ? "உங்கள் student profile சேமிக்கப்பட்டது. இனி CampusOS உங்கள் department மற்றும் year-ஐ பயன்படுத்தி பதில்களை personalize செய்யும்."
        : "Your student profile is saved. CampusOS will now personalize services using your department and year.";
      setReply(message);
      speak(message);
    } catch (error) {
      setReply(error instanceof Error ? error.message : "Could not save your profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[9000] bg-[#FF6500] px-5 py-3 font-mono text-xs font-black uppercase tracking-[0.12em] text-white shadow-xl transition-transform hover:-translate-y-1"
        aria-label="Open CampusOS AI"
      >
        ASK CAMPUSOS
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[10000] flex items-end justify-end bg-[#0B192C]/35 p-4 md:p-8 backdrop-blur-[2px]"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <section className="w-full max-w-xl border border-[#17252A]/15 bg-[#F7FCFC] shadow-2xl">
            <header className="bg-[#17252A] px-6 py-5 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-[10px] tracking-[0.24em] text-[#9BD5D2]">CAMPUSOS / PERSONAL AI</div>
                  <h2 className="mt-2 text-2xl font-black uppercase">JUST SAY WHAT YOU NEED.</h2>
                  {firstName && <div className="mt-1 text-sm text-[#9BD5D2]">Welcome back, {firstName}.</div>}
                </div>
                <button onClick={() => { stopSpeaking(); setOpen(false); }} className="text-2xl text-white/70 hover:text-white" aria-label="Close">×</button>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3 font-mono text-[10px] uppercase tracking-wider text-white/50">
                <span>Intent: {intent}</span>
                <span>{listening ? "Listening" : speaking ? "Speaking" : "Voice ready"}</span>
              </div>
            </header>

            <div className="space-y-4 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#4E6265]">Your campus profile</div>
                  <div className="mt-1 text-xs text-[#17252A]">
                    {profile?.department || "Department not set"}{profile?.year_level ? ` · Year ${profile.year_level}` : ""}
                  </div>
                </div>
                <button type="button" onClick={() => setProfileOpen(true)} className="border border-[#2B7A78] px-3 py-2 font-mono text-[10px] font-bold uppercase text-[#2B7A78]">Edit profile</button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4E6265]">Voice language</span>
                <button type="button" onClick={() => setLanguage("en-IN")} className={`border px-3 py-1.5 font-mono text-[10px] uppercase ${language === "en-IN" ? "border-[#2B7A78] bg-[#2B7A78] text-white" : "border-[#17252A]/15 bg-white"}`}>English</button>
                <button type="button" onClick={() => setLanguage("ta-IN")} className={`border px-3 py-1.5 font-mono text-[10px] uppercase ${language === "ta-IN" ? "border-[#2B7A78] bg-[#2B7A78] text-white" : "border-[#17252A]/15 bg-white"}`}>Tamil / தமிழ்</button>
              </div>

              <div className="border border-[#2B7A78]/20 bg-white p-5 text-sm leading-6 text-[#17252A]">{reply}</div>

              <div className="flex justify-between gap-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#4E6265]">Try speaking or typing</div>
                {speaking && (
                  <button type="button" onClick={stopSpeaking} className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#FF6500]">Stop voice</button>
                )}
              </div>

              <div className="grid gap-2 text-xs font-mono uppercase">
                <button onClick={() => { setPendingIntent(null); setInput("Enakku bonafide certificate venum scholarship-ku"); }} className="border border-[#17252A]/10 bg-white p-3 text-left hover:border-[#2B7A78]">“Enakku bonafide certificate venum scholarship-ku.”</button>
                <button onClick={() => { setPendingIntent(null); setInput("I need to book an appointment with placement"); }} className="border border-[#17252A]/10 bg-white p-3 text-left hover:border-[#2B7A78]">“I need to book an appointment with placement.”</button>
                <button onClick={() => { setPendingIntent("eligibility"); setInput("I want to check my eligibility"); }} className="border border-[#17252A]/10 bg-white p-3 text-left hover:border-[#2B7A78]">“I want to check my eligibility.”</button>
              </div>

              <form onSubmit={submit} className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={language === "ta-IN" ? "உங்களுக்கு என்ன வேண்டும் என்று சொல்லுங்கள்..." : "Say or type what you need..."}
                  className="min-w-0 flex-1 border border-[#17252A]/20 bg-white px-4 py-3 text-sm outline-none focus:border-[#2B7A78]"
                />
                <button
                  type="button"
                  onClick={startVoice}
                  className={`border px-4 py-3 font-mono text-xs font-black uppercase ${listening ? "border-[#FF6500] bg-[#FF6500] text-white" : "border-[#2B7A78] bg-white text-[#2B7A78]"}`}
                  aria-label={listening ? "Stop listening" : "Start voice input"}
                >
                  {listening ? "STOP" : "MIC"}
                </button>
                <button disabled={busy || listening} className="bg-[#2B7A78] px-5 py-3 font-mono text-xs font-black uppercase text-white disabled:opacity-50">
                  {busy ? "..." : "RUN"}
                </button>
              </form>

              <p className="text-[11px] leading-5 text-[#4E6265]">
                CampusOS uses your saved academic profile to personalize eligibility checks, appointment routing and service context. Speak in English or Tamil; Tanglish is supported by the intent engine.
              </p>
            </div>
          </section>
        </div>
      )}

      {profileOpen && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-[#0B192C]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg border border-[#17252A]/15 bg-[#F7FCFC] shadow-2xl">
            <div className="flex items-start justify-between bg-[#DEF2F1] px-6 py-5">
              <div>
                <div className="font-mono text-[10px] tracking-[0.2em] text-[#2B7A78]">CAMPUSOS / PROFILE</div>
                <h3 className="mt-2 text-xl font-black uppercase text-[#17252A]">STUDENT CONTEXT</h3>
              </div>
              <button type="button" onClick={() => setProfileOpen(false)} className="text-2xl text-[#17252A]" aria-label="Close">×</button>
            </div>
            <form onSubmit={saveProfile} className="space-y-4 p-6">
              <input value={profileDraft.full_name ?? ""} onChange={(e) => setProfileDraft({ ...profileDraft, full_name: e.target.value })} placeholder="Full name" className="w-full border border-[#17252A]/20 bg-white px-4 py-3 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input value={profileDraft.roll_number ?? ""} onChange={(e) => setProfileDraft({ ...profileDraft, roll_number: e.target.value })} placeholder="Roll number" className="w-full border border-[#17252A]/20 bg-white px-4 py-3 text-sm" />
                <input value={profileDraft.phone ?? ""} onChange={(e) => setProfileDraft({ ...profileDraft, phone: e.target.value })} placeholder="Phone" className="w-full border border-[#17252A]/20 bg-white px-4 py-3 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={profileDraft.department ?? ""} onChange={(e) => setProfileDraft({ ...profileDraft, department: e.target.value })} placeholder="Department (e.g. IT)" className="w-full border border-[#17252A]/20 bg-white px-4 py-3 text-sm" />
                <input type="number" min="1" max="8" value={profileDraft.year_level ?? ""} onChange={(e) => setProfileDraft({ ...profileDraft, year_level: e.target.value ? Number(e.target.value) : null })} placeholder="Year" className="w-full border border-[#17252A]/20 bg-white px-4 py-3 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={profileDraft.section ?? ""} onChange={(e) => setProfileDraft({ ...profileDraft, section: e.target.value })} placeholder="Section" className="w-full border border-[#17252A]/20 bg-white px-4 py-3 text-sm" />
                <input value={profileDraft.interests ?? ""} onChange={(e) => setProfileDraft({ ...profileDraft, interests: e.target.value })} placeholder="Interests (AI, placements...)" className="w-full border border-[#17252A]/20 bg-white px-4 py-3 text-sm" />
              </div>
              <div className="flex justify-end gap-3 border-t border-[#17252A]/10 pt-4">
                <button type="button" onClick={() => setProfileOpen(false)} className="border border-[#17252A]/20 px-5 py-3 font-mono text-xs font-bold uppercase">Cancel</button>
                <button disabled={profileSaving} className="bg-[#FF6500] px-6 py-3 font-mono text-xs font-bold uppercase text-white disabled:opacity-50">{profileSaving ? "Saving..." : "Save profile"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CampusAI;
