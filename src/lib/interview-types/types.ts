/**
 * Core TypeScript interfaces for the multi-agent interview platform
 * These types define the structure for interview type configurations
 */

// ============================================================================
// Agent Configuration
// ============================================================================

export interface AgentConfiguration {
  /** Unique identifier for the agent type */
  id: string;
  
  /** Display name of the agent */
  name: string;
  
  /** Description of what this agent does */
  description: string;
  
  /** Base system prompt that defines the agent's expertise and personality */
  systemPrompt: string;
  
  /** Template structure for research brief generation */
  briefTemplate: BriefTemplate;
  
  /** Conversation flow configuration */
  conversationFlow: ConversationFlow;
  
  /** Strategy for generating and refining questions */
  questionStrategy?: QuestionGenerationStrategy;
}

// ============================================================================
// Brief Template
// ============================================================================

export interface BriefTemplate {
  /** Sections that make up the research brief */
  sections: BriefSection[];
  
  /** Output format (markdown, json, etc.) */
  format?: 'markdown' | 'json' | 'structured';
  
  /** Whether to include examples in the brief */
  includeExamples?: boolean;
}

export interface BriefSection {
  /** Section identifier */
  id: string;
  
  /** Display title */
  title: string;
  
  /** Description of what goes in this section */
  description?: string;
  
  /** Whether this section is required */
  required: boolean;
  
  /** Expected content type */
  contentType: 'text' | 'list' | 'questions' | 'framework';
  
  /** Placeholder or example content */
  placeholder?: string;
}

// ============================================================================
// Conversation Flow
// ============================================================================

export interface ConversationFlow {
  /** How the agent opens the conversation */
  openingStyle: 'formal' | 'conversational' | 'conversational-curious' | 'expert';
  
  /** Question phrasing style */
  questionStyle: 'open-ended' | 'open-ended-exploratory' | 'structured' | 'mixed';
  
  /** Strategy for follow-up questions */
  followUpStrategy: 'deep-dive' | 'deep-dive-on-pain-points' | 'broad-coverage' | 'adaptive';
  
  /** How to close the conversation */
  closingStyle: 'summary' | 'action-oriented' | 'appreciative' | 'next-steps';
  
  /** Approximate conversation structure */
  structure?: ConversationStructure[];
}

export interface ConversationStructure {
  /** Phase of the conversation */
  phase: string;
  
  /** What to focus on in this phase */
  focus: string;
  
  /** Approximate duration (percentage of total time) */
  durationPercent?: number;
  
  /** Key topics to cover */
  keyTopics?: string[];
}

// ============================================================================
// Question Generation Strategy
// ============================================================================

export interface QuestionGenerationStrategy {
  /** Base questions that are always asked */
  baseQuestions?: string[];
  
  /** How to generate follow-ups */
  followUpLogic: 'ai-generated' | 'predefined' | 'hybrid';
  
  /** Maximum depth of follow-up questions */
  maxFollowUpDepth?: number;
  
  /** Whether to allow user-provided questions */
  allowCustomQuestions: boolean;
}

// ============================================================================
// Workflow Configuration
// ============================================================================

export interface WorkflowConfiguration {
  /** Ordered list of wizard steps */
  steps: WorkflowStep[];
  
  /** Fields required before proceeding */
  requiredFields: RequiredField[];
  
  /** Validation rules */
  validationRules?: ValidationRule[];
  
  /** Whether steps can be skipped */
  allowSkipping?: boolean;
}

export interface WorkflowStep {
  /** Step identifier */
  id: string;
  
  /** Display title */
  title: string;
  
  /** Step description */
  description?: string;
  
  /** Component to render for this step */
  component: string;
  
  /** Whether this step is required */
  required: boolean;
  
  /** Order in the workflow (1-indexed) */
  order: number;
  
  /** Conditions for showing this step */
  conditionalDisplay?: ConditionalDisplay;
}

export interface ConditionalDisplay {
  /** Field to check */
  field: string;
  
  /** Operator */
  operator: 'equals' | 'not-equals' | 'contains' | 'exists';
  
  /** Value to compare against */
  value: any;
}

export interface RequiredField {
  /** Field name */
  name: string;
  
  /** Field type */
  type: 'text' | 'url' | 'json' | 'array';
  
