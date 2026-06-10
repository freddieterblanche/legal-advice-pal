
-- 1) Add town_id to firms and chambers
ALTER TABLE public.firms ADD COLUMN IF NOT EXISTS town_id uuid REFERENCES public.towns(id) ON DELETE SET NULL;
ALTER TABLE public.chambers ADD COLUMN IF NOT EXISTS town_id uuid REFERENCES public.towns(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS firms_town_id_idx ON public.firms(town_id);
CREATE INDEX IF NOT EXISTS chambers_town_id_idx ON public.chambers(town_id);

-- 2) Seed missing Western Cape towns referenced by existing free-text data
WITH wc AS (SELECT id FROM public.provinces WHERE name='Western Cape')
INSERT INTO public.towns (name, slug, province_id, is_major_city)
SELECT v.name, lower(regexp_replace(v.name, '[^a-zA-Z0-9]+', '-', 'g')), wc.id, false
FROM wc, (VALUES
  ('Durbanville'),('Langebaan'),('Melkbosstrand'),('Velddrif'),('Hessequa'),
  ('Greyton'),('Stilbaai'),('Kleinmond'),('Riversdale'),('Gansbaai'),
  ('Clanwilliam'),('Riviersonderend'),('Bredasdorp'),('Yzerfontein')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.towns t
  WHERE t.province_id = wc.id AND lower(t.name) = lower(v.name)
);

-- 3) Backfill helper: match by province + name (case-insensitive), with "Still Bay" -> "Stilbaai" alias
WITH match_town AS (
  SELECT t.id AS town_id, t.province_id, lower(t.name) AS lname
  FROM public.towns t
)
-- service_providers
UPDATE public.service_providers sp
SET town_id = m.town_id
FROM match_town m, public.provinces p
WHERE sp.town_id IS NULL
  AND sp.city IS NOT NULL AND sp.city <> ''
  AND p.name = sp.province
  AND m.province_id = p.id
  AND m.lname = lower(CASE WHEN lower(trim(sp.city))='still bay' THEN 'stilbaai' ELSE trim(sp.city) END);

WITH match_town AS (SELECT t.id AS town_id, t.province_id, lower(t.name) AS lname FROM public.towns t)
UPDATE public.firms f
SET town_id = m.town_id
FROM match_town m, public.provinces p
WHERE f.town_id IS NULL AND f.city IS NOT NULL AND f.city<>''
  AND p.name = f.province AND m.province_id = p.id
  AND m.lname = lower(CASE WHEN lower(trim(f.city))='still bay' THEN 'stilbaai' ELSE trim(f.city) END);

WITH match_town AS (SELECT t.id AS town_id, t.province_id, lower(t.name) AS lname FROM public.towns t)
UPDATE public.firm_branches fb
SET town_id = m.town_id
FROM match_town m, public.provinces p
WHERE fb.town_id IS NULL AND fb.city IS NOT NULL AND fb.city<>''
  AND p.name = fb.province AND m.province_id = p.id
  AND m.lname = lower(CASE WHEN lower(trim(fb.city))='still bay' THEN 'stilbaai' ELSE trim(fb.city) END);

WITH match_town AS (SELECT t.id AS town_id, t.province_id, lower(t.name) AS lname FROM public.towns t)
UPDATE public.chambers c
SET town_id = m.town_id
FROM match_town m, public.provinces p
WHERE c.town_id IS NULL AND c.city IS NOT NULL AND c.city<>''
  AND p.name = c.province AND m.province_id = p.id
  AND m.lname = lower(CASE WHEN lower(trim(c.city))='still bay' THEN 'stilbaai' ELSE trim(c.city) END);

-- 4) Normalise the free-text city + province to the canonical town/province values
UPDATE public.service_providers sp
SET city = t.name, province = p.name
FROM public.towns t JOIN public.provinces p ON p.id = t.province_id
WHERE sp.town_id = t.id;

UPDATE public.firms f
SET city = t.name, province = p.name
FROM public.towns t JOIN public.provinces p ON p.id = t.province_id
WHERE f.town_id = t.id;

UPDATE public.firm_branches fb
SET city = t.name, province = p.name
FROM public.towns t JOIN public.provinces p ON p.id = t.province_id
WHERE fb.town_id = t.id;

UPDATE public.chambers c
SET city = t.name, province = p.name
FROM public.towns t JOIN public.provinces p ON p.id = t.province_id
WHERE c.town_id = t.id;
