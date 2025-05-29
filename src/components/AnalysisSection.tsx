import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisResponse } from "@/lib/api-services";
import { Check } from "lucide-react";
import ReactMarkdown from 'react-markdown';

interface AnalysisSectionProps {
  analysis: AnalysisResponse | null;
}

const AnalysisSection = ({ analysis }: AnalysisSectionProps) => {
  if (!analysis) return null;
  
  return (
    <Card className="mb-8 bg-card/50 backdrop-blur-sm border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="border-b border-border/20">
        <CardTitle className="text-lg flex items-center gap-2">
          <Check size={18} className="text-primary" />
          Simplified Explanation
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="text-foreground/90 leading-relaxed text-base prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-code:text-foreground prose-pre:text-foreground prose-blockquote:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground">
          <ReactMarkdown>
            {analysis.simplifiedExplanation}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalysisSection;
