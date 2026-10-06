import { createServiceRequest, createAppointment, createSupportTicket, createPaymentIntent, getApplicationStatus, getApplicationTimeline, findEligibleCourses } from "@/lib/campusos";

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
  text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

const hasTamilScript = (text: string) => /[\u0B80-\u0BFF]/u.test(text);
const has = (text: string, ...words: string[]) => words.some((word) => text.includes(normalize(word)));

export function detectCampusLanguage(input: string): CampusAILanguage {
  return hasTamilScript(input)
    ? "ta"
    : has(input, "enakku", "venum", "irukku", "enga", "engae", "epdi", "pannanum", "ku", "kku", "tamil")
      ? "ta"
      : "en";
}

export function understandCampusIntent(input: string): CampusIntentResult {
  const text = normalize(input);\n  const percentageMatch = text.match(/(?:percentage|percent|mark|score|cutoff)\\s*(?:is|of|:)?\\s*(\\d+(?:\\.\\d+)?)/i) ?? text.match(/(\\d+(?:\\.\\d+)?)\\s*(?:percent|%)/i);\n  const percentage = percentageMatch ? Number(percentageMatch[1]) : undefined;

  if (has(text, "bonafide", "bona fide", "bonafide certificate", "போனஃபைட்", "போனபைட்")) {
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
    const stream = has(text, "computer science", "cse") ? "Computer Science" : has(text, "information technology", "it") ? "Information Technology" : has(text, "commerce") ? "Commerce" : has(text, "science") ? "Science" : undefined;\n    const courseQuery = has(text, "bca") ? "BCA" : has(text, "bsc") ? "B.Sc" : has(text, "btech", "b.tech") ? "B.Tech" : undefined;\n    return { intent: "eligibility", confidence: 0.92, title: "Course Eligibility Check", percentage, stream, courseQuery };
  }

  if (has(text, "fee", "fees", "pay fee", "exam fee", "fees pay", "கட்டணம்")) {
    return { intent: "fee", confidence: 0.91, title: "Exam Fee Payment" };
  }

  if (has(text, "ticket", "complaint", "problem", "issue", "help me", "support", "பிரச்சனை", "உதவி")) {
    return { intent: "support", confidence: 0.88, title: "Create Support Ticket" };
  }

  if (has(text, "application", "request status", "status", "my requests", "my application", "என் application", "என் application status")) {
    return { intent: "application_status", confidence: 0.9, title: "My Applications" };
  }

  if (has(text, "where is", "location", "map", "எங்கே", "campus", "exam cell", "library", "hostel")) {
    const location = has(text, "exam cell") ? "Exam Cell" : has(text, "library") ? "Library" : has(text, "hostel") ? "Hostel" : undefined;
    return { intent: "campus_location", confidence: 0.86, title: "Campus Location", location };
  }

  return { intent: "unknown", confidence: 0, title: "CampusOS Assistant" };
}

const englishMessage = (result: CampusIntentResult, input: string, data?: any) => {
  switch (result.intent) {
    case "bonafide":
      return `Bonafide Certificate request created${result.purpose ? ` for ${result.purpose}` : ""}. Request ${data?.request_code} is now under review.`;
    case "appointment":
      return `Appointment request created. ${data?.appointment_code} is booked for ${data?.appointment_date}.`;
    case "eligibility":
      return "I can start the eligibility workflow. Tell me your percentage and preferred course.";
    case "fee":
      return data?.payment
        ? `Exam fee payment session created for ₹${data.payment.amount}. Payment status: ${data.payment.payment_status}.`
        : "I can start the exam fee payment workflow.";
    case "support":
      return data?.ticket
        ? `Support ticket ${data.ticket.ticket_code} was created. The support team can now process your issue.`
        : "Tell me the issue and I will create a support ticket.";
    case "application_status": {
      if (!data?.selected) return "You do not have any campus applications yet.";
      const selected = data.selected;
      const latest = data.timeline?.[data.timeline.length - 1];
      return `Your ${selected.title} (${selected.request_code}) is currently ${selected.status.replaceAll("_", " ")}.${latest?.note ? ` Latest update: ${latest.note}` : ""}`;
    }
    case "campus_location":
      return result.location ? `${result.location} can be found from the Campus Map.` : "I can open the Campus Map and help you find a location.";
    default:
      return "I can help with certificates, appointments, fees, eligibility, support tickets, application status and campus locations.";
  }
};

