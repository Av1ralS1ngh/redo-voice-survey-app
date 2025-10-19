// Prosody Analytics Manager
// Handles analysis and insights generation from prosody data

import { supabaseService } from "./supabase";
import { ProsodyAnalysis, ProsodyAnalytics, DetailedProsodyFeatures } from "./prosody-interfaces";

export class ProsodyAnalyticsManager {
  
  /**
   * Get comprehensive prosody analysis for a session
   */
  async getSessionProsodyAnalysis(sessionId: string): Promise<ProsodyAnalysis | null> {
    try {
      // Get conversation data
      const { data: conversation, error: conversationError } = await supabaseService()
        .from('conversations')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (conversationError || !conversation) {
        console.error('Conversation not found:', conversationError);
        return null;
      }

      // Get prosody analytics
      const { data: prosodyAnalytics, error: prosodyError } = await supabaseService()
        .from('prosody_analytics')
        .select('*')
        .eq('conversation_id', conversation.id)
        .single();

      // Get detailed prosody features
      const { data: prosodyFeatures, error: featuresError } = await supabaseService()
        .from('prosody_features')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('turn_number');

      if (featuresError) {
        console.error('Error fetching prosody features:', featuresError);
      }

      // Generate analysis
      const analysis = await this.generateProsodyAnalysis(
        conversation,
        prosodyAnalytics,
        prosodyFeatures || []
      );

      return analysis;

    } catch (error) {
      console.error('Error getting prosody analysis:', error);
      return null;
    }
  }

  /**
   * Generate comprehensive prosody analysis
   */
  private async generateProsodyAnalysis(
    conversation: any,
    prosodyAnalytics: ProsodyAnalytics | null,
    prosodyFeatures: DetailedProsodyFeatures[]
  ): Promise<ProsodyAnalysis> {
    
    // Calculate overall metrics
    const userFeatures = prosodyFeatures.filter(f => f.speaker === 'user');
    const agentFeatures = prosodyFeatures.filter(f => f.speaker === 'agent');

    const overallEngagement = this.calculateOverallEngagement(userFeatures);
    const overallConfidence = this.calculateOverallConfidence(userFeatures);
    const overallEmotionalState = this.calculateOverallEmotionalState(userFeatures);

    // Analyze speaking patterns
    const speakingPatterns = this.analyzeSpeakingPatterns(userFeatures);

    // Analyze voice quality
    const voiceQuality = this.analyzeVoiceQuality(userFeatures);

    // Analyze emotional journey
    const emotionalJourney = this.analyzeEmotionalJourney(userFeatures);

    // Detect stress and engagement indicators
    const stressIndicators = this.detectStressIndicators(userFeatures);

    // Generate recommendations
    const recommendations = this.generateRecommendations(userFeatures, prosodyAnalytics);

    return {
      conversation_id: conversation.id,
      session_id: conversation.session_id,
      user_uid: conversation.user_uid,
      
      overall_engagement: overallEngagement,
      overall_confidence: overallConfidence,
      overall_emotional_state: overallEmotionalState,
      
      speaking_patterns: speakingPatterns,
      voice_quality: voiceQuality,
      emotional_journey: emotionalJourney,
      stress_indicators: stressIndicators,
      recommendations: recommendations
    };
  }

