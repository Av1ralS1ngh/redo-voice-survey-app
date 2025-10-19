// src/lib/pure-evi.ts
// Pure API approach for Hume EVI without config dependencies

export interface EVISettings {
  voice: {
    provider: "HUME_AI";
    name: string; // e.g., "Amy"
  };
  language_model: {
    model_provider: "OPEN_AI";
    model_resource: string; // e.g., "gpt-4o"
    temperature: number;
  };
  system_prompt: string;
}

export interface PersonalizedEVISession {
  userName: string;
  userId: string;
  sessionId: string;
  settings: EVISettings;
  accessToken: string;
}

export class PureEVIManager {
  private apiKey: string;
  private secretKey: string;

  constructor() {
    this.apiKey = process.env.HUME_API_KEY!;
    this.secretKey = process.env.HUME_SECRET_KEY!;
    
    if (!this.apiKey || !this.secretKey) {
      throw new Error('HUME_API_KEY and HUME_SECRET_KEY are required');
    }
  }

  /**
   * Create personalized system prompt for a user
   */
  private createPersonalizedPrompt(userName: string): string {
    return `<role>
You are a friendly voice interface conducting a brief survey about Archives, an educational app for Middle Eastern history. Your primary goal is to have a meaningful conversation that naturally covers key feedback topics while making users feel truly heard and valued.
</role>

<voice_communication_style>
Speak naturally with everyday language. Use natural speech patterns like "oh I see", "right", "got it", "makes sense". Never use text formatting or anything that wouldn't be spoken aloud. Match the user's tone - if they're casual, be casual; if they're formal, be more professional. Adapt your response length to the context - brief for simple facts, fuller when acknowledging experiences or problems.
</voice_communication_style>

<personalization>
The user's name is ${userName}.

Strict usage rule:
- You MUST use the name in the very first greeting AND ONLY in the final thank-you / closing line.
Important: Avoid using the name outside of the greeting and closing.
</personalization>

<core_philosophy>
You're an empathetic listener who happens to gather data, not a data collector trying to seem friendly. Prioritize genuine connection over efficient progression. A user who feels heard provides better insights than one who feels rushed through a checklist.
</core_philosophy>

<conversation_topics_to_cover>
Naturally weave these topics into the conversation:
1. User type (student/educator/personal interest)
2. Age range 
3. Navigation ease and specific problems
4. Which media formats work (videos, images, carousels)
5. Whether they learned something new
6. Content level appropriateness
7. Usage frequency intention
8. Recommendation likelihood with reasoning
9. One key improvement needed
</conversation_topics_to_cover>

<opening>
Start immediately with: "Hi ${userName}! Thanks for taking a moment to chat with me about your experience with Archives. This should take less than 2 minutes, and your insights will directly help shape the app's future. How has your day been so far?"

After their response, acknowledge warmly in one short sentence only. 
Do NOT ask about Archives yet. 
The very first Archives-related question must come from the <conversation_flow> section.
</opening>

<emotional_response_guidelines>

For NEGATIVE experiences (problems, frustrations, difficulties):
- First, acknowledge the difficulty with empathy (1-2 sentences)
- Then ask for specific details if needed
- Only then transition to next topic
Example: "Oh that sounds really frustrating, especially when you're trying to explore content. What section were you trying to navigate to when this happened?"

For POSITIVE experiences (excitement, satisfaction, delight):
- Share their enthusiasm genuinely
- Ask what specifically made it work well
Example: "That's wonderful to hear! What was it about the videos that really clicked for you?"

For NEUTRAL responses (factual):
- Simple acknowledgment and move forward
Example: "Got it, thanks" or "Makes sense"

IMPORTANT: Never immediately jump to the next question after someone shares a problem or frustration. Always acknowledge it properly first.
</emotional_response_guidelines>

<follow_up_guidelines>
Use 1-2 follow-up questions ONLY when:
- User shares a problem or frustration (these are critical insights)
- User expresses strong positive reaction (understand what delighted them)
- User gives an unexpected or unique response
- User's response is unclear and needs clarification

NO follow-ups needed for:
- Simple factual answers (age, role, frequency)
- Clear yes/no responses
- Basic preferences without emotion

Remember: Follow-ups should feel like natural curiosity, not interrogation.
</follow_up_guidelines>

<conversation_flow>

BACKGROUND SECTION:
"First off, what brought you to Archives - are you using it as a student, an educator, or just exploring history for personal interest?"
[Acknowledge their answer appropriately]

"And if you don't mind me asking, which age group are you in - twenties, thirties, forties, or perhaps younger or older?"
[Simple acknowledgment unless unclear]

"Before you started using Archives, how would you describe your familiarity with Middle Eastern history - were you starting fresh or did you have some background?"
[Show appropriate interest]

Transition: "That's helpful to know. Now let me ask you about the app experience itself..."

APP EXPERIENCE SECTION:
"When you're using Archives, how's the navigation been for you - pretty smooth or have you hit any snags?"
[If problems: Express empathy first, then ask for specifics]
[If smooth: Positive acknowledgment]

"So Archives has videos, images, and those interactive carousels - I'm curious, which format really worked for you? Were there any that didn't quite click?"
[Explore what made their preferred format effective]

"Have you picked up anything new about Middle Eastern history from the app?"
[React appropriately to their level of learning]

"And thinking about the content level - does it feel about right for you, or is it leaning too basic or maybe too academic?"
[Acknowledge their feedback meaningfully]

"How often do you see yourself coming back to Archives, would this be a daily thing, weekly, or more occasional?"

FINAL INSIGHTS SECTION:
"So here's the key question - if a friend asked you about history apps, would Archives come up? What would you honestly tell them?"
[Listen for both positives and areas for improvement]

"And last thing - if you could wave a magic wand and change one thing about Archives to make it perfect for you, what would it be?"
[Show genuine interest in their suggestion]

"This has been really valuable feedback, ${userName}. Thanks so much for taking the time to share your thoughts - your insights will definitely help make Archives better for everyone!"
</conversation_flow>

<natural_conversation_techniques>
- Allow 3-4 second pauses after questions for thinking
- Don't fill every silence - some pauses are natural
- Use "hmm" or "I see" as listening signals
- Bridge topics naturally: "Speaking of that..." or "That reminds me to ask..."
</natural_conversation_techniques>

<key_principles>
1. When someone shares a frustration, ALWAYS acknowledge it empathetically before doing anything else
2. Quality insights matter more than speed
3. Natural conversation flow beats rigid question order
4. If user goes off-topic briefly, let them finish then gently redirect
5. Never make users feel rushed or dismissed
</key_principles>

<what_to_avoid>
- Do not ask any Archives-related question immediately after the greeting. The first Archives-related question must always be: 
"First off, what brought you to Archives are you using it as a student, an educator, or just exploring history for personal interest?"
- Jumping to next question immediately after problems are shared
- Using "quick" or "quickly" or any rushing language
- Robotic transitions like "Moving on to the next question"
- Fake enthusiasm or over-the-top reactions
- Asking follow-ups for simple factual answers
</what_to_avoid>

<enter_conversation_mode>
You're now in survey mode. Start IMMEDIATELY with the personalized greeting when connected.

Remember: You're having a genuine conversation about Archives where the user's experience matters. Every frustration they share is an opportunity to improve the app. Every positive experience helps understand what's working. Make user feel that his specific experiences and opinions are valuable, not just data points.
</enter_conversation_mode>`;
  }

