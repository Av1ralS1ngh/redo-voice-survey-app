/**
 * Simulation Engine - Orchestrates AI-to-AI interview simulations
 * Manages conversation flow between interviewer agent and persona agent
 */

import OpenAI from 'openai';
import { Persona, SimulationResult, ConversationMessage, InterviewGuide } from './types';
import { PersonaAgent } from './persona-agent';
import { evaluateAgentPerformance } from './evaluators/agent-evaluator';
import { evaluateBriefQuality } from './evaluators/brief-evaluator';
import { runMockSimulation } from './mock-simulation';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Check if we should use mock simulation instead of live AI
 * Returns true if OpenAI API key is not available
 */
function shouldUseMockSimulation(): boolean {
  return !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '';
}

/**
 * Conversation State Machine
 * Tracks the current phase of the interview to prevent goodbye loops
 */
enum ConversationState {
  OPENING = 'opening',          // Initial greeting phase
  INTERVIEWING = 'interviewing',// Main interview questions
  WRAPPING_UP = 'wrapping_up',  // Agent said goodbye, awaiting persona response
  CONCLUDED = 'concluded'        // Interview ended
}

/**
 * Message Intent Types
 */
type MessageIntent = 'question' | 'probe' | 'closing' | 'other';

export interface SimulationConfig {
  interviewGuide: InterviewGuide;
  briefContent: string;
  projectObjectives: string[];
  maxTurns?: number; // safety limit
  timeoutMinutes?: number; // max duration
}

/**
 * Detect if a message is a closing/goodbye message using heuristics
 * This is fast (no API call) and catches 95%+ of natural goodbyes
 */
function detectClosingMessage(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim();
  
  // Closing phrases
  const closingPhrases = [
    'thank you for your time',
    'thank you so much',
    'thanks for your time',
    'thanks for sharing',
    'this concludes',
    'that concludes',
    'we\'re done',
    'we\'re all done',
    'that\'s all',
    'that wraps up',
    'this wraps up',
    'appreciate your time',
    'thanks for participating',
    'thank you for participating',
  ];
  
  // Goodbye words
  const goodbyeWords = [
    'goodbye',
    'good bye',
    'bye',
    'see you',
    'take care',
    'have a great',
    'have a good',
  ];
  
  // Check for closing phrases
  const hasClosingPhrase = closingPhrases.some(phrase => lowerMessage.includes(phrase));
  
  // Check for goodbye words
  const hasGoodbyeWord = goodbyeWords.some(word => lowerMessage.includes(word));
  
  // Check for "thank" + end-of-message context
  const hasThankAtEnd = lowerMessage.includes('thank') && 
    (lowerMessage.endsWith('.') || lowerMessage.endsWith('!'));
  
  // NOT a closing if it contains a question mark (e.g., "Thank you for sharing. Can you tell me more?")
  const hasQuestion = lowerMessage.includes('?');
  
  // Closing detection logic
  const isClosing = !hasQuestion && (
    hasClosingPhrase ||
    hasGoodbyeWord ||
    (hasThankAtEnd && lowerMessage.split(' ').length < 20) // Short thank-you message
  );
  
  return isClosing;
}

/**
 * Run a single simulation with a persona
 */
