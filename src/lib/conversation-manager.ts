// src/lib/conversation-manager.ts
// Manages conversation-level storage and processing

import { supabaseService } from "./supabase";

export interface ConversationTurn {
  speaker: 'user' | 'agent';
  message: string;
  timestamp: string;
  turn_number: number;
  raw_message_type?: string; // Store original Hume message type
  emotions?: any; // Store emotion data if available
  
  // NEW: Enhanced prosody and audio data
  prosody?: {
    f0_mean?: number;        // Hz - mean fundamental frequency
    f0_std?: number;         // Hz - standard deviation of fundamental frequency
    f0_min?: number;         // Hz - minimum fundamental frequency
    f0_max?: number;         // Hz - maximum fundamental frequency
    speech_rate?: number;     // words per minute
    pause_duration?: number;  // seconds
    intensity_mean?: number;  // dB - mean intensity
    intensity_std?: number;   // dB - standard deviation of intensity
    jitter?: number;          // frequency variation (0-1)
    shimmer?: number;         // amplitude variation (0-1)
    hnr?: number;             // harmonics-to-noise ratio (dB)
    duration?: number;        // seconds
  };
  
  audio?: {
    url?: string;
    duration?: number;
    format?: string;
    sample_rate?: number;
    bit_depth?: number;
    file_size?: number;
  };
  
  metadata?: {
    confidence?: number;      // transcription confidence (0-1)
    language?: string;        // detected language
    sentiment?: string;       // positive/negative/neutral
    arousal?: number;         // emotional arousal level (0-10)
    valence?: number;         // emotional valence level (-10 to +10)
    time_begin?: number;      // 🎯 Turn start time in ms (from Hume's message.time.begin)
    time_end?: number;        // 🎯 Turn end time in ms (from Hume's message.time.end)
  };
  
  // Direct audio URL for easy access (also stored in audio.url)
  audioUrl?: string;
}

export interface SurveyResponses {
  user_type?: string;
  age_range?: string;
  navigation_ease?: string;
  preferred_media?: string;
  learned_something?: boolean;
  content_level?: string;
  usage_frequency?: string;
  recommendation?: string;
  key_improvement?: string;
}

export interface ConversationMetrics {
  duration_seconds?: number;
  total_turns: number;
  user_turns: number;
  agent_turns: number;
  completion_status: 'active' | 'completed' | 'abandoned';
  last_activity: string;
}

export interface ConversationData {
  participants: {
    user: string;
    agent: string;
  };
  turns: ConversationTurn[];
  survey_responses: SurveyResponses;
  metrics: ConversationMetrics;
}

export class ConversationManager {
  private conversations: Map<string, ConversationData> = new Map();

  /**
   * Get or create conversation from database if not in memory
   */
  private async getOrCreateConversation(sessionId: string): Promise<ConversationData | null> {
    // Check memory first
    if (this.conversations.has(sessionId)) {
      return this.conversations.get(sessionId)!;
    }

    // Check if conversation exists in database
    try {
      const { data: existingConversation, error } = await supabaseService()
        .from('conversations')
        .select('conversation_data, user_name')
        .eq('session_id', sessionId)
        .eq('status', 'active')
        .single();

      if (!error && existingConversation) {
        // Load existing conversation into memory
        const conversationData = existingConversation.conversation_data as ConversationData;
        this.conversations.set(sessionId, conversationData);
        console.log(`Loaded existing conversation for session ${sessionId}`);
        return conversationData;
      }
    } catch (error) {
      console.log(`No existing conversation found for session ${sessionId}`);
    }

    return null;
  }

