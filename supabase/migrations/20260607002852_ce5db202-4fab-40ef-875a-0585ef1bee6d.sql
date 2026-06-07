
-- Enable citext for case-insensitive uniqueness on reference data
CREATE EXTENSION IF NOT EXISTS citext;

-- ============ BARS ============
CREATE TABLE public.bars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name citext NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  province text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bars TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.bars TO authenticated;
GRANT ALL ON public.bars TO service_role;

ALTER TABLE public.bars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bars are public-readable" ON public.bars
  FOR SELECT USING (true);
CREATE POLICY "Platform admins can insert bars" ON public.bars
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'platform_admin');
CREATE POLICY "Platform admins can update bars" ON public.bars
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'platform_admin')
  WITH CHECK (public.get_my_role() = 'platform_admin');
CREATE POLICY "Platform admins can delete bars" ON public.bars
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'platform_admin');

CREATE TRIGGER trg_bars_updated_at
  BEFORE UPDATE ON public.bars
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed standard SA Bars
INSERT INTO public.bars (name, slug, province) VALUES
  ('Johannesburg Bar', 'johannesburg-bar', 'Gauteng'),
  ('Pretoria Bar', 'pretoria-bar', 'Gauteng'),
  ('Cape Bar', 'cape-bar', 'Western Cape'),
  ('KwaZulu-Natal Bar (Durban)', 'kzn-bar-durban', 'KwaZulu-Natal'),
  ('Pietermaritzburg Bar', 'pietermaritzburg-bar', 'KwaZulu-Natal'),
  ('Port Elizabeth Bar', 'port-elizabeth-bar', 'Eastern Cape'),
  ('Grahamstown Bar', 'grahamstown-bar', 'Eastern Cape'),
  ('Mthatha Bar', 'mthatha-bar', 'Eastern Cape'),
  ('Bloemfontein Bar', 'bloemfontein-bar', 'Free State'),
  ('Polokwane Bar', 'polokwane-bar', 'Limpopo'),
  ('Mahikeng Bar', 'mahikeng-bar', 'North West'),
  ('Kimberley Bar', 'kimberley-bar', 'Northern Cape'),
  ('Mbombela Bar', 'mbombela-bar', 'Mpumalanga');

-- ============ CHAMBERS ============
CREATE TABLE public.chambers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid REFERENCES public.bars(id) ON DELETE SET NULL,
  name citext NOT NULL,
  slug text NOT NULL UNIQUE,
  address text,
  city text,
  province text,
  phone text,
  website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate chambers within the same Bar (and globally when bar is null)
CREATE UNIQUE INDEX chambers_name_bar_unique
  ON public.chambers (name, COALESCE(bar_id, '00000000-0000-0000-0000-000000000000'::uuid));

GRANT SELECT ON public.chambers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chambers TO authenticated;
GRANT ALL ON public.chambers TO service_role;

ALTER TABLE public.chambers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chambers are public-readable" ON public.chambers
  FOR SELECT USING (true);
CREATE POLICY "Platform admins can insert chambers" ON public.chambers
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'platform_admin');
CREATE POLICY "Platform admins can update chambers" ON public.chambers
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'platform_admin')
  WITH CHECK (public.get_my_role() = 'platform_admin');
CREATE POLICY "Platform admins can delete chambers" ON public.chambers
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'platform_admin');

CREATE TRIGGER trg_chambers_updated_at
  BEFORE UPDATE ON public.chambers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ LAWYERS ============
ALTER TABLE public.lawyers
  ALTER COLUMN firm_id DROP NOT NULL,
  ADD COLUMN bar_id uuid REFERENCES public.bars(id) ON DELETE SET NULL,
  ADD COLUMN chambers_id uuid REFERENCES public.chambers(id) ON DELETE SET NULL;

CREATE INDEX lawyers_bar_id_idx ON public.lawyers (bar_id);
CREATE INDEX lawyers_chambers_id_idx ON public.lawyers (chambers_id);

-- Either belongs to a firm (attorney) or to a bar (advocate). Both is ok too.
ALTER TABLE public.lawyers
  ADD CONSTRAINT lawyers_firm_or_bar_check
  CHECK (firm_id IS NOT NULL OR bar_id IS NOT NULL);