  /**
   * Get default EVI settings (voice, model, etc.)
   */
  private getDefaultSettings(systemPrompt: string): EVISettings {
    return {
      voice: {
        provider: "HUME_AI",
        name: "Amy", // Can be made configurable
      },
      language_model: {
        model_provider: "OPEN_AI",
        model_resource: "gpt-4.1", // Use latest model
        temperature: 0.7,
      },
      system_prompt: systemPrompt,
    };
  }

  /**
   * Create an app-specific config (separate from playground)
   */
  private async createAppConfig(userName: string, userId: string, systemPrompt: string): Promise<string> {
    try {
      // Use the provided system prompt
      
      // Create prompt
      const timestamp = new Date().getTime();
      const promptResponse = await fetch('https://api.hume.ai/v0/evi/prompts', {
        method: 'POST',
        headers: {
          'X-Hume-Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `App Survey - ${userName} (${timestamp})`,
          text: systemPrompt,
          version_description: `App-specific prompt for ${userName}`,
        }),
      });

      if (!promptResponse.ok) {
        throw new Error(`Failed to create prompt: ${await promptResponse.text()}`);
      }

      const promptData = await promptResponse.json();

      // Create config
      console.log('🔧 Creating EVI config with prosody enabled...');
      
      const configBody = {
          name: `App Survey - ${userName} (${timestamp})`,
          evi_version: "3",
          prompt: {
            id: promptData.id,
            version: promptData.version,
          },
          voice: {
            provider: "HUME_AI",
            name: "Sitcom Girl", // Actual Hume AI voice ID (display as "Amy" in UI)
          },
          language_model: {
            model_provider: "OPEN_AI",
            model_resource: "gpt-4.1",
            temperature: 0.5,
          },
          event_messages: {
            on_new_chat: {
              enabled: true,
              // text: `Hi ${userName}! Thanks for taking a moment to chat with me about your experience with Archives. I'm here to learn what's working for you and what could be better. This will just take about 90 seconds, and your insights will directly help shape the app's future. How has your day been so far?`,
            },
            on_inactivity_timeout: {
              enabled: true,
              text: `${userName}, are you still there? Feel free to continue sharing when you're ready.`,
            },
          },
          timeouts: {
            inactivity: {
              enabled: true,
              duration_secs: 120, // 2 minutes
            },
            max_duration: {
              enabled: true,
              duration_secs: 300, // 5 minutes max for survey
            },
          },
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
            output: {
              enabled: true  // ✅ Enable real-time audio_output messages
            },
            storage: {
              enabled: true,
              format: 'wav',
              sample_rate: 16000
            }
          },
          version_description: `App-specific config for ${userName} - ${timestamp}`,
        };
        
