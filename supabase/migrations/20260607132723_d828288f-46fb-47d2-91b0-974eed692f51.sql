DROP VIEW IF EXISTS public.lawyer_search_view;

CREATE VIEW public.lawyer_search_view AS
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
   l.is_mediator,
   l.is_arbitrator,
   l.mediator_accreditation,
   l.mediator_style,
   l.mediator_sectors,
   l.arbitrator_accreditation,
   l.arbitrator_types,
   l.arbitrator_experience_years,
   l.languages,
   t.name::text AS town_name,
   t.slug AS town_slug,
   pr.id AS province_id,
   pr.name::text AS province_name,
   pr.slug AS province_slug,
   f.name AS firm_name,
   f.slug AS firm_slug,
   ch.name::text AS chambers_name,
   ch.slug AS chambers_slug,
   array_agg(DISTINCT pa.name) AS practice_areas,
   array_agg(DISTINCT pa.slug) AS practice_area_slugs,
   count(DISTINCT lc.id) AS case_count,
   l.year_of_admission,
   l.created_at
  FROM lawyers l
    LEFT JOIN firms f ON f.id = l.firm_id
    LEFT JOIN chambers ch ON ch.id = l.chambers_id
    LEFT JOIN towns t ON t.id = l.town_id
    LEFT JOIN provinces pr ON pr.id = t.province_id
    LEFT JOIN lawyer_practice_areas lpa ON lpa.lawyer_id = l.id
    LEFT JOIN practice_areas pa ON pa.id = lpa.practice_area_id
    LEFT JOIN lawyer_cases lc ON lc.lawyer_id = l.id
 WHERE l.status = ANY (ARRAY['trial'::text, 'active'::text])
 GROUP BY l.id, f.name, f.slug, ch.name, ch.slug, t.name, t.slug, pr.id, pr.name, pr.slug;

GRANT SELECT ON public.lawyer_search_view TO anon, authenticated;