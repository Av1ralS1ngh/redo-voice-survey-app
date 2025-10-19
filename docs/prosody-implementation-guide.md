# Prosody Metrics Storage Implementation Guide

## Overview
This guide provides step-by-step instructions for implementing comprehensive prosody metrics storage in the voice survey application.

## Implementation Steps

### Step 1: Database Setup

#### 1.1 Run Database Migration
```bash
# Execute the prosody storage migration
psql -h your-supabase-host -U postgres -d postgres -f scripts/add-prosody-storage.sql
```

#### 1.2 Verify Tables Created
```sql
-- Check if tables were created successfully
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('prosody_analytics', 'conversation_audio', 'prosody_features');
```

### Step 2: Update Hume EVI Configuration

#### 2.1 Enable Prosody Analysis in EVI Config
Update `src/lib/pure-evi.ts`:

```typescript
// In createAppConfig method, add prosody configuration
const configResponse = await fetch('https://api.hume.ai/v0/evi/configs', {
  method: 'POST',
  headers: {
    'X-Hume-Api-Key': this.apiKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    // ... existing config
    prosody: {
      enabled: true,
      features: [
        'f0_analysis',      // Fundamental frequency
        'intensity_analysis', // Volume/intensity
        'speech_rate',      // Speaking rate
        'pause_analysis',   // Pause detection
        'voice_quality',    // Jitter, shimmer, HNR
        'spectral_features' // MFCC, spectral centroid
      ]
    },
    audio: {
      enabled: true,
      storage: {
        enabled: true,
        format: 'wav',
        sample_rate: 16000
      }
    }
  })
});
```

### Step 3: Update API Response Handler

#### 3.1 Replace Current Response Handler
Replace `src/app/api/response/route.ts` with `src/app/api/response-enhanced/route.ts`:

```bash
# Backup current handler
mv src/app/api/response/route.ts src/app/api/response/route.ts.backup

# Use enhanced handler
mv src/app/api/response-enhanced/route.ts src/app/api/response/route.ts
```

#### 3.2 Update Conversation Manager
Update `src/lib/conversation-manager.ts` to handle enhanced data:

```typescript
// Update addMessage method signature
async addMessage(
  sessionId: string,
  speaker: 'user' | 'agent',
  message: string,
  rawMessageType?: string,
  enhancedData?: {
    emotions?: any;
    prosody?: ProsodyFeatures;
    audio?: AudioMetadata;
    metadata?: MessageMetadata;
  }
): Promise<void>
```

### Step 4: Update TypeScript Interfaces

#### 4.1 Import Enhanced Interfaces
Update files that use conversation data:

```typescript
// In conversation-manager.ts
import { 
  EnhancedConversationTurn, 
  ProsodyFeatures, 
  AudioMetadata, 
  MessageMetadata 
} from './prosody-interfaces';

// Update ConversationTurn interface
export interface ConversationTurn extends EnhancedConversationTurn {}
```

### Step 5: Test Prosody Data Capture

#### 5.1 Test with Development Server
```bash
# Start development server
pnpm dev

# Test a conversation and check logs for prosody data
# Look for: "✅ Stored prosody features for turn X"
# Look for: "✅ Stored audio file for turn X"
```

#### 5.2 Verify Database Storage
```sql
-- Check if prosody data is being stored
SELECT 
  session_id,
  turn_number,
  speaker,
  f0_mean,
  speech_rate,
  intensity_mean,
  jitter,
  shimmer
FROM prosody_features 
ORDER BY created_at DESC 
LIMIT 10;

-- Check if audio files are being stored
SELECT 
  session_id,
  turn_number,
  speaker,
  audio_url,
  audio_duration,
  processing_status
FROM conversation_audio 
ORDER BY created_at DESC 
LIMIT 10;
```

### Step 6: Implement Analytics

#### 6.1 Test Prosody Analytics API
```bash
# Test the prosody analytics endpoint
curl -X GET "http://localhost:3000/api/analytics/prosody/[SESSION_ID]"
```

#### 6.2 Verify Analytics Generation
```sql
-- Check if prosody analytics are being generated
SELECT 
  session_id,
  conversation_id,
  avg_speech_rate,
  avg_pitch_mean,
  engagement_score,
  confidence_level,
  emotional_arousal,
  emotional_valence
FROM prosody_analytics 
ORDER BY analysis_timestamp DESC 
LIMIT 5;
```

### Step 7: Integration Testing

#### 7.1 End-to-End Test
1. Start a voice survey session
2. Complete a conversation
3. Check that prosody data is captured
4. Verify analytics are generated
5. Test the analytics API endpoint

#### 7.2 Performance Testing
```sql
-- Check query performance
EXPLAIN ANALYZE 
SELECT * FROM prosody_features 
WHERE session_id = 'test-session-id';

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename IN ('prosody_analytics', 'conversation_audio', 'prosody_features');
```

### Step 8: Monitoring and Maintenance

