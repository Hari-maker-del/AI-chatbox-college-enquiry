import { createServiceRequest, createAppointment } from "@/lib/campusos";

export type CampusIntent =
  | "bonafide"
  | "appointment"
  | "eligibility"
  | "support"
  | "fee"
  | "application_status"
  | "campus_location"
  | "unknown";

export type CampusIntentResult = {
  intent: CampusIntent;
  confidence: number;
  title: string;
  purpose?: string;
  department?: string;
  location?: string;
};

export type CampusAILanguage = "en" | "ta";

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const hasTamilScript = (text: string) => /[\u0B80-\u0BFF]/u.test(text);

const has = (text: string, ...words: string[]) =>
  words.some((word) => text.includes(normalize(word)));

export function detectCampusLanguage(input: string): CampusAILanguage {
  return hasTamilScript(input)
    ? "ta"
    : has(input, "enakku", "venum", "irukku", "enga", "engae", "epdi", "pannanum", "ku", "kku", "tamil")
      ? "ta"
      : "en";
}

export function understandCampusIntent(input: string): CampusIntentResult {
  const text = normalize(input);

  if (has(text, "bonafide", "bona fide", "bonafide certificate", "போனஃபைட்", "போனபைட்", "bonafide certificate venum")) {
    const purpose = has(text, "scholarship", "scholarship ku", "scholarship kku", "ஸ்காலர்ஷிப்")
      ? "Scholarship"
      : has(text, "higher studies", "higher study", "மேற்படிப்பு")
        ? "Higher Studies"
        : undefined;
    return { intent: "bonafide", confidence: 0.98, title: "Bonafide Certificate", purpose };
  }

  if (has(text, "appointment", "meet", "meet hod", "meet faculty", "schedule", "appointment venum", "appointment book")) {
    const department = has(text, "placement")
      ? "Placement Cell"
      : has(text, "accounts", "fee")
        ? "Accounts"
        : has(text, "it", "information technology")
          ? "Information Technology"
          : undefined;
    return { intent: "appointment", confidence: 0.94, title: "Book Appointment", department };
  }

  if (has(text, "eligible", "eligibility", "eligible ah", "eligibility check", "தகுதி")) {
    return { intent: "eligibility", confidence: 0.92, title: "Course Eligibility Check" };
  }

  if (has(text, "fee", "fees", "pay fee", "exam fee", "fees pay", "கட்டணம்")) {
    return { intent: "fee", confidence: 0.91, title: "Exam Fee Payment" };
  }

  if (has(text, "ticket", "complaint", "problem", "issue", "help me", "support", "பிரச்சனை", "உதவி")) {
    return { intent: "support", confidence: 0.88, title: "Create Support Ticket" };
  }

  if (has(text, "application", "request status", "status", "my requests", "my application", "என் application")) {
    return { intent: "application_status", confidence: 0.9, title: "My Applications" };
  }

  if (has(text, "where is", "location", "map", "எங்கே", "campus", "exam cell", "library", "hostel")) {
    const location = has(text, "exam cell")
      ? "Exam Cell"
      : has(text, "library")
        ? "Library"
        : has(text, "hostel")
          ? "Hostel"
          : undefined;
    return { intent: "campus_location", confidence: 0.86, title: "Campus Location", location };
  }

  return { intent: "unknown", confidence: 0, title: "CampusOS Assistant" };
}

const englishMessage = (result: CampusIntentResult, input: string, data?: any) => {
  switch (result.intent) {
    case "bonafide":
      return `I understood this as a Bonafide Certificate request${result.purpose ? ` for ${result.purpose}` : ""}. Request ${data?.request_code} is now under review.`;
    case "appointment":
      return `I understood this as an appointment request. ${data?.appointment_code} is booked for ${data?.appointment_date}.`;
    case "eligibility":
      return "I can start the eligibility workflow. Tell me your percentage and preferred course.";
    case "fee":
      return "I found the exam fee workflow. Open Exam Fee Payment to continue securely.";
    case "support":
      return "I can route this to the right support team. Tell me the issue you are facing.";
    case "application_status":
      return "I can open your live application tracker.";
    case "campus_location":
      return result.location ? `${result.location} can be found from the Campus Map.` : "I can open the Campus Map and help you find a location.";
    default:
      return "I can help with certificates, appointments, fees, eligibility, support tickets, application status and campus locations. Try: “Enakku bonafide certificate venum scholarship-ku.”";
  }
};

const tamilMessage = (result: CampusIntentResult, data?: any) => {
  switch (result.intent) {
    case "bonafide":
      return `போனஃபைட் சான்றிதழ் கோரிக்கையை புரிந்துகொண்டேன்${result.purpose ? ` — ${result.purpose}க்காக` : ""}. உங்கள் கோரிக்கை ${data?.request_code ?? ""} இப்போது பரிசீலனையில் உள்ளது.`;
    case "appointment":
      return `Appointment கோரிக்கையை புரிந்துகொண்டேன். ${data?.appointment_code ?? ""} ${data?.appointment_date ?? ""} அன்று பதிவு செய்யப்பட்டுள்ளது.`;
    case "eligibility":
      return "Eligibility workflow-ஐ தொடங்கலாம். உங்கள் percentage மற்றும் விரும்பும் course-ஐ சொல்லுங்கள்.";
    case "fee":
      return "Exam fee payment workflow கிடைத்துள்ளது. பாதுகாப்பாக தொடர Exam Fee Payment-ஐ திறக்கவும்.";
    case "support":
      return "சரியான support team-க்கு உங்கள் பிரச்சனையை அனுப்பலாம். என்ன பிரச்சனை என்று சொல்லுங்கள்.";
    case "application_status":
      return "உங்கள் applications-ன் live status-ஐ திறந்து பார்க்கலாம்.";
    case "campus_location":
      return result.location ? `${result.location} Campus Map-ல் காணலாம்.` : "Campus Map-ஐ திறந்து location-ஐ கண்டுபிடிக்கலாம்.";
    default:
      return "Certificate, appointment, fees, eligibility, support, application status மற்றும் campus locations பற்றி நான் உதவ முடியும். உதாரணமாக: “enakku bonafide certificate venum scholarship-ku.”";
  }
};

export async function executeCampusIntent(
  input: string,
  userId: string,
  context?: { appointmentDate?: string; appointmentTime?: string; language?: CampusAILanguage }
) {
  const result = understandCampusIntent(input);
  const language = context?.language ?? detectCampusLanguage(input);

  if (result.intent === "bonafide") {
    const request = await createServiceRequest({
      userId,
      serviceType: "bonafide",
      title: result.title,
      purpose: result.purpose ?? "General purpose",
      details: { aiSource: true, originalText: input, detectedLanguage: language },
    });
    return { ...result, language, message: language === "ta" ? tamilMessage(result, request) : englishMessage(result, input, request) };
  }

  if (result.intent === "appointment") {
    const date = context?.appointmentDate ?? new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const time = context?.appointmentTime ?? "10:00:00";
    const appointment = await createAppointment({
      userId,
      department: result.department ?? "Student Services",
      appointmentDate: date,
      appointmentTime: time,
      purpose: input,
    });
    return { ...result, language, message: language === "ta" ? tamilMessage(result, appointment) : englishMessage(result, input, appointment) };
  }

  return {
    ...result,
    language,
    message: language === "ta" ? tamilMessage(result) : englishMessage(result, input),
  };
}
