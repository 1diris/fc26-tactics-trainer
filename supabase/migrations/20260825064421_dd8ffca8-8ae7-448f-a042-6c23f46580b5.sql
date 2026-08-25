CREATE POLICY "career_screenshots_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'career-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "career_screenshots_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'career-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "career_screenshots_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'career-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);