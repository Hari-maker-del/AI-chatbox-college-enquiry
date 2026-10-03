import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, CheckCircle2, Clock3, Ticket, CalendarDays, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ServiceRequest = {
  id: string;
  request_code: string;
  service_type: string;
  title: string;
  purpose: string | null;
  status: string;
  submitted_at: string;
  user_id: string;
};

type Appointment = {
  id: string;
  appointment_code: string;
  department: string;
  staff_name: string | null;
  appointment_date: string;
  appointment_time: string;
  purpose: string | null;
  status: string;
  user_id: string;
};

type SupportTicket = {
  id: string;
  ticket_code: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  user_id: string;
};

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
      supabase.from("campus_service_requests").select("id,request_code,service_type,title,purpose,status,submitted_at,user_id").order("submitted_at", { ascending: false }),
      supabase.from("campus_appointments").select("id,appointment_code,department,staff_name,appointment_date,appointment_time,purpose,status,user_id").order("appointment_date", { ascending: true }),
      supabase.from("campus_support_tickets").select("id,ticket_code,category,subject,description,status,priority,created_at,user_id").order("created_at", { ascending: false }),
    ]);

    const firstError = requestResult.error || appointmentResult.error || ticketResult.error;
    if (firstError) {
      toast({ title: "Could not load CampusOS operations", description: firstError.message, variant: "destructive" });
    }
    setRequests((requestResult.data as ServiceRequest[]) ?? []);
    setAppointments((appointmentResult.data as Appointment[]) ?? []);
    setTickets((ticketResult.data as SupportTicket[]) ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const updateRequest = async (id: string, userId: string, status: string) => {
    setUpdating(id);
    const { error } = await supabase.from("campus_service_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (!error) {
      await supabase.from("campus_request_events").insert({ request_id: id, user_id: userId, status, note: `Status changed by administrator to ${statusLabel(status)}.` });
      toast({ title: "Request updated" });
      await load();
    } else toast({ title: "Update failed", description: error.message, variant: "destructive" });
    setUpdating(null);
  };

  const updateAppointment = async (id: string, status: string) => {
    setUpdating(id);
    const { error } = await supabase.from("campus_appointments").update({ status }).eq("id", id);
    if (!error) { toast({ title: "Appointment updated" }); await load(); }
    else toast({ title: "Update failed", description: error.message, variant: "destructive" });
    setUpdating(null);
  };

  const updateTicket = async (id: string, status: string) => {
    setUpdating(id);
    const { error } = await supabase.from("campus_support_tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (!error) { toast({ title: "Ticket updated" }); await load(); }
    else toast({ title: "Update failed", description: error.message, variant: "destructive" });
    setUpdating(null);
  };

  const Metric = ({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: number }) => (
    <div className="border border-border bg-card p-5">
      <Icon className="h-5 w-5 text-primary mb-4" />
      <div className="text-3xl font-semibold tracking-tight">{value}</div>
      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground mt-1">{label}</div>
    </div>
  );

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">CampusOS / Operations</div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">SERVICE CONTROL</h2>
          <p className="text-muted-foreground mt-2">Process student requests, appointments and support tickets from one place.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Metric icon={FileText} label="Service requests" value={requests.length} />
        <Metric icon={CalendarDays} label="Appointments" value={appointments.length} />
        <Metric icon={Ticket} label="Support tickets" value={tickets.length} />
      </div>

      <Tabs defaultValue="requests">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 gap-6">
          <TabsTrigger value="requests" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Requests</TabsTrigger>
          <TabsTrigger value="appointments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Appointments</TabsTrigger>
          <TabsTrigger value="tickets" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-3 mt-5">
          {requests.map((request) => (
            <div key={request.id} className="border border-border bg-card p-5 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
              <div>
                <div className="text-xs tracking-[0.14em] text-muted-foreground">{request.request_code} · {request.service_type}</div>
                <h3 className="font-medium mt-1">{request.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{request.purpose || "No purpose provided"}</p>
                <p className="text-xs text-muted-foreground mt-3">Submitted {new Date(request.submitted_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3 min-w-[220px]">
                <Badge variant="outline">{statusLabel(request.status)}</Badge>
                <Select value={request.status} onValueChange={(value) => void updateRequest(request.id, request.user_id, value)} disabled={updating === request.id}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{requestStatuses.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          ))}
          {!loading && requests.length === 0 && <EmptyState label="No service requests yet." />}
        </TabsContent>

        <TabsContent value="appointments" className="space-y-3 mt-5">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="border border-border bg-card p-5 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
              <div>
                <div className="text-xs tracking-[0.14em] text-muted-foreground">{appointment.appointment_code}</div>
                <h3 className="font-medium mt-1">{appointment.department} · {appointment.staff_name || "Staff not assigned"}</h3>
                <p className="text-sm text-muted-foreground mt-1">{appointment.appointment_date} · {appointment.appointment_time}</p>
                <p className="text-sm text-muted-foreground mt-1">{appointment.purpose || "No purpose provided"}</p>
              </div>
              <Select value={appointment.status} onValueChange={(value) => void updateAppointment(appointment.id, value)} disabled={updating === appointment.id}>
                <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
                <SelectContent>{appointmentStatuses.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
          {!loading && appointments.length === 0 && <EmptyState label="No appointments yet." />}
        </TabsContent>

        <TabsContent value="tickets" className="space-y-3 mt-5">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="border border-border bg-card p-5 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
              <div>
                <div className="text-xs tracking-[0.14em] text-muted-foreground">{ticket.ticket_code} · {ticket.category}</div>
                <h3 className="font-medium mt-1">{ticket.subject}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
                <div className="flex gap-2 mt-3"><Badge variant="outline">{ticket.priority}</Badge><Badge variant="outline">{statusLabel(ticket.status)}</Badge></div>
              </div>
              <Select value={ticket.status} onValueChange={(value) => void updateTicket(ticket.id, value)} disabled={updating === ticket.id}>
                <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
                <SelectContent>{ticketStatuses.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
          {!loading && tickets.length === 0 && <EmptyState label="No support tickets yet." />}
        </TabsContent>
      </Tabs>

      <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-4">
        <CheckCircle2 className="h-4 w-4" /> Changes are written to the CampusOS database and request history.
        <Clock3 className="h-4 w-4 ml-2" /> Student-facing status updates appear after refresh.
      </div>
    </section>
  );
};

const EmptyState = ({ label }: { label: string }) => (
  <div className="border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{label}</div>
);

export default AdminCampusOps;
