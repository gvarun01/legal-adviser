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
async function getGeminiApiKey() {
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

// Function to handle Gemini API requests
async function callGeminiAPI(prompt: string, apiKey: string | null) {
  if (!apiKey) {
    throw new Error('No API key provided');
  }

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to get response from Gemini API');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

export async function analyzeClause(clause: string): Promise<AnalysisResponse> {
  try {
    // Get API key
    const apiKey = await getGeminiApiKey();
    
    if (!apiKey) {
      toast.error('Please enter your Gemini API key in settings');
      throw new Error('Gemini API key not found');
    }

    // Improved prompts for more accurate analysis
    const simplificationPrompt = `
      I need you to analyze and simplify the following legal clause in plain English. Provide a clear, concise explanation that a non-lawyer can understand:
      
      "${clause}"
      
      Respond with ONLY the simplified explanation, without any additional text.
    `;
    
    const riskyTermsPrompt = `
      Analyze the following legal clause and identify only genuinely problematic terms that could create legal risks:
      
      "${clause}"
      
      IMPORTANT GUIDELINES:
      - Only identify terms that are truly problematic in a legal context
      - If the text is too short (less than 15 words) or doesn't contain actual legal language, return an empty array
      - Don't force finding risky terms if none genuinely exist
      - Focus on terms with actual legal implications like indemnification, liability, termination, etc.
      - Ignore common words unless they create specific legal issues in this context
      
      For each legitimate risky term, provide:
      1. The specific term/word/phrase (just the relevant text)
      2. A severity level (high, moderate, or low)
      3. A brief explanation of why this term creates legal risk
      
      Format your response strictly as JSON with this structure:
      [
        {
          "term": "specific legal term or phrase",
          "severity": "high/moderate/low",
          "explanation": "brief explanation of legal risk"
        },
        {...}
      ]
      
      If no risky terms are found or if the text is too short for meaningful analysis, return an empty array: []
    `;

    const governmentArticlesPrompt = `
      Analyze the following legal clause and identify any relevant government articles, laws, or regulations that it might be related to:
      
      "${clause}"
      
      IMPORTANT GUIDELINES:
      - Only identify articles that are DIRECTLY relevant to the clause
      - If no relevant articles are found, return an empty array
      - Don't force finding articles if none are genuinely related
      - Focus on specific articles, laws, or regulations that the clause might be based on or related to
      - For Indian laws, use these official sources:
        * indiankanoon.org
        * legislative.gov.in
        * lawfinderlive.com
      - Always include a valid URL to the official source
      - If you find articles mentioned in the text, make sure to include them
      
      Format your response strictly as JSON with this structure:
      [
        {
          "title": "Article/Law title",
          "url": "Official URL to the article",
          "relevance": "Brief explanation of how this article relates to the clause"
        }
      ]
      
      If no relevant articles are found, return an empty array: []
      
      IMPORTANT: Your response must be valid JSON. Do not include any other text before or after the JSON array.
    `;

    // Make parallel API calls for efficiency
    toast.info('Analyzing your legal clause...');
    const [simplifiedExplanation, riskyTermsResponse, governmentArticlesResponse] = await Promise.all([
      callGeminiAPI(simplificationPrompt, apiKey),
      callGeminiAPI(riskyTermsPrompt, apiKey),
      callGeminiAPI(governmentArticlesPrompt, apiKey)
    ]);

    // Parse the risky terms JSON
    let riskyTerms = [];
    try {
      // Find JSON content by looking for array brackets
      const jsonMatch = riskyTermsResponse.match(/\[\s*\{.*\}\s*\]/s);
      const jsonStr = jsonMatch ? jsonMatch[0] : '[]';
      riskyTerms = JSON.parse(jsonStr);
      
      // Ensure correct format for each term
      riskyTerms = riskyTerms.map(term => ({
        term: term.term || '',
        severity: ['high', 'moderate', 'low'].includes(term.severity?.toLowerCase()) 
          ? term.severity.toLowerCase() 
          : 'moderate',
        explanation: term.explanation || ''
      }));
    } catch (error) {
      console.error('Failed to parse risky terms:', error);
      riskyTerms = [];
    }

    // Parse the government articles JSON
    let governmentArticles = [];
    try {
      // First try to parse the entire response as JSON
      try {
        governmentArticles = JSON.parse(governmentArticlesResponse);
      } catch {
        // If that fails, try to find JSON content by looking for array brackets
        const jsonMatch = governmentArticlesResponse.match(/\[\s*\{.*\}\s*\]/s);
        if (jsonMatch) {
          governmentArticles = JSON.parse(jsonMatch[0]);
        }
      }
      
      // Ensure correct format for each article and validate URLs
      governmentArticles = governmentArticles
        .filter(article => {
          // Basic validation
          if (!article.title || !article.url || !article.relevance) return false;
          
          // URL validation
          try {
            new URL(article.url);
            return true;
          } catch {
            return false;
          }
        })
        .map(article => ({
          title: article.title.trim(),
          url: article.url.trim(),
          relevance: article.relevance.trim()
        }));
    } catch (error) {
      console.error('Failed to parse government articles:', error);
      governmentArticles = [];
    }

    const result: AnalysisResponse = {
      simplifiedExplanation: simplifiedExplanation.trim(),
      riskyTerms: riskyTerms,
      governmentArticles: governmentArticles
    };
    
    // Store analysis in Supabase if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
        // Convert AnalysisResponse to a JSON object that's compatible with Supabase's Json type
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

    return result;
  } catch (error) {
    console.error('Analysis error:', error);
    toast.error('Failed to analyze legal clause');
    throw error;
  }
}

export async function submitFollowupQuestion(question: string, originalClause: string): Promise<FollowupResponse> {
  try {
    // Get API key
    const apiKey = await getGeminiApiKey();
    
    if (!apiKey) {
      toast.error('Please enter your Gemini API key in settings');
      throw new Error('Gemini API key not found');
    }
    
    const prompt = `
      I previously analyzed this legal clause: "${originalClause}"
      
      Now I have a follow-up question: "${question}"
      
      Please provide a CONCISE answer to my question about this legal clause. Follow these guidelines:
      - Keep the answer brief and to the point (2-3 sentences maximum)
      - Focus only on directly answering the question
      - Use simple, clear language
      - Avoid unnecessary explanations or examples
      - If the question requires a yes/no answer, start with that
      
      Respond with ONLY the answer, no additional text or formatting.
    `;
    
    toast.info('Getting answer to your question...');
    const answer = await callGeminiAPI(prompt, apiKey);
    
    return { answer: answer.trim() };
  } catch (error) {
    console.error('Follow-up question error:', error);
    toast.error('Failed to submit follow-up question');
    throw error;
  }
}
