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

const responses: Record<string, string> = {
  "admission process": `## Admission Process

Our admission process is simple and transparent:

1. **Online Application** — Visit our portal and fill out the application form.
2. **Entrance Exam** — Appear for the college entrance test (dates announced on the website).
3. **Merit List** — Shortlisted candidates are published based on exam scores and academic records.
4. **Counseling Round** — Attend the counseling session for seat allotment.
5. **Document Verification** — Submit original documents for verification.
6. **Fee Payment** — Complete the fee payment to confirm your admission.

📅 **Application Deadline:** Usually in June every year.
📞 **Helpline:** admission@college.edu | +91-9876543210`,

  "course details": `## Courses Offered

### Undergraduate Programs
- **B.Tech** — CSE, ECE, ME, Civil, IT (4 years)
- **BBA** — Business Administration (3 years)
- **BCA** — Computer Applications (3 years)
- **B.Sc** — Physics, Chemistry, Mathematics (3 years)

### Postgraduate Programs
- **M.Tech** — CSE, ECE, Data Science (2 years)
- **MBA** — Marketing, Finance, HR (2 years)
- **MCA** — Computer Applications (2 years)

### Doctoral Programs
- **Ph.D** — Available in all engineering and science departments

All programs are **AICTE/UGC approved** with industry-aligned curriculum.`,

  "fee structure": `## Fee Structure (2024-25)

| Program | Annual Fee | Total Duration |
|---------|-----------|----------------|
| B.Tech | ₹1,25,000 | 4 Years |
| BBA | ₹85,000 | 3 Years |
| BCA | ₹75,000 | 3 Years |
| M.Tech | ₹1,00,000 | 2 Years |
| MBA | ₹1,50,000 | 2 Years |
| MCA | ₹90,000 | 2 Years |

### Additional Fees
- **Hostel Fee:** ₹60,000/year (includes mess)
- **Exam Fee:** ₹5,000/semester
- **Library & Lab:** ₹10,000/year

💡 **Scholarships** available for merit students (up to 50% tuition waiver).
🏦 **Education loans** facilitated through partner banks.`,

  "hostel facilities": `## Hostel Facilities

We provide comfortable and secure hostel accommodation for all students.

### Amenities
- 🛏️ **Furnished Rooms** — Single, double, and triple sharing options
- 🍽️ **Mess Facility** — Nutritious vegetarian and non-vegetarian meals
- 📶 **Wi-Fi** — High-speed internet across all hostels
- 🏋️ **Gym & Sports** — Indoor games, gym, and outdoor sports complex
- 🔒 **24/7 Security** — CCTV surveillance and biometric entry
- 🏥 **Medical Facility** — On-campus health center
- 🧹 **Housekeeping** — Regular cleaning and laundry services

### Hostel Fee
- **Single Room:** ₹90,000/year
- **Double Sharing:** ₹60,000/year
- **Triple Sharing:** ₹45,000/year

*All fees include mess charges.*`,

  "placement details": `## Placement Record

Our Training & Placement Cell ensures excellent career opportunities for students.

### Highlights (2023-24)
- 📊 **Placement Rate:** 92%
- 💰 **Highest Package:** ₹42 LPA
- 📈 **Average Package:** ₹8.5 LPA
- 🏢 **500+ Companies** visit campus annually

### Top Recruiters
Google, Microsoft, Amazon, TCS, Infosys, Wipro, Deloitte, Goldman Sachs, Accenture, Cognizant, HCL, and many more.

### Placement Process
1. **Pre-Placement Training** — Aptitude, coding, and soft skills
2. **Resume Building** — Professional resume workshops
3. **Mock Interviews** — Practice with industry experts
4. **Campus Drives** — On-campus recruitment drives
5. **Internships** — Summer internship programs with top companies

📧 Contact: placement@college.edu`,
};

export function getAIResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase().trim();

  for (const [key, response] of Object.entries(responses)) {
    if (lower.includes(key)) {
      return response;
    }
  }

  // General greetings
  if (lower.match(/^(hi|hello|hey|good morning|good evening)/)) {
    return "Hello! 👋 Welcome to the AI College Enquiry Assistant. I can help you with information about **admissions, courses, fees, hostel facilities, and placements**. What would you like to know?";
  }

  if (lower.includes("scholarship")) {
    return "## Scholarships\n\nWe offer merit-based scholarships:\n- **Top 10 rank holders:** 50% tuition waiver\n- **Sports quota:** 25% fee concession\n- **Economically weaker sections:** Up to 75% scholarship\n\nApply through the scholarship portal during admission.";
  }

  if (lower.includes("contact") || lower.includes("phone") || lower.includes("email")) {
    return "## Contact Us\n\n📞 **Phone:** +91-9876543210\n📧 **Email:** info@college.edu\n📍 **Address:** College Campus, Education City, India\n🌐 **Website:** www.college.edu\n\n**Office Hours:** Mon-Sat, 9:00 AM - 5:00 PM";
  }

  return "I appreciate your question! However, I don't have specific information about that topic yet. 🤔\n\nI'm forwarding your query to the **admission office** for a detailed response. You'll receive a reply within 24 hours.\n\n📧 You can also reach out directly at **admission@college.edu**\n\nIn the meantime, feel free to ask about:\n- Admission Process\n- Course Details\n- Fee Structure\n- Hostel Facilities\n- Placement Details";
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
