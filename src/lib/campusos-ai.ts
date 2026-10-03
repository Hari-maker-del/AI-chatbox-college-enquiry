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

const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

export function understandCampusIntent(input: string): CampusIntentResult {
  const text = normalize(input);
  const has = (...words: string[]) => words.some((word) => text.includes(normalize(word)));

  if (has("bonafide", "bona fide", "bonafide certificate", "போனஃபைட்", "போனபைட்", "bonafide certificate venum")) {
    const purpose = has("scholarship", "scholarship ku", "scholarship kku", "ஸ்காலர்ஷிப்") ? "Scholarship" : has("higher studies", "higher study", "மேற்படிப்பு") ? "Higher Studies" : undefined;
    return { intent: "bonafide", confidence: 0.98, title: "Bonafide Certificate", purpose };
  }

  if (has("appointment", "meet", "meet hod", "meet faculty", "schedule", "appointment venum", "appointment book")) {
    const department = has("placement") ? "Placement Cell" : has("accounts", "fee") ? "Accounts" : has("it", "information technology") ? "Information Technology" : undefined;
    return { intent: "appointment", confidence: 0.94, title: "Book Appointment", department };
  }

  if (has("eligible", "eligibility", "eligible ah", "eligibility check", "தகுதி")) {
    return { intent: "eligibility", confidence: 0.92, title: "Course Eligibility Check" };
  }

  if (has("fee", "fees", "pay fee", "exam fee", "fees pay", "கட்டணம்")) {
    return { intent: "fee", confidence: 0.91, title: "Exam Fee Payment" };
  }

  if (has("ticket", "complaint", "problem", "issue", "help me", "support", "பிரச்சனை", "உதவி")) {
    return { intent: "support", confidence: 0.88, title: "Create Support Ticket" };
  }

  if (has("application", "request status", "status", "my requests", "my application", "என் application")) {
    return { intent: "application_status", confidence: 0.9, title: "My Applications" };
  }

  if (has("where is", "location", "map", "எங்கே", "campus", "exam cell", "library", "hostel")) {
    const location = has("exam cell") ? "Exam Cell" : has("library") ? "Library" : has("hostel") ? "Hostel" : undefined;
    return { intent: "campus_location", confidence: 0.86, title: "Campus Location", location };
  }

  return { intent: "unknown", confidence: 0, title: "CampusOS Assistant" };
}

export async function executeCampusIntent(input: string, userId: string, context?: { appointmentDate?: string; appointmentTime?: string }) {
  const result = understandCampusIntent(input);
  if (result.intent === "bonafide") {
    const request = await createServiceRequest({ userId, serviceType: "bonafide", title: result.title, purpose: result.purpose ?? "General purpose", details: { aiSource: true, originalText: input } });
    return { ...result, message: `I understood this as a Bonafide Certificate request${result.purpose ? ` for ${result.purpose}` : ""}. Request ${request.request_code} is now under review.` };
  }
  if (result.intent === "appointment") {
    const date = context?.appointmentDate ?? new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const time = context?.appointmentTime ?? "10:00:00";
    const appointment = await createAppointment({ userId, department: result.department ?? "Student Services", appointmentDate: date, appointmentTime: time, purpose: input });
    return { ...result, message: `I understood this as an appointment request. ${appointment.appointment_code} is booked for ${appointment.appointment_date}.` };
  }
  if (result.intent === "eligibility") return { ...result, message: "I can start the eligibility workflow. Tell me your percentage and preferred course." };
  if (result.intent === "fee") return { ...result, message: "I found the exam fee workflow. Open Exam Fee Payment to continue securely." };
  if (result.intent === "support") return { ...result, message: "I can route this to the right support team. Tell me the issue you are facing." };
  if (result.intent === "application_status") return { ...result, message: "I can open your live application tracker." };
  if (result.intent === "campus_location") return { ...result, message: result.location ? `${result.location} can be found from the Campus Map.` : "I can open the Campus Map and help you find a location." };
  return { ...result, message: "I can help with certificates, appointments, fees, eligibility, support tickets, application status and campus locations. Try: ‘Enakku bonafide certificate venum scholarship-ku.’" };
}
