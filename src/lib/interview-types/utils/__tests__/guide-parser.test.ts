/**
 * Unit tests for Interview Guide Parser
 */

import { parseInterviewGuide, validateResearchBrief } from '../guide-parser';

// Sample Interview Guide for testing
const SAMPLE_INTERVIEW_GUIDE = `
## 1. OBJECTIVE
Understand how users interact with the mobile shopping app to identify pain points in the search and checkout experience.

## 2. LEARNING GOALS
• Identify friction points in product search functionality
• Understand decision-making criteria during product comparison
• Assess checkout flow usability and trust factors
• Detect opportunities for personalization

## 3. KEY QUESTIONS
• How do users currently search for products on mobile?
• What information influences purchase decisions?
• What causes users to abandon their cart?
• How do users compare competing products?
• What would improve the checkout experience?

## 4. CONVERSATION FLOW

"The sample questions guide the conversation but the moderator will follow participant stories and adapt dynamically to achieve the objective."

**Warm-Up & Baseline Habits**

Sample Questions / Areas to Probe:
• "Can you tell me about your typical online shopping experience? What apps do you usually use?"
• Functional Dimensions: frequency of mobile shopping, preferred features
• Emotional Dimensions: comfort with technology, perceived ease of use

**Finding Products (High Emphasis)**

Sample Questions / Areas to Probe:
• "Walk me through how you would search for a new pair of running shoes in this app."
• "What features or filters do you usually look for when searching for products?"
• Functional Dimensions: search functionality, product categories
• Emotional Dimensions: frustration, satisfaction with search results

**Wrap-Up**

Sample Questions / Areas to Probe:
• "Is there anything else you'd like to share about your experience with the app?"
• Functional Dimensions: overall app performance, ease of navigation

## 5. SUCCESS METRICS
• Identify at least 5 specific friction points in search or checkout
• Surface 3-5 pain points or patterns across participants
• Capture 10+ user stories demonstrating current behavior
• Detect signals of feature gaps or competitive threats

## 6. PARTICIPANTS
• Target profile: Regular mobile shoppers (18-45 years old)
• Sample size: 5 participants (formative testing, 85% problem discovery rate)
• Screening criteria: Must have used mobile shopping apps in the past month
• Screening criteria: Mix of iOS and Android users
• Screening criteria: Variety of shopping categories (fashion, electronics, home goods)

## 7. RULES / GUARDRAILS
• Never ask leading questions that suggest desired answers
• Avoid direct asks about sensitive topics like spending habits
• Infer trust and security concerns rather than asking directly
• Test the design, never the user
• Follow user stories naturally without rigid script adherence
`;