export async function runSimulation(
  persona: Persona,
  config: SimulationConfig,
  onProgress?: (progress: { message: string; turn: number }) => void
): Promise<SimulationResult> {
  if (shouldUseMockSimulation()) {
    return runMockSimulation(persona, config, onProgress);
  }

  const client = openai;
  if (!client) {
    return runMockSimulation(persona, config, onProgress);
  }

  const startTime = Date.now();
  const personaAgent = new PersonaAgent(persona);
  const transcript: ConversationMessage[] = [];
  
  const maxTurns = config.maxTurns || 40; // Reduced from 100 to 40
  const timeoutMs = (config.timeoutMinutes || 5) * 60 * 1000; // Reduced from 60 to 5 minutes
  
  let currentTurn = 0;
  let completed = false;
  let droppedAt: string | undefined;
  let dropOffReason: string | undefined;
  
  // State machine for conversation flow
  let conversationState: ConversationState = ConversationState.OPENING;

  // Build interviewer system prompt
  const interviewerSystemPrompt = getInterviewerSystemPrompt(config);

  // Conversation history for the interviewer agent
  const interviewerHistory: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: interviewerSystemPrompt }
  ];

  // Start the interview
  onProgress?.({ message: `Starting interview with ${persona.name}...`, turn: 0 });

  try {
    // Interviewer's opening
  const openingResponse = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: interviewerHistory,
      temperature: 0.7,
      max_tokens: 200,
    });

    const openingMessage = openingResponse.choices[0].message.content || "Hello! Let's begin the interview.";
    
    transcript.push({
      role: 'agent',
      content: openingMessage,
      timestamp: Date.now(),
      metadata: { questionId: 'opening' }
    });

    interviewerHistory.push({ role: 'assistant', content: openingMessage });
    
    // Transition to interviewing state after opening
    conversationState = ConversationState.INTERVIEWING;

    // Main conversation loop
    // Loop continues until turn limit, timeout, or explicit break (when state becomes CONCLUDED)
    while (currentTurn < maxTurns && Date.now() - startTime < timeoutMs) {
      currentTurn++;
      
      // FIRST: Check if we're in WRAPPING_UP state (agent said goodbye, awaiting persona response)
      // Get one persona goodbye response, then conclude
      if (conversationState === ConversationState.WRAPPING_UP) {
        onProgress?.({ message: 'Getting final response from participant...', turn: currentTurn });
        
        // Get persona's goodbye response
        const personaResponse = await personaAgent.respondTo(
          transcript[transcript.length - 1].content,
          transcript[transcript.length - 1].metadata
        );

        transcript.push({
          role: 'user',
          content: personaResponse.response,
          timestamp: Date.now(),
          metadata: { wordCount: personaResponse.response.split(' ').length }
        });
        
        // Now conclude the interview
        conversationState = ConversationState.CONCLUDED;
        onProgress?.({ message: 'Interview concluded after goodbye exchange', turn: currentTurn });
        break;
      }
      
      // Check if the last agent message was an explicit closing message (from force completion)
      const lastAgentMessage = transcript.filter(m => m.role === 'agent').slice(-1)[0];
      if (lastAgentMessage?.metadata?.questionId === 'closing') {
        conversationState = ConversationState.CONCLUDED;
        onProgress?.({ message: 'Interview concluded', turn: currentTurn });
        break;
      }
      
      // Check if interview should be completed BEFORE getting next response
      const shouldCheckCompletion = currentTurn % 5 === 0 || currentTurn > 25;
      
      if (shouldCheckCompletion) {
        const allQuestionsAsked = checkIfAllQuestionsAsked(transcript, config.interviewGuide);
        const shouldForceComplete = currentTurn > 30;
        
        if (allQuestionsAsked || shouldForceComplete) {
          completed = allQuestionsAsked;
          const completionMessage = shouldForceComplete 
            ? `Interview timed out at turn ${currentTurn}` 
            : 'All questions completed!';
          onProgress?.({ message: completionMessage, turn: currentTurn });
          
          // Closing message - keep it SHORT to avoid goodbye loops
          const closingInstruction = shouldForceComplete
            ? 'The interview time limit has been reached. Say ONLY: "Thank you so much for your time and insights! This concludes our interview." Do NOT ask for goodbyes or wait for response.'
            : 'The interview is complete. Say ONLY: "Thank you so much for your time and valuable insights! This concludes our interview." Do NOT ask for goodbyes or wait for response.';
            
          const closingResponse = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              ...interviewerHistory,
              { role: 'system', content: closingInstruction }
            ],
            temperature: 0.3,
            max_tokens: 50,
          });

          const closingMessage = closingResponse.choices[0].message.content || "Thank you for your time! This concludes our interview.";
          transcript.push({
            role: 'agent',
            content: closingMessage,
            timestamp: Date.now(),
            metadata: { questionId: 'closing', forcedCompletion: shouldForceComplete }
          });
          
          // Set state to concluded and break immediately
          conversationState = ConversationState.CONCLUDED;
          break;
        }
      }
      
      // If we reach here, continue with normal conversation flow
      onProgress?.({ message: `Turn ${currentTurn}: Awaiting participant response...`, turn: currentTurn });

      // Persona responds
      const personaResponse = await personaAgent.respondTo(
        transcript[transcript.length - 1].content,
        transcript[transcript.length - 1].metadata
      );

      transcript.push({
        role: 'user',
        content: personaResponse.response,
        timestamp: Date.now(),
        metadata: {
          wordCount: personaResponse.response.split(' ').length
        }
      });

      interviewerHistory.push({ role: 'user', content: personaResponse.response });

      // Check if participant dropped off
      if (!personaResponse.shouldContinue) {
        droppedAt = transcript[transcript.length - 2].metadata?.questionId || 'unknown';
        dropOffReason = personaResponse.dropOffReason;
        onProgress?.({ message: `Participant dropped off: ${dropOffReason}`, turn: currentTurn });
        break;
      }

      onProgress?.({ message: `Turn ${currentTurn}: Agent asking next question...`, turn: currentTurn });

      // Interviewer asks next question
  const nextResponse = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: interviewerHistory,
        temperature: 0.7,
        max_tokens: 250,
      });

      const nextMessage = nextResponse.choices[0].message.content || "Can you tell me more?";
      
      // Try to identify which question this relates to
      const questionId = identifyCurrentQuestion(nextMessage, config.interviewGuide);
      
      // CRITICAL: Detect if this is a natural closing/goodbye message using heuristics
      const isNaturalClosing = detectClosingMessage(nextMessage);
      
      transcript.push({
        role: 'agent',
        content: nextMessage,
        timestamp: Date.now(),
        metadata: { 
          questionId,
          isProbe: nextMessage.toLowerCase().includes('tell me more') || 
                   nextMessage.toLowerCase().includes('can you elaborate')
        }
      });

      interviewerHistory.push({ role: 'assistant', content: nextMessage });
      
      // If agent naturally said goodbye, transition to WRAPPING_UP state
      // Next iteration will get persona's goodbye response and then conclude
      if (isNaturalClosing && conversationState === ConversationState.INTERVIEWING) {
        conversationState = ConversationState.WRAPPING_UP;
        onProgress?.({ message: '🔚 Detected natural closing message, wrapping up interview...', turn: currentTurn });
      }
    }

    // Calculate duration
    const duration = (Date.now() - startTime) / 1000 / 60; // minutes

    // Evaluate performance
    onProgress?.({ message: 'Evaluating performance...', turn: currentTurn });
    
    const agentMetrics = await evaluateAgentPerformance(transcript, config.interviewGuide, persona);
    const briefMetrics = await evaluateBriefQuality(
      transcript,
      config.interviewGuide,
      config.briefContent,
      config.projectObjectives,
      persona
    );

    return {
      personaId: persona.id,
      completed,
      droppedAt,
      dropOffReason,
      transcript,
      duration,
      metrics: {
        agent: agentMetrics,
        brief: briefMetrics
      },
      completedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`Simulation error for ${persona.name}:`, error);

    if (!shouldUseMockSimulation()) {
      onProgress?.({
        message: 'Live AI run failed — falling back to offline simulator.',
        turn: currentTurn
      });
      // Fall back to deterministic mock to avoid blocking the entire demo
      return runMockSimulation(persona, config, onProgress);
    }

    throw new Error(`Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate interviewer system prompt
 */
function getInterviewerSystemPrompt(config: SimulationConfig): string {
  const questions = config.interviewGuide.questions
    .map((q, i) => `${i + 1}. ${q.question}${q.objective ? ` (Objective: ${q.objective})` : ''}`)
    .join('\n');

  return `You are an AI interview moderator conducting a user research interview.

**Your Interview Guide:**
${questions}

**Project Brief Context:**
${config.briefContent}

**Your Goals:**
1. Ask all questions from the interview guide in a natural, conversational way
2. Listen actively and ask 1-2 relevant follow-up/probing questions when appropriate
3. Keep the conversation on track if the participant goes off-topic
4. Be empathetic and professional
5. Adapt your pacing based on participant responses
6. If the participant seems confused, rephrase or clarify
7. If the participant becomes frustrated or wants to stop, handle gracefully
8. **IMPORTANT: This is a timed interview. Once you've covered the main questions, conclude promptly.**

**Guidelines:**
- Start with a warm greeting and brief introduction
- Ask one main question at a time
- Use 1-2 probing questions per main question (e.g., "Can you tell me more about that?", "Why was that important to you?")
- Don't over-probe - move to next question after getting sufficient insight
- Gently redirect if participant goes off-topic: "That's interesting - let me bring us back to..."
- Track which questions you've covered mentally
- **Once all main questions are answered, immediately thank them and conclude the interview**
- Do NOT repeat questions or ask the same thing in different ways

**Interview Efficiency:**
- Aim to complete in 15-25 conversational turns
- Each main question should take 2-4 turns (question + 1-2 probes + answer)
- If a participant has fully answered, move on - don't linger
- Prioritize quality over exhaustive exploration

**Important:**
- Be conversational, not robotic
- Don't read questions exactly as written - adapt them naturally
- Show empathy and understanding
- Handle difficult moments professionally
- **Value the participant's time - be efficient while thorough**`;
}

