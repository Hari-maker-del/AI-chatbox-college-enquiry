import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, CheckCircle2, Clock3, Ticket, CalendarDays, FileText, Users, Timer, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ServiceRequest = { id: string; request_code: string; service_type: string; title: string; purpose: string | null; status: string; submitted_at: string; updated_at: string | null; user_id: string };
type Appointment = { id: string; appointment_code: string; department: string; staff_name: string | null; appointment_date: string; appointment_time: string; purpose: string | null; status: string; user_id: string };
type SupportTicket = { id: string; ticket_code: string; category: string; subject: string; description: string; status: string; priority: string; created_at: string; updated_at: string | null; user_id: string };

const requestStatuses = ["submitted", "under_review", "approved", "rejected", "completed", "cancelled"];
const appointmentStatuses = ["requested", "confirmed", "completed", "cancelled"];
const ticketStatuses = ["open", "in_progress", "resolved", "closed"];
const statusLabel = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

const AdminCampusOps = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [requestResult, appointmentResult, ticketResult] = await Promise.all([
      supabase.from("campus_service_requests").select("id,request_code,service_type,title,purpose,status,submitted_at,updated_at,user_id").order("submitted_at", { ascending: false }),
      supabase.from("campus_appointments").select("id,appointment_code,department,staff_name,appointment_date,appointment_time,purpose,status,user_id").order("appointment_date", { ascending: true }),
      supabase.from("campus_support_tickets").select("id,ticket_code,category,subject,description,status,priority,created_at,updated_at,user_id").order("created_at", { ascending: false }),
    ]);
    const firstError = requestResult.error || appointmentResult.error || ticketResult.error;
    if (firstError) toast({ title: "Could not load CampusOS operations", description: firstError.message, variant: "destructive" });
    setRequests((requestResult.data as ServiceRequest[]) ?? []);
    setAppointments((appointmentResult.data as Appointment[]) ?? []);
    setTickets((ticketResult.data as SupportTicket[]) ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const analytics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const pendingRequests = requests.filter((r) => ["submitted", "under_review"].includes(r.status)).length;
    const completedRequests = requests.filter((r) => ["completed", "approved"].includes(r.status)).length;
    const openTickets = tickets.filter((t) => ["open", "in_progress"].includes(t.status)).length;
    const todayAppointments = appointments.filter((a) => a.appointment_date === today && a.status !== "cancelled").length;
    const activeStudents = new Set([...requests.map((r) => r.user_id), ...appointments.map((a) => a.user_id), ...tickets.map((t) => t.user_id)].filter(Boolean)).size;
    const completedOrClosed = tickets.filter((t) => ["resolved", "closed"].includes(t.status)).length;
    const totalTracked = requests.length + tickets.length;
    const completionRate = totalTracked ? Math.round(((completedRequests + completedOrClosed) / totalTracked) * 100) : 0;
    const durations = requests.filter((r) => r.updated_at && ["approved", "completed", "rejected", "cancelled"].includes(r.status)).map((r) => Math.max(0, new Date(r.updated_at as string).getTime() - new Date(r.submitted_at).getTime()) / 3600000);
    const avgHours = durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 0;
    const departmentCounts = appointments.reduce<Record<string, number>>((acc, item) => { acc[item.department] = (acc[item.department] || 0) + 1; return acc; }, {});
    const departments = Object.entries(departmentCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxDepartment = Math.max(1, ...departments.map(([, count]) => count));
    return { pendingRequests, completedRequests, openTickets, todayAppointments, activeStudents, completionRate, avgHours, departments, maxDepartment };
  }, [requests, appointments, tickets]);

  const updateRequest = async (id: string, userId: string, status: string) => {
    setUpdating(id);
    const { error } = await supabase.from("campus_service_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (!error) { await supabase.from("campus_request_events").insert({ request_id: id, user_id: userId, status, note: `Status changed by administrator to ${statusLabel(status)}.` }); toast({ title: "Request updated" }); await load(); }
    else toast({ title: "Update failed", description: error.message, variant: "destructive" });
    setUpdating(null);
  };

  const updateAppointment = async (id: string, status: string) => {
    setUpdating(id); const { error } = await supabase.from("campus_appointments").update({ status }).eq("id", id);
    if (!error) { toast({ title: "Appointment updated" }); await load(); } else toast({ title: "Update failed", description: error.message, variant: "destructive" }); setUpdating(null);
  };

  const updateTicket = async (id: string, status: string) => {
    setUpdating(id); const { error } = await supabase.from("campus_support_tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (!error) { toast({ title: "Ticket updated" }); await load(); } else toast({ title: "Update failed", description: error.message, variant: "destructive" }); setUpdating(null);
  };

  const Metric = ({ icon: Icon, label, value, accent = false }: { icon: typeof FileText; label: string; value: string | number; accent?: boolean }) => (
    <div className={`border p-5 ${accent ? "border-[#1f8f91] bg-[#1f8f91] text-white" : "border-border bg-card"}`}>
      <Icon className={`h-5 w-5 mb-4 ${accent ? "text-white/80" : "text-primary"}`} />
      <div className="text-3xl font-semibold tracking-tight">{value}</div>
      <div className={`text-xs uppercase tracking-[0.16em] mt-1 ${accent ? "text-white/70" : "text-muted-foreground"}`}>{label}</div>
    </div>
  );

  return (
    <section className="space-y-7">
      <div className="flex items-end justify-between gap-4">
        <div><div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">CampusOS / Operations</div><h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">SERVICE CONTROL</h2><p className="text-muted-foreground mt-2">Live workload, service performance and student support operations.</p></div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Metric icon={FileText} label="Requests" value={requests.length} />
        <Metric icon={Clock3} label="Pending" value={analytics.pendingRequests} accent />
        <Metric icon={CalendarDays} label="Today" value={analytics.todayAppointments} />
        <Metric icon={Ticket} label="Open tickets" value={analytics.openTickets} />
        <Metric icon={Users} label="Students served" value={analytics.activeStudents} />
        <Metric icon={Activity} label="Completion" value={`${analytics.completionRate}%`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_.8fr] gap-4">
        <div className="border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-6"><div><div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Workload</div><h3 className="text-xl font-semibold mt-1">Department demand</h3></div><Users className="h-5 w-5 text-primary" /></div>
          {analytics.departments.length ? <div className="space-y-5">{analytics.departments.map(([department, count]) => <div key={department}><div className="flex justify-between text-sm mb-2"><span>{department}</span><span className="font-medium">{count}</span></div><div className="h-2 bg-muted overflow-hidden"><div className="h-full bg-[#1f8f91]" style={{ width: `${(count / analytics.maxDepartment) * 100}%` }} /></div></div>)}</div> : <EmptyState label="Department workload will appear when appointments are created." />}
        </div>
        <div className="border border-border bg-[#17252a] text-white p-6">
          <div className="text-xs uppercase tracking-[0.18em] text-white/50">Service performance</div>
          <h3 className="text-xl font-semibold mt-1">Processing overview</h3>
          <div className="mt-8 grid grid-cols-2 gap-6">
            <div><Timer className="h-5 w-5 text-[#9bd5d2] mb-3" /><div className="text-3xl font-semibold">{analytics.avgHours ? `${analytics.avgHours.toFixed(1)}h` : "—"}</div><div className="text-[10px] uppercase tracking-[0.15em] text-white/50 mt-1">Avg. resolved time</div></div>
            <div><CheckCircle2 className="h-5 w-5 text-[#9bd5d2] mb-3" /><div className="text-3xl font-semibold">{analytics.completedRequests}</div><div className="text-[10px] uppercase tracking-[0.15em] text-white/50 mt-1">Completed requests</div></div>
          </div>
          <div className="mt-8 pt-5 border-t border-white/10"><div className="flex justify-between text-xs mb-2"><span className="text-white/60">Tracked completion</span><span>{analytics.completionRate}%</span></div><div className="h-1.5 bg-white/10"><div className="h-full bg-[#9bd5d2]" style={{ width: `${analytics.completionRate}%` }} /></div></div>
        </div>
      </div>

      <Tabs defaultValue="requests">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 gap-6">
          <TabsTrigger value="requests" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Requests <span className="ml-2 text-xs text-muted-foreground">{requests.length}</span></TabsTrigger>
          <TabsTrigger value="appointments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Appointments <span className="ml-2 text-xs text-muted-foreground">{appointments.length}</span></TabsTrigger>
          <TabsTrigger value="tickets" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Tickets <span className="ml-2 text-xs text-muted-foreground">{tickets.length}</span></TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-3 mt-5">
          {requests.map((request) => <div key={request.id} className="border border-border bg-card p-5 flex flex-col lg:flex-row lg:items-center gap-4 justify-between"><div><div className="text-xs tracking-[0.14em] text-muted-foreground">{request.request_code} · {request.service_type}</div><h3 className="font-medium mt-1">{request.title}</h3><p className="text-sm text-muted-foreground mt-1">{request.purpose || "No purpose provided"}</p><p className="text-xs text-muted-foreground mt-3">Submitted {new Date(request.submitted_at).toLocaleString()}</p></div><div className="flex items-center gap-3 min-w-[220px]"><Badge variant="outline">{statusLabel(request.status)}</Badge><Select value={request.status} onValueChange={(value) => void updateRequest(request.id, request.user_id, value)} disabled={updating === request.id}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{requestStatuses.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}</SelectContent></Select></div></div>)}
          {!loading && requests.length === 0 && <EmptyState label="No service requests yet." />}
        </TabsContent>
        <TabsContent value="appointments" className="space-y-3 mt-5">
          {appointments.map((appointment) => <div key={appointment.id} className="border border-border bg-card p-5 flex flex-col lg:flex-row lg:items-center gap-4 justify-between"><div><div className="text-xs tracking-[0.14em] text-muted-foreground">{appointment.appointment_code}</div><h3 className="font-medium mt-1">{appointment.department} · {appointment.staff_name || "Staff not assigned"}</h3><p className="text-sm text-muted-foreground mt-1">{appointment.appointment_date} · {appointment.appointment_time}</p><p className="text-sm text-muted-foreground mt-1">{appointment.purpose || "No purpose provided"}</p></div><Select value={appointment.status} onValueChange={(value) => void updateAppointment(appointment.id, value)} disabled={updating === appointment.id}><SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger><SelectContent>{appointmentStatuses.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}</SelectContent></Select></div>)}
          {!loading && appointments.length === 0 && <EmptyState label="No appointments yet." />}
        </TabsContent>
        <TabsContent value="tickets" className="space-y-3 mt-5">
          {tickets.map((ticket) => <div key={ticket.id} className="border border-border bg-card p-5 flex flex-col lg:flex-row lg:items-center gap-4 justify-between"><div><div className="text-xs tracking-[0.14em] text-muted-foreground">{ticket.ticket_code} · {ticket.category}</div><h3 className="font-medium mt-1">{ticket.subject}</h3><p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p><div className="flex gap-2 mt-3"><Badge variant="outline">{ticket.priority}</Badge><Badge variant="outline">{statusLabel(ticket.status)}</Badge></div></div><Select value={ticket.status} onValueChange={(value) => void updateTicket(ticket.id, value)} disabled={updating === ticket.id}><SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger><SelectContent>{ticketStatuses.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}</SelectContent></Select></div>)}
          {!loading && tickets.length === 0 && <EmptyState label="No support tickets yet." />}
        </TabsContent>
      </Tabs>

      <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-4"><CheckCircle2 className="h-4 w-4" /> Analytics are calculated from live CampusOS records. <Clock3 className="h-4 w-4 ml-2" /> Refresh after new activity.</div>
    </section>
  );
};

const EmptyState = ({ label }: { label: string }) => <div className="border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{label}</div>;
export default AdminCampusOps;
