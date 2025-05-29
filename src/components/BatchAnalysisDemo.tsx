import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from '@/components/ui/sonner';
import { Upload, Zap, FileText, AlertTriangle } from 'lucide-react';
import { processBatchClauses, getCurrentAPIInfo } from '@/lib/api-wrapper';
import type { AnalysisResponse } from '@/lib/api-wrapper';

interface BatchAnalysisProps {
  onAnalysisComplete?: (results: AnalysisResponse[]) => void;
}

const BatchAnalysisDemo = ({ onAnalysisComplete }: BatchAnalysisProps) => {
  const [clauses, setClauses] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<AnalysisResponse[]>([]);
  const [progress, setProgress] = useState(0);

  const apiInfo = getCurrentAPIInfo();
  const canUseBatch = apiInfo.features.batchProcessing;

  const handleBatchAnalysis = async () => {
    if (!clauses.trim()) {
      toast.error('Please enter some legal clauses to analyze');
      return;
    }

    if (!canUseBatch) {
      toast.error('Batch processing is not enabled. Please enable LangChain in settings.');
      return;
    }

    // Split clauses by double newlines or numbered lists
    const clauseList = clauses
      .split(/\n\s*\n|\d+\.\s*/)
      .filter(clause => clause.trim().length > 10)
      .map(clause => clause.trim());

    if (clauseList.length === 0) {
      toast.error('No valid clauses found. Please separate clauses with double line breaks.');
      return;
    }

    if (clauseList.length > 10) {
      toast.warning('Maximum 10 clauses allowed for batch processing');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    
    try {
      toast.info(`Starting batch analysis of ${clauseList.length} clauses...`);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 1000);

      const batchResults = await processBatchClauses(clauseList);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      setResults(batchResults);
      onAnalysisComplete?.(batchResults);
      
      toast.success(`Successfully analyzed ${batchResults.length} clauses!`);
    } catch (error) {
      console.error('Batch analysis error:', error);
      toast.error('Failed to process batch analysis');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  const exampleClauses = `1. The contractor shall indemnify and hold harmless the client from any claims arising from the work performed.

2. This agreement may be terminated by either party with thirty (30) days written notice.

3. All intellectual property created during the course of this agreement shall remain the property of the client.

4. The contractor agrees to maintain confidentiality of all client information for a period of five (5) years.`;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Batch Legal Analysis
          {canUseBatch ? (
            <Badge variant="default" className="ml-2">Available</Badge>
          ) : (
            <Badge variant="secondary" className="ml-2">Requires LangChain</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Analyze multiple legal clauses simultaneously using advanced LangChain processing
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!canUseBatch && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Enable LangChain in settings to use batch processing
            </span>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Legal Clauses (separate with double line breaks)
          </label>
          <Textarea
            value={clauses}
            onChange={(e) => setClauses(e.target.value)}
            placeholder="Enter multiple legal clauses here..."
            className="min-h-32"
            disabled={!canUseBatch}
          />
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClauses(exampleClauses)}
              disabled={!canUseBatch}
            >
              <FileText className="h-4 w-4 mr-1" />
              Use Example
            </Button>
            <span className="text-xs text-muted-foreground">
              {clauses.split(/\n\s*\n|\d+\.\s*/).filter(c => c.trim().length > 10).length} clauses detected
            </span>
          </div>
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing batch analysis...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        <Button 
          onClick={handleBatchAnalysis}
          disabled={!canUseBatch || isProcessing || !clauses.trim()}
          className="w-full gap-2"
        >
          <Upload className="h-4 w-4" />
          {isProcessing ? 'Analyzing...' : 'Analyze Batch'}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Analysis Results ({results.length})</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {results.map((result, index) => (
                <Card key={index} className="p-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium">Clause {index + 1}</span>
                      <Badge variant={result.riskyTerms.length > 0 ? 'destructive' : 'default'}>
                        {result.riskyTerms.length} risks found
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {result.simplifiedExplanation}
                    </p>
                    {result.riskyTerms.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {result.riskyTerms.slice(0, 2).map((term, termIndex) => (
                          <Badge key={termIndex} variant="outline" className="text-xs">
                            {term.term}
                          </Badge>
                        ))}
                        {result.riskyTerms.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{result.riskyTerms.length - 2} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BatchAnalysisDemo;
