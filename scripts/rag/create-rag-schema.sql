-- RAG Infrastructure for Usability Testing Knowledge Base
-- Uses Supabase pgvector for vector similarity search

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- TABLE: rag_documents
-- Stores source documents with metadata
-- ============================================================
CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source identification
  source_id TEXT UNIQUE NOT NULL, -- deterministic slug from URL
  url TEXT NOT NULL,
  final_url TEXT, -- after redirects
  domain TEXT NOT NULL,
  
  -- Document metadata
  title TEXT,
  author TEXT,
  pub_date TIMESTAMPTZ,
  fetch_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Content info
  doc_type TEXT CHECK (doc_type IN ('article', 'guideline', 'standard', 'case_study', 'blog', 'pdf', 'template', 'other')),
  language TEXT DEFAULT 'en',
  content_length_words INTEGER,
  content_length_chars INTEGER,
  content_hash TEXT, -- SHA256 of cleaned content
  
  -- Quality & Priority
  source_priority_label TEXT CHECK (source_priority_label IN ('high', 'medium', 'low')),
  source_priority_score NUMERIC(4,3) CHECK (source_priority_score BETWEEN 0 AND 1),
  quality_score NUMERIC(4,3) CHECK (quality_score BETWEEN 0 AND 1),
  citation_count INTEGER DEFAULT 0,
  
  -- File paths
  raw_filename TEXT,
  processed_filename TEXT,
  
  -- Flags & Notes
  needs_manual_fetch BOOLEAN DEFAULT false,
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_of TEXT, -- reference to source_id
  manual_override BOOLEAN DEFAULT false,
  extraction_notes TEXT,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_rag_documents_domain ON rag_documents(domain);
