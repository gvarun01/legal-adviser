
import React from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import FileUploader from "@/components/FileUploader";

interface LegalInputSectionProps {
  legalClause: string;
  setLegalClause: (text: string) => void;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onStartNew: () => void;
  hasAnalysis: boolean;
}

const LegalInputSection = ({
  legalClause,
  setLegalClause,
  isAnalyzing,
  onAnalyze,
  onStartNew,
  hasAnalysis
}: LegalInputSectionProps) => {
  const handleContentExtracted = (content: string) => {
    setLegalClause(content);
  };

  return (
    <Card className="mb-8 bg-card/50 backdrop-blur-sm border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText size={20} className="text-legal-action" />
          Input Legal Text
        </CardTitle>
        <CardDescription>
          Paste a legal clause or upload a document (.txt, .pdf, .docx)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileUploader onContentExtracted={handleContentExtracted} />
        <Textarea 
          value={legalClause}
          onChange={(e) => setLegalClause(e.target.value)}
          placeholder="Paste your legal clause or contract section here..."
          className="min-h-[200px] resize-y bg-background/50"
          rows={10}
          disabled={isAnalyzing}
        />
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={onStartNew}
          disabled={isAnalyzing || (!hasAnalysis && legalClause === '')}
          className="gap-2"
        >
          <RefreshCw size={16} />
          Clear All
        </Button>
        <Button 
          onClick={onAnalyze}
          disabled={isAnalyzing || legalClause.trim() === ''}
          className="bg-legal-action hover:bg-legal-action/80 text-white gap-2"
        >
          {isAnalyzing ? (
            <>
              <Loader size={16} className="animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              Simplify & Analyze
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default LegalInputSection;
