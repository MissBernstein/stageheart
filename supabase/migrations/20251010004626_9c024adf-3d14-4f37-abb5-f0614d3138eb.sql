-- Create function to generate signed URLs for recordings
-- Only accessible to authenticated users and only for public recordings or own recordings
CREATE OR REPLACE FUNCTION public.get_recording_signed_urls(
  p_recording_id uuid,
  p_expiry_seconds integer DEFAULT 3600
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_recording recordings%ROWTYPE;
  v_signed_original text;
  v_signed_stream text;
  v_signed_waveform text;
  v_result jsonb;
BEGIN
  -- Fetch the recording
  SELECT * INTO v_recording
  FROM recordings
  WHERE id = p_recording_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recording not found';
  END IF;
  
  -- Check authorization: must be owner OR recording must be public and clean
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF v_recording.user_id != auth.uid() 
     AND NOT (v_recording.state = 'public' AND v_recording.moderation_status = 'clean') THEN
    RAISE EXCEPTION 'Not authorized to access this recording';
  END IF;
  
  -- Generate signed URLs using the storage schema's internal functions
  -- We need to use storage.objects to generate signed URLs
  v_result = '{}'::jsonb;
  
  IF v_recording.file_original_url IS NOT NULL THEN
    -- Generate signed URL for original file
    SELECT jsonb_build_object('signedUrl', 
      storage.create_signed_url(
        'recordings',
        v_recording.file_original_url,
        p_expiry_seconds
      )
    ) INTO v_signed_original;
    v_result = jsonb_set(v_result, '{file_original_url}', v_signed_original->'signedUrl');
  END IF;
  
  IF v_recording.file_stream_url IS NOT NULL THEN
    SELECT jsonb_build_object('signedUrl',
      storage.create_signed_url(
        'recordings',
        v_recording.file_stream_url,
        p_expiry_seconds
      )
    ) INTO v_signed_stream;
    v_result = jsonb_set(v_result, '{file_stream_url}', v_signed_stream->'signedUrl');
  END IF;
  
  IF v_recording.waveform_json_url IS NOT NULL THEN
    SELECT jsonb_build_object('signedUrl',
      storage.create_signed_url(
        'recordings',
        v_recording.waveform_json_url,
        p_expiry_seconds
      )
    ) INTO v_signed_waveform;
    v_result = jsonb_set(v_result, '{waveform_json_url}', v_signed_waveform->'signedUrl');
  END IF;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_recording_signed_urls IS 
'Generates time-limited signed URLs for recording files. Only accessible to recording owner or for public clean recordings.';

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_recording_signed_urls(uuid, integer) TO authenticated;