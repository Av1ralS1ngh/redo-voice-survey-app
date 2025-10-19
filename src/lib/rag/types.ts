// RAG Infrastructure Types

export interface RAGDocument {
  id: string;
  source_id: string;
  url: string;
  final_url?: string;
  domain: string;
  title?: string;
  author?: string;
  pub_date?: string;
  fetch_timestamp: string;
  doc_type?: 'article' | 'guideline' | 'standard' | 'case_study' | 'blog' | 'pdf' | 'template' | 'other';
  language: string;
  content_length_words?: number;
  content_length_chars?: number;
  content_hash?: string;
  source_priority_label?: 'high' | 'medium' | 'low';
  source_priority_score?: number;
  quality_score?: number;
  citation_count?: number;
  raw_filename?: string;
  processed_filename?: string;
  needs_manual_fetch: boolean;
  is_duplicate: boolean;
  duplicate_of?: string;
  manual_override: boolean;
  extraction_notes?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RAGChunk {
  id: string;
  chunk_id: string;
  source_id: string;
  chunk_index: number;
  domain: string;
  url: string;
  title?: string;
  pub_date?: string;
  chunk_text: string;
  chunk_token_estimate?: number;
  chunk_word_count?: number;
  chunk_char_count?: number;
  start_heading?: string;
  end_heading?: string;
  overlap_with_prev_words: number;
  quality_score?: number;
  source_priority_score?: number;
  embedding?: number[]; // 3072-dimensional vector
  language: string;
  content_hash?: string;
  namespace: string;
  created_at: string;
  updated_at: string;
}

export interface RetrievedChunk {
  chunk_id: string;
  source_id: string;
  domain: string;
  url: string;
  title?: string;
  pub_date?: string;
  chunk_text: string;
  chunk_index: number;
  start_heading?: string;
  quality_score?: number;
  source_priority_score?: number;
  similarity: number;
  hybrid_score?: number;
}

export interface RAGFetchLog {
  id: string;
  url: string;
  final_url?: string;
  http_status?: number;
  content_type?: string;
  content_length_bytes?: number;
  error_message?: string;
  attempts: number;
  fetch_timestamp: string;
}

export interface RAGEmbeddingLog {
  id: string;
  chunk_id: string;
  embedding_model: string;
  success: boolean;
  error_message?: string;
  attempts: number;
  token_count?: number;
  processing_time_ms?: number;
  created_at: string;
}

export interface RAGStats {
  namespace: string;
  total_documents: number;
  total_chunks: number;
  total_embeddings: number;
  avg_quality_score: number;
  avg_chunks_per_doc: number;
  domains: string[];
  high_quality_chunks: number;
}

export interface SourcePriorityMapping {
  domain: string;
  label: 'high' | 'medium' | 'low';
  score: number;
  notes?: string;
}

// Source priority mappings based on spec
export const SOURCE_PRIORITY_MAPPINGS: SourcePriorityMapping[] = [
  // High priority - authoritative standards & NN/g
  { domain: 'nngroup.com', label: 'high', score: 1.0, notes: 'Nielsen Norman Group - UX authority' },
  { domain: 'iso.org', label: 'high', score: 0.98, notes: 'ISO standards' },
  { domain: 'w3.org', label: 'high', score: 0.98, notes: 'W3C standards' },
  
  // Medium-high priority
  { domain: 'uxdesigninstitute.com', label: 'high', score: 0.85, notes: 'UX Design Institute' },
  { domain: 'interactivedomain', label: 'high', score: 0.85 },
  
  // Medium priority - reputable UX vendors & blogs
  { domain: 'maze.co', label: 'medium', score: 0.70, notes: 'Maze guides' },
  { domain: 'contentsquare.com', label: 'medium', score: 0.70, notes: 'Contentsquare guides' },
  { domain: 'looppanel.com', label: 'medium', score: 0.70, notes: 'Looppanel blog' },
  { domain: 'testlio.com', label: 'medium', score: 0.70, notes: 'Testlio blog' },
  { domain: 'uxtweak.com', label: 'medium', score: 0.70, notes: 'UXtweak blog' },
  { domain: 'digital.gov', label: 'medium', score: 0.75, notes: 'Government UX resources' },
  { domain: 'markup.io', label: 'medium', score: 0.75 },
  { domain: 'lyssna.com', label: 'medium', score: 0.70, notes: 'Lyssna guides' },
  { domain: 'turbouxr.com', label: 'medium', score: 0.70, notes: 'TurboUXR best practices' },
  
  // Medium-low priority - educational/reference
  { domain: 'sciencedirect.com', label: 'medium', score: 0.65, notes: 'Academic publisher' },
  { domain: 'wikipedia.org', label: 'medium', score: 0.60, notes: 'Wikipedia reference' },
  
  // Default for unknown domains
  { domain: '*', label: 'medium', score: 0.60, notes: 'Default for unlisted domains' }
];

export interface ChunkingConfig {
  target_tokens: number;
  min_tokens: number;
  max_tokens: number;
  overlap_tokens: number;
  prefer_heading_boundaries: boolean;
}

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  target_tokens: 400,
  min_tokens: 150,
  max_tokens: 700,
  overlap_tokens: 80, // 20% of 400
  prefer_heading_boundaries: true
};

export interface EmbeddingConfig {
  model: string;
  dimensions: number;
  batch_size: number;
  max_retries: number;
  retry_delay_ms: number;
}

export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  model: 'text-embedding-3-small', // Using 3-small (1536 dims) due to Supabase HNSW limit
  dimensions: 1536,
  batch_size: 100,
  max_retries: 3,
  retry_delay_ms: 1000
};

export interface RetrievalConfig {
  namespace: string;
  k: number;
  min_similarity: number;
  min_quality_score: number;
  similarity_weight: number;
  quality_weight: number;
  use_hybrid: boolean;
}

export const DEFAULT_RETRIEVAL_CONFIG: RetrievalConfig = {
  namespace: 'usability_testing_v1',
  k: 12,
  min_similarity: 0.7,
  min_quality_score: 0.0,
  similarity_weight: 0.7,
  quality_weight: 0.3,
  use_hybrid: true
};

export interface ScrapingConfig {
  user_agent: string;
  rate_limit_ms: number;
  timeout_ms: number;
  max_redirects: number;
  respect_robots_txt: boolean;
  use_headless_browser: boolean;
  max_retries: number;
}

export const DEFAULT_SCRAPING_CONFIG: ScrapingConfig = {
  user_agent: 'RAG-Scraper/1.0 (Usability Testing Knowledge Base)',
  rate_limit_ms: 1000, // 1 request per second
  timeout_ms: 30000,
  max_redirects: 5,
  respect_robots_txt: true,
  use_headless_browser: false, // Enable only if JS rendering needed
  max_retries: 3
};

// Doc type scoring for quality formula
export const DOC_TYPE_SCORES: Record<string, number> = {
  standard: 1.0,
  guideline: 0.9,
  template: 0.8,
  case_study: 0.7,
  article: 0.6,
  blog: 0.5,
  other: 0.4
};

// Quality score formula weights
export interface QualityScoreWeights {
  source_priority: number;
  recency: number;
  doc_type: number;
  citation: number;
}

export const DEFAULT_QUALITY_WEIGHTS: QualityScoreWeights = {
  source_priority: 0.60,
  recency: 0.20,
  doc_type: 0.10,
  citation: 0.10
};

