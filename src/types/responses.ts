export interface ConversationResponse {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  status: 'completed' | 'processing' | 'failed';
  quality: 'high' | 'medium' | 'low';
  date: string;
  duration: number; // in seconds
  turnCount: number;
  audioUrl?: string;
  transcript?: ConversationTurn[];
  attributes?: string[];
  metadata?: {
    userType?: string;
    ageRange?: string;
    keyImprovement?: string;
    contentLevel?: string;
    preferredMedia?: string;
    [key: string]: any;
  };
}

export interface ConversationTurn {
  id: string;
  turnNumber: number;
  speaker: 'user' | 'agent';
  message: string;
  timestamp: number; // seconds from start
  duration?: number; // duration of this turn in seconds
  audioUrl?: string; // individual turn audio if available
  emotions?: any;
  prosody?: any;
}

export interface ResponsesFilters {
  status: string;
  quality: string;
  dateRange: string;
  attributes: string[];
}

export interface BulkAction {
  id: string;
  label: string;
  icon: string;
  action: (selectedIds: string[]) => Promise<void>;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
}

export interface TranscriptHighlight {
  turnId: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
}
