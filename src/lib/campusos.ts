import { supabase } from "@/integrations/supabase/client";

export type EligibleCourse = {
  id: string;
  name: string;
  level: string;
  duration: string;
  annual_fee: number | null;
  description: string | null;
  min_percentage: number;
  eligible_streams: string[];
  eligibility_note: string | null;
};

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

export async function findEligibleCourses(input: { percentage: number; stream?: string; courseQuery?: string }) {
  const { data, error } = await db
    .from("courses")
    .select("id, name, level, duration, annual_fee, description, min_percentage, eligible_streams, eligibility_note")
    .lte("min_percentage", input.percentage)
    .order("min_percentage", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;

  const stream = input.stream?.trim().toLowerCase();
  const query = input.courseQuery?.trim().toLowerCase();
  const courses = ((data ?? []) as EligibleCourse[]).filter((course) => {
    const streams = (course.eligible_streams ?? []).map((value) => value.toLowerCase());
    const streamMatch = !stream || streams.length === 0 || streams.some((value) => stream.includes(value) || value.includes(stream));
    const courseMatch = !query || course.name.toLowerCase().includes(query) || (course.description ?? "").toLowerCase().includes(query);
    return streamMatch && courseMatch;
  });

  return { percentage: input.percentage, stream: input.stream ?? null, courses };
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


export type StudentProfile = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  roll_number: string | null;
  department: string | null;
  year_level: number | null;
  section: string | null;
  interests: string | null;
};

export async function getStudentProfile(userId: string) {
  const { data, error } = await db
    .from("profiles")
    .select("user_id, full_name, email, phone, roll_number, department, year_level, section, interests")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as StudentProfile | null;
}

export async function updateStudentProfile(
  userId: string,
  input: Partial<Omit<StudentProfile, "user_id" | "email">>
) {
  const { data, error } = await db
    .from("profiles")
    .update({
      full_name: input.full_name ?? undefined,
      phone: input.phone ?? null,
      roll_number: input.roll_number ?? null,
      department: input.department ?? null,
      year_level: input.year_level ?? null,
      section: input.section ?? null,
      interests: input.interests ?? null,
    })
    .eq("user_id", userId)
    .select("user_id, full_name, email, phone, roll_number, department, year_level, section, interests")
    .single();

  if (error) throw error;
  return data as StudentProfile;
}


export type CampusService = {
  id: string;
  name: string;
  service_type: string;
  description: string | null;
  department: string | null;
  keywords: string[];
  requirements: string[];
  active: boolean;
};

export async function listCampusServices(includeInactive = false) {
  let query = db
    .from("campus_service_catalog")
    .select("id,name,service_type,description,department,keywords,requirements,active")
    .order("name", { ascending: true });
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CampusService[];
}

export async function getCampusServiceByIntent(input: string) {
  const services = await listCampusServices();
  const text = input.toLowerCase();
  const scored = services.map((service) => {
    const terms = [service.name, service.service_type, ...(service.keywords ?? [])]
      .map((value) => value.toLowerCase())
      .filter(Boolean);
    const score = terms.reduce((total, term) => total + (text.includes(term) ? Math.max(1, term.split(/\\s+/).length) : 0), 0);
    return { service, score };
  }).sort((a, b) => b.score - a.score);
  return scored[0]?.score ? scored[0].service : null;
}


export type CampusMessage = {
  id: string;
  request_id: string;
  user_id: string;
  sender_role: "student" | "admin";
  message: string;
  created_at: string;
};

export async function listRequestMessages(requestId: string) {
  const { data, error } = await db
    .from("campus_request_messages")
    .select("id,request_id,user_id,sender_role,message,created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CampusMessage[];
}

export async function sendRequestMessage(input: {
  requestId: string;
  userId: string;
  message: string;
  senderRole: "student" | "admin";
}) {
  const message = input.message.trim();
  if (!message) throw new Error("Message cannot be empty.");
  const { data, error } = await db
    .from("campus_request_messages")
    .insert({
      request_id: input.requestId,
      user_id: input.userId,
      sender_role: input.senderRole,
      message,
    })
    .select("id,request_id,user_id,sender_role,message,created_at")
    .single();
  if (error) throw error;
  return data as CampusMessage;
}
