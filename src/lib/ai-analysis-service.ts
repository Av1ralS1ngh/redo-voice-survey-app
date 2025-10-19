// lib/ai-analysis-service.ts
// AI-powered analysis for founder-specific insights

import OpenAI from 'openai';

// Initialize OpenAI with error handling
let openai: OpenAI;
try {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('✅ OpenAI client initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize OpenAI client:', error);
  throw error;
}

export interface ConversationData {
  id: string;
  user_name: string;
  conversation_data: {
    turns: Array<{
      speaker: 'user' | 'agent';
      message: string;
      timestamp: string;
      turn_number: number;
    }>;
    metrics: {
      user_turns: number;
      agent_turns: number;
      total_turns: number;
      duration_seconds: number;
      completion_status: string;
    };
    survey_responses: Record<string, any>;
  };
  status: string;
  started_at: string;
  completed_at?: string;
}

export interface ChurnRiskAnalysis {
  risk_score: number; // 0-100
  risk_level: 'low' | 'medium' | 'high';
  behavioral_indicators: string[];
  specific_quotes: string[];
  recommendations: string[];
  confidence_score: number; // 0-100
  sample_size: number;
}

export interface PMFAnalysis {
  fit_score: number; // 0-100
  excitement_level: 'low' | 'medium' | 'high';
  genuine_enthusiasm: boolean;
  unprompted_positive_mentions: string[];
  compliance_signals: string[];
  market_signals: string[];
  confidence_score: number; // 0-100
  sample_size: number;
}

export interface CompetitorInsights {
  mentioned_competitors: string[];
  comparison_points: string[];
  user_expectations: string[];
  competitive_advantages: string[];
  threats: string[];
  indirect_comparisons: string[];
  positioning_insights: string[];
  mental_model_indicators: string[];
  confidence_score: number; // 0-100
  sample_size: number;
}

export interface HiddenNeedsAnalysis {
  unspoken_needs: string[];
  underlying_problems: string[];
  feature_request_insights: string[];
  cognitive_load_indicators: string[];
  usability_pain_points: string[];
  learning_style_preferences: string[];
  communication_patterns: string[];
  hesitation_indicators: string[];
  confidence_score: number; // 0-100
  sample_size: number;
}

export class AIAnalysisService {
  
