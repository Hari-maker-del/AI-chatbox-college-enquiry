import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, CheckCircle2, Clock3, X } from "lucide-react";

type RequestRow = { id: string; title: string; request_code: string; status: string; updated_at: string | null; submitted_at: string };

type CenterEvent = { id: string; title: string; message: string; kind: "status" | "new"; createdAt: string };

const pretty = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function CampusLiveCenter() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [events, setEvents] = useState<CenterEvent[]>([]);

  useEffect(() => {
    if (!user) {
      setRequests([]);
      setEvents([]);
      return;
    }

    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from("campus_service_requests")
        .select("id,title,request_code,status,updated_at,submitted_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(8);
      if (mounted) setRequests((data as RequestRow[]) ?? []);
    };

    void load();

    const channel = supabase
      .channel(`campusos-student-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "campus_service_requests", filter: `user_id=eq.${user.id}` }, (payload) => {
        const row = payload.new as RequestRow;
        setRequests((current) => [row, ...current.filter((item) => item.id !== row.id)].slice(0, 8));
        setEvents((current) => [{ id: `new-${row.id}`, title: "New request", message: `${row.title} was submitted.`, kind: "new", createdAt: new Date().toISOString() }, ...current].slice(0, 5));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "campus_service_requests", filter: `user_id=eq.${user.id}` }, (payload) => {
        const row = payload.new as RequestRow;
        setRequests((current) => [row, ...current.filter((item) => item.id !== row.id)].slice(0, 8));
        setEvents((current) => [{ id: `status-${row.id}-${row.updated_at}`, title: "Application updated", message: `${row.title} is now ${pretty(row.status)}.`, kind: "status", createdAt: new Date().toISOString() }, ...current].slice(0, 5));
      })
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user) return null;

  const pending = requests.filter((item) => ["submitted", "under_review"].includes(item.status)).length;
  const completed = requests.filter((item) => item.status === "completed").length;

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Open My Campus" className="fixed bottom-6 right-6 z-[9998] flex items-center gap-3 border border-[#17252a]/20 bg-[#17252a] px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-xl transition hover:bg-[#2b7a78]">
        <Bell className="h-4 w-4" /> MY CAMPUS
        {events.length > 0 && <span className="flex h-5 min-w-5 items-center justify-center bg-[#ff6500] px-1 text-[10px]">{events.length}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-[10000] flex items-end justify-end bg-[#0b192c]/40 p-4 md:p-6">
          <section className="w-full max-w-xl border border-[#17252a]/15 bg-[#f7fcfc] shadow-2xl">
            <header className="flex items-start justify-between border-b border-[#17252a]/10 bg-[#def2f1] p-5">
              <div>
                <div className="font-mono text-[10px] tracking-[0.22em] text-[#2b7a78]">CAMPUSOS / LIVE CENTER</div>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-[#17252a]">MY CAMPUS</h2>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button>
            </header>

            <div className="grid grid-cols-2 gap-px bg-[#17252a]/10">
              <div className="bg-white p-5"><div className="text-3xl font-black text-[#17252a]">{pending}</div><div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#4e6265]">Pending</div></div>
              <div className="bg-white p-5"><div className="text-3xl font-black text-[#17252a]">{completed}</div><div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#4e6265]">Completed</div></div>
            </div>

            {events.length > 0 && <div className="border-b border-[#17252a]/10 p-5">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2b7a78]">Live activity</div>
              <div className="space-y-2">{events.map((event) => <div key={event.id} className="flex gap-3 border border-[#17252a]/10 bg-white p-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2b7a78]" /><div><div className="text-sm font-bold uppercase">{event.title}</div><div className="text-xs text-[#4e6265]">{event.message}</div></div></div>)}</div>
            </div>}

            <div className="max-h-[48vh] overflow-auto p-5">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2b7a78]"><Clock3 className="h-4 w-4" /> Applications</div>
              {requests.length === 0 ? <div className="border border-dashed border-[#17252a]/15 p-8 text-center text-sm text-[#4e6265]">No applications yet.</div> : <div className="space-y-2">{requests.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 border border-[#17252a]/10 bg-white p-4"><div><div className="text-sm font-black uppercase">{item.title}</div><div className="mt-1 font-mono text-[10px] text-[#4e6265]">{item.request_code}</div></div><div className="font-mono text-[10px] font-bold uppercase text-[#2b7a78]">{pretty(item.status)}</div></div>)}</div>}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