describe('parseInterviewGuide', () => {
  test('should parse complete interview guide successfully', () => {
    const result = parseInterviewGuide(SAMPLE_INTERVIEW_GUIDE);

    expect(result).toBeDefined();
    expect(result.objective).toBeDefined();
    expect(result.learningGoals).toBeInstanceOf(Array);
    expect(result.keyQuestions).toBeInstanceOf(Array);
    expect(result.conversationFlow).toBeInstanceOf(Array);
  });

  test('should extract objective correctly', () => {
    const result = parseInterviewGuide(SAMPLE_INTERVIEW_GUIDE);

    expect(result.objective).toContain('mobile shopping app');
    expect(result.objective).toContain('search and checkout');
  });

  test('should extract learning goals as array', () => {
    const result = parseInterviewGuide(SAMPLE_INTERVIEW_GUIDE);

    expect(result.learningGoals.length).toBeGreaterThan(0);
    expect(result.learningGoals[0]).toContain('friction points');
    expect(result.learningGoals).toContain('Identify friction points in product search functionality');
  });

  test('should extract key questions as array', () => {
    const result = parseInterviewGuide(SAMPLE_INTERVIEW_GUIDE);

    expect(result.keyQuestions.length).toBeGreaterThanOrEqual(5);
    expect(result.keyQuestions[0]).toContain('search for products');
  });

  test('should extract conversation flow with phases', () => {
    const result = parseInterviewGuide(SAMPLE_INTERVIEW_GUIDE);

    expect(result.conversationFlow.length).toBeGreaterThan(0);
    
    const warmUpPhase = result.conversationFlow.find(p => 
      p.phase.includes('Warm-Up')
    );
    expect(warmUpPhase).toBeDefined();
    expect(warmUpPhase?.phase).toBe('Warm-Up & Baseline Habits');
  });

  test('should extract success metrics', () => {
    const result = parseInterviewGuide(SAMPLE_INTERVIEW_GUIDE);

    const metrics = result.additionalSections?.successMetrics;
    expect(metrics).toBeDefined();
    expect(metrics.length).toBeGreaterThan(0);
    expect(metrics[0]).toContain('friction points');
  });

  test('should extract participants information', () => {
    const result = parseInterviewGuide(SAMPLE_INTERVIEW_GUIDE);

    const participants = result.additionalSections?.participants;
    expect(participants).toBeDefined();
    expect(participants.targetAudience).toContain('mobile shoppers');
  });

  test('should extract guardrails', () => {
    const result = parseInterviewGuide(SAMPLE_INTERVIEW_GUIDE);

    const guardrails = result.additionalSections?.guardrails;
    expect(guardrails).toBeDefined();
    expect(guardrails.length).toBeGreaterThan(0);
    expect(guardrails.some((g) => g.includes('leading questions'))).toBe(true);
  });

  test('should throw error for empty guide', () => {
    expect(() => parseInterviewGuide('')).toThrow('empty or invalid');
  });

  test('should throw error for guide without objective', () => {
    const invalidGuide = `
## 2. LEARNING GOALS
• Goal 1
• Goal 2
    `;

    expect(() => parseInterviewGuide(invalidGuide)).toThrow('OBJECTIVE section is required');
  });

  test('should handle guide with minimal sections', () => {
    const minimalGuide = `
## 1. OBJECTIVE
Test objective

## 2. LEARNING GOALS
• Goal 1

## 3. KEY QUESTIONS
• Question 1
    `;

    const result = parseInterviewGuide(minimalGuide);
    expect(result.objective).toBe('Test objective');
    expect(result.learningGoals).toEqual(['Goal 1']);
    expect(result.keyQuestions).toEqual(['Question 1']);
  });

  test('should handle conversation flow with emphasis markers', () => {
    const guideWithEmphasis = `
## 1. OBJECTIVE
Test

## 4. CONVERSATION FLOW

**Phase 1 (High Emphasis)**

Sample Questions / Areas to Probe:
• Question 1
• Question 2

**Phase 2 (Medium Emphasis)**

• Question 3
    `;

    const result = parseInterviewGuide(guideWithEmphasis);
    expect(result.conversationFlow.length).toBe(2);
    expect(result.conversationFlow[0].phase).toBe('Phase 1');
    expect(result.conversationFlow[1].phase).toBe('Phase 2');
  });
});

describe('validateResearchBrief', () => {
  test('should validate complete brief as valid', () => {
    const brief = parseInterviewGuide(SAMPLE_INTERVIEW_GUIDE);
    const validation = validateResearchBrief(brief);

    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);
  });

  test('should return error for missing objective', () => {
    const brief = parseInterviewGuide(SAMPLE_INTERVIEW_GUIDE);
    brief.objective = '';

    const validation = validateResearchBrief(brief);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('Objective is required');
  });

  test('should return warning for missing learning goals', () => {
    const brief = parseInterviewGuide(SAMPLE_INTERVIEW_GUIDE);
    brief.learningGoals = [];

    const validation = validateResearchBrief(brief);

    expect(validation.warnings.some(w => w.includes('learning goals'))).toBe(true);
  });

  test('should return warning for insufficient questions', () => {
    const brief = parseInterviewGuide(SAMPLE_INTERVIEW_GUIDE);
    brief.keyQuestions = ['Q1', 'Q2'];

    const validation = validateResearchBrief(brief);

    expect(validation.warnings.some(w => w.includes('Less than 5 key questions'))).toBe(true);
  });
});