  /**
   * Calculate overall engagement score
   */
  private calculateOverallEngagement(features: DetailedProsodyFeatures[]): number {
    if (features.length === 0) return 5.0;

    const avgSpeechRate = features.reduce((sum, f) => sum + (f.speech_rate || 0), 0) / features.length;
    const avgPitchVariation = features.reduce((sum, f) => sum + (f.f0_std || 0), 0) / features.length;
    const avgIntensityVariation = features.reduce((sum, f) => sum + (f.intensity_std || 0), 0) / features.length;
    const avgPauseRatio = features.reduce((sum, f) => sum + (f.silence_ratio || 0), 0) / features.length;

    // Simple engagement scoring algorithm
    const engagement = Math.min(10.0, Math.max(0.0,
      (avgSpeechRate / 200.0) * 3.0 +           // Normalize speech rate
      (avgPitchVariation / 100.0) * 3.0 +       // Normalize pitch variation
      (avgIntensityVariation / 20.0) * 2.0 +     // Normalize intensity variation
      ((1.0 - avgPauseRatio) * 2.0)             // Invert pause ratio
    ));

    return Math.round(engagement * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Calculate overall confidence level
   */
  private calculateOverallConfidence(features: DetailedProsodyFeatures[]): number {
    if (features.length === 0) return 5.0;

    // Confidence based on voice quality metrics
    const avgJitter = features.reduce((sum, f) => sum + (f.jitter || 0), 0) / features.length;
    const avgShimmer = features.reduce((sum, f) => sum + (f.shimmer || 0), 0) / features.length;
    const avgHnr = features.reduce((sum, f) => sum + (f.hnr || 0), 0) / features.length;

    // Lower jitter and shimmer, higher HNR = higher confidence
    const confidence = Math.min(10.0, Math.max(0.0,
      10.0 - (avgJitter * 100) - (avgShimmer * 100) + (avgHnr / 10)
    ));

    return Math.round(confidence * 10) / 10;
  }

  /**
   * Calculate overall emotional state
   */
  private calculateOverallEmotionalState(features: DetailedProsodyFeatures[]): {
    arousal: number;
    valence: number;
    dominance: number;
  } {
    if (features.length === 0) return { arousal: 5.0, valence: 0.0, dominance: 5.0 };

    const avgArousal = features.reduce((sum, f) => sum + (f.emotional_arousal || 5.0), 0) / features.length;
    const avgValence = features.reduce((sum, f) => sum + (f.emotional_valence || 0.0), 0) / features.length;
    const avgDominance = features.reduce((sum, f) => sum + (f.emotional_dominance || 5.0), 0) / features.length;

    return {
      arousal: Math.round(avgArousal * 10) / 10,
      valence: Math.round(avgValence * 10) / 10,
      dominance: Math.round(avgDominance * 10) / 10
    };
  }

  /**
   * Analyze speaking patterns
   */
  private analyzeSpeakingPatterns(features: DetailedProsodyFeatures[]): any {
    if (features.length === 0) {
      return {
        avg_speech_rate: 0,
        pitch_variability: 0,
        intensity_variability: 0,
        pause_patterns: {
          avg_pause_duration: 0,
          pause_frequency: 0
        }
      };
    }

    const avgSpeechRate = features.reduce((sum, f) => sum + (f.speech_rate || 0), 0) / features.length;
    const avgPitchVariation = features.reduce((sum, f) => sum + (f.f0_std || 0), 0) / features.length;
    const avgIntensityVariation = features.reduce((sum, f) => sum + (f.intensity_std || 0), 0) / features.length;
    const avgPauseDuration = features.reduce((sum, f) => sum + (f.pause_duration || 0), 0) / features.length;
    const pauseCount = features.reduce((sum, f) => sum + (f.pause_count || 0), 0);
    const totalDuration = features.reduce((sum, f) => sum + (f.duration || 0), 0);

    return {
      avg_speech_rate: Math.round(avgSpeechRate * 10) / 10,
      pitch_variability: Math.round(avgPitchVariation * 10) / 10,
      intensity_variability: Math.round(avgIntensityVariation * 10) / 10,
      pause_patterns: {
        avg_pause_duration: Math.round(avgPauseDuration * 100) / 100,
        pause_frequency: totalDuration > 0 ? Math.round((pauseCount / totalDuration) * 60 * 10) / 10 : 0 // pauses per minute
      }
    };
  }

  /**
   * Analyze voice quality
   */
  private analyzeVoiceQuality(features: DetailedProsodyFeatures[]): any {
    if (features.length === 0) {
      return {
        avg_jitter: 0,
        avg_shimmer: 0,
        avg_hnr: 0,
        quality_score: 5.0
      };
    }

    const avgJitter = features.reduce((sum, f) => sum + (f.jitter || 0), 0) / features.length;
    const avgShimmer = features.reduce((sum, f) => sum + (f.shimmer || 0), 0) / features.length;
    const avgHnr = features.reduce((sum, f) => sum + (f.hnr || 0), 0) / features.length;

    // Quality score based on voice quality metrics
    const qualityScore = Math.min(10.0, Math.max(0.0,
      10.0 - (avgJitter * 200) - (avgShimmer * 200) + (avgHnr / 5)
    ));

    return {
      avg_jitter: Math.round(avgJitter * 1000000) / 1000000, // 6 decimal places
      avg_shimmer: Math.round(avgShimmer * 1000000) / 1000000, // 6 decimal places
      avg_hnr: Math.round(avgHnr * 10) / 10,
      quality_score: Math.round(qualityScore * 10) / 10
    };
  }

  /**
   * Analyze emotional journey
   */
  private analyzeEmotionalJourney(features: DetailedProsodyFeatures[]): any {
    if (features.length === 0) {
      return {
        start_emotion: 'neutral',
        end_emotion: 'neutral',
        emotional_transitions: 0,
        peak_arousal: 5.0,
        peak_valence: 0.0
      };
    }

    const firstFeature = features[0];
    const lastFeature = features[features.length - 1];

    const startEmotion = this.mapEmotionalState(firstFeature.emotional_arousal || 5.0, firstFeature.emotional_valence || 0.0);
    const endEmotion = this.mapEmotionalState(lastFeature.emotional_arousal || 5.0, lastFeature.emotional_valence || 0.0);

    // Count emotional transitions (simplified)
    let transitions = 0;
    for (let i = 1; i < features.length; i++) {
      const prevEmotion = this.mapEmotionalState(features[i-1].emotional_arousal || 5.0, features[i-1].emotional_valence || 0.0);
      const currEmotion = this.mapEmotionalState(features[i].emotional_arousal || 5.0, features[i].emotional_valence || 0.0);
      if (prevEmotion !== currEmotion) transitions++;
    }

    const peakArousal = Math.max(...features.map(f => f.emotional_arousal || 5.0));
    const peakValence = Math.max(...features.map(f => Math.abs(f.emotional_valence || 0.0)));

    return {
      start_emotion: startEmotion,
      end_emotion: endEmotion,
      emotional_transitions: transitions,
      peak_arousal: Math.round(peakArousal * 10) / 10,
      peak_valence: Math.round(peakValence * 10) / 10
    };
  }

  /**
   * Detect stress and engagement indicators
   */
  private detectStressIndicators(features: DetailedProsodyFeatures[]): any {
    if (features.length === 0) {
      return {
        stress_level: 'low',
        stress_patterns: [],
        engagement_trend: 'stable'
      };
    }

    const avgPitchVariation = features.reduce((sum, f) => sum + (f.f0_std || 0), 0) / features.length;
    const avgIntensityVariation = features.reduce((sum, f) => sum + (f.intensity_std || 0), 0) / features.length;

    // Simple stress detection
    let stressLevel: 'low' | 'moderate' | 'high' = 'low';
    if (avgPitchVariation > 50.0 && avgIntensityVariation > 10.0) {
      stressLevel = 'high';
    } else if (avgPitchVariation > 30.0 && avgIntensityVariation > 5.0) {
      stressLevel = 'moderate';
    }

    // Detect stress patterns
    const stressPatterns: string[] = [];
    if (avgPitchVariation > 40.0) stressPatterns.push('high_pitch_variation');
    if (avgIntensityVariation > 8.0) stressPatterns.push('high_intensity_variation');
    if (features.some(f => (f.pause_duration || 0) > 2.0)) stressPatterns.push('long_pauses');

    // Simple engagement trend (comparing first half vs second half)
    const midPoint = Math.floor(features.length / 2);
    const firstHalfEngagement = this.calculateOverallEngagement(features.slice(0, midPoint));
    const secondHalfEngagement = this.calculateOverallEngagement(features.slice(midPoint));

    let engagementTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (secondHalfEngagement > firstHalfEngagement + 0.5) {
      engagementTrend = 'increasing';
    } else if (secondHalfEngagement < firstHalfEngagement - 0.5) {
      engagementTrend = 'decreasing';
    }

    return {
      stress_level: stressLevel,
      stress_patterns: stressPatterns,
      engagement_trend: engagementTrend
    };
  }

  /**
   * Generate recommendations based on prosody analysis
   */
  private generateRecommendations(features: DetailedProsodyFeatures[], prosodyAnalytics: ProsodyAnalytics | null): any {
    const recommendations = {
      optimal_response_timing: 2.0, // seconds
      suggested_tone: 'neutral',
      engagement_strategies: [] as string[]
    };

    if (features.length === 0) return recommendations;

    const avgSpeechRate = features.reduce((sum, f) => sum + (f.speech_rate || 0), 0) / features.length;
    const avgPauseDuration = features.reduce((sum, f) => sum + (f.pause_duration || 0), 0) / features.length;
    const avgArousal = features.reduce((sum, f) => sum + (f.emotional_arousal || 5.0), 0) / features.length;

    // Adjust response timing based on user's speaking patterns
    if (avgSpeechRate > 180) {
      recommendations.optimal_response_timing = 1.5; // Faster responses for fast speakers
    } else if (avgSpeechRate < 120) {
      recommendations.optimal_response_timing = 3.0; // Slower responses for slow speakers
    }

    // Suggest tone based on emotional state
    if (avgArousal > 7.0) {
      recommendations.suggested_tone = 'calming';
    } else if (avgArousal < 3.0) {
      recommendations.suggested_tone = 'energetic';
    } else {
      recommendations.suggested_tone = 'neutral';
    }

    // Generate engagement strategies
    if (avgPauseDuration > 2.0) {
      recommendations.engagement_strategies.push('encourage_shorter_responses');
    }
    if (avgSpeechRate < 100) {
      recommendations.engagement_strategies.push('ask_open_ended_questions');
    }
    if (avgArousal < 4.0) {
      recommendations.engagement_strategies.push('increase_enthusiasm');
    }

    return recommendations;
  }

  /**
   * Map emotional arousal and valence to emotion labels
   */
  private mapEmotionalState(arousal: number, valence: number): string {
    if (arousal > 7.0 && valence > 2.0) return 'excited';
    if (arousal > 7.0 && valence < -2.0) return 'angry';
    if (arousal < 3.0 && valence > 2.0) return 'calm';
    if (arousal < 3.0 && valence < -2.0) return 'sad';
    if (valence > 2.0) return 'happy';
    if (valence < -2.0) return 'unhappy';
    return 'neutral';
  }

  /**
   * Calculate aggregate prosody metrics for a conversation
   */
  async calculateConversationProsodyMetrics(conversationId: string): Promise<ProsodyAnalytics | null> {
    try {
      const { data: features, error } = await supabaseService()
        .from('prosody_features')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('speaker', 'user'); // Only analyze user's prosody

      if (error || !features || features.length === 0) {
        console.error('Error fetching prosody features:', error);
        return null;
      }

      // Calculate aggregate metrics
      const metrics: ProsodyAnalytics = {
        id: '',
        session_id: '',
        conversation_id: conversationId,
        user_uid: '',
        
        avg_speech_rate: features.reduce((sum, f) => sum + (f.speech_rate || 0), 0) / features.length,
        avg_pitch_mean: features.reduce((sum, f) => sum + (f.f0_mean || 0), 0) / features.length,
        avg_pitch_std: features.reduce((sum, f) => sum + (f.f0_std || 0), 0) / features.length,
        avg_intensity_mean: features.reduce((sum, f) => sum + (f.intensity_mean || 0), 0) / features.length,
        avg_intensity_std: features.reduce((sum, f) => sum + (f.intensity_std || 0), 0) / features.length,
        avg_pause_duration: features.reduce((sum, f) => sum + (f.pause_duration || 0), 0) / features.length,
        total_silence_ratio: features.reduce((sum, f) => sum + (f.silence_ratio || 0), 0) / features.length,
        
        avg_jitter: features.reduce((sum, f) => sum + (f.jitter || 0), 0) / features.length,
        avg_shimmer: features.reduce((sum, f) => sum + (f.shimmer || 0), 0) / features.length,
        avg_hnr: features.reduce((sum, f) => sum + (f.hnr || 0), 0) / features.length,
        
        emotional_variability: this.calculateEmotionalVariability(features),
        conversation_duration: features.reduce((sum, f) => sum + (f.duration || 0), 0),
        turn_count: features.length,
        
        engagement_score: this.calculateOverallEngagement(features),
        confidence_level: this.calculateOverallConfidence(features),
        emotional_arousal: features.reduce((sum, f) => sum + (f.emotional_arousal || 5.0), 0) / features.length,
        emotional_valence: features.reduce((sum, f) => sum + (f.emotional_valence || 0.0), 0) / features.length,
        
        analysis_timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return metrics;

    } catch (error) {
      console.error('Error calculating prosody metrics:', error);
      return null;
    }
  }

  /**
   * Calculate emotional variability
   */
  private calculateEmotionalVariability(features: DetailedProsodyFeatures[]): number {
    if (features.length < 2) return 0;

    const arousalValues = features.map(f => f.emotional_arousal || 5.0);
    const valenceValues = features.map(f => f.emotional_valence || 0.0);

    const arousalVariability = this.calculateStandardDeviation(arousalValues);
    const valenceVariability = this.calculateStandardDeviation(valenceValues);

    return Math.round((arousalVariability + valenceVariability) * 100) / 100;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}
