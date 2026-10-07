-- Harden request message ownership and private attachment paths.
DROP POLICY IF EXISTS "Students read own request messages" ON public.campus_request_messages;
CREATE POLICY "Students read own request messages"
ON public.campus_request_messages FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.campus_service_requests r
             WHERE r.id = request_id AND r.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Students upload request attachments" ON storage.objects;
CREATE POLICY "Students upload request attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'campus-request-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.campus_service_requests r
    WHERE r.id::text = (storage.foldername(name))[2]
      AND r.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Students read request attachments" ON storage.objects;
CREATE POLICY "Students read request attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'campus-request-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      (storage.foldername(name))[1] = auth.uid()::text
      AND EXISTS (
        SELECT 1 FROM public.campus_service_requests r
        WHERE r.id::text = (storage.foldername(name))[2]
          AND r.user_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "Students delete own request attachments" ON storage.objects;
CREATE POLICY "Students delete own request attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'campus-request-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.campus_service_requests r
    WHERE r.id::text = (storage.foldername(name))[2]
      AND r.user_id = auth.uid()
  )
);
