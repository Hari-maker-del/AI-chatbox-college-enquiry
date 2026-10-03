import { useEffect, useRef, useState } from "react";

type Action = "bonafide" | "payment" | "appointment" | "eligibility" | "ticket" | null;

const Index = () => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [action, setAction] = useState<Action>(null);
  const [submitted, setSubmitted] = useState(false);

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

      const handler = (event: Event) => {
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
          scrollTo("APPLICATION");
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
          setAction("bonafide");
          return;
        }
        if (label.includes("PAY EXAM FEE") || label.includes("PAY NOW")) {
          event.preventDefault();
          setSubmitted(false);
          setAction("payment");
          return;
        }
        if (label.includes("SCHEDULE SESSION")) {
          event.preventDefault();
          setSubmitted(false);
          setAction("appointment");
          return;
        }
        if (label.includes("CHECK ELIGIBILITY")) {
          event.preventDefault();
          setSubmitted(false);
          setAction("eligibility");
          return;
        }
        if (label.includes("CREATE TICKET")) {
          event.preventDefault();
          setSubmitted(false);
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
  }, []);

  const close = () => {
    setAction(null);
    setSubmitted(false);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
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
                <h3 className="text-xl font-black uppercase text-[#17252A]">REQUEST SUBMITTED</h3>
                <p className="mt-2 text-sm text-[#4E6265]">Your request has been recorded. You can track its status from My Applications.</p>
                <button onClick={close} className="mt-6 bg-[#FF6500] px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white">DONE</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5 px-6 py-6">
                {action === "bonafide" && <>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#17252A]">Purpose<input required defaultValue="Higher Studies" className="mt-2 w-full border border-[#17252A]/20 bg-white px-4 py-3 outline-none focus:border-[#2B7A78]" /></label>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#17252A]">Delivery<select className="mt-2 w-full border border-[#17252A]/20 bg-white px-4 py-3 outline-none"><option>Digital Copy</option><option>Office Collection</option></select></label>
                </>}
                {action === "payment" && <div className="grid grid-cols-2 gap-4">
                  <div className="border border-[#17252A]/15 bg-white p-4"><div className="text-xs text-[#4E6265]">Exam Fee</div><div className="mt-2 text-2xl font-black text-[#17252A]">₹2,500</div></div>
                  <div className="border border-[#17252A]/15 bg-white p-4"><div className="text-xs text-[#4E6265]">Due Date</div><div className="mt-2 text-lg font-black text-[#17252A]">14 OCT 2026</div></div>
                </div>}
                {action === "appointment" && <>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#17252A]">Department<select className="mt-2 w-full border border-[#17252A]/20 bg-white px-4 py-3 outline-none"><option>Placement Cell</option><option>Information Technology</option><option>Accounts</option></select></label>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#17252A]">Preferred time<select className="mt-2 w-full border border-[#17252A]/20 bg-white px-4 py-3 outline-none"><option>10:00 AM</option><option>11:30 AM</option><option>02:00 PM</option></select></label>
                </>}
                {action === "eligibility" && <div className="grid grid-cols-2 gap-4">
                  <label className="text-xs font-bold uppercase tracking-wider">12th Percentage<input required type="number" min="0" max="100" className="mt-2 w-full border border-[#17252A]/20 bg-white px-4 py-3" /></label>
                  <label className="text-xs font-bold uppercase tracking-wider">Preferred Course<select className="mt-2 w-full border border-[#17252A]/20 bg-white px-4 py-3"><option>B.Tech IT</option><option>B.Tech CSE</option><option>B.Tech AI & DS</option></select></label>
                </div>}
                {action === "ticket" && <>
                  <label className="block text-xs font-bold uppercase tracking-wider">Category<select className="mt-2 w-full border border-[#17252A]/20 bg-white px-4 py-3"><option>Academic</option><option>Finance</option><option>Hostel</option><option>Transport</option><option>Technical</option></select></label>
                  <label className="block text-xs font-bold uppercase tracking-wider">Describe the issue<textarea required rows={4} className="mt-2 w-full border border-[#17252A]/20 bg-white px-4 py-3" /></label>
                </>}
                <div className="flex justify-end gap-3 border-t border-[#17252A]/10 pt-5">
                  <button type="button" onClick={close} className="border border-[#17252A]/20 px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[#17252A]">CANCEL</button>
                  <button type="submit" className="bg-[#FF6500] px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white">{action === "payment" ? "CONTINUE TO PAYMENT" : "SUBMIT REQUEST"}</button>
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
