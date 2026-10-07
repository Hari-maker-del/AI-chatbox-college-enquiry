-- Reproducible CampusOS operational schema.
-- These tables are the source of truth for student service workflows.

CREATE TABLE IF NOT EXISTS public.campus_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_code TEXT NOT NULL UNIQUE DEFAULT ('REQ-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  service_type TEXT NOT NULL,
  title TEXT NOT NULL,
  purpose TEXT,
  delivery_method TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','under_review','approved','rejected','completed','cancelled')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campus_request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.campus_service_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campus_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_code TEXT NOT NULL UNIQUE DEFAULT ('APT-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  department TEXT NOT NULL,
  staff_name TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','confirmed','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campus_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_code TEXT NOT NULL UNIQUE DEFAULT ('TKT-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','closed')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high','urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campus_service_requests_user_idx ON public.campus_service_requests(user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS campus_service_requests_status_idx ON public.campus_service_requests(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS campus_request_events_request_idx ON public.campus_request_events(request_id, created_at);
CREATE INDEX IF NOT EXISTS campus_appointments_user_idx ON public.campus_appointments(user_id, appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS campus_appointments_date_idx ON public.campus_appointments(appointment_date, status);
CREATE INDEX IF NOT EXISTS campus_support_tickets_user_idx ON public.campus_support_tickets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS campus_support_tickets_status_idx ON public.campus_support_tickets(status, created_at DESC);

ALTER TABLE public.campus_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students read own service requests" ON public.campus_service_requests;
CREATE POLICY "Students read own service requests" ON public.campus_service_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Students create own service requests" ON public.campus_service_requests;
CREATE POLICY "Students create own service requests" ON public.campus_service_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage service requests" ON public.campus_service_requests;
CREATE POLICY "Admins manage service requests" ON public.campus_service_requests FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Students read own request events" ON public.campus_request_events;
CREATE POLICY "Students read own request events" ON public.campus_request_events FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Students create own request events" ON public.campus_request_events;
CREATE POLICY "Students create own request events" ON public.campus_request_events FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM public.campus_service_requests r WHERE r.id = request_id AND r.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Admins manage request events" ON public.campus_request_events;
CREATE POLICY "Admins manage request events" ON public.campus_request_events FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Students read own appointments" ON public.campus_appointments;
CREATE POLICY "Students read own appointments" ON public.campus_appointments FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Students create own appointments" ON public.campus_appointments;
CREATE POLICY "Students create own appointments" ON public.campus_appointments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage appointments" ON public.campus_appointments;
CREATE POLICY "Admins manage appointments" ON public.campus_appointments FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Students read own support tickets" ON public.campus_support_tickets;
CREATE POLICY "Students read own support tickets" ON public.campus_support_tickets FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Students create own support tickets" ON public.campus_support_tickets;
CREATE POLICY "Students create own support tickets" ON public.campus_support_tickets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage support tickets" ON public.campus_support_tickets;
CREATE POLICY "Admins manage support tickets" ON public.campus_support_tickets FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DROP TRIGGER IF EXISTS campus_request_updated_at ON public.campus_service_requests;
CREATE OR REPLACE FUNCTION public.touch_campus_request_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER campus_request_updated_at BEFORE UPDATE ON public.campus_service_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_campus_request_updated_at();

DROP TRIGGER IF EXISTS campus_appointment_updated_at ON public.campus_appointments;
CREATE OR REPLACE FUNCTION public.touch_campus_appointment_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER campus_appointment_updated_at BEFORE UPDATE ON public.campus_appointments
FOR EACH ROW EXECUTE FUNCTION public.touch_campus_appointment_updated_at();

DROP TRIGGER IF EXISTS campus_ticket_updated_at ON public.campus_support_tickets;
CREATE OR REPLACE FUNCTION public.touch_campus_ticket_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER campus_ticket_updated_at BEFORE UPDATE ON public.campus_support_tickets
FOR EACH ROW EXECUTE FUNCTION public.touch_campus_ticket_updated_at();