const tamilMessage = (result: CampusIntentResult, data?: any) => {
  switch (result.intent) {
    case "bonafide":
      return `போனஃபைட் சான்றிதழ் கோரிக்கை உருவாக்கப்பட்டது${result.purpose ? ` — ${result.purpose}க்காக` : ""}. உங்கள் கோரிக்கை ${data?.request_code ?? ""} இப்போது பரிசீலனையில் உள்ளது.`;
    case "appointment":
      return `Appointment கோரிக்கை உருவாக்கப்பட்டது. ${data?.appointment_code ?? ""} ${data?.appointment_date ?? ""} அன்று பதிவு செய்யப்பட்டுள்ளது.`;
    case "eligibility":
      return "Eligibility workflow-ஐ தொடங்கலாம். உங்கள் percentage மற்றும் விரும்பும் course-ஐ சொல்லுங்கள்.";
    case "fee":
      return data?.payment
        ? `₹${data.payment.amount} exam fee payment session உருவாக்கப்பட்டுள்ளது. Payment status: ${data.payment.payment_status}.`
        : "Exam fee payment workflow-ஐ தொடங்கலாம்.";
    case "support":
      return data?.ticket
        ? `உங்கள் support ticket ${data.ticket.ticket_code} உருவாக்கப்பட்டது. Support team இப்போது உங்கள் பிரச்சனையை process செய்யலாம்.`
        : "உங்கள் பிரச்சனையை சொல்லுங்கள். நான் support ticket உருவாக்குகிறேன்.";
    case "application_status": {
      if (!data?.selected) return "உங்கள் மாணவர் கணக்கில் இன்னும் எந்த application-மும் இல்லை.";
      const selected = data.selected;
      const latest = data.timeline?.[data.timeline.length - 1];
      return `உங்கள் ${selected.title} (${selected.request_code}) தற்போது ${selected.status.replaceAll("_", " ")} நிலையில் உள்ளது.${latest?.note ? ` சமீபத்திய update: ${latest.note}` : ""}`;
    }
    case "campus_location":
      return result.location ? `${result.location} Campus Map-ல் காணலாம்.` : "Campus Map-ஐ திறந்து location-ஐ கண்டுபிடிக்கலாம்.";
    default:
      return "Certificate, appointment, fees, eligibility, support, application status மற்றும் campus locations பற்றி நான் உதவ முடியும்.";
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

  if (result.intent === "application_status") {
    const data = await getApplicationStatus(userId, input);
    if (data.selected) data.timeline = await getApplicationTimeline(userId, data.selected.id);
    return { ...result, language, data, message: language === "ta" ? tamilMessage(result, data) : englishMessage(result, input, data) };
  }

  if (result.intent === "eligibility") {\n    if (result.percentage === undefined || Number.isNaN(result.percentage)) {\n      return { ...result, language, message: language === "ta" ? tamilMessage(result) : englishMessage(result, input) };\n    }\n    const eligibility = await findEligibleCourses({\n      percentage: Math.max(0, Math.min(100, result.percentage)),\n      stream: result.stream,\n      courseQuery: result.courseQuery,\n    });\n    const data = { eligibility };\n    return { ...result, language, data, message: language === "ta" ? tamilMessage(result, data) : englishMessage(result, input, data) };\n  }\n\n  if (result.intent === "support") {
    const ticket = await createSupportTicket({
      userId,
      category: "student-support",
      subject: "CampusOS student support request",
      description: input,
    });
    const data = { ticket };
    return { ...result, language, data, message: language === "ta" ? tamilMessage(result, data) : englishMessage(result, input, data) };
  }

  if (result.intent === "fee") {
    const payment = await createPaymentIntent({ userId, amount: 0 });
    const data = { payment };
    return { ...result, language, data, message: language === "ta" ? tamilMessage(result, data) : englishMessage(result, input, data) };
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