#### 8.1 Set Up Monitoring
```sql
-- Create monitoring queries
CREATE VIEW prosody_data_quality AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_features,
  COUNT(CASE WHEN f0_mean IS NOT NULL THEN 1 END) as f0_captured,
  COUNT(CASE WHEN speech_rate IS NOT NULL THEN 1 END) as speech_rate_captured,
  COUNT(CASE WHEN intensity_mean IS NOT NULL THEN 1 END) as intensity_captured,
  ROUND(
    COUNT(CASE WHEN f0_mean IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*) * 100, 
    2
  ) as f0_capture_rate
FROM prosody_features 
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

#### 8.2 Data Cleanup Jobs
```sql
-- Create cleanup function for old data
CREATE OR REPLACE FUNCTION cleanup_old_prosody_data()
RETURNS void AS $$
BEGIN
  -- Delete prosody features older than 90 days
  DELETE FROM prosody_features 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete audio files older than 30 days
  DELETE FROM conversation_audio 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Archive old prosody analytics
  INSERT INTO prosody_analytics_archive 
  SELECT * FROM prosody_analytics 
  WHERE analysis_timestamp < NOW() - INTERVAL '180 days';
  
  DELETE FROM prosody_analytics 
  WHERE analysis_timestamp < NOW() - INTERVAL '180 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run daily)
-- This would typically be done via a cron job or scheduled task
```

## Configuration Options

### Environment Variables
Add to `.env.local`:
```bash
# Prosody analysis settings
PROSODY_ANALYSIS_ENABLED=true
PROSODY_AUDIO_STORAGE_ENABLED=true
PROSODY_AUDIO_RETENTION_DAYS=30
PROSODY_FEATURES_RETENTION_DAYS=90
PROSODY_ANALYTICS_RETENTION_DAYS=180
```

### Hume EVI Configuration Options
```typescript
// Prosody features to enable
const PROSODY_FEATURES = [
  'f0_analysis',           // Fundamental frequency
  'intensity_analysis',    // Volume/intensity
  'speech_rate',           // Speaking rate
  'pause_analysis',        // Pause detection
  'voice_quality',         // Jitter, shimmer, HNR
  'spectral_features',     // MFCC, spectral centroid
  'emotional_prosody',     // Emotional indicators
  'stress_detection'       // Stress patterns
];

// Audio storage settings
const AUDIO_SETTINGS = {
  enabled: true,
  format: 'wav',
  sample_rate: 16000,
  bit_depth: 16,
  compression: 'lossless'
};
```

## Troubleshooting

### Common Issues

#### 1. Prosody Data Not Captured
**Symptoms**: No prosody features in database
**Solutions**:
- Check Hume EVI configuration includes prosody settings
- Verify API response handler is using enhanced version
- Check console logs for error messages

#### 2. Audio Files Not Stored
**Symptoms**: No audio files in conversation_audio table
**Solutions**:
- Verify Hume EVI audio storage is enabled
- Check audio URL is valid and accessible
- Verify file size limits are not exceeded

#### 3. Analytics Not Generated
**Symptoms**: No prosody analytics in database
**Solutions**:
- Check conversation completion triggers
- Verify prosody features exist before analytics generation
- Check analytics manager error logs

#### 4. Performance Issues
**Symptoms**: Slow queries, high database load
**Solutions**:
- Check index usage with EXPLAIN ANALYZE
- Consider partitioning large tables
- Implement data archiving strategy

### Debugging Queries

```sql
-- Check data capture rates
SELECT 
  'prosody_features' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN f0_mean IS NOT NULL THEN 1 END) as f0_records,
  COUNT(CASE WHEN speech_rate IS NOT NULL THEN 1 END) as speech_rate_records
FROM prosody_features
UNION ALL
SELECT 
  'conversation_audio' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN audio_url IS NOT NULL THEN 1 END) as audio_records,
  COUNT(CASE WHEN prosody_extracted = true THEN 1 END) as prosody_extracted_records
FROM conversation_audio;

-- Check recent activity
SELECT 
  DATE(created_at) as date,
  COUNT(*) as features_count,
  COUNT(DISTINCT session_id) as unique_sessions
FROM prosody_features 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Performance Considerations

### Database Optimization
1. **Indexing**: Ensure all foreign keys and frequently queried columns are indexed
2. **Partitioning**: Consider partitioning prosody_features by date for large datasets
3. **Compression**: Use JSONB compression for large prosody data
4. **Archiving**: Implement automated archiving of old data

### Storage Management
1. **Audio Files**: Implement CDN for audio file delivery
2. **Compression**: Compress audio files to reduce storage costs
3. **Cleanup**: Automated cleanup of old audio files
4. **Monitoring**: Monitor storage usage and costs

### Query Optimization
1. **Aggregation**: Pre-calculate common aggregations
2. **Caching**: Cache frequently accessed analytics
3. **Batch Processing**: Process prosody analytics in batches
4. **Async Processing**: Use background jobs for heavy computations

## Security and Privacy

### Data Protection
1. **Encryption**: Encrypt audio files at rest
2. **Access Control**: Implement strict access controls
3. **Audit Logging**: Log all access to prosody data
4. **Data Retention**: Implement data retention policies

### Privacy Compliance
1. **GDPR**: Implement right to deletion for prosody data
2. **Consent**: Obtain explicit consent for prosody analysis
3. **Anonymization**: Anonymize prosody data for research
4. **Transparency**: Document prosody data usage

## Monitoring and Alerting

### Key Metrics to Monitor
1. **Data Capture Rate**: Percentage of messages with prosody data
2. **Audio Storage Success**: Percentage of audio files successfully stored
3. **Analytics Generation**: Percentage of conversations with analytics
4. **Query Performance**: Average query execution time
5. **Storage Usage**: Database and file storage usage

### Alerting Thresholds
1. **Data Capture Rate < 80%**: Alert for missing prosody data
2. **Audio Storage Failure > 5%**: Alert for storage issues
3. **Query Time > 5s**: Alert for performance issues
4. **Storage Usage > 90%**: Alert for capacity issues

This implementation guide provides a comprehensive roadmap for implementing prosody metrics storage while ensuring performance, security, and maintainability.
