-- Fix search_path security issue by making it immutable and more specific
DROP FUNCTION IF EXISTS public.get_recording_signed_urls(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_recording_signed_urls(
  p_recording_id uuid,
  p_expiry_seconds integer DEFAULT 3600
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public', 'storage'
AS $$
DECLARE
  v_recording public.recordings%ROWTYPE;
  v_result jsonb := '{}'::jsonb;
  v_original_signed text;
  v_stream_signed text;
  v_waveform_signed text;
BEGIN
  -- Validate input parameters
  IF p_recording_id IS NULL THEN
    RAISE EXCEPTION 'Recording ID cannot be null';
  END IF;

  IF p_expiry_seconds <= 0 THEN
    RAISE EXCEPTION 'Expiry seconds must be greater than zero';
  END IF;

  -- Fetch the recording
  SELECT * INTO v_recording
  FROM public.recordings
  WHERE id = p_recording_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recording not found with ID: %', p_recording_id;
  END IF;

  -- Check authorization: must be owner OR recording must be public and clean
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access recording';
  END IF;

  IF v_recording.user_id != auth.uid() 
     AND NOT (v_recording.state = 'public' AND v_recording.moderation_status = 'clean') THEN
    RAISE EXCEPTION 'Not authorized to access recording with ID: %', p_recording_id;
  END IF;

  -- Generate signed URLs for each file type
  IF v_recording.file_original_url IS NOT NULL THEN
    SELECT (storage.create_signed_url('recordings', v_recording.file_original_url, p_expiry_seconds))::text
    INTO v_original_signed;
    IF v_original_signed IS NOT NULL THEN
      v_result = jsonb_set(v_result, '{file_original_url}', to_jsonb(v_original_signed));
    END IF;
  END IF;
  
  IF v_recording.file_stream_url IS NOT NULL THEN
    SELECT (storage.create_signed_url('recordings', v_recording.file_stream_url, p_expiry_seconds))::text
    INTO v_stream_signed;
    IF v_stream_signed IS NOT NULL THEN
      v_result = jsonb_set(v_result, '{file_stream_url}', to_jsonb(v_stream_signed));
    END IF;
  END IF;
  
  IF v_recording.waveform_json_url IS NOT NULL THEN
    SELECT (storage.create_signed_url('recordings', v_recording.waveform_json_url, p_expiry_seconds))::text
    INTO v_waveform_signed;
    IF v_waveform_signed IS NOT NULL THEN
      v_result = jsonb_set(v_result, '{waveform_json_url}', to_jsonb(v_waveform_signed));
    END IF;
  END IF;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_recording_signed_urls IS 
'Generates time-limited signed URLs for recording files. Only accessible to recording owner or for public clean recordings.';

GRANT EXECUTE ON FUNCTION public.get_recording_signed_urls(uuid, integer) TO authenticated;