  /**
   * Start a new conversation buffer and persist to database
   */
  async startConversation(sessionId: string, userName: string, userUid: string): Promise<void> {
    const conversationData: ConversationData = {
      participants: {
        user: userName,
        agent: "Archives Survey AI"
      },
      turns: [],
      survey_responses: {},
      metrics: {
        total_turns: 0,
        user_turns: 0,
        agent_turns: 0,
        completion_status: 'active',
        last_activity: new Date().toISOString()
      }
    };

    this.conversations.set(sessionId, conversationData);

    // 🔧 FIXED: Create the conversation record in the database
    try {
      const { error } = await supabaseService()
        .from('conversations')
        .insert({
          session_id: sessionId,
          user_uid: userUid,
          user_name: userName,
          conversation_data: conversationData,
          status: 'active',
          started_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Error creating conversation record:', error);
      } else {
        console.log(`✅ Created conversation record for ${userName} (session: ${sessionId})`);
      }
    } catch (error) {
      console.error('❌ Exception creating conversation record:', error);
    }
  }

  /**
   * Add a complete message to the conversation buffer
   */
  async addMessage(
    sessionId: string,
    speaker: 'user' | 'agent',
    message: string,
    rawMessageType?: string,
    enhancedData?: {
      emotions?: any;
      prosody?: any;
      audio?: any;
      metadata?: any;
      audioUrl?: string; // Add audio URL support
    }
  ): Promise<void> {
    let conversation = this.conversations.get(sessionId);
    
    // Try to load from database if not in memory
    if (!conversation) {
      conversation = await this.getOrCreateConversation(sessionId);
      if (!conversation) {
        console.error(`No conversation found for session ${sessionId} and cannot load from database`);
        return;
      }
    }

    // Only add substantial messages (filter out fragments and noise)
    if (!message.trim() || message.length < 3) {
      return;
    }

    const turn: ConversationTurn = {
      speaker,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      turn_number: conversation.turns.length + 1,
      raw_message_type: rawMessageType,
      emotions: enhancedData?.emotions,
      prosody: enhancedData?.prosody,
      audio: {
        ...enhancedData?.audio,
        url: enhancedData?.audioUrl // Store audio URL in audio.url
      },
      metadata: enhancedData?.metadata,
      audioUrl: enhancedData?.audioUrl // Also store directly for easy access
    };

    conversation.turns.push(turn);
    conversation.metrics.total_turns = conversation.turns.length;
    conversation.metrics.user_turns = conversation.turns.filter(t => t.speaker === 'user').length;
    conversation.metrics.agent_turns = conversation.turns.filter(t => t.speaker === 'agent').length;
    conversation.metrics.last_activity = new Date().toISOString();

    // 🔧 FIXED: Store message in the actual 'conversations' table structure
    try {
      // Update the existing conversation record with the new turn
      const { error: insertError } = await supabaseService()
        .from('conversations')
        .update({
          conversation_data: conversation,
          metrics: conversation.metrics,
          status: 'active'
        })
        .eq('session_id', sessionId);

      if (insertError) {
        console.error('❌ Error updating conversation:', insertError);
        console.error('❌ Failed message data:', {
          session_id: sessionId,
          role: speaker,
          message_text: message,
          turn_number: turn.turn_number
        });
      } else {
        console.log('✅ Successfully updated conversation with new message');
      }
    } catch (error) {
      console.error('❌ Exception storing individual message:', error);
    }

    console.log(`Added ${speaker} message (turn ${turn.turn_number}): "${message.slice(0, 50)}..."`);
  }

  /**
   * Extract survey responses from conversation using simple keyword matching
   */
  private extractSurveyResponses(conversation: ConversationData): SurveyResponses {
    const responses: SurveyResponses = {};
    const userMessages = conversation.turns
      .filter(t => t.speaker === 'user')
      .map(t => t.message.toLowerCase());

    const allUserText = userMessages.join(' ');

    // Simple extraction logic - can be enhanced with NLP
    if (allUserText.includes('student')) responses.user_type = 'student';
    else if (allUserText.includes('educator') || allUserText.includes('teacher')) responses.user_type = 'educator';
    else if (allUserText.includes('personal') || allUserText.includes('interest')) responses.user_type = 'personal_interest';

    if (allUserText.includes('twenties') || allUserText.includes('20s')) responses.age_range = 'twenties';
    else if (allUserText.includes('thirties') || allUserText.includes('30s')) responses.age_range = 'thirties';
    else if (allUserText.includes('forties') || allUserText.includes('40s')) responses.age_range = 'forties';

    if (allUserText.includes('intuitive') || allUserText.includes('easy')) responses.navigation_ease = 'intuitive';
    else if (allUserText.includes('stuck') || allUserText.includes('confusing')) responses.navigation_ease = 'difficult';

    if (allUserText.includes('video')) responses.preferred_media = 'videos';
    else if (allUserText.includes('image')) responses.preferred_media = 'images';
    else if (allUserText.includes('carousel')) responses.preferred_media = 'carousels';

    if (allUserText.includes('yes') && allUserText.includes('learn')) responses.learned_something = true;
    if (allUserText.includes('no') && allUserText.includes('learn')) responses.learned_something = false;

    if (allUserText.includes('about right') || allUserText.includes('just right')) responses.content_level = 'about_right';
    else if (allUserText.includes('too basic')) responses.content_level = 'too_basic';
    else if (allUserText.includes('too academic')) responses.content_level = 'too_academic';

    if (allUserText.includes('daily')) responses.usage_frequency = 'daily';
    else if (allUserText.includes('weekly')) responses.usage_frequency = 'weekly';
    else if (allUserText.includes('monthly')) responses.usage_frequency = 'monthly';
    else if (allUserText.includes('occasionally')) responses.usage_frequency = 'occasionally';

    if (allUserText.includes('recommend') || allUserText.includes('yes')) responses.recommendation = 'yes';
    if (allUserText.includes('would not') || allUserText.includes('wouldn\'t')) responses.recommendation = 'no';

    // Extract key improvement from last few user messages
    const lastUserMessages = conversation.turns
      .filter(t => t.speaker === 'user')
      .slice(-3)
      .map(t => t.message);
    
    if (lastUserMessages.length > 0) {
      responses.key_improvement = lastUserMessages[lastUserMessages.length - 1];
    }

    return responses;
  }

  /**
   * Complete and save conversation to database
   */
  async completeConversation(sessionId: string, userUid: string): Promise<void> {
    const conversation = this.conversations.get(sessionId);
    if (!conversation) {
      console.error(`No conversation found for session ${sessionId}`);
      return;
    }

    try {
      // Calculate final metrics
      const startTime = conversation.turns[0]?.timestamp;
      const endTime = conversation.turns[conversation.turns.length - 1]?.timestamp;
      
      if (startTime && endTime) {
        const duration = new Date(endTime).getTime() - new Date(startTime).getTime();
        conversation.metrics.duration_seconds = Math.round(duration / 1000);
      }

      conversation.metrics.completion_status = 'completed';

      // Extract survey responses
      conversation.survey_responses = this.extractSurveyResponses(conversation);

      // Generate summary
      const summary = this.generateSummary(conversation);

      // Update existing conversation in database
      const { error } = await supabaseService()
        .from('conversations')
        .update({
          conversation_data: conversation,
          summary,
          survey_responses: conversation.survey_responses,
          metrics: conversation.metrics,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('status', 'active');

      if (error) {
        console.error('Error saving conversation:', error);
      } else {
        console.log(`✅ Saved complete conversation for ${conversation.participants.user}`);
      }

      // Clean up memory
      this.conversations.delete(sessionId);

    } catch (error) {
      console.error('Error completing conversation:', error);
    }
  }

  /**
   * Generate conversation summary
   */
  private generateSummary(conversation: ConversationData): string {
    const userName = conversation.participants.user;
    const totalTurns = conversation.metrics.total_turns;
    const duration = conversation.metrics.duration_seconds || 0;
    
    const surveyData = conversation.survey_responses;
    
    let summary = `${userName} completed a ${duration}s survey in ${totalTurns} turns.`;
    
    if (surveyData.user_type) summary += ` User type: ${surveyData.user_type}.`;
    if (surveyData.age_range) summary += ` Age: ${surveyData.age_range}.`;
    if (surveyData.navigation_ease) summary += ` Navigation: ${surveyData.navigation_ease}.`;
    if (surveyData.content_level) summary += ` Content level: ${surveyData.content_level}.`;
    if (surveyData.recommendation) summary += ` Would recommend: ${surveyData.recommendation}.`;
    
    return summary;
  }

  /**
   * Abandon conversation (user left without completing)
   */
  async abandonConversation(sessionId: string, userUid: string): Promise<void> {
    const conversation = this.conversations.get(sessionId);
    if (!conversation) return;

    conversation.metrics.completion_status = 'abandoned';
    
    try {
      const { error } = await supabaseService()
        .from('conversations')
        .update({
          conversation_data: conversation,
          summary: `${conversation.participants.user} abandoned survey after ${conversation.metrics.total_turns} turns.`,
          survey_responses: this.extractSurveyResponses(conversation),
          metrics: conversation.metrics,
          status: 'abandoned',
          completed_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('status', 'active');

      if (error) {
        console.error('Error saving abandoned conversation:', error);
      } else {
        console.log(`📝 Saved abandoned conversation for ${conversation.participants.user}`);
      }

      this.conversations.delete(sessionId);
    } catch (error) {
      console.error('Error abandoning conversation:', error);
    }
  }

  /**
   * Get conversation analytics
   */
  async getConversationAnalytics(userUid?: string) {
    try {
      let query = supabaseService()
        .from('conversations')
        .select('*');

      if (userUid) {
        query = query.eq('user_uid', userUid);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching conversation analytics:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getConversationAnalytics:', error);
      return null;
    }
  }

  /**
   * 🎯 Update conversation with Hume chat metadata - The missing link!
   */
  async updateConversationMetadata(sessionId: string, metadata: {
    hume_chat_id: string;
    hume_chat_group_id: string;
    hume_session_id: string;
    chat_metadata_captured_at: string;
  }) {
    try {
      console.log(`🔗 Updating conversation ${sessionId} with chat metadata:`, metadata);
      
      // 🎯 NEW APPROACH: Store in dedicated conversation_chat_metadata table
      const { data, error } = await supabaseService()
        .from('conversation_chat_metadata')
        .upsert({
          session_id: sessionId,
          hume_chat_id: metadata.hume_chat_id,
          hume_chat_group_id: metadata.hume_chat_group_id,
          hume_session_id: metadata.hume_session_id,
          captured_at: metadata.chat_metadata_captured_at,
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('❌ Error updating conversation metadata:', error);
        throw error;
      }

      console.log('✅ Successfully stored chat metadata in dedicated table');
      return data;
    } catch (error) {
      console.error('❌ Error in updateConversationMetadata:', error);
      throw error;
    }
  }
}

// Singleton instance
export const conversationManager = new ConversationManager();
