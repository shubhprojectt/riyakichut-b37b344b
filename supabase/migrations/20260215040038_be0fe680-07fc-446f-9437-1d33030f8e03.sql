ALTER TABLE public.scheduled_hits ADD COLUMN max_rounds integer DEFAULT 0;
-- 0 means unlimited