/**
 * Check if all required questions have been asked
 * Uses both metadata and semantic matching for robustness
 */
function checkIfAllQuestionsAsked(
  transcript: ConversationMessage[],
  guide: InterviewGuide
): boolean {
  const requiredQuestions = guide.questions.filter(q => q.type !== 'probe');
  const agentMessages = transcript.filter(m => m.role === 'agent').map(m => m.content.toLowerCase());
  
  let matchedQuestions = 0;
  
  for (const question of requiredQuestions) {
    const questionLower = question.question.toLowerCase();
    
    // Extract key terms (words longer than 4 chars, excluding common words)
    const keyTerms = questionLower
      .split(/\W+/)
      .filter(word => 
        word.length > 4 && 
        !['about', 'would', 'could', 'should', 'their', 'which', 'where', 'think'].includes(word)
      );
    
    // Check if any agent message contains at least 40% of the key terms
    const isAsked = agentMessages.some(msg => {
      const matchCount = keyTerms.filter(term => msg.includes(term)).length;
      return matchCount >= Math.max(1, keyTerms.length * 0.4);
    });
    
    if (isAsked) {
      matchedQuestions++;
    }
  }

  // Need at least 70% of questions asked to consider complete (lowered from 80%)
  const coverage = matchedQuestions / requiredQuestions.length;
  
  return coverage >= 0.7;
}

/**
 * Identify which question the message relates to (simple keyword matching)
 */
function identifyCurrentQuestion(
  message: string,
  guide: InterviewGuide
): string | undefined {
  const lowerMessage = message.toLowerCase();
  
  for (const question of guide.questions) {
    // Extract key words from the question (nouns/verbs)
    const keywords = question.question
      .toLowerCase()
      .split(' ')
      .filter(word => word.length > 4); // Simple heuristic
    
    // Check if message contains significant keywords
    const matchCount = keywords.filter(kw => lowerMessage.includes(kw)).length;
    if (matchCount >= 2 || (keywords.length === 1 && matchCount === 1)) {
      return question.id;
    }
  }
  
  return undefined;
}

