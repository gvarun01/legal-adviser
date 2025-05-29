import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, LogOut, LogIn, UserPlus } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { analyzeClause } from '@/lib/api-wrapper';
import type { AnalysisResponse } from '@/lib/api-wrapper';
import AnalysisSection from '@/components/AnalysisSection';
import FollowupQuestionsSection from '@/components/FollowupQuestionsSection';
import GovernmentArticlesSection from '@/components/GovernmentArticlesSection';
import SettingsDialog from '@/components/SettingsDialog';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const { user, signOut } = useAuth();
  const [legalClause, setLegalClause] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();

  const handleAnalyze = async () => {
    if (!legalClause.trim()) {
      toast.warning('Please enter a legal clause to analyze');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeClause(legalClause);
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis error:', error);
      // Error toast is already shown in the API service
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">Clause Clarity AI</h1>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className="text-foreground/70 hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
          </Button>
          {user ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-foreground/70 hover:text-foreground"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => navigate('/login')}
                className="text-foreground/70 hover:text-foreground"
              >
                <LogIn className="h-5 w-5 mr-2" />
                Login
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/signup')}
                className="text-foreground/70 hover:text-foreground"
              >
                <UserPlus className="h-5 w-5 mr-2" />
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>

      <Card className="mb-8 bg-card/50 backdrop-blur-sm border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Legal Clause Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              value={legalClause}
              onChange={(e) => setLegalClause(e.target.value)}
              placeholder="Paste your legal clause here..."
              className="min-h-[150px] resize-none"
            />
            <Button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || !legalClause.trim()}
              className="w-full"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Clause'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <>
          <AnalysisSection analysis={analysis} />
          <GovernmentArticlesSection articles={analysis.governmentArticles} />
          <FollowupQuestionsSection 
            legalClause={legalClause}
            hasApiKey={!!localStorage.getItem('gemini_api_key')}
            setSettingsOpen={setSettingsOpen}
            analysisData={{
              simplifiedExplanation: analysis.simplifiedExplanation,
              riskyTerms: analysis.riskyTerms,
              governmentArticles: analysis.governmentArticles
            }}
          />
        </>
      )}

      <SettingsDialog 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
};

export default Home; 