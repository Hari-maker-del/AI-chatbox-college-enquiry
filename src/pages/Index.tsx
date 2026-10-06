import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getStudentProfile, type StudentProfile } from "@/lib/campusos";
import CampusServiceCatalog from "@/components/student/CampusServiceCatalog";
import {
  CampusRequest,
  createAppointment,
  createPaymentIntent,
  createServiceRequest,
  createSupportTicket,
  listServiceRequests,
} from "@/lib/campusos";

type Action = "bonafide" | "payment" | "appointment" | "eligibility" | "ticket" | null;

const Index = () => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const { user, isLoading: authLoading } = useAuth();
  const [action, setAction] = useState<Action>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applicationsOpen, setApplicationsOpen] = useState(false);
  const [applications, setApplications] = useState<CampusRequest[]>([]);
  const [purpose, setPurpose] = useState("Higher Studies");
  const [delivery, setDelivery] = useState("Digital Copy");
  const [department, setDepartment] = useState("Placement Cell");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("10:00:00");
  const [percentage, setPercentage] = useState("");
  const [preferredCourse, setPreferredCourse] = useState("B.Tech IT");
  const [ticketCategory, setTicketCategory] = useState("Academic");
  const [ticketDescription, setTicketDescription] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const installInteractions = () => {
      const doc = frame.contentDocument;
      if (!doc) return;

      const text = (el: Element) => (el.textContent || "").replace(/\s+/g, " ").trim().toUpperCase();
      const find = (needle: string) =>
        Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6,button,a,span,div"))
          .find((el) => text(el).includes(needle.toUpperCase()));

      const scrollTo = (needle: string) => {
        const target = find(needle);
        if (target && "scrollIntoView" in target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      };

      const handler = async (event: Event) => {
        const target = event.target as HTMLElement | null;
        const clickable = target?.closest("a,button") as HTMLElement | null;
        if (!clickable) return;

        const label = text(clickable);
        if (!label) return;

        if (label.includes("01 SERVICES") || label.includes("EXPLORE SERVICES") || label.includes("CORE SERVICES")) {
          event.preventDefault();
          scrollTo("CORE SERVICES & DISPATCH");
          return;
        }

        if (label.includes("05 APPLICATIONS") || label.includes("TRACK STATUS") || label.includes("AUDIT TRAIL")) {
          event.preventDefault();
          if (!user) {
            toast.error("Sign in to view your applications.");
            return;
          }
          try {
            const rows = await listServiceRequests(user.id);
            setApplications(rows);
            setApplicationsOpen(true);
          } catch (error) {
            console.error(error);
            toast.error("Could not load your applications.");
          }
          return;
        }

        if (label.includes("04 CAMPUS") || label.includes("VIEW CAMPUS") || label.includes("3D LOCATOR")) {
          event.preventDefault();
          scrollTo("CAMPUS");
          return;
        }

        if (label.includes("BONAFIDE CERTIFICATE") || label.includes("REQUEST CERTIFICATE")) {
          event.preventDefault();
          setSubmitted(false);
          setResultMessage("");
          setAction("bonafide");
          return;
        }

        if (label.includes("PAY EXAM FEE") || label.includes("PAY NOW")) {
          event.preventDefault();
          setSubmitted(false);
          setResultMessage("");
          setAction("payment");
          return;
        }

        if (label.includes("SCHEDULE SESSION")) {
          event.preventDefault();
          setSubmitted(false);
          setResultMessage("");
          setAppointmentDate(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
          setAction("appointment");
          return;
        }

        if (label.includes("CHECK ELIGIBILITY")) {
          event.preventDefault();
          setSubmitted(false);
          setResultMessage("");
          setAction("eligibility");
          return;
        }

        if (label.includes("CREATE TICKET")) {
          event.preventDefault();
          setSubmitted(false);
          setResultMessage("");
          setTicketDescription("");
          setAction("ticket");
          return;
        }
      };

      doc.addEventListener("click", handler);
      return () => doc.removeEventListener("click", handler);
    };

    frame.addEventListener("load", installInteractions);
    if (frame.contentDocument?.readyState === "complete") installInteractions();
    return () => frame.removeEventListener("load", installInteractions);
  }, [user]);

  const close = () => {
    setAction(null);
    setSubmitted(false);
    setResultMessage("");
  };

  const requireUser = () => {
    if (authLoading) {
      toast.message("Checking your session...");
      return false;
    }
    if (!user) {
      toast.error("Please sign in before submitting a student service request.");
      return false;
    }
    return true;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!requireUser() || !action) return;

    setSaving(true);
    try {
      if (action === "bonafide") {
        const request = await createServiceRequest({
          userId: user!.id,
          serviceType: "bonafide",
          title: "Bonafide Certificate",
          purpose,
          deliveryMethod: delivery,
          details: { purpose, deliveryMethod: delivery },
        });
        setResultMessage(`Request ${request.request_code} has been recorded and is now under review.`);
      }

      if (action === "payment") {
        const payment = await createPaymentIntent({ userId: user!.id, amount: 2500 });
        setResultMessage(`Payment session ${payment.id.slice(0, 8).toUpperCase()} has been created. A payment gateway can be attached to this intent next.`);
      }

      if (action === "appointment") {
        const appointment = await createAppointment({
          userId: user!.id,
          department,
          appointmentDate,
          appointmentTime,
          purpose: "Student service appointment",
        });
        setResultMessage(`Appointment ${appointment.appointment_code} is confirmed for ${appointment.appointment_date}.`);
      }

      if (action === "eligibility") {
        const value = Number(percentage);
        if (!Number.isFinite(value) || value < 0 || value > 100) {
          throw new Error("Enter a percentage between 0 and 100.");
        }
        const eligible = value >= 60;
        const request = await createServiceRequest({
          userId: user!.id,
          serviceType: "other",
          title: "Course Eligibility Check",
          details: { percentage: value, preferredCourse, result: eligible ? "eligible" : "review_required" },
        });
        setResultMessage(`${eligible ? "Preliminary eligibility requirement met" : "Additional eligibility review required"}. Check ${request.request_code} in My Applications.`);
      }

      if (action === "ticket") {
        const ticket = await createSupportTicket({
          userId: user!.id,
          category: ticketCategory,
          subject: `${ticketCategory} support request`,
          description: ticketDescription,
        });
        setResultMessage(`Support ticket ${ticket.ticket_code} is open and has been routed to the college support team.`);
      }

      setSubmitted(true);
      toast.success("CampusOS request saved successfully.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to save the request.");
    } finally {
      setSaving(false);
    }
  };

  const modalCopy = {
    bonafide: { title: "BONAFIDE CERTIFICATE", subtitle: "Start a new certificate request." },
    payment: { title: "EXAM FEE PAYMENT", subtitle: "Review and continue to secure payment." },
    appointment: { title: "BOOK APPOINTMENT", subtitle: "Choose a department and preferred time." },
    eligibility: { title: "CHECK ELIGIBILITY", subtitle: "Enter your academic details for a quick check." },
    ticket: { title: "CREATE SUPPORT TICKET", subtitle: "Send your issue to the appropriate college team." },
  } as const;

  return (
    <main className="relative h-screen w-full overflow-hidden bg-white">
      <iframe
        ref={frameRef}
        title="CampusOS — Your Digital Campus"
        src="/campusos/index.html"
        className="h-full w-full border-0"
        allow="microphone; camera"
      />

      {studentProfile && user && (\n        <div className="pointer-events-none fixed left-5 top-5 z-[9998] hidden md:block">\n          <div className="border border-[#17252A]/15 bg-[#F7FCFC]/95 px-4 py-3 shadow-lg backdrop-blur">\n            <div className="font-mono text-[9px] tracking-[0.18em] text-[#2B7A78]">CAMPUSOS / STUDENT CONTEXT</div>\n            <div className="mt-1 text-sm font-black uppercase text-[#17252A]">{studentProfile.full_name || "Student"}</div>\n            <div className="mt-1 font-mono text-[10px] uppercase text-[#4E6265]">\n              {studentProfile.department || "Department not set"}{studentProfile.year_level ? ` · YEAR ${studentProfile.year_level}` : ""}{studentProfile.section ? ` · SEC ${studentProfile.section}` : ""}\n            </div>\n          </div>\n        </div>\n      )}\n\n      {applicationsOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0B192C]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl border border-[#2B7A78]/30 bg-[#F7FCFC] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#17252A]/15 bg-[#DEF2F1] px-6 py-5">
              <div>
                <div className="mb-2 font-mono text-xs tracking-[0.2em] text-[#2B7A78]">CAMPUSOS / LIVE DATA</div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-[#17252A]">MY APPLICATIONS</h2>
                <p className="mt-1 text-sm text-[#4E6265]">Requests loaded directly from your CampusOS account.</p>
              </div>
              <button onClick={() => setApplicationsOpen(false)} className="text-2xl text-[#17252A]" aria-label="Close">×</button>
            </div>
            <div className="max-h-[65vh] overflow-auto p-6">
              {applications.length === 0 ? (
                <div className="border border-[#17252A]/10 bg-white p-10 text-center">
                  <div className="text-sm font-bold uppercase tracking-wider text-[#17252A]">NO REQUESTS YET</div>
                  <p className="mt-2 text-sm text-[#4E6265]">Start a student service from the CampusOS dashboard.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.map((item) => (
                    <div key={item.id} className="grid gap-3 border border-[#17252A]/10 bg-white p-4 md:grid-cols-[1fr_auto] md:items-center">
                      <div>
                        <div className="font-black uppercase text-[#17252A]">{item.title}</div>
                        <div className="mt-1 font-mono text-xs text-[#4E6265]">{item.request_code} · {new Date(item.submitted_at).toLocaleDateString()}</div>
                      </div>
                      <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#2B7A78]">{item.status.replaceAll("_", " ")}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {action && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0B192C]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl border border-[#2B7A78]/30 bg-[#F7FCFC] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#17252A]/15 bg-[#DEF2F1] px-6 py-5">
              <div>
                <div className="mb-2 font-mono text-xs tracking-[0.2em] text-[#2B7A78]">CAMPUSOS / STUDENT SERVICES</div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-[#17252A]">{modalCopy[action].title}</h2>
                <p className="mt-1 text-sm text-[#4E6265]">{modalCopy[action].subtitle}</p>
              </div>
              <button onClick={close} className="text-2xl text-[#17252A]" aria-label="Close">×</button>
            </div>

            {submitted ? (
              <div className="px-6 py-10 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center bg-[#2B7A78] text-2xl text-white">✓</div>
                <h3 className="text-xl font-black uppercase text-[#17252A]">REQUEST SAVED</h3>
                <p className="mt-2 text-sm text-[#4E6265]">{resultMessage}</p>
                <button onClick={close} className="mt-6 bg-[#FF6500] px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white">DONE</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5 px-6 py-6">
                {!user && (
                  <div className="border border-[#FF6500]/30 bg-[#FFF7F0] p-4 text-sm text-[#7A3A00]">
                    Sign in to CampusOS before submitting. Your request will be linked to your student account.
                  </div>
                )}

                {action === "bonafide" && <>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#17252A]">Purpose
                    <input required value={purpose} onChange={(e) => setPurpose(e.target.value)} className="mt-2 w-full border border-[#17252A]/20 bg-white px-4 py-3 outline-none focus:border-[#2B7A78]" />
                  </label>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#17252A]">Delivery
                    <select value={delivery} onChange={(e) => setDelivery(e.target.value)} className="mt-2 w-full border border-[#17252A]/20 bg-white px-4 py-3 outline-none">
                      <option>Digital Copy</option><option>Office Collection</option>
                    </select>
                  </label>
                </>}

                {action === "payment" && <div className="grid grid-cols-2 gap-4">
                  <div className="border border-[#17252A]/15 bg-white p-4"><div className="text-xs text-[#4E6265]">Exam Fee</div><div className="mt-2 text-2xl font-black text-[#17252A]">₹2,500</div></div>
                  <div className="border border-[#17252A]/15 bg-white p-4"><div className="text-xs text-[#4E6265]">Due Date</div><div className="mt-2 text-lg font-black text-[#17252A]">14 OCT 2026</div></div>
                </div>}

                {action === "appointment" && <>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#17252A]">Department
                    <select value={department} onChange={(e) => setDepartment(e.target.value)} className="mt-2 w-full border border-[#17252A]/20 bg-white px-4 py-3 outline-none">
                      <option>Placement Cell</option><option>Information Technology</option><option>Accounts</option>
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#17252A]">Date
                      <input required type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} className="mt-2 w-full border border-[#17252A]/20 bg-white px-4 py-3" />
                    </label>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#17252A]">Preferred time
                      <select value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} className="mt-2 w-full border border-[#17252A]/20 bg-white px-4 py-3">
                        <option value="10:00:00">10:00 AM</option><option value="11:30:00">11:30 AM</option><option value="14:00:00">02:00 PM</option>
                      </select>
                    </label>
                  </div>
                </>}

                {action === "eligibility" && <div className="grid grid-cols-2 gap-4">
                  <label className="text-xs font-bold uppercase tracking-wider">12th Percentage
                    <input required type="number" min="0" max="100" value={percentage} onChange={(e) => setPercentage(e.target.value)} className="mt-2 w-full border border-[#17252A]/20 bg-white px-4 py-3" />
                  </label>
                  <label className="text-xs font-bold uppercase tracking-wider">Preferred Course
                    <select value={preferredCourse} onChange={(e) => setPreferredCourse(e.target.value)} className="mt-2 w-full border border-[#17252A]/20 bg-white px-4 py-3">
                      <option>B.Tech IT</option><option>B.Tech CSE</option><option>B.Tech AI & DS</option>
                    </select>
                  </label>
                </div>}

                {action === "ticket" && <>
                  <label className="block text-xs font-bold uppercase tracking-wider">Category
                    <select value={ticketCategory} onChange={(e) => setTicketCategory(e.target.value)} className="mt-2 w-full border border-[#17252A]/20 bg-white px-4 py-3">
                      <option>Academic</option><option>Finance</option><option>Hostel</option><option>Transport</option><option>Technical</option>
                    </select>
                  </label>
                  <label className="block text-xs font-bold uppercase tracking-wider">Describe the issue
                    <textarea required rows={4} value={ticketDescription} onChange={(e) => setTicketDescription(e.target.value)} className="mt-2 w-full border border-[#17252A]/20 bg-white px-4 py-3" />
                  </label>
                </>}

                <div className="flex justify-end gap-3 border-t border-[#17252A]/10 pt-5">
                  <button type="button" onClick={close} className="border border-[#17252A]/20 px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[#17252A]">CANCEL</button>
                  <button disabled={saving} type="submit" className="bg-[#FF6500] px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-60">
                    {saving ? "SAVING..." : action === "payment" ? "CREATE PAYMENT SESSION" : "SUBMIT REQUEST"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default Index;
