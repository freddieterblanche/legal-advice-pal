ALTER TABLE public.lawyers DROP CONSTRAINT lawyers_firm_or_bar_check;
ALTER TABLE public.lawyers ADD CONSTRAINT lawyers_firm_or_bar_check CHECK (
  firm_id IS NOT NULL OR bar_id IS NOT NULL OR is_mediator = true OR is_arbitrator = true
);