export interface ResearchStudy {
  id: string;
  projectId: string;
  projectName: string;
  projectSlug?: string;
  projectDescription?: string | null;
  interviewId?: string | null;
  interviewName?: string | null;
  interviewStatus?: string | null;
  version: number;
  summary: string;
  content: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
