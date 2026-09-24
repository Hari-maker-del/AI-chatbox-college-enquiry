CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('admissions','courses','fees','scholarships','hostel','placements','departments','contact','calendar','policies','general')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  is_published BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  search_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,'') || ' ' || coalesce(category,''))) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_base_search_idx ON public.knowledge_base USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS knowledge_base_category_idx ON public.knowledge_base(category);
CREATE INDEX IF NOT EXISTS knowledge_base_title_trgm_idx ON public.knowledge_base USING GIN(title gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'New conversation',
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL CHECK (char_length(content) <= 20000),
  model TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversations_user_updated_idx ON public.conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx ON public.messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('request','response','error','rate_limited')),
  category TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_events_created_idx ON public.ai_usage_events(created_at DESC);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read published knowledge" ON public.knowledge_base;
CREATE POLICY "Authenticated users read published knowledge" ON public.knowledge_base FOR SELECT TO authenticated USING (is_published = true OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins manage knowledge" ON public.knowledge_base;
CREATE POLICY "Admins manage knowledge" ON public.knowledge_base FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Users manage own conversations" ON public.conversations;
CREATE POLICY "Users manage own conversations" ON public.conversations FOR ALL TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Users read own messages" ON public.messages;
CREATE POLICY "Users read own messages" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Users insert own messages" ON public.messages;
CREATE POLICY "Users insert own messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own AI events" ON public.ai_usage_events;
CREATE POLICY "Users read own AI events" ON public.ai_usage_events FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins manage settings" ON public.system_settings;
CREATE POLICY "Admins manage settings" ON public.system_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(_user_id UUID, _max_requests INTEGER DEFAULT 12, _window_seconds INTEGER DEFAULT 60)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*) < _max_requests FROM public.ai_usage_events
  WHERE user_id = _user_id AND event_type = 'request'
  AND created_at > now() - make_interval(secs => _window_seconds);
$$;

CREATE OR REPLACE FUNCTION public.touch_conversation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id; RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS messages_touch_conversation ON public.messages;
CREATE TRIGGER messages_touch_conversation AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.touch_conversation();
DROP TRIGGER IF EXISTS knowledge_base_updated_at ON public.knowledge_base;
CREATE TRIGGER knowledge_base_updated_at BEFORE UPDATE ON public.knowledge_base FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS conversations_updated_at ON public.conversations;
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS system_settings_updated_at ON public.system_settings;
CREATE TRIGGER system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.knowledge_base (category,title,content,priority)
SELECT 'general','AI assistant policy','Answer only from verified college information supplied in the knowledge base. If information is missing or outdated, say so and direct the user to the college office.',100
WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_base WHERE title='AI assistant policy');
INSERT INTO public.knowledge_base (category,title,content,priority)
SELECT 'general','Supported topics','Admissions, courses, fees, scholarships, hostel, placements, departments, contact information, academic calendar and college policies.',90
WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_base WHERE title='Supported topics');


-- Harden AI rate limiting against concurrent requests.
CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  _user_id UUID,
  _max_requests INTEGER DEFAULT 12,
  _window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_count INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text, 918273645));
  SELECT count(*)::INTEGER
    INTO request_count
    FROM public.ai_usage_events
   WHERE user_id = _user_id
     AND event_type = 'request'
     AND created_at > now() - make_interval(secs => _window_seconds);
  RETURN request_count < _max_requests;
END;
$$;


-- Phase 7: conversation feedback, document ingestion metadata, and admin audit trail.
CREATE TABLE IF NOT EXISTS public.message_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
  comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);
CREATE INDEX IF NOT EXISTS message_feedback_message_idx ON public.message_feedback(message_id);
CREATE INDEX IF NOT EXISTS message_feedback_created_idx ON public.message_feedback(created_at DESC);

CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  file_size_bytes BIGINT,
  language TEXT NOT NULL DEFAULT 'en',
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('admissions','courses','fees','scholarships','hostel','placements','departments','contact','calendar','policies','general')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','processing','published','failed')),
  checksum TEXT,
  error_message TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_documents_status_idx ON public.knowledge_documents(status);
CREATE INDEX IF NOT EXISTS knowledge_documents_created_idx ON public.knowledge_documents(created_at DESC);

CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.knowledge_documents(id) ON DELETE CASCADE NOT NULL,
  chunk_index INTEGER NOT NULL,
  page_number INTEGER,
  content TEXT NOT NULL,
  source_title TEXT NOT NULL,
  source_url TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, chunk_index)
);
CREATE INDEX IF NOT EXISTS knowledge_chunks_document_idx ON public.knowledge_chunks(document_id, chunk_index);
CREATE INDEX IF NOT EXISTS knowledge_chunks_trgm_idx ON public.knowledge_chunks USING GIN(content gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_logs_created_idx ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_logs_admin_idx ON public.admin_audit_logs(admin_user_id, created_at DESC);

ALTER TABLE public.message_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own feedback" ON public.message_feedback;
CREATE POLICY "Users manage own feedback" ON public.message_feedback FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins manage documents" ON public.knowledge_documents;
CREATE POLICY "Admins manage documents" ON public.knowledge_documents FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authenticated read published chunks" ON public.knowledge_chunks;
CREATE POLICY "Authenticated read published chunks" ON public.knowledge_chunks FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.knowledge_documents d
  WHERE d.id = document_id AND d.status = 'published'
) OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins manage chunks" ON public.knowledge_chunks;
CREATE POLICY "Admins manage chunks" ON public.knowledge_chunks FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins read audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins read audit logs" ON public.admin_audit_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS knowledge_documents_updated_at ON public.knowledge_documents;
CREATE TRIGGER knowledge_documents_updated_at BEFORE UPDATE ON public.knowledge_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_chunks TO authenticated;
GRANT SELECT ON public.admin_audit_logs TO authenticated;
