-- Keep chat query ownership tied to an existing auth profile.
-- This is safe on fresh databases and only adds the FK when it is absent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_queries_user_id_fkey'
      AND conrelid = 'public.chat_queries'::regclass
  ) THEN
    ALTER TABLE public.chat_queries
      ADD CONSTRAINT chat_queries_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
