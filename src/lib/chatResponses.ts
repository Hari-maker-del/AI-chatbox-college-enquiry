export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export const suggestions = [
  { label: "Admission Process", icon: "📋" },
  { label: "Course Details", icon: "📚" },
  { label: "Fee Structure", icon: "💰" },
  { label: "Hostel Facilities", icon: "🏠" },
  { label: "Placement Details", icon: "💼" },
] as const;

const unavailable = (topic: string) =>
  `## ${topic}

I don't have verified college-specific information for this topic yet.

Please use the CampusOS service catalogue or ask the college administration for the current official details. I won't guess fees, deadlines, eligibility rules, contact details, placement statistics, or policies.`;

const responses: Record<string, string> = {
  "admission process": unavailable("Admission Process"),
  "course details": unavailable("Course Details"),
  "fee structure": unavailable("Fee Structure"),
  "hostel facilities": unavailable("Hostel Facilities"),
  "placement details": unavailable("Placement Details"),
};

export function getAIResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase().trim();

  for (const [key, response] of Object.entries(responses)) {
    if (lower.includes(key)) return response;
  }

  if (lower.match(/^(hi|hello|hey|good morning|good evening)/)) {
    return "Hello! 👋 Welcome to CampusOS. I can help you discover campus services, admissions, courses, fees, applications, appointments, support, and other college workflows. What do you need?";
  }

  if (lower.includes("scholarship")) return unavailable("Scholarships");

  if (lower.includes("contact") || lower.includes("phone") || lower.includes("email")) {
    return "I don't have a verified college contact directory configured yet. Please check the official college website or the CampusOS administration-provided contact details.";
  }

  return "I don't have verified information for that request yet. Please use the CampusOS service catalogue or contact the appropriate college office. I won't invent institution-specific facts.";
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
