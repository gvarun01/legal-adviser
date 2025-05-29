import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ConversationChain } from "langchain/chains";
import { ConversationBufferWindowMemory } from "langchain/memory";
import { createLLMInstance } from './langchain-api-services';
import { toast } from '@/components/ui/sonner';

interface ClauseChunk {
  content: string;
  metadata: {
    chunkIndex: number;
    source: string;
    type: 'simplified' | 'risky_terms' | 'government_articles' | 'original';
    relevanceScore?: number;
  };
}

interface VectorStoreData {
  vectorStore: MemoryVectorStore;
  chunks: ClauseChunk[];
  embeddings: GoogleGenerativeAIEmbeddings;
}

// Cache for vector stores to avoid re-creating for the same clause
const vectorStoreCache = new Map<string, VectorStoreData>();

// Enhanced text splitter configuration
const createTextSplitter = () => {
  return new RecursiveCharacterTextSplitter({
    chunkSize: 200, // Smaller chunks for more precise retrieval
    chunkOverlap: 50, // Overlap to maintain context
    separators: [
      '\n\n', // Paragraph breaks
      '\n', // Line breaks
      '. ', // Sentence breaks
      ', ', // Clause breaks
      ' ', // Word breaks
    ],
  });
};

// Create embeddings instance
async function createEmbeddings(apiKey: string): Promise<GoogleGenerativeAIEmbeddings> {
  return new GoogleGenerativeAIEmbeddings({
    apiKey,
    model: 'embedding-001', // Google's text embedding model
  });
}

// Generate a cache key for the clause and its analysis
function generateCacheKey(originalClause: string, analysisData?: any): string {
  const baseKey = btoa(originalClause.slice(0, 100)); // Use first 100 chars as base
  const analysisKey = analysisData ? btoa(JSON.stringify(analysisData).slice(0, 50)) : '';
  return `${baseKey}_${analysisKey}`;
}

// Create and populate vector store with clause content and analysis
export async function createClauseVectorStore(
  originalClause: string,
  analysisData: {
    simplifiedExplanation: string;
    riskyTerms: Array<{ term: string; severity: string; explanation: string; }>;
    governmentArticles: Array<{ title: string; url: string; relevance: string; }>;
  },
  apiKey: string
): Promise<VectorStoreData> {
  const cacheKey = generateCacheKey(originalClause, analysisData);
  
  // Check cache first
  if (vectorStoreCache.has(cacheKey)) {
    console.log('📚 Using cached vector store for clause');
    return vectorStoreCache.get(cacheKey)!;
  }

  try {
    console.log('🔧 Creating new vector store for clause');
    
    const embeddings = await createEmbeddings(apiKey);
    const textSplitter = createTextSplitter();

    // Prepare all content for vectorization
    const documents: Document[] = [];
    const chunks: ClauseChunk[] = [];

    // 1. Original clause chunks
    const originalChunks = await textSplitter.splitText(originalClause);
    originalChunks.forEach((chunk, index) => {
      const chunkData: ClauseChunk = {
        content: chunk,
        metadata: {
          chunkIndex: index,
          source: 'original_clause',
          type: 'original'
        }
      };
      chunks.push(chunkData);
      documents.push(new Document({
        pageContent: chunk,
        metadata: chunkData.metadata
      }));
    });

    // 2. Simplified explanation chunks
    if (analysisData.simplifiedExplanation) {
      const simplifiedChunks = await textSplitter.splitText(analysisData.simplifiedExplanation);
      simplifiedChunks.forEach((chunk, index) => {
        const chunkData: ClauseChunk = {
          content: chunk,
          metadata: {
            chunkIndex: index,
            source: 'simplified_explanation',
            type: 'simplified'
          }
        };
        chunks.push(chunkData);
        documents.push(new Document({
          pageContent: chunk,
          metadata: chunkData.metadata
        }));
      });
    }

    // 3. Risky terms with context
    analysisData.riskyTerms.forEach((term, index) => {
      const termContent = `Risky Term: "${term.term}" (${term.severity} severity) - ${term.explanation}`;
      const chunkData: ClauseChunk = {
        content: termContent,
        metadata: {
          chunkIndex: index,
          source: `risky_term_${term.term}`,
          type: 'risky_terms'
        }
      };
      chunks.push(chunkData);
      documents.push(new Document({
        pageContent: termContent,
        metadata: chunkData.metadata
      }));
    });

    // 4. Government articles context
    analysisData.governmentArticles.forEach((article, index) => {
      const articleContent = `Legal Article: "${article.title}" - ${article.relevance}`;
      const chunkData: ClauseChunk = {
        content: articleContent,
        metadata: {
          chunkIndex: index,
          source: `gov_article_${index}`,
          type: 'government_articles'
        }
      };
      chunks.push(chunkData);
      documents.push(new Document({
        pageContent: articleContent,
        metadata: chunkData.metadata
      }));
    });

    // Create vector store
    const vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddings);

    const storeData: VectorStoreData = {
      vectorStore,
      chunks,
      embeddings
    };

    // Cache the result
    vectorStoreCache.set(cacheKey, storeData);
    
    // Limit cache size (keep only last 10 clauses)
    if (vectorStoreCache.size > 10) {
      const firstKey = vectorStoreCache.keys().next().value;
      vectorStoreCache.delete(firstKey);
    }

    console.log(`✅ Vector store created with ${documents.length} chunks`);
    return storeData;
  } catch (error) {
    console.error('❌ Failed to create vector store:', error);
    throw new Error('Failed to create vector store for semantic search');
  }
}

