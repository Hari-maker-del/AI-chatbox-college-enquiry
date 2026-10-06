import {
  createServiceRequest,
  createAppointment,
  createSupportTicket,
  createPaymentIntent,
  getApplicationStatus,
  getApplicationTimeline,
  findEligibleCourses,
  getStudentProfile,
  getCampusServiceByIntent,
  type StudentProfile,
} from "@/lib/campusos";

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
  percentage?: number;
  stream?: string;
  courseQuery?: string;
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
  const text = normalize(input);
  const percentageMatch =
    text.match(/(?:percentage|percent|mark|score|cutoff)\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i) ??
    text.match(/(\d+(?:\.\d+)?)\s*(?:percent|%)/i);
  const percentage = percentageMatch ? Number(percentageMatch[1]) : undefined;

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
    const stream = has(text, "computer science", "cse")
      ? "Computer Science"
      : has(text, "information technology", "it")
        ? "Information Technology"
        : has(text, "commerce")
          ? "Commerce"
          : has(text, "science")
            ? "Science"
            : undefined;
    const courseQuery = has(text, "bca")
      ? "BCA"
      : has(text, "bsc")
        ? "B.Sc"
        : has(text, "btech", "b.tech")
          ? "B.Tech"
          : undefined;
    return { intent: "eligibility", confidence: 0.92, title: "Course Eligibility Check", percentage, stream, courseQuery };
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

const profileName = (profile?: StudentProfile | null) =>
  profile?.full_name?.trim() ? profile.full_name.trim().split(/\s+/)[0] : "";

const englishMessage = (result: CampusIntentResult, input: string, data?: any, profile?: StudentProfile | null) => {
  const name = profileName(profile);
  switch (result.intent) {
    case "bonafide":
      return `${name ? `Hi ${name}, ` : ""}Bonafide Certificate request created${result.purpose ? ` for ${result.purpose}` : ""}. Request ${data?.request_code} is now under review.`;
    case "appointment":
      return `Appointment request created. ${data?.appointment_code} is booked for ${data?.appointment_date}.`;
    case "eligibility":
      if (data?.eligibility) {
        const courses = data.eligibility.courses ?? [];
        if (!courses.length) return `Based on ${data.eligibility.percentage}%, I could not find a matching course in the college catalogue. Ask admissions to verify any course-specific rules.`;
        return `Based on ${data.eligibility.percentage}%${result.stream ? ` in ${result.stream}` : ""}, I found ${courses.length} matching course${courses.length === 1 ? "" : "s"}: ${courses.slice(0, 5).map((course: any) => course.name).join(", ")}.`;
      }
      return `I can check your eligibility. Tell me your percentage${profile?.department ? ` (your profile says ${profile.department})` : ""} and preferred course.`;
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
      return `I can help${profile?.department ? ` with services relevant to ${profile.department}` : ""} — certificates, appointments, fees, eligibility, support tickets, application status and campus locations.`;
  }
};