CREATE INDEX IF NOT EXISTS idx_rag_documents_quality ON rag_documents(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_rag_documents_source_priority ON rag_documents(source_priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_rag_documents_pub_date ON rag_documents(pub_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_rag_documents_content_hash ON rag_documents(content_hash);

-- ============================================================
-- TABLE: rag_chunks
-- Stores chunked content with embeddings
-- ============================================================
CREATE TABLE IF NOT EXISTS rag_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Chunk identification
  chunk_id TEXT UNIQUE NOT NULL, -- format: <source_id>__chunk_<zero-padded-index>
  source_id TEXT NOT NULL REFERENCES rag_documents(source_id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  
  -- Source metadata (denormalized for fast retrieval)
  domain TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  pub_date TIMESTAMPTZ,
  
  -- Chunk content
  chunk_text TEXT NOT NULL,
  chunk_token_estimate INTEGER,
  chunk_word_count INTEGER,
  chunk_char_count INTEGER,
  
  -- Chunk boundaries
  start_heading TEXT,
  end_heading TEXT,
  overlap_with_prev_words INTEGER DEFAULT 0,
  
  -- Quality & Priority (inherited from source)
  quality_score NUMERIC(4,3) CHECK (quality_score BETWEEN 0 AND 1),
  source_priority_score NUMERIC(4,3) CHECK (source_priority_score BETWEEN 0 AND 1),
  
  -- Vector embedding (OpenAI text-embedding-3-small = 1536 dimensions)
  -- Note: Supabase pgvector HNSW index limited to 2000 dimensions
  embedding vector(1536),
  
  -- Metadata
  language TEXT DEFAULT 'en',
  content_hash TEXT, -- SHA256 of chunk_text
  
  -- Namespace for different knowledge bases
  namespace TEXT DEFAULT 'usability_testing_v1',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for retrieval
CREATE INDEX IF NOT EXISTS idx_rag_chunks_source ON rag_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_namespace ON rag_chunks(namespace);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_quality ON rag_chunks(quality_score DESC);

-- Create HNSW index for vector similarity search (cosine distance)
-- ef_construction=64, m=16 for balanced performance
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding ON rag_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================================
-- TABLE: rag_fetch_log
-- Logs all fetch attempts for debugging
-- ============================================================
CREATE TABLE IF NOT EXISTS rag_fetch_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  final_url TEXT,
  http_status INTEGER,
  content_type TEXT,
  content_length_bytes INTEGER,
  error_message TEXT,
  attempts INTEGER DEFAULT 1,
  fetch_timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_fetch_log_url ON rag_fetch_log(url);
CREATE INDEX IF NOT EXISTS idx_rag_fetch_log_timestamp ON rag_fetch_log(fetch_timestamp DESC);

-- ============================================================
-- TABLE: rag_embedding_log
-- Logs embedding generation for debugging
-- ============================================================
CREATE TABLE IF NOT EXISTS rag_embedding_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id TEXT NOT NULL,
  embedding_model TEXT DEFAULT 'text-embedding-3-large',
  success BOOLEAN NOT NULL,
  error_message TEXT,
  attempts INTEGER DEFAULT 1,
  token_count INTEGER,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_embedding_log_chunk ON rag_embedding_log(chunk_id);
CREATE INDEX IF NOT EXISTS idx_rag_embedding_log_success ON rag_embedding_log(success);

-- ============================================================
-- RPC FUNCTIONS
-- ============================================================

-- Function: Search chunks by vector similarity
CREATE OR REPLACE FUNCTION search_rag_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 12,
  filter_namespace text DEFAULT 'usability_testing_v1',
  min_quality_score float DEFAULT 0.0
)
RETURNS TABLE (
  chunk_id text,
  source_id text,
  domain text,
  url text,
  title text,
  pub_date timestamptz,
  chunk_text text,
  chunk_index integer,
  start_heading text,
  quality_score numeric,
  source_priority_score numeric,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.chunk_id,
    c.source_id,
    c.domain,
    c.url,
    c.title,
    c.pub_date,
    c.chunk_text,
    c.chunk_index,
    c.start_heading,
    c.quality_score,
    c.source_priority_score,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM rag_chunks c
  WHERE 
    c.namespace = filter_namespace
    AND c.quality_score >= min_quality_score
    AND (1 - (c.embedding <=> query_embedding)) >= match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function: Hybrid search (vector similarity + quality reranking)
CREATE OR REPLACE FUNCTION hybrid_search_rag_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 12,
  filter_namespace text DEFAULT 'usability_testing_v1',
  similarity_weight float DEFAULT 0.7,
  quality_weight float DEFAULT 0.3
)
RETURNS TABLE (
  chunk_id text,
  source_id text,
  domain text,
  url text,
  title text,
  pub_date timestamptz,
  chunk_text text,
  chunk_index integer,
  start_heading text,
  quality_score numeric,
  source_priority_score numeric,
  similarity float,
  hybrid_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.chunk_id,
    c.source_id,
    c.domain,
    c.url,
    c.title,
    c.pub_date,
    c.chunk_text,
    c.chunk_index,
    c.start_heading,
    c.quality_score,
    c.source_priority_score,
    1 - (c.embedding <=> query_embedding) AS similarity,
    (similarity_weight * (1 - (c.embedding <=> query_embedding))) + 
    (quality_weight * c.quality_score::float) AS hybrid_score
  FROM rag_chunks c
  WHERE c.namespace = filter_namespace
  ORDER BY hybrid_score DESC
  LIMIT match_count;
END;
$$;

-- Function: Get chunks by source document
CREATE OR REPLACE FUNCTION get_chunks_by_source(
  p_source_id text,
  p_namespace text DEFAULT 'usability_testing_v1'
)
RETURNS TABLE (
  chunk_id text,
  chunk_index integer,
  chunk_text text,
  start_heading text,
  chunk_word_count integer,
  quality_score numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.chunk_id,
    c.chunk_index,
    c.chunk_text,
    c.start_heading,
    c.chunk_word_count,
    c.quality_score
  FROM rag_chunks c
  WHERE 
    c.source_id = p_source_id
    AND c.namespace = p_namespace
  ORDER BY c.chunk_index;
END;
$$;

-- Function: Get statistics for namespace
CREATE OR REPLACE FUNCTION get_rag_stats(
  p_namespace text DEFAULT 'usability_testing_v1'
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'namespace', p_namespace,
    'total_documents', (SELECT COUNT(*) FROM rag_documents),
    'total_chunks', (SELECT COUNT(*) FROM rag_chunks WHERE namespace = p_namespace),
    'total_embeddings', (SELECT COUNT(*) FROM rag_chunks WHERE namespace = p_namespace AND embedding IS NOT NULL),
    'avg_quality_score', (SELECT AVG(quality_score) FROM rag_chunks WHERE namespace = p_namespace),
    'avg_chunks_per_doc', (
      SELECT AVG(chunk_count)::numeric(10,2)
      FROM (
        SELECT COUNT(*) as chunk_count
        FROM rag_chunks
        WHERE namespace = p_namespace
        GROUP BY source_id
      ) sub
    ),
    'domains', (
      SELECT json_agg(DISTINCT domain ORDER BY domain)
      FROM rag_documents
    ),
    'high_quality_chunks', (
      SELECT COUNT(*)
      FROM rag_chunks
      WHERE namespace = p_namespace AND quality_score >= 0.8
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- ============================================================
-- RLS POLICIES (Row Level Security)
-- ============================================================

-- Enable RLS
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_fetch_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_embedding_log ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
CREATE POLICY "Service role has full access to rag_documents"
  ON rag_documents FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to rag_chunks"
  ON rag_chunks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to rag_fetch_log"
  ON rag_fetch_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to rag_embedding_log"
  ON rag_embedding_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read (for app queries)
CREATE POLICY "Authenticated users can read rag_chunks"
  ON rag_chunks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read rag_documents"
  ON rag_documents FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE rag_documents IS 'Source documents for RAG knowledge base with quality scoring';
COMMENT ON TABLE rag_chunks IS 'Chunked content with vector embeddings for semantic search';
COMMENT ON TABLE rag_fetch_log IS 'Audit log of all fetch attempts for debugging';
COMMENT ON TABLE rag_embedding_log IS 'Audit log of embedding generation for debugging';

COMMENT ON FUNCTION search_rag_chunks IS 'Vector similarity search with quality threshold';
COMMENT ON FUNCTION hybrid_search_rag_chunks IS 'Hybrid search combining vector similarity and quality score';
COMMENT ON FUNCTION get_chunks_by_source IS 'Get all chunks for a specific source document';
COMMENT ON FUNCTION get_rag_stats IS 'Get statistics for a namespace';

