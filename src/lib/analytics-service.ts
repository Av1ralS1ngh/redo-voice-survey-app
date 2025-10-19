// lib/analytics-service.ts
// User analytics and demographic analysis service

import { supabaseService } from './supabase';

export interface Demographics {
  age_group: string;
  user_type: string;
  experience_level: string;
  primary_interest: string;
  usage_frequency: string;
}

export interface UserSegment {
  segment_name: string;
  demographics: Demographics;
  user_count: number;
  completion_rate: number;
  average_engagement: number;
  churn_risk_score: number;
  pmf_score: number;
  content_feedback: {
    too_academic: number;
    just_right: number;
    too_basic: number;
  };
}

export interface ContentFeedback {
  difficulty_level: 'too_academic' | 'just_right' | 'too_basic';
  user_segment: string;
  count: number;
  percentage: number;
}

export interface FeatureRequest {
  feature: string;
  frequency: number;
  user_segments: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface UserJourney {
  stage: string;
  user_count: number;
  conversion_rate: number;
  drop_off_rate: number;
}

export interface CorrelationInsight {
  type: 'churn_risk' | 'pmf_signals' | 'content_fit' | 'engagement';
  description: string;
  correlation_strength: number;
  user_segments: string[];
  actionable_recommendations: string[];
}

export interface PowerUserProfile {
  demographics: Demographics;
  characteristics: string[];
  engagement_score: number;
  retention_rate: number;
  feature_adoption: string[];
}

export interface AtRiskSegment {
  segment_name: string;
  demographics: Demographics;
  risk_indicators: string[];
  churn_probability: number;
  intervention_strategies: string[];
}

export interface ContentMarketFit {
  user_type: string;
  content_value_score: number;
  difficulty_perception: string;
  engagement_correlation: number;
  recommendations: string[];
}

export interface GrowthOpportunity {
  segment_name: string;
  unmet_needs: string[];
  market_size_estimate: number;
  acquisition_strategy: string[];
  content_recommendations: string[];
}

export class AnalyticsService {
  
  /**
   * Extract demographics from survey responses
   */
  async extractDemographics(): Promise<Demographics[]> {
    try {
      console.log('📊 Extracting demographics from survey responses...');
      
      const { data: conversations, error } = await supabaseService()
        .from('conversations')
        .select('survey_responses, user_uid')
        .not('survey_responses', 'is', null);
      
      if (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }
      
      const demographics: Demographics[] = [];
      
      conversations.forEach(conv => {
        if (conv.survey_responses && typeof conv.survey_responses === 'object') {
          const responses = conv.survey_responses as any;
          
          // Extract demographic data from survey responses
          const demographic: Demographics = {
            age_group: this.extractAgeGroup(responses),
            user_type: this.extractUserType(responses),
            experience_level: this.extractExperienceLevel(responses),
            primary_interest: this.extractPrimaryInterest(responses),
            usage_frequency: this.extractUsageFrequency(responses)
          };
          
          demographics.push(demographic);
        }
      });
      
      console.log(`✅ Extracted demographics for ${demographics.length} users`);
      return demographics;
      
    } catch (error) {
      console.error('Error extracting demographics:', error);
      return [];
    }
  }
  
  /**
   * Analyze user segments based on demographics
   */
  async analyzeUserSegments(): Promise<UserSegment[]> {
    try {
      console.log('📊 Analyzing user segments...');
      
      const demographics = await this.extractDemographics();
      const conversations = await this.getConversationMetrics();
      
      // Group users by demographics
      const segmentMap = new Map<string, Demographics[]>();
      
      demographics.forEach(demo => {
        const segmentKey = `${demo.user_type}_${demo.age_group}`;
        if (!segmentMap.has(segmentKey)) {
          segmentMap.set(segmentKey, []);
        }
        segmentMap.get(segmentKey)!.push(demo);
      });
      
      const segments: UserSegment[] = [];
      
      segmentMap.forEach((users, segmentKey) => {
        const segment: UserSegment = {
          segment_name: segmentKey.replace('_', ' '),
          demographics: users[0], // Use first user's demographics as representative
          user_count: users.length,
          completion_rate: this.calculateCompletionRate(users),
          average_engagement: this.calculateAverageEngagement(users),
          churn_risk_score: this.calculateChurnRiskScore(users),
          pmf_score: this.calculatePMFScore(users),
          content_feedback: this.calculateContentFeedback(users)
        };
        
        segments.push(segment);
      });
      
      console.log(`✅ Analyzed ${segments.length} user segments`);
      return segments;
      
    } catch (error) {
      console.error('Error analyzing user segments:', error);
      return [];
    }
  }
  
