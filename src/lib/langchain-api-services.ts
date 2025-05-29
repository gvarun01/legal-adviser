import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface GovernmentArticle {
  title: string;
  url: string;
  relevance: string;
}

export interface AnalysisResponse {
  simplifiedExplanation: string;
  riskyTerms: {
    term: string;
    severity: 'high' | 'moderate' | 'low';
    explanation: string;
  }[];
  governmentArticles: GovernmentArticle[];
}

export interface FollowupResponse {
  answer: string;
}

// Function to get the current user's Gemini API key
async function getGeminiApiKey(): Promise<string | null> {
  // First check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // Try to get API key from Supabase
    const { data, error } = await supabase
      .from('api_keys')
      .select('gemini_api_key')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data && !error) {
      return data.gemini_api_key;
    }
  }
  
  // Fallback to localStorage for backward compatibility
  return localStorage.getItem('gemini_api_key');
}

// Create a reusable LangChain model instance
function createLLMInstance(apiKey: string) {
  return new ChatGoogleGenerativeAI({
    model: 'gemini-2.0-flash',
    apiKey,
    temperature: 0.2,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 2048,
  });
}

// Advanced prompt templates using LangChain
const simplificationTemplate = PromptTemplate.fromTemplate(`
You are a legal expert specializing in simplifying complex legal language for non-lawyers.

Analyze and simplify the following legal clause in plain English. Provide a clear, concise explanation that anyone can understand:

Legal Clause: "{clause}"

Requirements:
- Use simple, everyday language
- Explain the practical implications
- Avoid legal jargon
- Keep it concise but comprehensive
- Focus on what this means for the average person

Simplified Explanation:
`);

const riskyTermsTemplate = PromptTemplate.fromTemplate(`
You are a legal risk assessment expert. Analyze the following legal clause and identify genuinely problematic terms.

Legal Clause: "{clause}"

CRITICAL GUIDELINES:
- Only identify terms that create REAL legal risks
- If the text is too short (less than 15 words) or lacks legal substance, return empty array
- Don't force findings - only report legitimate concerns
- Focus on terms with actual legal implications: indemnification, liability, termination, penalties, etc.
- Ignore common words unless they create specific legal risks

For each legitimate risky term, provide:
1. The specific term/phrase (exact text from clause)
2. Severity level (high/moderate/low)
3. Brief explanation of the legal risk

Return ONLY valid JSON in this exact format:
[
  {{
    "term": "specific legal term or phrase",
    "severity": "high/moderate/low", 
    "explanation": "brief explanation of legal risk"
  }}
]

If no risky terms exist, return: []
`);

const governmentArticlesTemplate = PromptTemplate.fromTemplate(`
You are a legal research expert specializing in Indian law. Analyze the legal clause and identify relevant government articles, laws, or regulations.

Legal Clause: "{clause}"

RESEARCH GUIDELINES:
- Only identify DIRECTLY relevant articles/laws/regulations
- Focus on Indian legal framework
- If no relevant articles exist, return empty array
- Use official sources:
  * indiankanoon.org
  * legislative.gov.in  
  * lawfinderlive.com
- Ensure URLs are valid and accessible
- Look for specific legal provisions that apply

For each relevant article, provide:
1. Official title of the law/article
2. Valid URL to official source
3. Clear explanation of relevance

Return ONLY valid JSON in this exact format:
[
  {{
    "title": "Article/Law title",
    "url": "https://official-source-url.com",
    "relevance": "Brief explanation of how this relates to the clause"
  }}
]

If no relevant articles exist, return: []
`);

// Create processing chains using LangChain
async function createAnalysisChains(apiKey: string) {
  const llm = createLLMInstance(apiKey);
  const outputParser = new StringOutputParser();

  const simplificationChain = RunnableSequence.from([
    simplificationTemplate,
    llm,
    outputParser
  ]);

  const riskyTermsChain = RunnableSequence.from([
    riskyTermsTemplate,
    llm,
    outputParser
  ]);

  const governmentArticlesChain = RunnableSequence.from([
    governmentArticlesTemplate,
    llm,
    outputParser
  ]);

  return {
    simplificationChain,
    riskyTermsChain,
    governmentArticlesChain
  };
}

// Enhanced JSON parser with better error handling
function parseJSONResponse(response: string, fallback: any = []): any {
  try {
    // First try direct JSON parsing
    return JSON.parse(response);
  } catch {
    try {
      // Try to extract JSON from markdown code blocks
      const codeBlockMatch = response.match(/```(?:json)?\s*(\[.*?\])\s*```/s);
      if (codeBlockMatch) {
        return JSON.parse(codeBlockMatch[1]);
      }
      
      // Try to find JSON array in the response
      const jsonMatch = response.match(/\[\s*\{.*?\}\s*\]/s);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If all else fails, return fallback
      return fallback;
    } catch {
      console.error('Failed to parse JSON response:', response);
      return fallback;
    }
  }
}

// Validate and sanitize risky terms
function validateRiskyTerms(terms: any[]): AnalysisResponse['riskyTerms'] {
  if (!Array.isArray(terms)) return [];
  
  return terms
    .filter(term => term.term && term.severity && term.explanation)
    .map(term => ({
      term: String(term.term).trim(),
      severity: ['high', 'moderate', 'low'].includes(term.severity?.toLowerCase()) 
        ? term.severity.toLowerCase() as 'high' | 'moderate' | 'low'
        : 'moderate',
      explanation: String(term.explanation).trim()
    }));
}

