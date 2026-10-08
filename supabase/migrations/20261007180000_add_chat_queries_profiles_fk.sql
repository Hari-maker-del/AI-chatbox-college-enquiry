-- Keep chat query ownership tied to the authenticated user represented by the profile.
-- profiles.id is an internal row id; profiles.user_id is the auth.users id.
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
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;
