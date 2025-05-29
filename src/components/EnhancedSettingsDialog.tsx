import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from '@/components/ui/sonner';
import { Save, Zap, Brain, Layers, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { loadAPIConfig, updateAPIConfig, getCurrentAPIInfo, type APIConfig } from '@/lib/api-wrapper';

interface EnhancedSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EnhancedSettingsDialog = ({ open, onOpenChange }: EnhancedSettingsDialogProps) => {
  const [apiKey, setApiKey] = useState('');
  const [apiConfig, setApiConfigState] = useState<APIConfig>({
    useLangChain: true,
    enableBatchProcessing: true,
    enableAdvancedPrompts: true,
    enableSemanticSearch: true
  });
  const { user } = useAuth();
  
  // Load existing settings when dialog opens
  useEffect(() => {
    if (open) {
      if (user) {
        fetchApiKey();
      }
      // Load API configuration
      const config = loadAPIConfig();
      setApiConfigState(config);
    }
  }, [open, user]);

  const fetchApiKey = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('gemini_api_key')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setApiKey(data.gemini_api_key);
      } else {
        // Fallback to localStorage for backward compatibility
        const savedKey = localStorage.getItem('gemini_api_key') || '';
        setApiKey(savedKey);
      }
    } catch (error) {
      console.error('Error fetching API key:', error);
      toast.error('Failed to load saved API key');
    }
  };
  
  const handleSaveSettings = async () => {
    if (!apiKey.trim()) {
      toast.warning('Please enter a valid Gemini API key');
      return;
    }
    
    if (!user) {
      toast.error('You must be signed in to save settings');
      return;
    }
    
    try {
      // First, check if a record exists
      const { data } = await supabase
        .from('api_keys')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        // Update existing record
        const { error } = await supabase
          .from('api_keys')
          .update({ gemini_api_key: apiKey.trim() })
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('api_keys')
          .insert({ user_id: user.id, gemini_api_key: apiKey.trim() });
        
        if (error) throw error;
      }
      
      // Also save to localStorage for backward compatibility
      localStorage.setItem('gemini_api_key', apiKey.trim());
      
      // Save API configuration
      updateAPIConfig(apiConfig);
      
      const apiInfo = getCurrentAPIInfo();
      toast.success(`Settings saved! Using ${apiInfo.apiType} API with ${Object.values(apiInfo.features).filter(Boolean).length} features enabled.`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving API key:', error);
      toast.error('Failed to save API key');
    }
  };

  const apiInfo = getCurrentAPIInfo();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Advanced API Settings
          </DialogTitle>
          <DialogDescription>
            Configure your Gemini API key and enable advanced LangChain features for better analysis.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* API Key Section */}
          <div className="space-y-2">
            <label htmlFor="apiKey" className="text-sm font-medium">
              Gemini API Key
            </label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Get your API key from{' '}
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer" 
                className="text-primary underline hover:no-underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>
          
          <Separator />
          
          {/* Current API Status */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Info className="h-4 w-4" />
              Current API Status
            </h3>
            <div className="flex items-center gap-2">
              <Badge variant={apiInfo.apiType === 'LangChain' ? 'default' : 'secondary'}>
                {apiInfo.apiType}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {Object.values(apiInfo.features).filter(Boolean).length} features enabled
              </span>
            </div>
          </div>

          <Separator />
          
          {/* Advanced Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Advanced Features
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">
                    Enable LangChain
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Use LangChain for better prompt management and parallel processing
                  </p>
                </div>
                <Switch
                  checked={apiConfig.useLangChain}
                  onCheckedChange={(checked) => 
                    setApiConfigState({ ...apiConfig, useLangChain: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">
                    Batch Processing
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Analyze multiple clauses simultaneously for faster results
                  </p>
                </div>
                <Switch
                  checked={apiConfig.enableBatchProcessing && apiConfig.useLangChain}
                  disabled={!apiConfig.useLangChain}
                  onCheckedChange={(checked) => 
                    setApiConfigState({ ...apiConfig, enableBatchProcessing: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">
                    Advanced Prompts
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Use enhanced prompt templates for more accurate analysis
                  </p>
                </div>
                <Switch
                  checked={apiConfig.enableAdvancedPrompts && apiConfig.useLangChain}
                  disabled={!apiConfig.useLangChain}
                  onCheckedChange={(checked) => 
                    setApiConfigState({ ...apiConfig, enableAdvancedPrompts: checked })
                  }
                />
              </div>
            </div>
          </div>

          {/* Features Preview */}
          {apiConfig.useLangChain && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Enabled Features
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Parallel Processing</Badge>
                  <Badge variant="outline">Enhanced Error Handling</Badge>
                  <Badge variant="outline">Improved JSON Parsing</Badge>
                  {apiConfig.enableBatchProcessing && (
                    <Badge variant="outline">Batch Analysis</Badge>
                  )}
                  {apiConfig.enableAdvancedPrompts && (
                    <Badge variant="outline">Advanced Prompts</Badge>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button onClick={handleSaveSettings} className="gap-2">
            <Save size={16} />
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedSettingsDialog;