// Retrieve relevant context for a follow-up question
export async function retrieveRelevantContext(
  question: string,
  vectorStoreData: VectorStoreData,
  options: {
    maxResults?: number;
    relevanceThreshold?: number;
    includeMetadata?: boolean;
  } = {}
): Promise<{
  relevantChunks: ClauseChunk[];
  contextSummary: string;
  totalChunks: number;
  averageRelevance: number;
}> {
  const {
    maxResults = 3,
    relevanceThreshold = 0.7,
    includeMetadata = true
  } = options;

  try {
    console.log(`🔍 Searching for relevant context: "${question.slice(0, 50)}..."`);
    
    // Perform similarity search
    const searchResults = await vectorStoreData.vectorStore.similaritySearchWithScore(
      question,
      maxResults * 2 // Get more results to filter by threshold
    );

    // Filter by relevance threshold and add scores
    const relevantResults = searchResults
      .filter(([_, score]) => score >= relevanceThreshold)
      .slice(0, maxResults)
      .map(([document, score]) => {
        const chunkData = vectorStoreData.chunks.find(
          chunk => chunk.content === document.pageContent
        );
        
        if (chunkData) {
          return {
            ...chunkData,
            metadata: {
              ...chunkData.metadata,
              relevanceScore: score
            }
          };
        }
        
        return {
          content: document.pageContent,
          metadata: {
            chunkIndex: 0,
            source: 'unknown',
            type: 'original' as const,
            relevanceScore: score
          }
        };
      });

    // Create context summary
    const contextSummary = relevantResults
      .map((chunk, index) => {
        const prefix = includeMetadata 
          ? `[${chunk.metadata.type.toUpperCase()}] ` 
          : '';
        return `${index + 1}. ${prefix}${chunk.content}`;
      })
      .join('\n\n');

    const averageRelevance = relevantResults.length > 0
      ? relevantResults.reduce((sum, chunk) => sum + (chunk.metadata.relevanceScore || 0), 0) / relevantResults.length
      : 0;

    console.log(`✅ Found ${relevantResults.length} relevant chunks (avg relevance: ${averageRelevance.toFixed(2)})`);

    return {
      relevantChunks: relevantResults,
      contextSummary,
      totalChunks: vectorStoreData.chunks.length,
      averageRelevance
    };
  } catch (error) {
    console.error('❌ Failed to retrieve relevant context:', error);
    
    // Fallback: return first few chunks
    const fallbackChunks = vectorStoreData.chunks.slice(0, maxResults);
    return {
      relevantChunks: fallbackChunks,
      contextSummary: fallbackChunks.map(chunk => chunk.content).join('\n\n'),
      totalChunks: vectorStoreData.chunks.length,
      averageRelevance: 0
    };
  }
}

