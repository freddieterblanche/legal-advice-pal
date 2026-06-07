CREATE POLICY "Platform admin full access to lawyer_practice_areas"
ON public.lawyer_practice_areas
FOR ALL
USING (get_my_role() = 'platform_admin')
WITH CHECK (get_my_role() = 'platform_admin');