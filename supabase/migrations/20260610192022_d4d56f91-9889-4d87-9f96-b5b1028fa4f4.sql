
-- Match by name only for the few province-mismatched rows
WITH cand AS (
  SELECT t.id AS town_id, p.name AS province_name, lower(t.name) AS lname
  FROM public.towns t JOIN public.provinces p ON p.id = t.province_id
)
UPDATE public.service_providers sp SET town_id = c.town_id, province = c.province_name, city = initcap(sp.city)
FROM cand c
WHERE sp.town_id IS NULL AND sp.city<>'' AND c.lname = lower(trim(sp.city))
  AND NOT EXISTS (SELECT 1 FROM cand c2 WHERE c2.lname=lower(trim(sp.city)) AND c2.town_id<>c.town_id);

WITH cand AS (
  SELECT t.id AS town_id, p.name AS province_name, lower(t.name) AS lname
  FROM public.towns t JOIN public.provinces p ON p.id = t.province_id
)
UPDATE public.firms f SET town_id = c.town_id, province = c.province_name
FROM cand c
WHERE f.town_id IS NULL AND f.city<>'' AND c.lname = lower(trim(f.city))
  AND NOT EXISTS (SELECT 1 FROM cand c2 WHERE c2.lname=lower(trim(f.city)) AND c2.town_id<>c.town_id);

WITH cand AS (
  SELECT t.id AS town_id, p.name AS province_name, lower(t.name) AS lname
  FROM public.towns t JOIN public.provinces p ON p.id = t.province_id
)
UPDATE public.firm_branches fb SET town_id = c.town_id, province = c.province_name
FROM cand c
WHERE fb.town_id IS NULL AND fb.city<>'' AND c.lname = lower(trim(fb.city))
  AND NOT EXISTS (SELECT 1 FROM cand c2 WHERE c2.lname=lower(trim(fb.city)) AND c2.town_id<>c.town_id);

-- Re-normalise city/province from canonical town
UPDATE public.service_providers sp SET city = t.name, province = p.name
FROM public.towns t JOIN public.provinces p ON p.id = t.province_id WHERE sp.town_id = t.id;
UPDATE public.firms f SET city = t.name, province = p.name
FROM public.towns t JOIN public.provinces p ON p.id = t.province_id WHERE f.town_id = t.id;
UPDATE public.firm_branches fb SET city = t.name, province = p.name
FROM public.towns t JOIN public.provinces p ON p.id = t.province_id WHERE fb.town_id = t.id;
