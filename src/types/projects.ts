export interface Project {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  category: ProjectCategory;
  createdAt: string;
  updatedAt: string;
  userId: string;
  status: 'active' | 'archived' | 'draft';
  
  // Metadata
  interviewCount: number;
  responseCount: number;
  responseRate: number; // Percentage (0-100)
  
  // Optional settings
  settings?: {
    allowAnonymous?: boolean;
    requireApproval?: boolean;
    maxResponses?: number;
    studyType?: 'research_study' | (string & {});
  };
}

export interface Interview {
  id: string;
  // projectId is now optional — interviews are top-level and may not belong to a project
  projectId?: string | null;
  name: string;
  description?: string;
  category: InterviewCategory;
  status: 'draft' | 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
  
  // Interview configuration
  questions?: InterviewQuestion[];
  estimatedDuration?: number; // in minutes
  
  // AI-generated artifacts
  researchBrief?: any; // Structured research brief (JSONB)
  interviewGuide?: string; // Stakeholder-ready interview guide (markdown)
  humeSystemPrompt?: string; // Generated Hume AI prompt (TEXT)
  briefMetadata?: any;
  workflowState?: any;
  
  // Response tracking
  responseCount: number;
  targetResponseCount?: number;
  
  // Share settings
  shareUrl?: string;
  isPublic: boolean;
}

export interface InterviewQuestion {
  id: string;
  type: 'open_ended' | 'multiple_choice' | 'rating' | 'yes_no';
  question: string;
  required: boolean;
  order: number;
  options?: string[]; // For multiple choice
  scale?: {
    min: number;
    max: number;
    labels?: string[];
  }; // For rating questions
}

export type ProjectCategory =
  | 'custom'
  | 'nps'
  | 'lost_deals'
  | 'won_deals'
  | 'churn'
  | 'renewal'
  | 'product_feedback'
  | 'usability_testing'
  | 'customer_satisfaction'
  | 'concept_testing'
  | 'research_study';

export type InterviewCategory =
  | 'nps'
  | 'won_deals'
  | 'lost_deals'
  | 'churn'
  | 'renewal'
  | 'product_feedback'
  | 'usability_testing'
  | 'customer_satisfaction'
  | 'concept_testing'
  | 'custom';

export interface CreateProjectRequest {
  name: string;
  description?: string;
  category: ProjectCategory;
}

export interface CreateInterviewRequest {
  // projectId is optional; interviews can be created at top-level
  projectId?: string;
  name: string;
  description?: string;
  category: InterviewCategory;
  questions?: InterviewQuestion[];
  targetResponseCount?: number;
}

export interface ProjectStats {
  totalProjects: number;
  totalInterviews: number;
  totalResponses: number;
  averageResponseRate: number;
}

// UI Component Props
export interface ProjectCardProps {
  project: Project;
  onUpdate: () => void;
}

export interface NewInterviewModalProps {
  projects: Project[];
  selectedProjectId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export interface EmptyProjectsStateProps {
  onNewInterview: () => void;
}