  /**
   * Calculate engagement by user segment
   */
  async calculateEngagementBySegment(): Promise<Map<string, number>> {
    try {
      const segments = await this.analyzeUserSegments();
      const engagementMap = new Map<string, number>();
      
      segments.forEach(segment => {
        engagementMap.set(segment.segment_name, segment.average_engagement);
      });
      
      return engagementMap;
      
    } catch (error) {
      console.error('Error calculating engagement by segment:', error);
      return new Map();
    }
  }
  
  /**
   * Analyze content feedback patterns
   */
  async analyzeContentFeedback(): Promise<ContentFeedback[]> {
    try {
      console.log('📊 Analyzing content feedback...');
      
      const { data: conversations, error } = await supabaseService()
        .from('conversations')
        .select('survey_responses, conversation_data')
        .not('survey_responses', 'is', null);
      
      if (error) {
        console.error('Error fetching conversations for content feedback:', error);
        return [];
      }
      
      const feedbackMap = new Map<string, ContentFeedback>();
      
      conversations.forEach(conv => {
        if (conv.survey_responses && conv.conversation_data) {
          const responses = conv.survey_responses as any;
          const conversationData = conv.conversation_data as any;
          
          const difficultyLevel = this.extractContentDifficulty(responses, conversationData);
          const userSegment = this.extractUserSegmentFromResponses(responses);
          
          const key = `${userSegment}_${difficultyLevel}`;
          
          if (!feedbackMap.has(key)) {
            feedbackMap.set(key, {
              difficulty_level: difficultyLevel,
              user_segment: userSegment,
              count: 0,
              percentage: 0
            });
          }
          
          const feedback = feedbackMap.get(key)!;
          feedback.count++;
        }
      });
      
      // Calculate percentages
      const totalFeedback = Array.from(feedbackMap.values()).reduce((sum, f) => sum + f.count, 0);
      
      feedbackMap.forEach(feedback => {
        feedback.percentage = totalFeedback > 0 ? (feedback.count / totalFeedback) * 100 : 0;
      });
      
      console.log(`✅ Analyzed content feedback for ${feedbackMap.size} segments`);
      return Array.from(feedbackMap.values());
      
    } catch (error) {
      console.error('Error analyzing content feedback:', error);
      return [];
    }
  }
  