  /**
   * Test OpenAI connection with a simple completion
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing OpenAI connection...');
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Say 'Hello, AI analysis service is working!'" }],
        max_tokens: 20,
        temperature: 0.1,
      });
      
      const message = response.choices[0].message.content;
      console.log('✅ OpenAI test successful:', message);
      return true;
    } catch (error) {
      console.error('❌ OpenAI test failed:', error);
      return false;
    }
  }
  
  /**
   * Analyze churn risk based on conversation patterns
   */
  async analyzeChurnRisk(conversationData: ConversationData): Promise<ChurnRiskAnalysis> {
    try {
      console.log(`🔍 Analyzing churn risk for conversation ${conversationData.id}`);
      
      const conversationText = this.extractConversationText(conversationData);
      
      if (!conversationText || conversationText.trim().length < 10) {
        console.log('⚠️ Insufficient conversation data for churn risk analysis');
        return {
          risk_score: 0,
          risk_level: 'low',
          behavioral_indicators: ['Insufficient conversation data'],
          specific_quotes: [],
          recommendations: ['Encourage more user participation']
        };
      }
      
      const prompt = `
Analyze this voice survey conversation for churn risk indicators. Look for:

1. Hesitation patterns (pauses, "um", "uh", short responses)
2. Politeness without enthusiasm ("it's fine", "it's okay")
3. Defensive responses or reluctance to engage
4. Short, non-committal answers
5. Signs of frustration or impatience

Conversation:
${conversationText}

Provide analysis in this JSON format:
{
  "risk_score": 0-100,
  "risk_level": "low|medium|high",
  "behavioral_indicators": ["specific patterns found"],
  "specific_quotes": ["exact quotes showing risk"],
  "recommendations": ["actionable recommendations"],
  "confidence_score": 0-100,
  "sample_size": 1
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const content = response.choices[0].message.content || '{}';
      // More robust JSON cleaning - handle various markdown formats
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^.*?(\{.*\}).*?$/s, '$1') // Extract JSON object from mixed content
        .trim();
      
      const analysis = JSON.parse(cleanedContent);
      
      console.log(`✅ Churn risk analysis completed for ${conversationData.id}: ${analysis.risk_level} (${analysis.risk_score}%)`);
      return analysis as ChurnRiskAnalysis;
    } catch (error) {
      console.error(`❌ Error analyzing churn risk for ${conversationData.id}:`, error);
      return {
        risk_score: 0,
        risk_level: 'low',
        behavioral_indicators: [`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        specific_quotes: [],
        recommendations: ['Manual review recommended'],
        confidence_score: 0,
        sample_size: 1
      };
    }
  }

  /**
   * Analyze product-market fit signals
   */
  async analyzeProductMarketFit(conversationData: ConversationData): Promise<PMFAnalysis> {
    try {
      const conversationText = this.extractConversationText(conversationData);
      
      const prompt = `
Analyze this voice survey conversation for product-market fit signals. Look for:

1. Genuine excitement vs compliance ("I love this!" vs "It's good")
2. Unprompted positive mentions (user brings up benefits without being asked)
3. Specific use cases or scenarios mentioned
4. Willingness to recommend or share
5. Emotional investment in the product

Conversation:
${conversationText}

Provide analysis in this JSON format:
{
  "fit_score": 0-100,
  "excitement_level": "low|medium|high",
  "genuine_enthusiasm": true/false,
  "unprompted_positive_mentions": ["specific mentions"],
  "compliance_signals": ["signs of just being polite"],
  "market_signals": ["indicators of market demand"],
  "confidence_score": 0-100,
  "sample_size": 1
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const content = response.choices[0].message.content || '{}';
      // More robust JSON cleaning - handle various markdown formats
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^.*?(\{.*\}).*?$/s, '$1') // Extract JSON object from mixed content
        .trim();
      
      const analysis = JSON.parse(cleanedContent);
      return analysis as PMFAnalysis;
    } catch (error) {
      console.error('Error analyzing PMF:', error);
      return {
        fit_score: 0,
        excitement_level: 'low',
        genuine_enthusiasm: false,
        unprompted_positive_mentions: [],
        compliance_signals: [],
        market_signals: [],
        confidence_score: 0,
        sample_size: 1
      };
    }
  }

  /**
   * Extract competitor insights from conversation
   */
  async extractCompetitorInsights(conversationData: ConversationData): Promise<CompetitorInsights> {
    try {
      const conversationText = this.extractConversationText(conversationData);
      
      const prompt = `
Analyze this voice survey conversation for comprehensive competitor insights. Look for:

1. Direct competitor mentions (brand names, product names)
2. Indirect comparisons ("I expected it to work like...", "It's similar to...")
3. User expectations based on competitor experience
4. Competitive advantages mentioned
5. Potential threats or concerns
6. Positioning insights from user mental models
7. Feature expectations based on competitor experience

Conversation:
${conversationText}

Provide analysis in this JSON format:
{
  "mentioned_competitors": ["competitor names mentioned"],
  "comparison_points": ["specific features compared"],
  "user_expectations": ["expectations based on competitor experience"],
  "competitive_advantages": ["advantages mentioned"],
  "threats": ["competitive threats identified"],
  "indirect_comparisons": ["implicit comparisons made"],
  "positioning_insights": ["insights about user mental models"],
  "mental_model_indicators": ["how users categorize/think about the product"],
  "confidence_score": 0-100,
  "sample_size": 1
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const content = response.choices[0].message.content || '{}';
      // More robust JSON cleaning - handle various markdown formats
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^.*?(\{.*\}).*?$/s, '$1') // Extract JSON object from mixed content
        .trim();
      
      const analysis = JSON.parse(cleanedContent);
      return analysis as CompetitorInsights;
    } catch (error) {
      console.error('Error extracting competitor insights:', error);
      return {
        mentioned_competitors: [],
        comparison_points: [],
        user_expectations: [],
        competitive_advantages: [],
        threats: [],
        indirect_comparisons: [],
        positioning_insights: [],
        mental_model_indicators: [],
        confidence_score: 0,
        sample_size: 1
      };
    }
  }

  /**
   * Detect hidden needs and unspoken requirements
   */
  async detectHiddenNeeds(conversationData: ConversationData): Promise<HiddenNeedsAnalysis> {
    try {
      const conversationText = this.extractConversationText(conversationData);
      
      const prompt = `
Analyze this voice survey conversation for hidden needs and unspoken requirements. Look for:

1. What users struggle to articulate (hesitation, "I don't know how to explain")
2. Needs behind feature requests ("more pictures" might mean "reduce cognitive load")
3. Cognitive load indicators (confusion, overwhelm, "too much")
4. Usability pain points (navigation issues, finding things)
5. Emotional needs (confidence, trust, belonging)
6. Learning style preferences from communication patterns
7. Communication patterns that reveal preferences
8. Hesitation indicators that suggest uncertainty

Conversation:
${conversationText}

Provide analysis in this JSON format:
{
  "unspoken_needs": ["needs not directly stated"],
  "underlying_problems": ["problems behind surface complaints"],
  "feature_request_insights": ["what feature requests really mean"],
  "cognitive_load_indicators": ["signs of mental effort"],
  "usability_pain_points": ["specific usability issues"],
  "learning_style_preferences": ["how user prefers to learn"],
  "communication_patterns": ["communication style insights"],
  "hesitation_indicators": ["signs of uncertainty"],
  "confidence_score": 0-100,
  "sample_size": 1
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const content = response.choices[0].message.content || '{}';
      // More robust JSON cleaning - handle various markdown formats
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^.*?(\{.*\}).*?$/s, '$1') // Extract JSON object from mixed content
        .trim();
      
      const analysis = JSON.parse(cleanedContent);
      return analysis as HiddenNeedsAnalysis;
    } catch (error) {
      console.error('Error detecting hidden needs:', error);
      return {
        unspoken_needs: [],
        underlying_problems: [],
        feature_request_insights: [],
        cognitive_load_indicators: [],
        usability_pain_points: [],
        learning_style_preferences: [],
        communication_patterns: [],
        hesitation_indicators: [],
        confidence_score: 0,
        sample_size: 1
      };
    }
  }

  /**
   * Extract conversation text for analysis
   */
  private extractConversationText(conversationData: ConversationData): string {
    const turns = conversationData.conversation_data?.turns;
    if (!turns || !Array.isArray(turns)) {
      return '';
    }
    
    const text = turns.map(turn => 
      `${turn.speaker}: ${turn.message}`
    ).join('\n');
    
    return text;
  }

  /**
   * Analyze multiple conversations for aggregated insights
   */
  async analyzeConversationBatch(conversations: ConversationData[]): Promise<{
    churnRisk: ChurnRiskAnalysis[];
    pmfSignals: PMFAnalysis[];
    competitorInsights: CompetitorInsights[];
    hiddenNeeds: HiddenNeedsAnalysis[];
  }> {
    const results = {
      churnRisk: [] as ChurnRiskAnalysis[],
      pmfSignals: [] as PMFAnalysis[],
      competitorInsights: [] as CompetitorInsights[],
      hiddenNeeds: [] as HiddenNeedsAnalysis[]
    };

    // Process conversations in parallel for better performance
    const promises = conversations.map(async (conv) => {
      const [churnRisk, pmfSignals, competitorInsights, hiddenNeeds] = await Promise.all([
        this.analyzeChurnRisk(conv),
        this.analyzeProductMarketFit(conv),
        this.extractCompetitorInsights(conv),
        this.detectHiddenNeeds(conv)
      ]);

      return { churnRisk, pmfSignals, competitorInsights, hiddenNeeds };
    });

    const batchResults = await Promise.all(promises);
    
    batchResults.forEach(result => {
      results.churnRisk.push(result.churnRisk);
      results.pmfSignals.push(result.pmfSignals);
      results.competitorInsights.push(result.competitorInsights);
      results.hiddenNeeds.push(result.hiddenNeeds);
    });

    return results;
  }
}

export const aiAnalysisService = new AIAnalysisService();