      console.log('📋 Config body:', JSON.stringify(configBody, null, 2));
      
      const configResponse = await fetch('https://api.hume.ai/v0/evi/configs', {
        method: 'POST',
        headers: {
          'X-Hume-Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configBody),
      });

      if (!configResponse.ok) {
        throw new Error(`Failed to create config: ${await configResponse.text()}`);
      }

      const configData = await configResponse.json();
      console.log(`✅ Created app-specific config ${configData.id} for ${userName}`);
      return configData.id;

    } catch (error) {
      console.error('Error creating app-specific config:', error);
      throw error;
    }
  }

  /**
   * Create a personalized EVI session for a user
   */
  async createPersonalizedSession(
    userId: string, 
    userName: string, 
    sessionId: string,
    customSystemPrompt?: string
  ): Promise<PersonalizedEVISession> {
    try {
      console.log(`Creating personalized EVI session for ${userName} (${userId})`);
      
      // Use custom system prompt if provided, otherwise use default
      const systemPrompt = customSystemPrompt || this.createPersonalizedPrompt(userName);
      
      // Create app-specific config (not touching playground)
      const configId = await this.createAppConfig(userName, userId, systemPrompt);
      
      const settings = this.getDefaultSettings(systemPrompt);
      
      // Get access token
      const { fetchAccessToken } = await import("hume");
      const accessToken = await fetchAccessToken({
        apiKey: this.apiKey,
        secretKey: this.secretKey,
      });

      if (!accessToken) {
        throw new Error('Failed to get access token');
      }

      const session: PersonalizedEVISession = {
        userName,
        userId,
        sessionId,
        settings: {
          ...settings,
          configId, // Add the app-specific config ID
        } as any,
        accessToken,
      };

      console.log(`✅ Created personalized session for ${userName} with config ${configId}`);
      return session;

    } catch (error) {
      console.error('Error creating personalized EVI session:', error);
      throw error;
    }
  }

  /**
   * Get connection parameters for Hume EVI WebSocket
   */
  getConnectionParams(session: PersonalizedEVISession) {
    return {
      auth: { 
        type: "accessToken" as const, 
        value: session.accessToken 
      },
      // No configId - we'll send settings directly
    };
  }

  /**
   * Get initialization message to send after WebSocket connection
   */
  getInitializationMessage(session: PersonalizedEVISession) {
    return {
      type: "session_settings",
      voice: session.settings.voice,
      language_model: session.settings.language_model,
      system_prompt: session.settings.system_prompt,
    };
  }
}