// Validate and sanitize government articles
function validateGovernmentArticles(articles: any[]): GovernmentArticle[] {
  if (!Array.isArray(articles)) return [];
  
  return articles
    .filter(article => {
      if (!article.title || !article.url || !article.relevance) return false;
      
      // Validate URL format
      try {
        new URL(article.url);
        return true;
      } catch {
        return false;
      }
    })
    .map(article => ({
      title: String(article.title).trim(),
      url: String(article.url).trim(),
      relevance: String(article.relevance).trim()
    }));
}

// Main analysis function using LangChain
export async function analyzeClause(clause: string): Promise<AnalysisResponse> {
  try {
    // Get API key
    const apiKey = await getGeminiApiKey();
    
    if (!apiKey) {
      toast.error('Please enter your Gemini API key in settings');
      throw new Error('Gemini API key not found');
    }

    // Create analysis chains
    const { simplificationChain, riskyTermsChain, governmentArticlesChain } = await createAnalysisChains(apiKey);

    // Show progress to user
    toast.info('Analyzing your legal clause with advanced AI...');

    // Execute all chains in parallel for efficiency
    const [simplifiedExplanation, riskyTermsResponse, governmentArticlesResponse] = await Promise.all([
      simplificationChain.invoke({ clause }),
      riskyTermsChain.invoke({ clause }),
      governmentArticlesChain.invoke({ clause })
    ]);

    // Parse and validate responses
    const riskyTermsData = parseJSONResponse(riskyTermsResponse, []);
    const governmentArticlesData = parseJSONResponse(governmentArticlesResponse, []);

    const riskyTerms = validateRiskyTerms(riskyTermsData);
    const governmentArticles = validateGovernmentArticles(governmentArticlesData);

    const result: AnalysisResponse = {
      simplifiedExplanation: simplifiedExplanation.trim(),
      riskyTerms,
      governmentArticles
    };
    
    // Store analysis in Supabase if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
        const analysisJson = {
          simplifiedExplanation: result.simplifiedExplanation,
          riskyTerms: result.riskyTerms,
          governmentArticles: result.governmentArticles
        } as Json;
        
        await supabase.from('chat_history').insert({
          user_id: user.id,
          legal_clause: clause,
          analysis: analysisJson
        });
      } catch (error) {
        console.error('Failed to save analysis to database:', error);
        // Continue even if saving fails
      }
    }

    toast.success('Analysis completed successfully!');
    return result;
  } catch (error) {
    console.error('LangChain analysis error:', error);
    toast.error('Failed to analyze legal clause');
    throw error;
  }
}

// Follow-up question handler using LangChain
export async function submitFollowupQuestion(question: string, originalClause: string): Promise<FollowupResponse> {
  try {
    // Get API key
    const apiKey = await getGeminiApiKey();
    
    if (!apiKey) {
      toast.error('Please enter your Gemini API key in settings');
      throw new Error('Gemini API key not found');
    }

    // Create follow-up prompt template
    const followupTemplate = PromptTemplate.fromTemplate(`
You are a helpful legal assistant providing concise answers about legal clauses.

Original Legal Clause: "{originalClause}"

User's Question: "{question}"

Instructions:
- Provide a CONCISE and DIRECT answer (2-3 sentences maximum)
- Focus only on answering the specific question asked
- Use simple, clear language that non-lawyers can understand
- If it requires a yes/no answer, start with that
- Stay focused on the legal clause context
- Avoid unnecessary explanations or examples

Answer:
`);

    // Create processing chain
    const llm = createLLMInstance(apiKey);
    const outputParser = new StringOutputParser();
    
    const followupChain = RunnableSequence.from([
      followupTemplate,
      llm,
      outputParser
    ]);

    toast.info('Getting answer to your question...');
    
    // Execute the chain
    const answer = await followupChain.invoke({ 
      question, 
      originalClause 
    });
    
    toast.success('Answer ready!');
    return { answer: answer.trim() };
  } catch (error) {
    console.error('LangChain follow-up error:', error);
    toast.error('Failed to submit follow-up question');
    throw error;
  }
}

// Advanced batch processing for multiple clauses (bonus feature)
export async function analyzeBatchClauses(clauses: string[]): Promise<AnalysisResponse[]> {
  try {
    const apiKey = await getGeminiApiKey();
    
    if (!apiKey) {
      throw new Error('Gemini API key not found');
    }

    toast.info(`Analyzing ${clauses.length} clauses in batch...`);
    
    // Process all clauses in parallel with LangChain
    const results = await Promise.all(
      clauses.map(clause => analyzeClause(clause))
    );
    
    toast.success(`Successfully analyzed ${results.length} clauses!`);
    return results;
  } catch (error) {
    console.error('Batch analysis error:', error);
    toast.error('Failed to analyze clauses in batch');
    throw error;
  }
}

// Export utility for creating custom chains (advanced users)
export { createLLMInstance, simplificationTemplate, riskyTermsTemplate, governmentArticlesTemplate };