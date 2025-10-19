import { supabaseService } from './supabase';

export interface TranscriptAnalytics {
  sessionId: string;
  userUid: string;
  userMessages: ConversationMessage[];
  agentMessages: ConversationMessage[];
  conversationFlow: ConversationMessage[];
  metrics: {
    totalTurns: number;
    userTurns: number;
    agentTurns: number;
    averageUserResponseLength: number;
    averageAgentResponseLength: number;
    conversationDuration: number | null;
    emotionSummary?: any;
  };
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  turn: number;
  timestamp: string;
  messageType?: string;
  emotionScores?: any;
  audioUrl?: string;
}

export class TranscriptAnalyticsManager {
  /**
   * Get all transcripts for a session with analytics
   */
  async getSessionTranscripts(sessionId: string): Promise<TranscriptAnalytics | null> {
    try {
      // Get session info
      const { data: session, error: sessionError } = await supabaseService()
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        console.error('Session not found:', sessionError);
        return null;
      }

      // Get user info
      const { data: user, error: userError } = await supabaseService()
        .from('users')
        .select('uid, name')
        .eq('id', session.user_id)
        .single();

      const userUid = user?.uid || 'unknown';

      // Get conversation data from new conversation-level storage
      const { data: conversationData, error: conversationError } = await supabaseService()
        .from('conversations')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (conversationError) {
        console.error('Error fetching conversation:', conversationError);
        return null;
      }

      if (!conversationData) {
        console.log('No conversation data found for session:', sessionId);
        return null;
      }

      // Extract messages from conversation data
      const turns = conversationData.conversation_data?.turns || [];
      const messages: ConversationMessage[] = turns.map((turn: any, index: number) => ({
        id: `${sessionId}-turn-${index}`,
        role: turn.speaker as 'user' | 'agent',
        text: turn.message,
        turn: turn.turn_number,
        timestamp: turn.timestamp,
        messageType: turn.raw_message_type,
        emotionScores: turn.emotions,
        audioUrl: null, // Not stored in conversation data yet
      }));

      // Separate user and agent messages
      const userMessages = messages.filter(m => m.role === 'user');
      const agentMessages = messages.filter(m => m.role === 'agent');

      // Calculate metrics
      const userWordCounts = userMessages.map(m => m.text.split(' ').length);
      const agentWordCounts = agentMessages.map(m => m.text.split(' ').length);

      const averageUserResponseLength = userWordCounts.length > 0 
        ? userWordCounts.reduce((a, b) => a + b, 0) / userWordCounts.length 
        : 0;

      const averageAgentResponseLength = agentWordCounts.length > 0
        ? agentWordCounts.reduce((a, b) => a + b, 0) / agentWordCounts.length
        : 0;

      // Calculate conversation duration
      let conversationDuration = null;
      if (messages.length > 1) {
        const firstMessage = new Date(messages[0].timestamp);
        const lastMessage = new Date(messages[messages.length - 1].timestamp);
        conversationDuration = lastMessage.getTime() - firstMessage.getTime();
      }

      return {
        sessionId,
        userUid,
        userMessages,
        agentMessages,
        conversationFlow: messages,
        metrics: {
          totalTurns: messages.length,
          userTurns: userMessages.length,
          agentTurns: agentMessages.length,
          averageUserResponseLength,
          averageAgentResponseLength,
          conversationDuration,
          emotionSummary: this.analyzeEmotions(messages),
        }
      };

    } catch (error) {
      console.error('Error getting session transcripts:', error);
      return null;
    }
  }

  /**
   * Get analytics for multiple sessions
   */
  async getUserAnalytics(userUid: string): Promise<TranscriptAnalytics[]> {
    try {
      // Get user ID
      const { data: user, error: userError } = await supabaseService()
        .from('users')
        .select('id')
        .eq('uid', userUid)
        .single();

      if (userError || !user) {
        return [];
      }

      // Get all sessions for this user
      const { data: sessions, error: sessionsError } = await supabaseService()
        .from('sessions')
        .select('id')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (sessionsError || !sessions) {
        return [];
      }

      // Get analytics for each session
      const analyticsPromises = sessions.map(session => 
        this.getSessionTranscripts(session.id)
      );

      const results = await Promise.all(analyticsPromises);
      return results.filter(result => result !== null) as TranscriptAnalytics[];

    } catch (error) {
      console.error('Error getting user analytics:', error);
      return [];
    }
  }

  /**
   * Generate conversation summary for analytics
   */
  async generateConversationSummary(sessionId: string): Promise<{
    keyTopics: string[];
    sentiment: 'positive' | 'negative' | 'neutral';
    userSatisfaction: number; // 1-10 scale
    feedbackCategories: string[];
    actionableInsights: string[];
  } | null> {
    const transcripts = await this.getSessionTranscripts(sessionId);
    if (!transcripts) return null;

    // Basic analysis - in production, you'd use AI/NLP here
    const allText = transcripts.conversationFlow.map(m => m.text).join(' ');
    
    // Simple keyword analysis for Archives app feedback
    const keyTopics: string[] = [];
    const keywords = {
      'navigation': ['navigate', 'navigation', 'menu', 'find', 'search', 'lost', 'confused'],
      'content': ['content', 'information', 'learn', 'history', 'article', 'text'],
      'media': ['video', 'image', 'picture', 'carousel', 'visual', 'media'],
      'usability': ['easy', 'difficult', 'intuitive', 'hard', 'simple', 'complex'],
      'performance': ['slow', 'fast', 'loading', 'lag', 'speed', 'responsive'],
    };

    Object.entries(keywords).forEach(([topic, words]) => {
      if (words.some(word => allText.toLowerCase().includes(word))) {
        keyTopics.push(topic);
      }
    });

    // Simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'love', 'like', 'easy', 'helpful'];
    const negativeWords = ['bad', 'terrible', 'hate', 'difficult', 'confusing', 'slow'];
    
    const positiveCount = positiveWords.filter(word => allText.toLowerCase().includes(word)).length;
    const negativeCount = negativeWords.filter(word => allText.toLowerCase().includes(word)).length;
    
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';

    return {
      keyTopics,
      sentiment,
      userSatisfaction: Math.max(1, Math.min(10, 5 + positiveCount - negativeCount)),
      feedbackCategories: keyTopics,
      actionableInsights: this.generateInsights(transcripts),
    };
  }

  /**
   * Analyze emotions from Hume data
   */
  private analyzeEmotions(messages: ConversationMessage[]): any {
    const emotionData = messages
      .filter(m => m.emotionScores)
      .map(m => m.emotionScores);

    if (emotionData.length === 0) return null;

    // Aggregate emotion data - this would be more sophisticated in production
    return {
      totalEmotionDataPoints: emotionData.length,
      hasEmotionData: true,
      // Add specific emotion analysis here based on Hume's emotion format
    };
  }

  /**
   * Generate actionable insights
   */
  private generateInsights(transcripts: TranscriptAnalytics): string[] {
    const insights: string[] = [];
    const { metrics, userMessages, agentMessages } = transcripts;

    // Conversation length insights
    if (metrics.totalTurns < 5) {
      insights.push('Short conversation - user may have encountered barriers');
    } else if (metrics.totalTurns > 20) {
      insights.push('Extended conversation - user was highly engaged');
    }

    // Response length insights
    if (metrics.averageUserResponseLength < 3) {
      insights.push('Brief user responses - may indicate discomfort or lack of engagement');
    } else if (metrics.averageUserResponseLength > 15) {
      insights.push('Detailed user responses - high engagement and willingness to share');
    }

    // Turn balance insights
    const turnRatio = metrics.userTurns / metrics.agentTurns;
    if (turnRatio < 0.5) {
      insights.push('Agent dominated conversation - may need to encourage more user input');
    } else if (turnRatio > 2) {
      insights.push('User dominated conversation - good engagement levels');
    }

    return insights;
  }

  /**
   * Export transcripts for analysis
   */
  async exportSessionData(sessionId: string): Promise<{
    session: any;
    transcripts: TranscriptAnalytics;
    summary: any;
  } | null> {
    const transcripts = await this.getSessionTranscripts(sessionId);
    if (!transcripts) return null;

    const summary = await this.generateConversationSummary(sessionId);

    return {
      session: { id: sessionId, userUid: transcripts.userUid },
      transcripts,
      summary,
    };
  }
}
