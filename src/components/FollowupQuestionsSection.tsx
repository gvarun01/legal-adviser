import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Send, Brain, BarChart3, Zap } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { submitFollowupQuestion } from "@/lib/api-wrapper";
import ReactMarkdown from 'react-markdown';

interface FollowupQuestionsSectionProps {
  legalClause: string;
  hasApiKey: boolean;
  setSettingsOpen: (open: boolean) => void;
  analysisData?: {
    simplifiedExplanation: string;
    riskyTerms: Array<{ term: string; severity: string; explanation: string; }>;
    governmentArticles: Array<{ title: string; url: string; relevance: string; }>;
  };
}

const FollowupQuestionsSection = ({ 
  legalClause, 
  hasApiKey,
  setSettingsOpen,
  analysisData
}: FollowupQuestionsSectionProps) => {
  const [followupQuestion, setFollowupQuestion] = useState('');
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [followupAnswers, setFollowupAnswers] = useState<{
    question: string; 
    answer: string;
    contextMetrics?: {
      chunksUsed: number;
      totalChunks: number;
      averageRelevance: number;
      tokensSaved: number;
    };
  }[]>([]);

  const handleSubmitQuestion = async () => {
    if (!followupQuestion.trim() || !legalClause.trim()) {
      toast.warning('Please enter a question');
      return;
    }
    
    if (!hasApiKey) {
      toast.error('Please enter your Gemini API key in settings first');
      setSettingsOpen(true);
      return;
    }
    
    setIsSubmittingQuestion(true);
    
    try {
      const result = await submitFollowupQuestion(followupQuestion, legalClause, analysisData);
      
      // Handle both enhanced and regular responses
      setFollowupAnswers(prev => [...prev, {
        question: followupQuestion,
        answer: result.answer,
        contextMetrics: 'contextMetrics' in result ? result.contextMetrics : undefined
      }]);
      setFollowupQuestion('');
    } catch (error) {
      console.error(error);
      // Toast is already shown in the API service
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  return (
    <Card className="mb-8 bg-card/50 backdrop-blur-sm border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <HelpCircle size={18} className="text-legal-action" />
          Follow-up Questions
        </CardTitle>
        <CardDescription>
          Ask specific questions about this legal text
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {followupAnswers.length > 0 && (
          <div className="space-y-5">
            {followupAnswers.map((qa, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-end">
                  <div className="bg-legal-action/20 py-2 px-4 rounded-2xl rounded-tr-none max-w-[85%]">
                    <p className="text-sm text-foreground/90">{qa.question}</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-secondary/30 py-3 px-4 rounded-2xl rounded-tl-none max-w-[85%] space-y-3">
                    <div className="text-sm text-foreground/90 prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-code:text-foreground prose-pre:text-foreground prose-blockquote:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground">
                      <ReactMarkdown>
                        {qa.answer}
                      </ReactMarkdown>
                    </div>
                    
                    {/* Enhanced Context Metrics */}
                    {qa.contextMetrics && (
                      <div className="border-t border-border/30 pt-2 mt-2">
                        <div className="flex items-center gap-1 mb-2">
                          <Brain size={12} className="text-legal-action" />
                          <span className="text-xs font-medium text-foreground/70">Semantic Search Applied</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <BarChart3 size={10} />
                            {qa.contextMetrics.chunksUsed}/{qa.contextMetrics.totalChunks} chunks
                          </Badge>
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Zap size={10} />
                            {qa.contextMetrics.averageRelevance.toFixed(2)} relevance
                          </Badge>
                          <Badge variant="outline" className="gap-1 text-xs text-green-600 dark:text-green-400">
                            ~{qa.contextMetrics.tokensSaved} tokens saved
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <Separator />
          </div>
        )}
        
        <div className="flex gap-2">
          <Input
            value={followupQuestion}
            onChange={(e) => setFollowupQuestion(e.target.value)}
            placeholder="Ask a follow-up question..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitQuestion();
              }
            }}
          />
          <Button 
            onClick={handleSubmitQuestion}
            disabled={isSubmittingQuestion || !followupQuestion.trim()}
            className="gap-2"
          >
            <Send size={16} />
            {isSubmittingQuestion ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FollowupQuestionsSection;
