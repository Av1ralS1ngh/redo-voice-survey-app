// Verify RAG Infrastructure Setup
// Tests that Supabase pgvector schema is working correctly

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiKey = process.env.OPENAI_API_KEY!;

if (!supabaseUrl || !supabaseKey || !openaiKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });

async function verify() {
  console.log('🧪 RAG INFRASTRUCTURE VERIFICATION\n');
  console.log('='.repeat(60));
  
  let allPassed = true;
  
  // Test 1: Check tables exist
  console.log('\n1️⃣  Checking database tables...');
  try {
    const tables = ['rag_documents', 'rag_chunks', 'rag_fetch_log', 'rag_embedding_log'];
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      if (error && !error.message.includes('0 rows')) {
        console.error(`   ❌ Table ${table}: ${error.message}`);
        allPassed = false;
      } else {
        console.log(`   ✅ Table ${table} exists`);
      }
    }
  } catch (error: any) {
    console.error(`   ❌ Error checking tables: ${error.message}`);
    allPassed = false;
  }
  
  // Test 2: Insert test document
  console.log('\n2️⃣  Inserting test document...');
  try {
    const testDoc = {
      source_id: 'test_doc_001',
      url: 'https://www.nngroup.com/articles/usability-testing-101/',
      domain: 'nngroup.com',
      title: 'Usability Testing 101',
      doc_type: 'article',
      language: 'en',
      source_priority_label: 'high',
      source_priority_score: 1.0,
      quality_score: 0.95,
      content_length_words: 1500,
      needs_manual_fetch: false,
      is_duplicate: false,
      manual_override: false
    };
    
    const { data, error } = await supabase
      .from('rag_documents')
      .upsert(testDoc, { onConflict: 'source_id' })
      .select();
    
    if (error) {
      console.error(`   ❌ Insert failed: ${error.message}`);
      allPassed = false;
    } else {
      console.log(`   ✅ Test document inserted: ${data[0].id}`);
    }
  } catch (error: any) {
    console.error(`   ❌ Error inserting document: ${error.message}`);
    allPassed = false;
  }
  
  // Test 3: Generate embedding
  console.log('\n3️⃣  Testing embedding generation...');
  let testEmbedding: number[] = [];
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'Usability testing is a method to evaluate user experience',
      dimensions: 1536
    });
    
    testEmbedding = response.data[0].embedding;
    console.log(`   ✅ Embedding generated: ${testEmbedding.length} dimensions`);
    
    if (testEmbedding.length !== 1536) {
      console.error(`   ❌ Wrong dimensions: expected 1536, got ${testEmbedding.length}`);
      allPassed = false;
    }
  } catch (error: any) {
    console.error(`   ❌ Embedding generation failed: ${error.message}`);
    allPassed = false;
  }
  
  // Test 4: Insert test chunk with embedding
  console.log('\n4️⃣  Inserting test chunk with embedding...');
  try {
    const testChunk = {
      chunk_id: 'test_doc_001__chunk_0001',
      source_id: 'test_doc_001',
      chunk_index: 0,
      domain: 'nngroup.com',
      url: 'https://www.nngroup.com/articles/usability-testing-101/',
      title: 'Usability Testing 101',
      chunk_text: 'Usability testing is a technique used in user-centered interaction design to evaluate a product by testing it on users. This can be seen as an irreplaceable usability practice, since it gives direct input on how real users use the system.',
      chunk_token_estimate: 50,
      chunk_word_count: 45,
      chunk_char_count: 289,
      start_heading: 'What is Usability Testing?',
      quality_score: 0.95,
      source_priority_score: 1.0,
      embedding: testEmbedding,
      language: 'en',
      namespace: 'usability_testing_v1'
    };
    
    const { data, error } = await supabase
      .from('rag_chunks')
      .upsert(testChunk, { onConflict: 'chunk_id' })
      .select();
    
    if (error) {
      console.error(`   ❌ Insert failed: ${error.message}`);
      allPassed = false;
    } else {
      console.log(`   ✅ Test chunk inserted: ${data[0].id}`);
    }
  } catch (error: any) {
    console.error(`   ❌ Error inserting chunk: ${error.message}`);
    allPassed = false;
  }
  
  // Test 5: Test vector search RPC
  console.log('\n5️⃣  Testing vector search RPC...');
  try {
    // Generate query embedding
    const queryResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'What is usability testing?',
      dimensions: 1536
    });
    
    const queryEmbedding = queryResponse.data[0].embedding;
    
    // Call search function
    const { data, error } = await supabase.rpc('search_rag_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 5,
      filter_namespace: 'usability_testing_v1',
      min_quality_score: 0.0
    });
    
    if (error) {
      console.error(`   ❌ Search failed: ${error.message}`);
      allPassed = false;
    } else {
      console.log(`   ✅ Search returned ${data.length} results`);
      if (data.length > 0) {
        console.log(`      Top result:`);
        console.log(`        Similarity: ${(data[0].similarity * 100).toFixed(1)}%`);
        console.log(`        Quality: ${(data[0].quality_score * 100).toFixed(1)}%`);
        console.log(`        Text: "${data[0].chunk_text.substring(0, 60)}..."`);
      }
    }
  } catch (error: any) {
    console.error(`   ❌ Error in vector search: ${error.message}`);
    allPassed = false;
  }
  
  // Test 6: Test hybrid search RPC
  console.log('\n6️⃣  Testing hybrid search RPC...');
  try {
    const queryResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'user testing methodology',
      dimensions: 1536
    });
    
    const queryEmbedding = queryResponse.data[0].embedding;
    
    const { data, error } = await supabase.rpc('hybrid_search_rag_chunks', {
      query_embedding: queryEmbedding,
      match_count: 5,
      filter_namespace: 'usability_testing_v1',
      similarity_weight: 0.7,
      quality_weight: 0.3
    });
    
    if (error) {
      console.error(`   ❌ Hybrid search failed: ${error.message}`);
      allPassed = false;
    } else {
      console.log(`   ✅ Hybrid search returned ${data.length} results`);
      if (data.length > 0) {
        console.log(`      Top result:`);
        console.log(`        Hybrid score: ${data[0].hybrid_score.toFixed(3)}`);
        console.log(`        Similarity: ${(data[0].similarity * 100).toFixed(1)}%`);
        console.log(`        Quality: ${(data[0].quality_score * 100).toFixed(1)}%`);
      }
    }
  } catch (error: any) {
    console.error(`   ❌ Error in hybrid search: ${error.message}`);
    allPassed = false;
  }
  
  // Test 7: Get RAG stats
  console.log('\n7️⃣  Testing get_rag_stats RPC...');
  try {
    const { data, error } = await supabase.rpc('get_rag_stats', {
      p_namespace: 'usability_testing_v1'
    });
    
    if (error) {
      console.error(`   ❌ Stats failed: ${error.message}`);
      allPassed = false;
    } else {
      console.log(`   ✅ Stats retrieved:`);
      console.log(`      Total documents: ${data.total_documents}`);
      console.log(`      Total chunks: ${data.total_chunks}`);
      console.log(`      Total embeddings: ${data.total_embeddings}`);
      console.log(`      Avg quality score: ${data.avg_quality_score?.toFixed(3) || 'N/A'}`);
      console.log(`      High quality chunks: ${data.high_quality_chunks}`);
    }
  } catch (error: any) {
    console.error(`   ❌ Error getting stats: ${error.message}`);
    allPassed = false;
  }
  
  // Test 8: Test TypeScript retrieval service
  console.log('\n8️⃣  Testing TypeScript retrieval service...');
  try {
    // Dynamic import
    const { searchRAGChunks } = await import('../../src/lib/rag/retrieval-service.js');
    
    const results = await searchRAGChunks('usability testing best practices', {
      namespace: 'usability_testing_v1',
      k: 3,
      use_hybrid: true
    });
    
    console.log(`   ✅ Retrieval service returned ${results.length} results`);
    if (results.length > 0) {
      console.log(`      Top result similarity: ${(results[0].similarity * 100).toFixed(1)}%`);
    }
  } catch (error: any) {
    console.error(`   ❌ Retrieval service error: ${error.message}`);
    allPassed = false;
  }
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - RAG Infrastructure is working!\n');
    console.log('Next steps:');
    console.log('  1. Run the ingestion pipeline to scrape and process URLs');
    console.log('  2. Verify with real queries after ingestion');
    console.log('  3. Integrate with Usability Testing agent workflow\n');
  } else {
    console.log('❌ SOME TESTS FAILED - Check errors above\n');
    process.exit(1);
  }
}

verify().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

