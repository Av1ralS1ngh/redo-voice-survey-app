# Audio Capture & Storage Pipeline

This implementation provides a complete audio capture and storage pipeline based on Hume AI documentation patterns, using WebRTC for audio capture and Supabase for storage.

## 🎯 Features

- **WebRTC Audio Capture**: Hume AI compatible settings (16kHz, mono, echo cancellation)
- **Supabase Storage**: Secure file storage with public URLs for playback
- **Database Integration**: PostgreSQL table for audio metadata and processing status
- **React Components**: Ready-to-use audio recording components
- **API Endpoints**: RESTful APIs for upload and retrieval
- **Error Handling**: Comprehensive error handling and user feedback

## 🚀 Quick Start

### 1. Setup Supabase Storage

Run the SQL script in your Supabase dashboard:

```sql
-- Copy and paste the contents of scripts/setup-audio-storage.sql
-- This creates:
-- - Storage bucket: conversation-audio-files
-- - Table: conversation_audio
-- - RLS policies for security
-- - Indexes for performance
```

### 2. Test the Implementation

Visit the demo page: `http://localhost:3000/audio-demo`

### 3. Integrate with Your App

```tsx
import { AudioRecorder } from '@/components/AudioRecorder';

function MyComponent() {
  return (
    <AudioRecorder
      conversationId="conv-123"
      turnNumber={1}
      speaker="user"
      onUploadComplete={(url) => console.log('Audio uploaded:', url)}
    />
  );
}
```

## 📁 File Structure

```
src/
├── lib/
│   ├── audio-capture-service.ts    # WebRTC audio capture
│   └── audio-storage-service.ts    # Supabase storage integration
├── components/
│   ├── AudioRecorder.tsx          # React audio recording component
│   └── VoiceSurveyWithAudio.tsx   # Complete voice survey example
├── hooks/
│   └── useAudioCapture.ts         # React hook for audio capture
├── app/
│   ├── api/audio/
│   │   ├── upload/route.ts         # Audio upload API
│   │   └── conversation/[id]/route.ts # Audio retrieval API
│   └── audio-demo/page.tsx        # Demo page
└── scripts/
    └── setup-audio-storage.sql    # Database setup script
```

## 🔧 Technical Details

### Audio Capture Service

- **Sample Rate**: 16kHz (Hume AI compatible)
- **Channels**: Mono (1 channel)
- **Format**: WebM with Opus codec
- **Features**: Echo cancellation, noise suppression, auto-gain control
- **Browser Support**: Modern browsers with WebRTC support

### Storage Architecture

- **Bucket**: `conversation-audio-files` (public access)
- **File Size Limit**: 50MB
- **Supported Formats**: WebM, MP4, WAV, OGG
- **URLs**: Public URLs for easy playback

### Database Schema

```sql
CREATE TABLE conversation_audio (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  turn_number INTEGER,
  speaker VARCHAR(10) CHECK (speaker IN ('user', 'agent')),
  audio_url TEXT,
  audio_duration INTEGER, -- milliseconds
  processing_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(conversation_id, turn_number, speaker)
);
```

## 🎵 Usage Examples

### Basic Audio Recording

```tsx
import { useAudioCapture } from '@/hooks/useAudioCapture';

function MyComponent() {
  const {
    isRecording,
    duration,
    startRecording,
    stopRecording
  } = useAudioCapture({
    onRecordingStart: () => console.log('Recording started'),
    onRecordingStop: (result) => console.log('Recording stopped:', result)
  });

  return (
    <div>
      <button onClick={startRecording} disabled={isRecording}>
        Start Recording
      </button>
      <button onClick={stopRecording} disabled={!isRecording}>
        Stop Recording
      </button>
      {isRecording && <div>Duration: {duration}ms</div>}
    </div>
  );
}
```

### Upload Audio File

```tsx
import { completeAudioUpload } from '@/lib/audio-storage-service';

async function uploadAudio(audioBlob: Blob, duration: number) {
  try {
    const result = await completeAudioUpload(
      'conversation-123',
      1,
      'user',
      audioBlob,
      duration
    );
    
    console.log('Audio uploaded:', result.url);
  } catch (error) {
    console.error('Upload failed:', error);
  }
}
```

### Fetch Conversation Audio

```tsx
import { getConversationAudio } from '@/lib/audio-storage-service';

async function fetchAudio(conversationId: string) {
  try {
    const audioRecords = await getConversationAudio(conversationId);
    console.log('Audio records:', audioRecords);
  } catch (error) {
    console.error('Fetch failed:', error);
  }
}
```

## 🔒 Security

- **RLS Policies**: Row Level Security enabled on all tables
- **Authentication**: Requires authenticated users for uploads
- **Public Access**: Audio files are publicly readable for playback
- **File Validation**: Server-side validation of file types and sizes

## 📊 Monitoring

### Audio Statistics View

```sql
SELECT * FROM audio_statistics;
```

Returns:
- Total audio files
- Conversations with audio
- Total duration
- Processing status breakdown
- User vs agent audio counts

### Conversation Audio Summary

```sql
SELECT * FROM get_conversation_audio_summary('conversation-id');
```

Returns audio URLs and durations for each turn.

## 🐛 Troubleshooting

### Common Issues

1. **Audio not recording**: Check browser permissions and WebRTC support
2. **Upload fails**: Verify Supabase storage bucket exists and RLS policies are correct
3. **Playback issues**: Ensure audio URLs are accessible and format is supported

### Browser Compatibility

- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Limited support (may need different MIME types)
- ❌ Internet Explorer: Not supported

### Debug Mode

Enable debug logging by setting `console.log` statements in the audio capture service.

## 🔄 Integration with Hume AI

This implementation is designed to work seamlessly with Hume AI's voice interface:

1. **Audio Format**: Compatible with Hume AI's 16kHz requirement
2. **Real-time Processing**: Can be integrated with Hume's streaming API
3. **Metadata Storage**: Stores conversation context for analysis
4. **Playback Support**: Public URLs enable audio playback in dashboards

## 📈 Performance Considerations

- **File Size**: Average 16KB per second of audio
- **Upload Time**: ~1-2 seconds for typical conversation turns
- **Storage Cost**: Minimal cost for audio files
- **Database Performance**: Indexed queries for fast retrieval

## 🚀 Next Steps

1. **Real-time Integration**: Connect with Hume AI's streaming API
2. **Audio Analysis**: Add speech-to-text and emotion analysis
3. **Dashboard Integration**: Add audio playback to conversation dashboards
4. **Batch Processing**: Implement background audio processing
5. **Compression**: Add audio compression for storage optimization
