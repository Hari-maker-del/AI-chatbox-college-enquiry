export const SPEECH_LANGUAGES = [
  { code: "en-IN", label: "English (India)" },
  { code: "ta-IN", label: "Tamil" },
  { code: "hi-IN", label: "Hindi" },
  { code: "te-IN", label: "Telugu" },
  { code: "ml-IN", label: "Malayalam" },
  { code: "kn-IN", label: "Kannada" },
] as const;
export function isSpeechRecognitionSupported() { return typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window); }
export function isSpeechSynthesisSupported() { return typeof window !== "undefined" && "speechSynthesis" in window; }
export function detectSpeechLanguage(text: string) {
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta-IN";
  if (/[\u0900-\u097F]/.test(text)) return "hi-IN";
  if (/[\u0C00-\u0C7F]/.test(text)) return "te-IN";
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml-IN";
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn-IN";
  return "en-IN";
}
export function speak(text: string, language?: string) {
  if (!isSpeechSynthesisSupported()) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/[#*_>|]/g, ""));
  utterance.lang = language || detectSpeechLanguage(text);
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
  return true;
}
