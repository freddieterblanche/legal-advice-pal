
CREATE POLICY "Authenticated can upload lawyer photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lawyer-photos');

CREATE POLICY "Authenticated can update lawyer photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'lawyer-photos');

CREATE POLICY "Authenticated can delete lawyer photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lawyer-photos');

CREATE POLICY "Anyone can view lawyer photos"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'lawyer-photos');