const tamilMessage = (result: CampusIntentResult, data?: any, profile?: StudentProfile | null) => {
  const name = profileName(profile);
  switch (result.intent) {
    case "bonafide":
      return `${name ? `வணக்கம் ${name}. ` : ""}போனஃபைட் சான்றிதழ் கோரிக்கை உருவாக்கப்பட்டது${result.purpose ? ` — ${result.purpose}க்காக` : ""}. உங்கள் கோரிக்கை ${data?.request_code ?? ""} இப்போது பரிசீலனையில் உள்ளது.`;
    case "appointment":
      return `Appointment கோரிக்கை உருவாக்கப்பட்டது. ${data?.appointment_code ?? ""} ${data?.appointment_date ?? ""} அன்று பதிவு செய்யப்பட்டுள்ளது.`;
    case "eligibility":
      if (data?.eligibility) {
        const courses = data.eligibility.courses ?? [];
        if (!courses.length) return `${data.eligibility.percentage}% அடிப்படையில் college catalogue-ல் பொருந்தும் course கிடைக்கவில்லை. Admissions team-ல் course rules-ஐ verify செய்யுங்கள்.`;
        return `${data.eligibility.percentage}% அடிப்படையில் ${courses.length} course கிடைத்துள்ளது: ${courses.slice(0, 5).map((course: any) => course.name).join(", ")}.`;
      }
      return "Eligibility check செய்யலாம். உங்கள் percentage மற்றும் விரும்பும் course-ஐ சொல்லுங்கள்.";
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

const profileStream = (department?: string | null) => {
  const value = (department ?? "").toLowerCase();
  if (value.includes("computer") || value.includes("cse")) return "Computer Science";
  if (value.includes("information technology") || /\bit\b/.test(value)) return "Information Technology";
  if (value.includes("commerce")) return "Commerce";
  if (value.includes("science")) return "Science";
  return undefined;
};

export async function executeCampusIntent(
  input: string,
  userId: string,
  context?: { appointmentDate?: string; appointmentTime?: string; language?: CampusAILanguage; profile?: StudentProfile | null }
) {
  const result = understandCampusIntent(input);
  const language = context?.language ?? detectCampusLanguage(input);
  const profile = context?.profile ?? await getStudentProfile(userId);

  if (result.intent === "unknown") {
    const service = await getCampusServiceByIntent(input);
    if (service) {
      const request = await createServiceRequest({
        userId,
        serviceType: service.service_type,
        title: service.name,
        purpose: service.description ?? "Student service request",
        details: {
          aiSource: true,
          originalText: input,
          detectedLanguage: language,
          serviceId: service.id,
          department: service.department,
          requirements: service.requirements,
          studentDepartment: profile?.department ?? null,
        },
      });
      const message = language === "ta"
        ? `${service.name} service-க்கான request உருவாக்கப்பட்டது. Request ${request.request_code} இப்போது process செய்யப்படுகிறது.`
        : `${service.name} request created. Request ${request.request_code} is now with ${service.department || "the responsible campus team"}.`;
      return { ...result, intent: "dynamic_service" as const, title: service.name, language, profile, data: { service, request }, message };
    }
  }

  if (result.intent === "eligibility") {
    const stream = result.stream ?? profileStream(profile?.department);
    if (result.percentage === undefined || Number.isNaN(result.percentage)) {
      return {
        ...result,
        stream,
        language,
        profile,
        message: language === "ta" ? tamilMessage({ ...result, stream }) : englishMessage({ ...result, stream }, input, undefined, profile),
      };
    }
    const eligibility = await findEligibleCourses({
      percentage: Math.max(0, Math.min(100, result.percentage)),
      stream,
      courseQuery: result.courseQuery,
    });
    const data = { eligibility };
    return {
      ...result,
      stream,
      language,
      profile,
      data,
      message: language === "ta" ? tamilMessage({ ...result, stream }, data, profile) : englishMessage({ ...result, stream }, input, data, profile),
    };
  }

  if (result.intent === "bonafide") {
    const request = await createServiceRequest({
      userId,
      serviceType: "bonafide",
      title: result.title,
      purpose: result.purpose ?? "General purpose",
      details: { aiSource: true, originalText: input, detectedLanguage: language, studentDepartment: profile?.department ?? null },
    });
    return { ...result, language, profile, message: language === "ta" ? tamilMessage(result, request, profile) : englishMessage(result, input, request, profile) };
  }

  if (result.intent === "application_status") {
    const data = await getApplicationStatus(userId, input);
    if (data.selected) data.timeline = await getApplicationTimeline(userId, data.selected.id);
    return { ...result, language, profile, data, message: language === "ta" ? tamilMessage(result, data, profile) : englishMessage(result, input, data, profile) };
  }

  if (result.intent === "support") {
    const ticket = await createSupportTicket({
      userId,
      category: "student-support",
      subject: `${profile?.department ?? "Student"} support request`,
      description: input,
    });
    const data = { ticket };
    return { ...result, language, profile, data, message: language === "ta" ? tamilMessage(result, data, profile) : englishMessage(result, input, data, profile) };
  }

  if (result.intent === "fee") {
    const payment = await createPaymentIntent({ userId, amount: 0 });
    const data = { payment };
    return { ...result, language, profile, data, message: language === "ta" ? tamilMessage(result, data, profile) : englishMessage(result, input, data, profile) };
  }

  if (result.intent === "appointment") {
    const date = context?.appointmentDate ?? new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const time = context?.appointmentTime ?? "10:00:00";
    const appointment = await createAppointment({
      userId,
      department: result.department ?? profile?.department ?? "Student Services",
      appointmentDate: date,
      appointmentTime: time,
      purpose: input,
    });
    return { ...result, language, profile, message: language === "ta" ? tamilMessage(result, appointment, profile) : englishMessage(result, input, appointment, profile) };
  }

  return { ...result, language, profile, message: language === "ta" ? tamilMessage(result, undefined, profile) : englishMessage(result, input, undefined, profile) };
}