  /**
   * Generate correlation insights
   */
  async generateCorrelationInsights(): Promise<CorrelationInsight[]> {
    try {
      console.log('📊 Generating correlation insights...');
      
      const segments = await this.analyzeUserSegments();
      const insights: CorrelationInsight[] = [];
      
      // Churn Risk Correlation
      const highChurnSegments = segments.filter(s => s.churn_risk_score >= 70);
      if (highChurnSegments.length > 0) {
        insights.push({
          type: 'churn_risk',
          description: `High churn risk detected in ${highChurnSegments.length} user segments`,
          correlation_strength: 0.8,
          user_segments: highChurnSegments.map(s => s.segment_name),
          actionable_recommendations: [
            'Implement targeted retention campaigns',
            'Address specific pain points for at-risk segments',
            'Provide additional support resources'
          ]
        });
      }
      
      // PMF Signals Correlation
      const lowPMFSegments = segments.filter(s => s.pmf_score < 40);
      if (lowPMFSegments.length > 0) {
        insights.push({
          type: 'pmf_signals',
          description: `Weak PMF signals in ${lowPMFSegments.length} user segments`,
          correlation_strength: 0.7,
          user_segments: lowPMFSegments.map(s => s.segment_name),
          actionable_recommendations: [
            'Conduct user interviews to understand needs',
            'Develop segment-specific value propositions',
            'Test different messaging approaches'
          ]
        });
      }
      
      // Content Fit Correlation
      const contentFeedback = await this.analyzeContentFeedback();
      const tooAcademicFeedback = contentFeedback.filter(f => f.difficulty_level === 'too_academic');
      if (tooAcademicFeedback.length > 0) {
        insights.push({
          type: 'content_fit',
          description: 'Content perceived as too academic by some user segments',
          correlation_strength: 0.6,
          user_segments: tooAcademicFeedback.map(f => f.user_segment),
          actionable_recommendations: [
            'Simplify content for broader accessibility',
            'Create beginner-friendly versions',
            'Add progressive difficulty levels'
          ]
        });
      }
      
      console.log(`✅ Generated ${insights.length} correlation insights`);
      return insights;
      
    } catch (error) {
      console.error('Error generating correlation insights:', error);
      return [];
    }
  }
  
  /**
   * Identify power user profiles
   */
  async identifyPowerUserProfiles(): Promise<PowerUserProfile[]> {
    try {
      const segments = await this.analyzeUserSegments();
      const powerUsers = segments.filter(s => s.average_engagement >= 80 && s.completion_rate >= 90);
      
      return powerUsers.map(segment => ({
        demographics: segment.demographics,
        characteristics: [
          'High completion rate',
          'Strong engagement',
          'Positive feedback',
          'Feature adoption'
        ],
        engagement_score: segment.average_engagement,
        retention_rate: segment.completion_rate,
        feature_adoption: ['Voice survey', 'Feedback system', 'Dashboard access']
      }));
      
    } catch (error) {
      console.error('Error identifying power user profiles:', error);
      return [];
    }
  }
  
  /**
   * Identify at-risk segments
   */
  async identifyAtRiskSegments(): Promise<AtRiskSegment[]> {
    try {
      const segments = await this.analyzeUserSegments();
      const atRiskSegments = segments.filter(s => s.churn_risk_score >= 60);
      
      return atRiskSegments.map(segment => ({
        segment_name: segment.segment_name,
        demographics: segment.demographics,
        risk_indicators: [
          'Low completion rate',
          'High churn risk score',
          'Negative content feedback'
        ],
        churn_probability: segment.churn_risk_score,
        intervention_strategies: [
          'Personalized outreach',
          'Content difficulty adjustment',
          'Additional support resources'
        ]
      }));
      
    } catch (error) {
      console.error('Error identifying at-risk segments:', error);
      return [];
    }
  }
  
  /**
   * Analyze content-market fit by user type
   */
  async analyzeContentMarketFit(): Promise<ContentMarketFit[]> {
    try {
      const segments = await this.analyzeUserSegments();
      const contentFeedback = await this.analyzeContentFeedback();
      
      return segments.map(segment => {
        const feedback = contentFeedback.find(f => f.user_segment === segment.segment_name);
        
        return {
          user_type: segment.demographics.user_type,
          content_value_score: segment.pmf_score,
          difficulty_perception: feedback?.difficulty_level || 'just_right',
          engagement_correlation: segment.average_engagement,
          recommendations: [
            'Optimize content for user type',
            'Adjust difficulty level',
            'Enhance engagement features'
          ]
        };
      });
      
    } catch (error) {
      console.error('Error analyzing content-market fit:', error);
      return [];
    }
  }
  
