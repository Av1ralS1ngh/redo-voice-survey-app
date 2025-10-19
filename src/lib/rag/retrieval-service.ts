// RAG Retrieval Service
// Handles vector similarity search against Supabase pgvector

import { supabaseService } from '../supabase';
import OpenAI from 'openai';
import type { 
  RetrievedChunk, 
  RetrievalConfig,
  RAGStats 
} from './types';
import { DEFAULT_RETRIEVAL_CONFIG } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

/**
 * Generate embedding for a query string
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small', // Using 3-small (1536 dims) due to Supabase HNSW limit
      input: query,
      dimensions: 1536
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating query embedding:', error);
    throw new Error(`Failed to generate embedding: ${error}`);
  }
}

/**
 * Search RAG chunks using vector similarity
 */
export async function searchRAGChunks(
  query: string,
  config: Partial<RetrievalConfig> = {}
): Promise<RetrievedChunk[]> {
  const finalConfig = { ...DEFAULT_RETRIEVAL_CONFIG, ...config };
  
  try {
    console.log(`🔍 Searching RAG chunks for: "${query.substring(0, 50)}..."`);
    console.log(`   Namespace: ${finalConfig.namespace}`);
    console.log(`   K: ${finalConfig.k}, Min similarity: ${finalConfig.min_similarity}`);
    
    // Step 1: Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(query);
    
    // Step 2: Choose search method (hybrid or pure vector)
    const searchFunction = finalConfig.use_hybrid 
      ? 'hybrid_search_rag_chunks' 
      : 'search_rag_chunks';
    
    // Step 3: Execute search
    const { data, error } = await supabaseService()
      .rpc(searchFunction, {
        query_embedding: queryEmbedding,
        match_count: finalConfig.k,
        filter_namespace: finalConfig.namespace,
        ...(finalConfig.use_hybrid 
          ? {
              similarity_weight: finalConfig.similarity_weight,
              quality_weight: finalConfig.quality_weight
            }
          : {
              match_threshold: finalConfig.min_similarity,
              min_quality_score: finalConfig.min_quality_score
            }
        )
      });
    
    if (error) {
      console.error('Error searching RAG chunks:', error);
      throw error;
    }
    
    console.log(`✅ Found ${data?.length || 0} relevant chunks`);
    
    if (data && data.length > 0) {
      console.log('   Top result:');
      console.log(`     Domain: ${data[0].domain}`);
      console.log(`     Title: ${data[0].title || 'N/A'}`);
      console.log(`     Similarity: ${(data[0].similarity * 100).toFixed(1)}%`);
      console.log(`     Quality: ${(data[0].quality_score * 100).toFixed(1)}%`);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in searchRAGChunks:', error);
    return [];
  }
}

/**
 * Get multiple search results for different queries
 * Useful for gathering diverse context
 */
export async function multiQuerySearch(
  queries: string[],
  config: Partial<RetrievalConfig> = {}
): Promise<RetrievedChunk[]> {
  const finalConfig = { ...DEFAULT_RETRIEVAL_CONFIG, ...config };
  
  console.log(`🔍 Multi-query search with ${queries.length} queries`);
  
  // Execute searches in parallel
  const results = await Promise.all(
    queries.map(q => searchRAGChunks(q, { 
      ...finalConfig, 
      k: Math.ceil(finalConfig.k / queries.length) 
    }))
  );
  
  // Flatten and deduplicate by chunk_id
  const allChunks = results.flat();
  const uniqueChunks = new Map<string, RetrievedChunk>();
  
  for (const chunk of allChunks) {
    if (!uniqueChunks.has(chunk.chunk_id)) {
      uniqueChunks.set(chunk.chunk_id, chunk);
    } else {
      // Keep the one with higher similarity
      const existing = uniqueChunks.get(chunk.chunk_id)!;
      if (chunk.similarity > existing.similarity) {
        uniqueChunks.set(chunk.chunk_id, chunk);
      }
    }
  }
  
  // Sort by similarity (or hybrid_score if available) and limit
  const sorted = Array.from(uniqueChunks.values())
    .sort((a, b) => {
      const scoreA = a.hybrid_score || a.similarity;
      const scoreB = b.hybrid_score || b.similarity;
      return scoreB - scoreA;
    })
    .slice(0, finalConfig.k);
  
  console.log(`✅ Deduplicated to ${sorted.length} unique chunks`);
  
  return sorted;
}

/**
 * Get chunks by source document ID
 */
export async function getChunksBySource(
  sourceId: string,
  namespace: string = 'usability_testing_v1'
): Promise<any[]> {
  try {
    const { data, error } = await supabaseService()
      .rpc('get_chunks_by_source', {
        p_source_id: sourceId,
        p_namespace: namespace
      });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting chunks by source:', error);
    return [];
  }
}

/**
 * Get RAG statistics for a namespace
 */
export async function getRAGStats(
  namespace: string = 'usability_testing_v1'
): Promise<RAGStats | null> {
  try {
    const { data, error } = await supabaseService()
      .rpc('get_rag_stats', {
        p_namespace: namespace
      });
    
    if (error) throw error;
    return data as RAGStats;
  } catch (error) {
    console.error('Error getting RAG stats:', error);
    return null;
  }
}

/**
 * Format retrieved chunks for LLM context
 */
export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return 'No relevant context found.';
  
  return chunks.map((chunk, idx) => {
    const source = chunk.title 
      ? `${chunk.domain} - "${chunk.title}"` 
      : chunk.domain;
    
    const heading = chunk.start_heading 
      ? `\n## ${chunk.start_heading}\n` 
      : '\n';
    
    return `[Source ${idx + 1}] ${source}${heading}${chunk.chunk_text}`;
  }).join('\n\n---\n\n');
}

/**
 * Get context for usability testing research brief generation
 * Combines multiple queries to get comprehensive coverage
 */
export async function getUsabilityTestingContext(
  projectType: string,
  userInput?: string
): Promise<RetrievedChunk[]> {
  // Build query set based on project type and user input
  const queries = [
    `usability testing methodology for ${projectType}`,
    'usability testing best practices',
    'think-aloud protocol',
    'task-based usability testing'
  ];
  
  if (userInput) {
    queries.unshift(userInput); // User's specific needs first
  }
  
  return multiQuerySearch(queries, {
    namespace: 'usability_testing_v1',
    k: 15,
    use_hybrid: true,
    min_quality_score: 0.6
  });
}

/**
 * Verify RAG system is working
 * Returns test results for common queries
 */
export async function verifyRAGSystem(): Promise<{
  success: boolean;
  tests: Array<{
    query: string;
    results_count: number;
    top_quality: number;
    top_similarity: number;
  }>;
  stats: RAGStats | null;
}> {
  const testQueries = [
    'think-aloud protocol',
    '5-user testing',
    'ISO 9241-11',
    'remote usability testing',
    'task scenarios'
  ];
  
  const tests = await Promise.all(
    testQueries.map(async (query) => {
      const results = await searchRAGChunks(query, { k: 5 });
      return {
        query,
        results_count: results.length,
        top_quality: results[0]?.quality_score || 0,
        top_similarity: results[0]?.similarity || 0
      };
    })
  );
  
  const stats = await getRAGStats();
  
  const success = tests.every(t => 
    t.results_count > 0 && 
    t.top_quality >= 0.7 && 
    t.top_similarity >= 0.7
  );
  
  return { success, tests, stats };
}