  /** Validation rules */
  validation?: string;
  
  /** Error message if validation fails */
  errorMessage?: string;
}

export interface ValidationRule {
  /** Field to validate */
  field: string;
  
  /** Validation function name or regex */
  rule: string;
  
  /** Error message */
  message: string;
}

// ============================================================================
// UI Configuration
// ============================================================================

export interface UIConfiguration {
  /** Custom components for this interview type */
  customComponents?: CustomComponent[];
  
  /** Features to enable in the UI */
  features: UIFeatures;
  
  /** Preview settings for the brief */
  briefPreviewSettings?: BriefPreviewSettings;
  
  /** Custom styling or theme overrides */
  theme?: UITheme;
}

export interface CustomComponent {
  /** Component identifier */
  id: string;
  
  /** Where to inject this component (step ID) */
  injectAt: string;
  
  /** Component name/path */
  component: string;
  
  /** Props to pass to the component */
  props?: Record<string, any>;
}

export interface UIFeatures {
  /** Enable URL input and scraping */
  enableUrlInput?: boolean;
  
  /** Enable pasting of existing questions */
  enableQuestionPaste?: boolean;
  
  /** Enable competitor analysis input */
  enableCompetitorAnalysis?: boolean;
  
  /** Enable file upload */
  enableFileUpload?: boolean;
  
  /** Enable real-time collaboration */
  enableCollaboration?: boolean;
  
  /** Show advanced settings */
  showAdvancedSettings?: boolean;
}

export interface BriefPreviewSettings {
  /** Show preview in sidebar or modal */
  displayMode: 'sidebar' | 'modal' | 'inline';
  
  /** Enable live updates as user types */
  liveUpdates: boolean;
  
  /** Show section navigation */
  showSectionNav: boolean;
}

export interface UITheme {
  /** Primary color */
  primaryColor?: string;
  
  /** Accent color */
  accentColor?: string;
  
  /** Custom CSS class */
  customClass?: string;
}

// ============================================================================
// Complete Interview Type Configuration
// ============================================================================

export interface InterviewTypeConfig {
  /** Agent configuration */
  agent: AgentConfiguration;
  
  /** Workflow configuration */
  workflow: WorkflowConfiguration;
  
  /** UI configuration */
  ui: UIConfiguration;
  
  /** Metadata */
  metadata?: InterviewTypeMetadata;
}

export interface InterviewTypeMetadata {
  /** Version of this configuration */
  version: string;
  
  /** When this was created */
  createdAt?: Date;
  
  /** Last update timestamp */
  updatedAt?: Date;
  
  /** Author/maintainer */
  author?: string;
  
  /** Tags for categorization */
  tags?: string[];
  
  /** Whether this type is active */
  isActive: boolean;
}

// ============================================================================
// Runtime State
// ============================================================================

export interface InterviewState {
  /** Current interview ID */
  interviewId: string;
  
  /** Interview type */
  type: string;
  
  /** Current workflow step */
  currentStep: string;
  
  /** Step completion status */
  completedSteps: string[];
  
  /** Research brief (as generated) */
  researchBrief?: ResearchBrief;
  
  /** Generated Hume system prompt */
  humeSystemPrompt?: string;
  
  /** User input data */
  inputData: Record<string, any>;
  
  /** Agent-specific state */
  agentState?: Record<string, any>;
}

export interface ResearchBrief {
  /** Objective statement */
  objective: string;
  
  /** Learning goals */
  learningGoals: string[];
  
  /** Key research questions */
  keyQuestions: string[];
  
  /** Conversation flow */
  conversationFlow: ConversationStructure[];
  
  /** Additional sections (dynamic based on agent type) */
  additionalSections?: Record<string, any>;
  
  /** Metadata */
  generatedAt: Date;
  generatedBy: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface GenerateBriefRequest {
  interviewType: string;
  userInput: Record<string, any>;
  conversationHistory?: ChatMessage[];
  context?: Record<string, any>;
}

export interface GenerateBriefResponse {
  success: boolean;
  brief?: ResearchBrief;
  error?: string;
}

export interface GenerateHumePromptRequest {
  brief: ResearchBrief;
  interviewType: string;
}

export interface GenerateHumePromptResponse {
  success: boolean;
  prompt?: string;
  error?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}
