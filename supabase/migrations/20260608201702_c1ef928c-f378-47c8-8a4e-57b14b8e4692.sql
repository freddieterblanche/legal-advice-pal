
-- 1. Countries lookup table
CREATE TABLE public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name citext NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.countries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.countries TO authenticated;
GRANT ALL ON public.countries TO service_role;

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Countries are publicly readable" ON public.countries
  FOR SELECT USING (true);

CREATE POLICY "Platform admin manage countries" ON public.countries
  TO authenticated
  USING (get_my_role() = 'platform_admin')
  WITH CHECK (get_my_role() = 'platform_admin');

-- 2. Seed African countries
INSERT INTO public.countries (name, code, slug) VALUES
  ('Algeria','DZ','algeria'),
  ('Angola','AO','angola'),
  ('Benin','BJ','benin'),
  ('Botswana','BW','botswana'),
  ('Burkina Faso','BF','burkina-faso'),
  ('Burundi','BI','burundi'),
  ('Cabo Verde','CV','cabo-verde'),
  ('Cameroon','CM','cameroon'),
  ('Central African Republic','CF','central-african-republic'),
  ('Chad','TD','chad'),
  ('Comoros','KM','comoros'),
  ('Democratic Republic of the Congo','CD','democratic-republic-of-the-congo'),
  ('Republic of the Congo','CG','republic-of-the-congo'),
  ('Côte d''Ivoire','CI','cote-divoire'),
  ('Djibouti','DJ','djibouti'),
  ('Egypt','EG','egypt'),
  ('Equatorial Guinea','GQ','equatorial-guinea'),
  ('Eritrea','ER','eritrea'),
  ('Eswatini','SZ','eswatini'),
  ('Ethiopia','ET','ethiopia'),
  ('Gabon','GA','gabon'),
  ('Gambia','GM','gambia'),
  ('Ghana','GH','ghana'),
  ('Guinea','GN','guinea'),
  ('Guinea-Bissau','GW','guinea-bissau'),
  ('Kenya','KE','kenya'),
  ('Lesotho','LS','lesotho'),
  ('Liberia','LR','liberia'),
  ('Libya','LY','libya'),
  ('Madagascar','MG','madagascar'),
  ('Malawi','MW','malawi'),
  ('Mali','ML','mali'),
  ('Mauritania','MR','mauritania'),
  ('Mauritius','MU','mauritius'),
  ('Morocco','MA','morocco'),
  ('Mozambique','MZ','mozambique'),
  ('Namibia','NA','namibia'),
  ('Niger','NE','niger'),
  ('Nigeria','NG','nigeria'),
  ('Rwanda','RW','rwanda'),
  ('São Tomé and Príncipe','ST','sao-tome-and-principe'),
  ('Senegal','SN','senegal'),
  ('Seychelles','SC','seychelles'),
  ('Sierra Leone','SL','sierra-leone'),
  ('Somalia','SO','somalia'),
  ('South Africa','ZA','south-africa'),
  ('South Sudan','SS','south-sudan'),
  ('Sudan','SD','sudan'),
  ('Tanzania','TZ','tanzania'),
  ('Togo','TG','togo'),
  ('Tunisia','TN','tunisia'),
  ('Uganda','UG','uganda'),
  ('Zambia','ZM','zambia'),
  ('Zimbabwe','ZW','zimbabwe');

-- 3. Add country column to firm_branches
ALTER TABLE public.firm_branches
  ADD COLUMN country text NOT NULL DEFAULT 'South Africa';