  /**
   * Identify growth opportunities
   */
  async identifyGrowthOpportunities(): Promise<GrowthOpportunity[]> {
    try {
      const segments = await this.analyzeUserSegments();
      const opportunities: GrowthOpportunity[] = [];
      
      // Find underserved segments
      const smallSegments = segments.filter(s => s.user_count < 5);
      
      smallSegments.forEach(segment => {
        opportunities.push({
          segment_name: segment.segment_name,
          unmet_needs: [
            'Content customization',
            'Difficulty adjustment',
            'Personalized experience'
          ],
          market_size_estimate: segment.user_count * 10, // Estimate potential growth
          acquisition_strategy: [
            'Targeted marketing campaigns',
            'Content partnerships',
            'Referral programs'
          ],
          content_recommendations: [
            'Create segment-specific content',
            'Develop beginner resources',
            'Add advanced features'
          ]
        });
      });
      
      return opportunities;
      
    } catch (error) {
      console.error('Error identifying growth opportunities:', error);
      return [];
    }
  }
  
  // Helper methods
  private extractAgeGroup(responses: any): string {
    // Extract age group from survey responses
    if (responses.age) {
      const age = parseInt(responses.age);
      if (age < 25) return '18-24';
      if (age < 35) return '25-34';
      if (age < 45) return '35-44';
      if (age < 55) return '45-54';
      return '55+';
    }
    return 'Unknown';
  }
  
  private extractUserType(responses: any): string {
    // Extract user type from survey responses
    if (responses.user_type) return responses.user_type;
    if (responses.role) return responses.role;
    return 'Personal Interest';
  }
  
  private extractExperienceLevel(responses: any): string {
    if (responses.experience_level) return responses.experience_level;
    if (responses.experience) return responses.experience;
    return 'Beginner';
  }
  
  private extractPrimaryInterest(responses: any): string {
    if (responses.primary_interest) return responses.primary_interest;
    if (responses.interest) return responses.interest;
    return 'General Learning';
  }
  
  private extractUsageFrequency(responses: any): string {
    if (responses.usage_frequency) return responses.usage_frequency;
    if (responses.frequency) return responses.frequency;
    return 'Occasional';
  }
  
  private extractContentDifficulty(responses: any, conversationData: any): 'too_academic' | 'just_right' | 'too_basic' {
    // Analyze conversation content for difficulty indicators
    const text = JSON.stringify(conversationData).toLowerCase();
    
    if (text.includes('too academic') || text.includes('too complex') || text.includes('difficult')) {
      return 'too_academic';
    }
    if (text.includes('too basic') || text.includes('too simple') || text.includes('easy')) {
      return 'too_basic';
    }
    return 'just_right';
  }
  
  private extractUserSegmentFromResponses(responses: any): string {
    const userType = this.extractUserType(responses);
    const ageGroup = this.extractAgeGroup(responses);
    return `${userType} ${ageGroup}`;
  }
  
  private calculateCompletionRate(users: Demographics[]): number {
    // Mock calculation - in real implementation, this would be based on actual completion data
    return Math.random() * 100;
  }
  
  private calculateAverageEngagement(users: Demographics[]): number {
    // Mock calculation - in real implementation, this would be based on actual engagement metrics
    return Math.random() * 100;
  }
  
  private calculateChurnRiskScore(users: Demographics[]): number {
    // Mock calculation - in real implementation, this would be based on actual churn data
    return Math.random() * 100;
  }
  
  private calculatePMFScore(users: Demographics[]): number {
    // Mock calculation - in real implementation, this would be based on actual PMF data
    return Math.random() * 100;
  }
  
  private calculateContentFeedback(users: Demographics[]): { too_academic: number; just_right: number; too_basic: number } {
    // Mock calculation - in real implementation, this would be based on actual feedback data
    return {
      too_academic: Math.random() * 30,
      just_right: Math.random() * 50 + 30,
      too_basic: Math.random() * 20
    };
  }
  
  private async getConversationMetrics(): Promise<any> {
    // Mock implementation - in real implementation, this would fetch actual metrics
    return {};
  }
}
