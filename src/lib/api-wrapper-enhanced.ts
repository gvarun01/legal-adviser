import { 
  analyzeClause as oldAnalyzeClause, 
  submitFollowupQuestion as oldSubmitFollowupQuestion 
} from './api-services';

import { 
  analyzeClause as newAnalyzeClause, 
  submitFollowupQuestion as newSubmitFollowupQuestion,
  analyzeBatchClauses
} from './langchain-api-services';

import { 
  submitEnhancedFollowupQuestion 
} from './semantic-search';

export interface APIConfig {
  useLangChain: boolean;
  enableBatchProcessing: boolean;
  enableAdvancedPrompts: boolean;
  enableSemanticSearch: boolean; // New option for semantic search
}

// Default configuration - can be updated via settings
let apiConfig: APIConfig = {
  useLangChain: true, // Default to LangChain for better performance
  enableBatchProcessing: true,
  enableAdvancedPrompts: true,
  enableSemanticSearch: true // Enable semantic search by default
};

// Function to update API configuration
export function updateAPIConfig(newConfig: Partial<APIConfig>) {
  apiConfig = { ...apiConfig, ...newConfig };
  
  // Store in localStorage for persistence
  localStorage.setItem('clause-clarity-api-config', JSON.stringify(apiConfig));
}

// Function to load API configuration
export function loadAPIConfig(): APIConfig {
  try {
    const stored = localStorage.getItem('clause-clarity-api-config');
    if (stored) {
      const storedConfig = JSON.parse(stored);
      // Ensure new properties have defaults
      apiConfig = { 
        ...apiConfig, 
        ...storedConfig,
        enableSemanticSearch: storedConfig.enableSemanticSearch ?? true
      };
    }
  } catch (error) {
    console.error('Failed to load API config:', error);
  }
  return apiConfig;
}

// Smart wrapper that uses the appropriate API based on configuration
export async function analyzeClause(clause: string) {
  const config = loadAPIConfig();
  
  if (config.useLangChain) {
    console.log('🚀 Using LangChain API for enhanced analysis');
    return await newAnalyzeClause(clause);
  } else {
    console.log('📡 Using traditional API');
    return await oldAnalyzeClause(clause);
  }
}

// Enhanced smart wrapper for follow-up questions with semantic search
export async function submitFollowupQuestion(
  question: string, 
  originalClause: string,
  analysisData?: {
    simplifiedExplanation: string;
    riskyTerms: Array<{ term: string; severity: string; explanation: string; }>;
    governmentArticles: Array<{ title: string; url: string; relevance: string; }>;
  }
) {
  const config = loadAPIConfig();
  
  if (config.useLangChain && config.enableSemanticSearch && analysisData) {
    console.log('🧠 Using Enhanced Semantic Search for follow-up question');
    return await submitEnhancedFollowupQuestion(question, originalClause, analysisData, '');
  } else if (config.useLangChain) {
    console.log('🚀 Using LangChain API for follow-up question');
    return await newSubmitFollowupQuestion(question, originalClause);
  } else {
    console.log('📡 Using traditional API for follow-up question');
    return await oldSubmitFollowupQuestion(question, originalClause);
  }
}

// New feature: Batch processing (only available with LangChain)
export async function processBatchClauses(clauses: string[]) {
  const config = loadAPIConfig();
  
  if (!config.useLangChain) {
    throw new Error('Batch processing is only available with LangChain API');
  }
  
  if (!config.enableBatchProcessing) {
    throw new Error('Batch processing is disabled in configuration');
  }
  
  console.log('🚀 Processing batch clauses with LangChain');
  return await analyzeBatchClauses(clauses);
}

// Utility to get current API info
export function getCurrentAPIInfo() {
  const config = loadAPIConfig();
  return {
    apiType: config.useLangChain ? 'LangChain' : 'Traditional',
    features: {
      batchProcessing: config.useLangChain && config.enableBatchProcessing,
      advancedPrompts: config.useLangChain && config.enableAdvancedPrompts,
      parallelProcessing: config.useLangChain,
      improvedErrorHandling: config.useLangChain,
      enhancedJSONParsing: config.useLangChain,
      semanticSearch: config.useLangChain && config.enableSemanticSearch
    }
  };
}

// Export types and config
export { apiConfig };

// Re-export types for convenience
export type { 
  AnalysisResponse, 
  FollowupResponse, 
  GovernmentArticle 
} from './langchain-api-services';
