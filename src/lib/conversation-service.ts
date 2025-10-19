// lib/conversation-service.ts
// Data access layer for conversation analytics and metrics

import { supabaseService } from './supabase';

export interface ConversationWithUser {
  id: string;
  session_id: string;
  user_uid: string;
  user_name: string;
  conversation_data: any;
  survey_responses: any;
  metrics: any;
  status: 'active' | 'completed' | 'abandoned';
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationMetrics {
  total_conversations: number;
  completed_conversations: number;
  abandoned_conversations: number;
  active_conversations: number;
  completion_rate: number;
  unique_users: number;
  average_duration: number;
  average_turns: number;
}

export interface DailyActivity {
  date: string;
  conversations: number;
  completed: number;
  users: number;
}

export interface RecentActivity {
  conversations: ConversationWithUser[];
  daily_activity: DailyActivity[];
  weekly_summary: {
    conversations: number;
    completion_rate: number;
    new_users: number;
  };
}

export class ConversationService {
  
  /**
   * Fetch all conversations with user data
   */
  async fetchAllConversations(): Promise<ConversationWithUser[]> {
    try {
      console.log('🔍 Starting fetchAllConversations...');
      
      // Test basic connection first
      const { data: testData, error: testError } = await supabaseService()
        .from('conversations')
        .select('id')
        .limit(1);
        
      if (testError) {
        console.error('❌ Basic connection test failed:', testError);
        throw testError;
      }
      
      console.log('✅ Basic connection test passed, found', testData?.length || 0, 'conversations');

      // Get conversations first
      const { data: conversations, error: conversationsError } = await supabaseService()
        .from('conversations')
        .select('*')
        .order('started_at', { ascending: false });

      if (conversationsError) {
        console.error('❌ Error fetching conversations:', conversationsError);
        throw conversationsError;
      }

      console.log('✅ Successfully fetched', conversations?.length || 0, 'conversations');

      // Get unique user UIDs
      const userUids = [...new Set(conversations.map(c => c.user_uid))];
      console.log('🔍 Found', userUids.length, 'unique user UIDs');

      // Get users data
      const { data: users, error: usersError } = await supabaseService()
        .from('users')
        .select('uid, name, email, created_at')
        .in('uid', userUids);

      if (usersError) {
        console.error('❌ Error fetching users:', usersError);
        throw usersError;
      }

      console.log('✅ Successfully fetched', users?.length || 0, 'users');

      // Create a map for quick user lookup
      const userMap = new Map(users?.map(user => [user.uid, user]) || []);

      // Transform the data to include user info
      const transformedData = conversations.map(conv => {
        const user = userMap.get(conv.user_uid);
        return {
          ...conv,
          user_name: user?.name || conv.user_name,
          user_email: user?.email,
          user_created_at: user?.created_at
        };
      });

      console.log('✅ Transformed data:', transformedData.length, 'conversations');
      return transformedData;
    } catch (error) {
      console.error('❌ Error in fetchAllConversations:', error);
      throw error;
    }
  }

  /**
   * Get conversation metrics and statistics
   */
  async getConversationMetrics(): Promise<ConversationMetrics> {
    try {
      console.log('🔍 Starting getConversationMetrics...');
      const conversations = await this.fetchAllConversations();
      console.log('✅ Got conversations for metrics:', conversations.length);
      
      const total_conversations = conversations.length;
      const completed_conversations = conversations.filter(c => c.status === 'completed').length;
      const abandoned_conversations = conversations.filter(c => c.status === 'abandoned').length;
      const active_conversations = conversations.filter(c => c.status === 'active').length;
      
      const completion_rate = total_conversations > 0 
        ? (completed_conversations / total_conversations) * 100 
        : 0;

      const unique_users = new Set(conversations.map(c => c.user_uid)).size;

      // Calculate average duration for completed conversations
      const completed_with_duration = conversations.filter(c => 
        c.status === 'completed' && c.metrics?.duration_seconds
      );
      
      const average_duration = completed_with_duration.length > 0
        ? completed_with_duration.reduce((sum, c) => sum + (c.metrics.duration_seconds || 0), 0) / completed_with_duration.length
        : 0;

      // Calculate average turns
      const conversations_with_turns = conversations.filter(c => c.metrics?.total_turns);
      const average_turns = conversations_with_turns.length > 0
        ? conversations_with_turns.reduce((sum, c) => sum + (c.metrics.total_turns || 0), 0) / conversations_with_turns.length
        : 0;

      return {
        total_conversations,
        completed_conversations,
        abandoned_conversations,
        active_conversations,
        completion_rate: Math.round(completion_rate * 100) / 100,
        unique_users,
        average_duration: Math.round(average_duration),
        average_turns: Math.round(average_turns * 10) / 10
      };
    } catch (error) {
      console.error('Error calculating conversation metrics:', error);
      throw error;
    }
  }