// Enhanced follow-up question handler with semantic search
export async function submitEnhancedFollowupQuestion(
  question: string,
  originalClause: string,
  analysisData: {
    simplifiedExplanation: string;
    riskyTerms: Array<{ term: string; severity: string; explanation: string; }>;
    governmentArticles: Array<{ title: string; url: string; relevance: string; }>;
  },
  apiKey: string
): Promise<{
  answer: string;
  relevantContext: string;
  contextMetrics: {
    chunksUsed: number;
    totalChunks: number;
    averageRelevance: number;
    tokensSaved: number;
  };
}> {
  try {
    // Create or get vector store
    const vectorStoreData = await createClauseVectorStore(originalClause, analysisData, apiKey);
    
    // Retrieve relevant context
    const contextResult = await retrieveRelevantContext(question, vectorStoreData, {
      maxResults: 3,
      relevanceThreshold: 0.6,
      includeMetadata: true
    });

    // Create enhanced prompt template
    const enhancedFollowupTemplate = PromptTemplate.fromTemplate(`
You are a helpful legal assistant providing precise answers about legal clauses using semantic context.

RELEVANT CONTEXT (automatically selected based on question relevance):
{relevantContext}

USER'S QUESTION: "{question}"

INSTRUCTIONS:
- Provide a CONCISE and DIRECT answer (2-3 sentences maximum)
- Use ONLY the relevant context provided above
- Focus on answering the specific question asked
- Use simple, clear language that non-lawyers can understand
- If the context doesn't contain enough information, say so clearly
- Reference specific parts of the context when relevant

ANSWER:
`);

    // Create processing chain
    const llm = createLLMInstance(apiKey);
    const outputParser = new StringOutputParser();
    
    const enhancedChain = RunnableSequence.from([
      enhancedFollowupTemplate,
      llm,
      outputParser
    ]);

    console.log(`🚀 Processing follow-up with ${contextResult.relevantChunks.length} relevant chunks`);
    
    // Execute the chain with relevant context only
    const answer = await enhancedChain.invoke({
      question,
      relevantContext: contextResult.contextSummary
    });

    // Calculate tokens saved (rough estimation)
    const originalTokens = originalClause.length + JSON.stringify(analysisData).length;
    const contextTokens = contextResult.contextSummary.length;
    const tokensSaved = Math.max(0, originalTokens - contextTokens);

    const result = {
      answer: answer.trim(),
      relevantContext: contextResult.contextSummary,
      contextMetrics: {
        chunksUsed: contextResult.relevantChunks.length,
        totalChunks: contextResult.totalChunks,
        averageRelevance: contextResult.averageRelevance,
        tokensSaved
      }
    };

    console.log(`✅ Enhanced follow-up completed:
    - Chunks used: ${result.contextMetrics.chunksUsed}/${result.contextMetrics.totalChunks}
    - Average relevance: ${result.contextMetrics.averageRelevance.toFixed(2)}
    - Tokens saved: ~${result.contextMetrics.tokensSaved}`);

    return result;
  } catch (error) {
    console.error('❌ Enhanced follow-up failed:', error);
    throw new Error('Failed to process enhanced follow-up question');
  }
}

// Utility function to clear vector store cache
export function clearVectorStoreCache(): void {
  vectorStoreCache.clear();
  console.log('🗑️ Vector store cache cleared');
}

// Utility function to get cache statistics
export function getVectorStoreCacheStats(): {
  cacheSize: number;
  cacheKeys: string[];
} {
  return {
    cacheSize: vectorStoreCache.size,
    cacheKeys: Array.from(vectorStoreCache.keys())
  };
}

// Export types for use in other components
export type { ClauseChunk, VectorStoreData };

// Enhanced followup response type
export interface EnhancedFollowupResponse {
  answer: string;
  relevantContext: string;
  contextMetrics: {
    chunksUsed: number;
    totalChunks: number;
    averageRelevance: number;
    tokensSaved: number;
  };
}
