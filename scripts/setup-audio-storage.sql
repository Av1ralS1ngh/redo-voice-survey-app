-- scripts/setup-audio-storage.sql
-- Setup Supabase storage bucket and RLS policies for conversation audio files

-- Create storage bucket for conversation audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conversation-audio-files',
  'conversation-audio-files',
  true, -- Public access for easy playback
  52428800, -- 50MB file size limit
  ARRAY['audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg']
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create RLS policy for authenticated users to upload audio
CREATE POLICY "Allow authenticated users to upload audio" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'conversation-audio-files');

-- Create RLS policy for public read access to audio files
CREATE POLICY "Allow public read access to audio" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'conversation-audio-files');

-- Create RLS policy for authenticated users to update their own audio files
CREATE POLICY "Allow authenticated users to update audio" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'conversation-audio-files')
WITH CHECK (bucket_id = 'conversation-audio-files');

-- Create RLS policy for authenticated users to delete their own audio files
CREATE POLICY "Allow authenticated users to delete audio" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'conversation-audio-files');

-- Create conversation_audio table if it doesn't exist
CREATE TABLE IF NOT EXISTS conversation_audio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  speaker VARCHAR(10) NOT NULL CHECK (speaker IN ('user', 'agent')),
  audio_url TEXT NOT NULL,
  audio_duration INTEGER NOT NULL, -- Duration in milliseconds
  processing_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combination of conversation, turn, and speaker
  UNIQUE(conversation_id, turn_number, speaker)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversation_audio_conversation_id ON conversation_audio(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_audio_turn_number ON conversation_audio(turn_number);
CREATE INDEX IF NOT EXISTS idx_conversation_audio_speaker ON conversation_audio(speaker);
CREATE INDEX IF NOT EXISTS idx_conversation_audio_status ON conversation_audio(processing_status);
CREATE INDEX IF NOT EXISTS idx_conversation_audio_created_at ON conversation_audio(created_at);

-- Create RLS policies for conversation_audio table
ALTER TABLE conversation_audio ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all audio records
CREATE POLICY "Allow authenticated users to read audio records" ON conversation_audio
FOR SELECT TO authenticated
USING (true);

-- Allow authenticated users to insert audio records
CREATE POLICY "Allow authenticated users to insert audio records" ON conversation_audio
FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update audio records
CREATE POLICY "Allow authenticated users to update audio records" ON conversation_audio
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete audio records
CREATE POLICY "Allow authenticated users to delete audio records" ON conversation_audio
FOR DELETE TO authenticated
USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_audio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_conversation_audio_updated_at ON conversation_audio;
CREATE TRIGGER trigger_update_conversation_audio_updated_at
  BEFORE UPDATE ON conversation_audio
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_audio_updated_at();

-- Create view for audio statistics
CREATE OR REPLACE VIEW audio_statistics AS
SELECT 
  COUNT(*) as total_audio_files,
  COUNT(DISTINCT conversation_id) as conversations_with_audio,
  SUM(audio_duration) as total_duration_ms,
  AVG(audio_duration) as avg_duration_ms,
  COUNT(CASE WHEN processing_status = 'completed' THEN 1 END) as completed_files,
  COUNT(CASE WHEN processing_status = 'failed' THEN 1 END) as failed_files,
  COUNT(CASE WHEN processing_status = 'pending' THEN 1 END) as pending_files,
  COUNT(CASE WHEN speaker = 'user' THEN 1 END) as user_audio_files,
  COUNT(CASE WHEN speaker = 'agent' THEN 1 END) as agent_audio_files
FROM conversation_audio;

-- Grant access to the view
GRANT SELECT ON audio_statistics TO authenticated;

-- Create function to get conversation audio summary
CREATE OR REPLACE FUNCTION get_conversation_audio_summary(conv_id UUID)
RETURNS TABLE (
  turn_number INTEGER,
  user_audio_url TEXT,
  user_duration INTEGER,
  agent_audio_url TEXT,
  agent_duration INTEGER,
  total_duration INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca_user.turn_number,
    ca_user.audio_url as user_audio_url,
    ca_user.audio_duration as user_duration,
    ca_agent.audio_url as agent_audio_url,
    ca_agent.audio_duration as agent_duration,
    COALESCE(ca_user.audio_duration, 0) + COALESCE(ca_agent.audio_duration, 0) as total_duration
  FROM (
    SELECT DISTINCT turn_number 
    FROM conversation_audio 
    WHERE conversation_id = conv_id
  ) turns
  LEFT JOIN conversation_audio ca_user ON ca_user.conversation_id = conv_id 
    AND ca_user.turn_number = turns.turn_number 
    AND ca_user.speaker = 'user'
  LEFT JOIN conversation_audio ca_agent ON ca_agent.conversation_id = conv_id 
    AND ca_agent.turn_number = turns.turn_number 
    AND ca_agent.speaker = 'agent'
  ORDER BY turns.turn_number;
END;
$$ LANGUAGE plpgsql;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_conversation_audio_summary(UUID) TO authenticated;
