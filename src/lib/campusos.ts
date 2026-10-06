import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type CampusRequest = {
  id: string;
  request_code: string;
  service_type: string;
  title: string;
  purpose: string | null;
  delivery_method: string | null;
  status: string;
  submitted_at: string;
  updated_at?: string | null;
};

export async function createServiceRequest(input: {
  userId: string;
  serviceType: string;
  title: string;
  purpose?: string;
  deliveryMethod?: string;
  details?: Record<string, unknown>;
}) {
  const { data, error } = await db
    .from("campus_service_requests")
    .insert({
      user_id: input.userId,
      service_type: input.serviceType,
      title: input.title,
      purpose: input.purpose ?? null,
      delivery_method: input.deliveryMethod ?? null,
      details: input.details ?? {},
    })
    .select("id, request_code, service_type, title, purpose, delivery_method, status, submitted_at, updated_at")
    .single();

  if (error) throw error;

  await db.from("campus_request_events").insert({
    request_id: data.id,
    user_id: input.userId,
    status: data.status,
    note: "Request submitted by student",
  });

  return data as CampusRequest;
}

export async function listServiceRequests(userId: string) {
  const { data, error } = await db
    .from("campus_service_requests")
    .select("id, request_code, service_type, title, purpose, delivery_method, status, submitted_at, updated_at")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CampusRequest[];
}

export async function getApplicationStatus(userId: string, requestedText?: string) {
  let query = db
    .from("campus_service_requests")
    .select("id, request_code, service_type, title, purpose, delivery_method, status, submitted_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(5);

  const { data, error } = await query;
  if (error) throw error;

  const requests = (data ?? []) as CampusRequest[];
  if (!requests.length) return { requests: [], selected: null };

  const text = (requestedText ?? "").toLowerCase();
  const selected =
    requests.find((item) =>
      text.includes(item.request_code.toLowerCase()) ||
      text.includes(item.title.toLowerCase()) ||
      text.includes(item.service_type.toLowerCase())
    ) ?? requests[0];

  return { requests, selected };
}

export async function getApplicationTimeline(userId: string, requestId: string) {
  const { data, error } = await db
    .from("campus_request_events")
    .select("id, request_id, status, note, created_at")
    .eq("user_id", userId)
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createAppointment(input: {
  userId: string;
  department: string;
  staffName?: string;
  appointmentDate: string;
  appointmentTime: string;
  purpose?: string;
}) {
  const { data, error } = await db
    .from("campus_appointments")
    .insert({
      user_id: input.userId,
      department: input.department,
      staff_name: input.staffName ?? null,
      appointment_date: input.appointmentDate,
      appointment_time: input.appointmentTime,
      purpose: input.purpose ?? "Student appointment",
    })
    .select("id, appointment_code, department, staff_name, appointment_date, appointment_time, status")
    .single();

  if (error) throw error;
  return data;
}

export async function createSupportTicket(input: {
  userId: string;
  category: string;
  subject: string;
  description: string;
}) {
  const { data, error } = await db
    .from("campus_support_tickets")
    .insert({
      user_id: input.userId,
      category: input.category,
      subject: input.subject,
      description: input.description,
    })
    .select("id, ticket_code, category, subject, status, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function createPaymentIntent(input: {
  userId: string;
  amount: number;
}) {
  const { data, error } = await db
    .from("campus_fee_payments")
    .insert({
      user_id: input.userId,
      amount: input.amount,
      payment_status: "initiated",
    })
    .select("id, amount, payment_status, created_at")
    .single();

  if (error) throw error;
  return data;
}