  /**
   * Get recent activity (last 7/30 days)
   */
  async getRecentActivity(days: number = 30): Promise<RecentActivity> {
    try {
      console.log('🔍 Starting getRecentActivity for', days, 'days...');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Get conversations first
      const { data: conversations, error: conversationsError } = await supabaseService()
        .from('conversations')
        .select('*')
        .gte('started_at', cutoffDate.toISOString())
        .order('started_at', { ascending: false });

      if (conversationsError) {
        console.error('❌ Error fetching recent conversations:', conversationsError);
        throw conversationsError;
      }

      console.log('✅ Successfully fetched', conversations?.length || 0, 'recent conversations');

      // Get unique user UIDs
      const userUids = [...new Set(conversations.map(c => c.user_uid))];
      console.log('🔍 Found', userUids.length, 'unique user UIDs in recent activity');

      // Get users data
      const { data: users, error: usersError } = await supabaseService()
        .from('users')
        .select('uid, name, email, created_at')
        .in('uid', userUids);

      if (usersError) {
        console.error('❌ Error fetching users for recent activity:', usersError);
        throw usersError;
      }

      console.log('✅ Successfully fetched', users?.length || 0, 'users for recent activity');

      // Create a map for quick user lookup
      const userMap = new Map(users?.map(user => [user.uid, user]) || []);

      // Transform conversations
      const transformedConversations = conversations.map(conv => {
        const user = userMap.get(conv.user_uid);
        return {
          ...conv,
          user_name: user?.name || conv.user_name,
          user_email: user?.email,
          user_created_at: user?.created_at
        };
      });

      // Calculate daily activity
      const dailyActivity = this.calculateDailyActivity(transformedConversations, days);

      // Calculate weekly summary
      const weeklySummary = this.calculateWeeklySummary(transformedConversations);

      return {
        conversations: transformedConversations,
        daily_activity: dailyActivity,
        weekly_summary: weeklySummary
      };
    } catch (error) {
      console.error('Error getting recent activity:', error);
      throw error;
    }
  }

  /**
   * Calculate daily activity for the specified number of days
   */
  private calculateDailyActivity(conversations: ConversationWithUser[], days: number): DailyActivity[] {
    const dailyData: { [key: string]: DailyActivity } = {};
    
    // Initialize all days with zero values
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyData[dateStr] = {
        date: dateStr,
        conversations: 0,
        completed: 0,
        users: 0
      };
    }

    // Count conversations per day
    conversations.forEach(conv => {
      const dateStr = conv.started_at.split('T')[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].conversations++;
        if (conv.status === 'completed') {
          dailyData[dateStr].completed++;
        }
      }
    });

    // Count unique users per day
    Object.keys(dailyData).forEach(dateStr => {
      const dayConversations = conversations.filter(conv => 
        conv.started_at.split('T')[0] === dateStr
      );
      dailyData[dateStr].users = new Set(dayConversations.map(c => c.user_uid)).size;
    });

    return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate weekly summary statistics
   */
  private calculateWeeklySummary(conversations: ConversationWithUser[]) {
    const completed = conversations.filter(c => c.status === 'completed').length;
    const completion_rate = conversations.length > 0 
      ? (completed / conversations.length) * 100 
      : 0;

    const unique_users = new Set(conversations.map(c => c.user_uid)).size;

    return {
      conversations: conversations.length,
      completion_rate: Math.round(completion_rate * 100) / 100,
      new_users: unique_users
    };
  }

  /**
   * Get conversation by ID with full details
   */
  async getConversationById(conversationId: string): Promise<ConversationWithUser | null> {
    try {
      const { data, error } = await supabaseService()
        .from('conversations')
        .select(`
          *,
          users!inner(
            uid,
            name,
            email,
            created_at
          )
        `)
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('Error fetching conversation:', error);
        return null;
      }

      return {
        ...data,
        user_name: data.users?.name || data.user_name,
        user_email: data.users?.email,
        user_created_at: data.users?.created_at
      };
    } catch (error) {
      console.error('Error in getConversationById:', error);
      return null;
    }
  }

  /**
   * Get user conversation history
   */
  async getUserConversations(userUid: string): Promise<ConversationWithUser[]> {
    try {
      const { data, error } = await supabaseService()
        .from('conversations')
        .select(`
          *,
          users!inner(
            uid,
            name,
            email,
            created_at
          )
        `)
        .eq('user_uid', userUid)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user conversations:', error);
        throw error;
      }

      return data.map(conv => ({
        ...conv,
        user_name: conv.users?.name || conv.user_name,
        user_email: conv.users?.email,
        user_created_at: conv.users?.created_at
      }));
    } catch (error) {
      console.error('Error in getUserConversations:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const conversationService = new ConversationService();
