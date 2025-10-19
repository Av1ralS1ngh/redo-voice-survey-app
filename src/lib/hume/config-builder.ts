/**
 * Hume EVI Config Builder
 * Builds complete Hume EVI configurations with prompts
 * 
 * Integration: Works with existing PureEVIManager and fetchAccessToken pattern
 */

import { fetchAccessToken } from 'hume';

/**
 * Voice settings for Hume EVI
 */
export interface VoiceSettings {
  provider?: 'HUME_AI' | 'PLAYHT' | 'ELEVEN_LABS';
  name?: string; // Hume AI voice ID like "Sitcom Girl" (not display name)
}

/**
 * Language model settings
 */
export interface LanguageModelSettings {
  model_provider?: 'OPEN_AI' | 'ANTHROPIC' | 'FIREWORKS';
  model_resource?: string; // e.g., "gpt-4.1", "claude-3-5-sonnet-20241022"
  temperature?: number;
}

/**
 * Complete Hume EVI configuration
 */
export interface HumeEVIConfig {
  name: string;
  evi_version: string;
  prompt: {
    id: string;
    version: number;
  };
  voice: {
    provider: string;
    name: string;
  };
  language_model: {
    model_provider: string;
    model_resource: string;
    temperature: number;
  };
  event_messages?: {
    on_new_chat?: {
      enabled: boolean;
      text?: string;
    };
  };
  audio?: {
    enabled?: boolean;
    output?: {
      enabled?: boolean;
    };
  };
  tools?: any[];
  builtin_tools?: any[];
}

/**
 * Build Hume EVI config from prompt ID
 */
export function buildHumeConfig(
  promptId: string,
  promptVersion: number,
  options: {
    name: string;
    voice?: VoiceSettings;
    languageModel?: LanguageModelSettings;
    enableOnNewChat?: boolean;
    onNewChatMessage?: string;
  }
): HumeEVIConfig {
  const config: HumeEVIConfig = {
    name: options.name,
    evi_version: '3',
    prompt: {
      id: promptId,
      version: promptVersion,
    },
    voice: {
      provider: options.voice?.provider || 'HUME_AI',
      name: options.voice?.name || 'Sitcom Girl', // Default to Hume AI voice ID
    },
    language_model: {
      model_provider: options.languageModel?.model_provider || 'OPEN_AI',
      model_resource: options.languageModel?.model_resource || 'gpt-4.1',
      temperature: options.languageModel?.temperature ?? 0.5,
    },
    // Enable audio output so AI can speak
    audio: {
      enabled: true,
      output: {
        enabled: true,
      },
    },
  };

  // Add event messages if specified
  if (options.enableOnNewChat) {
    config.event_messages = {
      on_new_chat: {
        enabled: true,
        ...(options.onNewChatMessage && { text: options.onNewChatMessage }),
      },
    };
  }

  return config;
}

/**
 * Create a complete Hume EVI config via API
 * This integrates with the existing Hume API pattern
 */
export async function createHumeConfigWithPrompt(
  promptText: string,
  options: {
    name: string;
    userName?: string;
    voice?: VoiceSettings;
    languageModel?: LanguageModelSettings;
    enableOnNewChat?: boolean;
    onNewChatMessage?: string;
  }
): Promise<{
  configId: string;
  promptId: string;
  config: HumeEVIConfig;
}> {
  const apiKey = process.env.HUME_API_KEY!;

  if (!apiKey) {
    throw new Error('HUME_API_KEY is required');
  }

  // Step 1: Create the prompt
  const timestamp = new Date().getTime();
  const promptResponse = await fetch('https://api.hume.ai/v0/evi/prompts', {
    method: 'POST',
    headers: {
      'X-Hume-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `${options.name} (${timestamp})`,
      text: promptText,
      version_description: `AI-generated prompt for ${options.name}`,
    }),
  });

  if (!promptResponse.ok) {
    throw new Error(`Failed to create prompt: ${await promptResponse.text()}`);
  }

  const promptData = await promptResponse.json();

  // Step 2: Build the config
  const config = buildHumeConfig(promptData.id, promptData.version, {
    ...options,
    name: `${options.name} (${timestamp})`,
  });

  // Step 3: Create the config
  const configResponse = await fetch('https://api.hume.ai/v0/evi/configs', {
    method: 'POST',
    headers: {
      'X-Hume-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!configResponse.ok) {
    throw new Error(`Failed to create config: ${await configResponse.text()}`);
  }

  const configData = await configResponse.json();

  return {
    configId: configData.id,
    promptId: promptData.id,
    config: configData,
  };
}

/**
 * Get access token for Hume WebSocket connection
 * Follows the existing pattern from getHumeAccessToken.ts
 */
export async function getHumeAccessToken(): Promise<string> {
  const apiKey = process.env.HUME_API_KEY;
  const secretKey = process.env.HUME_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error('Missing HUME_API_KEY or HUME_SECRET_KEY');
  }

  const accessToken = await fetchAccessToken({
    apiKey,
    secretKey,
  });

  if (!accessToken || accessToken === 'undefined') {
    throw new Error('Unable to get access token from Hume API');
  }

  return accessToken;
}

/**
 * Get connection parameters for Hume EVI WebSocket
 * Compatible with @humeai/voice-react
 */
export function getConnectionParams(
  accessToken: string,
  configId: string
): {
  auth: { type: 'accessToken'; value: string };
  configId: string;
} {
  return {
    auth: {
      type: 'accessToken',
      value: accessToken,
    },
    configId,
  };
}

/**
 * Default voice and model settings
 * Matches the existing pure-evi.ts defaults
 */
export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  provider: 'HUME_AI',
  name: 'Sitcom Girl', // Actual Hume AI voice ID (can display as "Amy" in UI)
};

export const DEFAULT_LANGUAGE_MODEL_SETTINGS: LanguageModelSettings = {
  model_provider: 'OPEN_AI',
  model_resource: 'gpt-4.1',
  temperature: 0.5,
};

/**
 * Helper to get default settings with custom overrides
 */
export function getDefaultSettings(overrides?: {
  voice?: Partial<VoiceSettings>;
  languageModel?: Partial<LanguageModelSettings>;
}): {
  voice: VoiceSettings;
  languageModel: LanguageModelSettings;
} {
  return {
    voice: {
      ...DEFAULT_VOICE_SETTINGS,
      ...overrides?.voice,
    },
    languageModel: {
      ...DEFAULT_LANGUAGE_MODEL_SETTINGS,
      ...overrides?.languageModel,
    },
  };
}
