ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS min_percentage NUMERIC(5,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS eligible_streams TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS eligibility_note TEXT;

CREATE INDEX IF NOT EXISTS courses_min_percentage_idx
  ON public.courses (min_percentage);

COMMENT ON COLUMN public.courses.min_percentage IS 'Minimum qualifying percentage used by CampusOS eligibility checks.';
COMMENT ON COLUMN public.courses.eligible_streams IS 'Accepted academic streams, for example IT, CSE, Computer Science, Commerce, Science. Empty means open to all streams.';
