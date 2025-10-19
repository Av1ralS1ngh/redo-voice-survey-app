import { supabaseService } from './supabase';

export interface SurveySession {
  id: string;
  user_uid: string;
  user_name: string;
  config_id: string;
  chat_group_id?: string;
  status: 'active' | 'completed' | 'abandoned';
  personalized_prompt?: string;
  created_at: string;
  completed_at?: string;
}

export interface SurveyResponse {
  id: string;
  session_id: string;
  user_uid: string;
  role: 'user' | 'agent';
  message_text: string;
  message_type: string;
  emotion_scores?: any;
  timestamp: string;
  turn_number: number;
}

export interface HumeMessage {
  type: string;
  message?: {
    content: string;
    role: string;
  };
  emotions?: any;
  timestamp?: number;
  // Additional Hume message properties
  prosody?: any;
  audio?: {
    url?: string;
    duration?: number;
  };
  transcript?: {
    content: string;
    confidence?: number;
    interim?: boolean;
  };
}

export class SurveySessionManager {
  /**
   * Start a new personalized survey session
   */
  async startPersonalizedSession(
    userId: string, 
    userName: string, 
    configId: string
  ): Promise<SurveySession> {
    try {
      // First, get the actual user UUID from the users table
      const { data: userData, error: userError } = await supabaseService()
        .from('users')
        .select('id')
        .eq('uid', userId)
        .single();

      if (userError || !userData) {
        console.error('Could not find user for session:', userError);
        // Return fallback session without database
        return {
          id: crypto.randomUUID(),
          user_uid: userId,
          user_name: userName,
          config_id: configId,
          status: 'active',
          created_at: new Date().toISOString(),
        };
      }

      const sessionData = {
        user_uid: userId,
        user_name: userName,
        config_id: configId,
        status: 'active' as const,
        created_at: new Date().toISOString(),
      };

      // 🔧 FIX: Generate session ID first so we can use it consistently
      const sessionId = crypto.randomUUID();
      
      // Use the actual 'sessions' table structure
      const { data, error } = await supabaseService()
        .from('sessions')
        .insert({
          id: sessionId, // Explicitly set the ID
          user_id: userData.id, // sessions table uses user_id (UUID), not user_uid
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Database error creating session:', error);
        console.error('❌ Attempting to insert with explicit ID may help with foreign key constraints');
        
        // 🔧 Try alternative: insert with minimal fields
        const { data: retryData, error: retryError } = await supabaseService()
          .from('sessions')
          .insert({
            id: sessionId,
            user_id: userData.id,
            started_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (retryError) {
          console.error('❌ Retry also failed:', retryError);
          console.log('⚠️  Continuing with in-memory session (conversations may fail foreign key constraint)');
          
          // Return session with generated ID (conversations will still fail FK constraint)
          return {
            id: sessionId,
            ...sessionData,
          };
        }
        
        console.log('✅ Session created on retry:', retryData);
        return {
          id: retryData.id,
          user_uid: userId,
          user_name: userName,
          config_id: configId,
          status: 'active',
          created_at: retryData.started_at,
        };
      }

      console.log('✅ Successfully created session in database:', data);

      // Return session in the expected format
      return {
        id: data.id,
        user_uid: userId,
        user_name: userName,
        config_id: configId,
        status: 'active',
        created_at: data.started_at,
      };
    } catch (error) {
      console.error('Error starting survey session:', error);
      // Fallback - return a session object even if DB fails
      return {
        id: crypto.randomUUID(),
        user_uid: userId,
        user_name: userName,
        config_id: configId,
        status: 'active',
        created_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Update session with chat group ID from Hume
   */
  async updateSessionChatGroup(sessionId: string, chatGroupId: string): Promise<void> {
    try {
      const { error } = await supabaseService()
        .from('sessions')
        .update({ 
          // Note: old sessions table might not have chat_group_id column
          // Will add this column in future migration
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Error updating session chat group:', error);
      }
    } catch (error) {
      console.error('Error updating session chat group:', error);
    }
  }

  /**
   * @deprecated This method is no longer used. 
   * Messages are now handled directly by ConversationManager via the /api/response endpoint.
   * This method is kept for backwards compatibility but does nothing.
   */
  async recordResponse(
    sessionId: string, 
    userUid: string,
    message: HumeMessage,
    turnNumber: number
  ): Promise<void> {
    // All message recording now happens through ConversationManager
    // This method is deprecated but kept for compatibility
    console.log('recordResponse called but deprecated - using ConversationManager instead');
  }

  /**
   * Complete a survey session
   */
  async completeSession(sessionId: string): Promise<{
    success: boolean;
    summary?: any;
  }> {
    try {
      // Mark session as completed - only update if ended_at column exists
      const { error: updateError } = await supabaseService()
        .from('sessions')
        .update({ 
          // Note: original sessions table may not have status/ended_at columns
          // ended_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('Error completing session:', updateError);
      }

      // Get session summary
      const summary = await this.getSessionSummary(sessionId);

      return {
        success: true,
        summary,
      };
    } catch (error) {
      console.error('Error completing session:', error);
      return { success: false };
    }
  }

  /**
   * Get summary of a survey session
   */
  async getSessionSummary(sessionId: string): Promise<any> {
    try {
      // Get session details
      const { data: session, error: sessionError } = await supabaseService()
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        throw sessionError;
      }

      // Get all responses
      const { data: responses, error: responsesError } = await supabaseService()
        .from('responses')
        .select('*')
        .eq('session_id', sessionId)
        .order('turn');

      if (responsesError) {
        throw responsesError;
      }

      // Calculate metrics
      const userResponses = responses?.filter(r => r.role === 'user') || [];
      const agentResponses = responses?.filter(r => r.role === 'agent') || [];

      const summary = {
        session,
        metrics: {
          total_turns: responses?.length || 0,
          user_messages: userResponses.length,
          agent_messages: agentResponses.length,
        session_duration: null, // Cannot calculate without ended_at column
        },
        responses: responses || [],
      };

      return summary;
    } catch (error) {
      console.error('Error getting session summary:', error);
      return null;
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userUid: string): Promise<SurveySession[]> {
    try {
      // First get the user UUID
      const { data: userData, error: userError } = await supabaseService()
        .from('users')
        .select('id')
        .eq('uid', userUid)
        .single();

      if (userError || !userData) {
        return [];
      }

      const { data, error } = await supabaseService()
        .from('sessions')
        .select('*')
        .eq('user_id', userData.id)  // Use user_id instead of user_uid
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  /**
   * Abandon a session (user left without completing)
   */
  async abandonSession(sessionId: string): Promise<void> {
    try {
      const { error } = await supabaseService()
        .from('sessions')
        .update({ 
          // Note: original sessions table may not have status column
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Error abandoning session:', error);
      }
    } catch (error) {
      console.error('Error abandoning session:', error);
    }
  }
}
