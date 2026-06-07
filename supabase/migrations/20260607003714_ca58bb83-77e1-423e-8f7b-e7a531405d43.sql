
-- Provinces
CREATE TABLE public.provinces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name citext NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.provinces TO anon, authenticated;
GRANT ALL ON public.provinces TO service_role;
ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Provinces are publicly readable" ON public.provinces FOR SELECT USING (true);
CREATE POLICY "Platform admin manage provinces" ON public.provinces FOR ALL TO authenticated
  USING (get_my_role() = 'platform_admin') WITH CHECK (get_my_role() = 'platform_admin');

INSERT INTO public.provinces (name, slug, code) VALUES
  ('Eastern Cape','eastern-cape','EC'),
  ('Free State','free-state','FS'),
  ('Gauteng','gauteng','GP'),
  ('KwaZulu-Natal','kwazulu-natal','KZN'),
  ('Limpopo','limpopo','LP'),
  ('Mpumalanga','mpumalanga','MP'),
  ('Northern Cape','northern-cape','NC'),
  ('North West','north-west','NW'),
  ('Western Cape','western-cape','WC');

-- Towns
CREATE TABLE public.towns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id uuid NOT NULL REFERENCES public.provinces(id) ON DELETE CASCADE,
  name citext NOT NULL,
  slug text NOT NULL,
  is_major_city boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (province_id, name),
  UNIQUE (province_id, slug)
);
CREATE INDEX towns_province_idx ON public.towns(province_id);
GRANT SELECT ON public.towns TO anon, authenticated;
GRANT ALL ON public.towns TO service_role;
ALTER TABLE public.towns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Towns are publicly readable" ON public.towns FOR SELECT USING (true);
CREATE POLICY "Platform admin manage towns" ON public.towns FOR ALL TO authenticated
  USING (get_my_role() = 'platform_admin') WITH CHECK (get_my_role() = 'platform_admin');
