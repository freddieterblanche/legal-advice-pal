CREATE POLICY "Authenticated users can create pending firms"
  ON public.firms FOR INSERT
  TO authenticated
  WITH CHECK (status = 'pending');