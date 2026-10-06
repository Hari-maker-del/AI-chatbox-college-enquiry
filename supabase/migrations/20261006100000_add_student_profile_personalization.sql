-- CampusOS student profile personalization
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS roll_number TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS year_level INTEGER,
  ADD COLUMN IF NOT EXISTS section TEXT,
  ADD COLUMN IF NOT EXISTS interests TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);

COMMENT ON COLUMN public.profiles.department IS 'Student academic department used for CampusOS personalization.';
COMMENT ON COLUMN public.profiles.year_level IS 'Current academic year, e.g. 1 to 4.';