CREATE TRIGGER towns_updated_at BEFORE UPDATE ON public.towns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed towns. Helper subqueries use province slug.
WITH p AS (SELECT id, slug FROM public.provinces)
INSERT INTO public.towns (province_id, name, slug, is_major_city)
SELECT (SELECT id FROM p WHERE slug = src.prov), src.name, src.slug, src.major
FROM (VALUES
  -- Gauteng
  ('gauteng','Johannesburg','johannesburg',true),
  ('gauteng','Sandton','sandton',true),
  ('gauteng','Rosebank','rosebank',false),
  ('gauteng','Randburg','randburg',false),
  ('gauteng','Roodepoort','roodepoort',false),
  ('gauteng','Soweto','soweto',false),
  ('gauteng','Midrand','midrand',false),
  ('gauteng','Pretoria','pretoria',true),
  ('gauteng','Centurion','centurion',false),
  ('gauteng','Hatfield','hatfield',false),
  ('gauteng','Brooklyn','brooklyn-gp',false),
  ('gauteng','Menlyn','menlyn',false),
  ('gauteng','Edenvale','edenvale',false),
  ('gauteng','Kempton Park','kempton-park',false),
  ('gauteng','Boksburg','boksburg',false),
  ('gauteng','Benoni','benoni',false),
  ('gauteng','Germiston','germiston',false),
  ('gauteng','Alberton','alberton',false),
  ('gauteng','Springs','springs',false),
  ('gauteng','Krugersdorp','krugersdorp',false),
  ('gauteng','Vereeniging','vereeniging',false),
  ('gauteng','Vanderbijlpark','vanderbijlpark',false),
  ('gauteng','Heidelberg','heidelberg-gp',false),
  ('gauteng','Bronkhorstspruit','bronkhorstspruit',false),
  ('gauteng','Cullinan','cullinan',false),
  -- Western Cape
  ('western-cape','Cape Town','cape-town',true),
  ('western-cape','Bellville','bellville',false),
  ('western-cape','Claremont','claremont',false),
  ('western-cape','Sea Point','sea-point',false),
  ('western-cape','Stellenbosch','stellenbosch',true),
  ('western-cape','Paarl','paarl',false),
  ('western-cape','Somerset West','somerset-west',false),
  ('western-cape','Strand','strand',false),
  ('western-cape','Worcester','worcester',false),
  ('western-cape','George','george',true),
  ('western-cape','Mossel Bay','mossel-bay',false),
  ('western-cape','Knysna','knysna',false),
  ('western-cape','Plettenberg Bay','plettenberg-bay',false),
  ('western-cape','Oudtshoorn','oudtshoorn',false),
  ('western-cape','Hermanus','hermanus',false),
  ('western-cape','Caledon','caledon',false),
  ('western-cape','Swellendam','swellendam',false),
  ('western-cape','Robertson','robertson',false),
  ('western-cape','Ceres','ceres',false),
  ('western-cape','Malmesbury','malmesbury',false),
  ('western-cape','Vredenburg','vredenburg',false),
  ('western-cape','Saldanha','saldanha',false),
  ('western-cape','Beaufort West','beaufort-west',false),
  ('western-cape','Wellington','wellington',false),
  ('western-cape','Franschhoek','franschhoek',false),
  -- KwaZulu-Natal
  ('kwazulu-natal','Durban','durban',true),
  ('kwazulu-natal','Umhlanga','umhlanga',false),
  ('kwazulu-natal','Ballito','ballito',false),
  ('kwazulu-natal','Pinetown','pinetown',false),
  ('kwazulu-natal','Westville','westville',false),
  ('kwazulu-natal','Hillcrest','hillcrest',false),
  ('kwazulu-natal','Amanzimtoti','amanzimtoti',false),
  ('kwazulu-natal','Pietermaritzburg','pietermaritzburg',true),
  ('kwazulu-natal','Hilton','hilton',false),
  ('kwazulu-natal','Howick','howick',false),
  ('kwazulu-natal','Newcastle','newcastle',false),
  ('kwazulu-natal','Ladysmith','ladysmith',false),
  ('kwazulu-natal','Richards Bay','richards-bay',false),
  ('kwazulu-natal','Empangeni','empangeni',false),
  ('kwazulu-natal','Vryheid','vryheid',false),
  ('kwazulu-natal','Dundee','dundee',false),
  ('kwazulu-natal','Estcourt','estcourt',false),
  ('kwazulu-natal','Margate','margate',false),
  ('kwazulu-natal','Port Shepstone','port-shepstone',false),
  ('kwazulu-natal','Kokstad','kokstad',false),
  ('kwazulu-natal','Ulundi','ulundi',false),
  ('kwazulu-natal','Eshowe','eshowe',false),
  ('kwazulu-natal','Stanger','stanger',false),
  -- Eastern Cape
  ('eastern-cape','Gqeberha','gqeberha',true),
  ('eastern-cape','Port Elizabeth','port-elizabeth',false),
  ('eastern-cape','East London','east-london',true),
  ('eastern-cape','Mthatha','mthatha',false),
  ('eastern-cape','Makhanda','makhanda',false),
  ('eastern-cape','Grahamstown','grahamstown',false),
  ('eastern-cape','Uitenhage','uitenhage',false),
  ('eastern-cape','Kariega','kariega',false),
  ('eastern-cape','Jeffreys Bay','jeffreys-bay',false),
  ('eastern-cape','Humansdorp','humansdorp',false),
  ('eastern-cape','Queenstown','queenstown',false),
  ('eastern-cape','Komani','komani',false),
  ('eastern-cape','King William''s Town','king-williams-town',false),
  ('eastern-cape','Bhisho','bhisho',false),
  ('eastern-cape','Butterworth','butterworth',false),
  ('eastern-cape','Aliwal North','aliwal-north',false),
  ('eastern-cape','Cradock','cradock',false),
  ('eastern-cape','Graaff-Reinet','graaff-reinet',false),
  ('eastern-cape','Port Alfred','port-alfred',false),
  ('eastern-cape','Stutterheim','stutterheim',false),
  -- Free State
  ('free-state','Bloemfontein','bloemfontein',true),
  ('free-state','Welkom','welkom',false),
  ('free-state','Bethlehem','bethlehem',false),
  ('free-state','Sasolburg','sasolburg',false),
  ('free-state','Kroonstad','kroonstad',false),
  ('free-state','Parys','parys',false),
  ('free-state','Harrismith','harrismith',false),
  ('free-state','Ficksburg','ficksburg',false),
  ('free-state','Phuthaditjhaba','phuthaditjhaba',false),
  ('free-state','Botshabelo','botshabelo',false),
  ('free-state','Thaba Nchu','thaba-nchu',false),
  ('free-state','Virginia','virginia',false),
  ('free-state','Odendaalsrus','odendaalsrus',false),
  ('free-state','Senekal','senekal',false),
  ('free-state','Bothaville','bothaville',false),
  -- Limpopo
  ('limpopo','Polokwane','polokwane',true),
  ('limpopo','Tzaneen','tzaneen',false),
  ('limpopo','Mokopane','mokopane',false),
  ('limpopo','Thohoyandou','thohoyandou',false),
  ('limpopo','Musina','musina',false),
  ('limpopo','Louis Trichardt','louis-trichardt',false),
  ('limpopo','Makhado','makhado',false),
  ('limpopo','Lephalale','lephalale',false),
  ('limpopo','Bela-Bela','bela-bela',false),
  ('limpopo','Modimolle','modimolle',false),
  ('limpopo','Mookgophong','mookgophong',false),
  ('limpopo','Phalaborwa','phalaborwa',false),
  ('limpopo','Giyani','giyani',false),
  ('limpopo','Burgersfort','burgersfort',false),
  ('limpopo','Hoedspruit','hoedspruit',false),
  -- Mpumalanga
  ('mpumalanga','Mbombela','mbombela',true),
  ('mpumalanga','Nelspruit','nelspruit',false),
  ('mpumalanga','White River','white-river',false),
  ('mpumalanga','Witbank','witbank',false),
  ('mpumalanga','eMalahleni','emalahleni',false),
  ('mpumalanga','Middelburg','middelburg-mp',false),
  ('mpumalanga','Secunda','secunda',false),
  ('mpumalanga','Ermelo','ermelo',false),
  ('mpumalanga','Standerton','standerton',false),
  ('mpumalanga','Bethal','bethal',false),
  ('mpumalanga','Barberton','barberton',false),
  ('mpumalanga','Sabie','sabie',false),
  ('mpumalanga','Graskop','graskop',false),
  ('mpumalanga','Komatipoort','komatipoort',false),
  ('mpumalanga','Piet Retief','piet-retief',false),
  ('mpumalanga','Volksrust','volksrust',false),
  -- Northern Cape
  ('northern-cape','Kimberley','kimberley',true),
  ('northern-cape','Upington','upington',false),
  ('northern-cape','Kathu','kathu',false),
  ('northern-cape','Kuruman','kuruman',false),
  ('northern-cape','Springbok','springbok',false),
  ('northern-cape','De Aar','de-aar',false),
  ('northern-cape','Colesberg','colesberg',false),
  ('northern-cape','Hartswater','hartswater',false),
  ('northern-cape','Postmasburg','postmasburg',false),
  ('northern-cape','Calvinia','calvinia',false),
  ('northern-cape','Prieska','prieska',false),
  ('northern-cape','Douglas','douglas',false),
  ('northern-cape','Vryburg','vryburg-nc',false),
  -- North West
  ('north-west','Mahikeng','mahikeng',true),
  ('north-west','Mafikeng','mafikeng',false),
  ('north-west','Rustenburg','rustenburg',false),
  ('north-west','Klerksdorp','klerksdorp',false),
  ('north-west','Potchefstroom','potchefstroom',false),
  ('north-west','Brits','brits',false),
  ('north-west','Lichtenburg','lichtenburg',false),
  ('north-west','Vryburg','vryburg-nw',false),
  ('north-west','Zeerust','zeerust',false),
  ('north-west','Hartbeespoort','hartbeespoort',false),
  ('north-west','Ventersdorp','ventersdorp',false),
  ('north-west','Wolmaransstad','wolmaransstad',false),
  ('north-west','Schweizer-Reneke','schweizer-reneke',false),
  ('north-west','Orkney','orkney',false),
  ('north-west','Stilfontein','stilfontein',false)
) AS src(prov, name, slug, major);

