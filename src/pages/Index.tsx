
import React, { useState, useEffect } from 'react';
import { toast } from "@/components/ui/sonner";
import SettingsDialog from "@/components/SettingsDialog";
import { analyzeClause, type AnalysisResponse } from "@/lib/api-services";
import AppHeader from '@/components/AppHeader';
import LegalInputSection from '@/components/LegalInputSection';
import AnalysisSection from '@/components/AnalysisSection';
import RiskyTermsSection from '@/components/RiskyTermsSection';
import FollowupQuestionsSection from '@/components/FollowupQuestionsSection';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const [legalClause, setLegalClause] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const { user } = useAuth();
  
  // Check if API key exists when component mounts and when user changes
  useEffect(() => {
    const checkApiKey = async () => {
      if (user) {
        // Check if API key exists in Supabase
        const { data, error } = await supabase
          .from('api_keys')
          .select('gemini_api_key')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (!error && data) {
          setHasApiKey(true);
          return;
        }
      }
      
      // Fall back to localStorage
      const key = localStorage.getItem('gemini_api_key');
      setHasApiKey(!!key);
    };
    
    checkApiKey();
    
    // Also check when window regains focus
    const handleFocus = () => {
      checkApiKey();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);
  
  const handleAnalyze = async () => {
    if (!legalClause.trim()) {
      toast.warning('Please enter a legal clause or upload a document');
      return;
    }
    
    if (!hasApiKey) {
      toast.error('Please enter your Gemini API key in settings first');
      setSettingsOpen(true);
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysis(null);
    
    try {
      const result = await analyzeClause(legalClause);
      setAnalysis(result);
      
      if (result.riskyTerms.length > 0) {
        const highRisks = result.riskyTerms.filter(term => term.severity === 'high').length;
        if (highRisks > 0) {
          toast.warning(`Found ${highRisks} high-risk term${highRisks > 1 ? 's' : ''}!`);
        } else {
          toast.info('Analysis complete');
        }
      } else {
        toast.success('No risky terms detected!');
      }
    } catch (error) {
      console.error(error);
      // Toast is already shown in the API service
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleStartNew = () => {
    setLegalClause('');
    setAnalysis(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4 md:px-8 bg-background">
      <div className="w-full max-w-4xl">
        <AppHeader setSettingsOpen={setSettingsOpen} />
        
        <LegalInputSection 
          legalClause={legalClause}
          setLegalClause={setLegalClause}
          isAnalyzing={isAnalyzing}
          onAnalyze={handleAnalyze}
          onStartNew={handleStartNew}
          hasAnalysis={!!analysis}
        />
        
        {analysis && (
          <>
            <AnalysisSection analysis={analysis} />
            
            <RiskyTermsSection analysis={analysis} />
            
            <FollowupQuestionsSection 
              legalClause={legalClause}
              hasApiKey={hasApiKey}
              setSettingsOpen={setSettingsOpen}
            />
          </>
        )}
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default Index;
