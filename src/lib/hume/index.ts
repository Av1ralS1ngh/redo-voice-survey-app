/**
 * Hume Integration - Public API
 * Centralized exports for Hume AI integration
 */

// Prompt Generator
export {
  generateHumePrompt,
  generatePromptForHumeAPI,
  validatePrompt,
} from './prompt-generator';

// Config Builder
export {
  buildHumeConfig,
  createHumeConfigWithPrompt,
  getHumeAccessToken,
  getConnectionParams,
  getDefaultSettings,
  DEFAULT_VOICE_SETTINGS,
  DEFAULT_LANGUAGE_MODEL_SETTINGS,
} from './config-builder';

// Types
export type {
  VoiceSettings,
  LanguageModelSettings,
  HumeEVIConfig,
} from './config-builder';