-- Link lawyers to towns
ALTER TABLE public.lawyers ADD COLUMN town_id uuid REFERENCES public.towns(id) ON DELETE SET NULL;
CREATE INDEX lawyers_town_idx ON public.lawyers(town_id);

ALTER TABLE public.firm_branches ADD COLUMN town_id uuid REFERENCES public.towns(id) ON DELETE SET NULL;
CREATE INDEX firm_branches_town_idx ON public.firm_branches(town_id);

-- Rebuild search view to expose town / province linkage
DROP VIEW IF EXISTS public.lawyer_search_view;
CREATE VIEW public.lawyer_search_view AS
SELECT l.id,
  l.slug,
  l.first_name,
  l.last_name,
  (l.first_name || ' ' || l.last_name) AS full_name,
  l.designation,
  l.city,
  l.province,
  l.avatar_url,
  l.status,
  l.profile_views,
  l.trial_end_date,
  l.town_id,
  t.name::text AS town_name,
  t.slug AS town_slug,
  pr.id AS province_id,
  pr.name::text AS province_name,
  pr.slug AS province_slug,
  f.name AS firm_name,
  f.slug AS firm_slug,
  array_agg(DISTINCT pa.name) AS practice_areas,
  array_agg(DISTINCT pa.slug) AS practice_area_slugs,
  count(DISTINCT lc.id) AS case_count
FROM public.lawyers l
LEFT JOIN public.firms f ON f.id = l.firm_id
LEFT JOIN public.towns t ON t.id = l.town_id
LEFT JOIN public.provinces pr ON pr.id = t.province_id
LEFT JOIN public.lawyer_practice_areas lpa ON lpa.lawyer_id = l.id
LEFT JOIN public.practice_areas pa ON pa.id = lpa.practice_area_id
LEFT JOIN public.lawyer_cases lc ON lc.lawyer_id = l.id
WHERE l.status = ANY (ARRAY['trial'::text, 'active'::text])
GROUP BY l.id, f.name, f.slug, t.name, t.slug, pr.id, pr.name, pr.slug;

GRANT SELECT ON public.lawyer_search_view TO anon, authenticated;
