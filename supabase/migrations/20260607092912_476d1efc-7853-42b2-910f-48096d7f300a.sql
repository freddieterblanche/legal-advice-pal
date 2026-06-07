DROP VIEW IF EXISTS public.lawyer_search_view;

CREATE OR REPLACE VIEW public.lawyer_search_view AS
SELECT l.id,
    l.slug,
    l.first_name,
    l.last_name,
    (l.first_name || ' '::text) || l.last_name AS full_name,
    l.designation,
    l.city,
    l.province,
    l.avatar_url,
    l.status,
    l.profile_views,
    l.trial_end_date,
    l.town_id,
    l.is_senior_counsel,
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
   FROM lawyers l
     LEFT JOIN firms f ON f.id = l.firm_id
     LEFT JOIN towns t ON t.id = l.town_id
     LEFT JOIN provinces pr ON pr.id = t.province_id
     LEFT JOIN lawyer_practice_areas lpa ON lpa.lawyer_id = l.id
     LEFT JOIN practice_areas pa ON pa.id = lpa.practice_area_id
     LEFT JOIN lawyer_cases lc ON lc.lawyer_id = l.id
  WHERE l.status = ANY (ARRAY['trial'::text, 'active'::text])
  GROUP BY l.id, f.name, f.slug, t.name, t.slug, pr.id, pr.name, pr.slug;