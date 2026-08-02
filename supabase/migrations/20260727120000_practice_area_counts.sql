-- Aggregated per-practice-area provider counts. The homepage and
-- /practice-areas previously downloaded every provider_practice_areas row on
-- each visit just to count them client-side — with a large seeded database
-- that is megabytes per page view. This view returns ~20 rows instead.
create or replace view public.practice_area_counts as
select
  ppa.practice_area_id,
  count(*)::int as provider_count
from public.provider_practice_areas ppa
join public.service_providers sp on sp.id = ppa.service_provider_id
where sp.status in ('trial', 'active')
group by ppa.practice_area_id;

grant select on public.practice_area_counts to anon, authenticated, service_role;
