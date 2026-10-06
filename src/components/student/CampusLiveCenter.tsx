import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, CheckCircle2, Clock3, X } from "lucide-react";

type RequestRow = {
  id: string;
  title: string;
  request_code: string;
  status: string;
  updated_at: string | null;
  submitted_at: string;
};

type RequestEvent = {
  id: string;
  request_id: string;
  status: string;
  note: string | null;
  created_at: string;
};

type CenterEvent = {
  id: string;
  title: string;
  message: string;
  kind: "status" | "new";
  createdAt: string;
};

const pretty = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

const steps = ["submitted", "under_review", "approved", "ready", "completed"];

const stepLabel = (status: string) => {
  if (status === "under_review") return "Under Review";
  return pretty(status);
};

const stepIndex = (status: string) => {
  if (status === "rejected" || status === "cancelled") return -1;
  const index = steps.indexOf(status);
  return index < 0 ? 0 : index;
};

const formatTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function CampusLiveCenter() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [events, setEvents] = useState<CenterEvent[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<RequestEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const selectedRequest = useMemo(
    () => requests.find((item) => item.id === selectedRequestId) ?? requests[0] ?? null,
    [requests, selectedRequestId]
  );

  const loadTimeline = async (requestId: string) => {
    setLoadingTimeline(true);
    const { data } = await supabase
      .from("campus_request_events")
      .select("id,request_id,status,note,created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });
    setTimeline((data as RequestEvent[]) ?? []);
    setLoadingTimeline(false);
  };

  useEffect(() => {
    if (!user) {
      setRequests([]);
      setEvents([]);
      setTimeline([]);
      setSelectedRequestId(null);
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

      if (!mounted) return;
      const next = (data as RequestRow[]) ?? [];
      setRequests(next);
      if (next[0]) {
        setSelectedRequestId((current) => current ?? next[0].id);
        await loadTimeline(next[0].id);
      }
    };

    void load();

    const channel = supabase
      .channel(`campusos-student-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "campus_service_requests", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as RequestRow;
          setRequests((current) => [row, ...current.filter((item) => item.id !== row.id)].slice(0, 8));
          setSelectedRequestId(row.id);
          setEvents((current) => [
            {
              id: `new-${row.id}`,
              title: "New request",
              message: `${row.title} was submitted.`,
              kind: "new",
              createdAt: new Date().toISOString(),
            },
            ...current,
          ].slice(0, 5));
          void loadTimeline(row.id);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "campus_service_requests", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as RequestRow;
          setRequests((current) => [row, ...current.filter((item) => item.id !== row.id)].slice(0, 8));
          setSelectedRequestId(row.id);
          setEvents((current) => [
            {
              id: `status-${row.id}-${row.updated_at}`,
              title: "Application updated",
              message: `${row.title} is now ${pretty(row.status)}.`,
              kind: "status",
              createdAt: new Date().toISOString(),
            },
            ...current,
          ].slice(0, 5));
          void loadTimeline(row.id);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "campus_request_events", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const event = payload.new as RequestEvent;
          if (event.request_id === selectedRequestId) {
            setTimeline((current) => [...current, event]);
          }
          setEvents((current) => [
            {
              id: `event-${event.id}`,
              title: "Request timeline updated",
              message: event.note ?? `Status changed to ${pretty(event.status)}.`,
              kind: "status",
              createdAt: event.created_at,
            },
            ...current,
          ].slice(0, 5));
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [user, selectedRequestId]);

  useEffect(() => {
    if (selectedRequest?.id) void loadTimeline(selectedRequest.id);
  }, [selectedRequest?.id]);

  if (!user) return null;

  const pending = requests.filter((item) => ["submitted", "under_review"].includes(item.status)).length;
  const completed = requests.filter((item) => item.status === "completed").length;
  const currentStep = selectedRequest ? stepIndex(selectedRequest.status) : 0;
  const rejected = selectedRequest && ["rejected", "cancelled"].includes(selectedRequest.status);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open My Campus"
        className="fixed bottom-6 right-6 z-[9998] flex items-center gap-3 border border-[#17252a]/20 bg-[#17252a] px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-xl transition hover:bg-[#2b7a78]"
      >
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

            {events.length > 0 && (
              <div className="border-b border-[#17252a]/10 p-5">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2b7a78]">Live activity</div>
                <div className="space-y-2">
                  {events.map((event) => (
                    <div key={event.id} className="flex gap-3 border border-[#17252a]/10 bg-white p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2b7a78]" />
                      <div>
                        <div className="text-sm font-bold uppercase">{event.title}</div>
                        <div className="text-xs text-[#4e6265]">{event.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="max-h-[52vh] overflow-auto p-5">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2b7a78]">
                <Clock3 className="h-4 w-4" /> Applications
              </div>

              {requests.length === 0 ? (
                <div className="border border-dashed border-[#17252a]/15 p-8 text-center text-sm text-[#4e6265]">No applications yet.</div>
              ) : (
                <div className="space-y-3">
                  {requests.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedRequestId(item.id)}
                      className={`w-full border bg-white p-4 text-left transition hover:border-[#2b7a78] ${selectedRequest?.id === item.id ? "border-[#2b7a78]" : "border-[#17252a]/10"}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-black uppercase">{item.title}</div>
                          <div className="mt-1 font-mono text-[10px] text-[#4e6265]">{item.request_code}</div>
                        </div>
                        <div className="font-mono text-[10px] font-bold uppercase text-[#2b7a78]">{pretty(item.status)}</div>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden bg-[#e7eeee]">
                        <div
                          className="h-full bg-[#2b7a78] transition-all"
                          style={{ width: `${rejected ? 100 : ((currentStep + 1) / steps.length) * 100}%` }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedRequest && (
                <div className="mt-5 border border-[#17252a]/10 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#2b7a78]">Request timeline</div>
                      <h3 className="mt-1 text-lg font-black uppercase">{selectedRequest.title}</h3>
                      <div className="mt-1 font-mono text-[10px] text-[#4e6265]">{selectedRequest.request_code}</div>
                    </div>
                    <div className={`font-mono text-[10px] font-bold uppercase ${rejected ? "text-[#ff6500]" : "text-[#2b7a78]"}`}>
                      {stepLabel(selectedRequest.status)}
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    {steps.map((step, index) => {
                      const event = timeline.find((item) => item.status === step);
                      const active = index <= currentStep && !rejected;
                      return (
                        <div key={step} className="flex gap-3">
                          <div className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 ${active ? "border-[#2b7a78] bg-[#2b7a78]" : "border-[#cbd9d9] bg-white"}`}>
                            {active && <span className="block h-full w-full text-center text-[9px] leading-4 text-white">✓</span>}
                          </div>
                          <div className="min-w-0">
                            <div className={`text-xs font-black uppercase ${active ? "text-[#17252a]" : "text-[#839092]"}`}>{stepLabel(step)}</div>
                            {event && <div className="mt-1 text-xs text-[#4e6265]">{event.note ?? "Status updated."} · {formatTime(event.created_at)}</div>}
                          </div>
                        </div>
                      );
                    })}

                    {rejected && (
                      <div className="border border-[#ff6500]/30 bg-[#fff4ed] p-3 text-xs text-[#17252a]">
                        This request is {pretty(selectedRequest.status)}. Please contact the relevant campus department for the next step.
                      </div>
                    )}

                    {loadingTimeline && <div className="font-mono text-[10px] uppercase text-[#4e6265]">Loading timeline...</div>}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
