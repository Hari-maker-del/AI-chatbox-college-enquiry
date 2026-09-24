-- Phase 7 document storage bucket for administrator-controlled source files.
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-documents', 'knowledge-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins upload knowledge documents" ON storage.objects;
CREATE POLICY "Admins upload knowledge documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'knowledge-documents' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins read knowledge documents" ON storage.objects;
CREATE POLICY "Admins read knowledge documents" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'knowledge-documents' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins update knowledge documents" ON storage.objects;
CREATE POLICY "Admins update knowledge documents" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'knowledge-documents' AND public.has_role(auth.uid(),'admin'))
WITH CHECK (bucket_id = 'knowledge-documents' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins delete knowledge documents" ON storage.objects;
CREATE POLICY "Admins delete knowledge documents" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'knowledge-documents' AND public.has_role(auth.uid(),'admin'));
