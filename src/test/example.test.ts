import { describe, expect, it } from "vitest";
import { detectSpeechLanguage, SPEECH_LANGUAGES } from "@/lib/voice";
import { generateId, suggestions } from "@/lib/chatResponses";

describe("voice language detection", () => {
  it("detects Tamil", () => expect(detectSpeechLanguage("கல்லூரி கட்டணம் என்ன?")).toBe("ta-IN"));
  it("detects Hindi", () => expect(detectSpeechLanguage("कॉलेज फीस क्या है?")).toBe("hi-IN"));
  it("detects English", () => expect(detectSpeechLanguage("What are the fees?")).toBe("en-IN"));
  it("exposes supported Indian languages", () => expect(SPEECH_LANGUAGES.length).toBeGreaterThanOrEqual(6));
});

describe("chat helpers", () => {
  it("creates unique ids", () => expect(generateId()).not.toBe(generateId()));
  it("provides core enquiry suggestions", () => {
    expect(suggestions.map(x => x.label)).toEqual(expect.arrayContaining(["Admission process","Courses offered","Fee structure","Scholarships"]));
  });
});
