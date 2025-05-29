import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from '@/components/ui/sonner';
import { Save, Zap, Brain, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { loadAPIConfig, updateAPIConfig, getCurrentAPIInfo, type APIConfig } from '@/lib/api-wrapper';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const [apiKey, setApiKey] = useState('');
  const [apiConfig, setApiConfigState] = useState<APIConfig>({
    useLangChain: true,
    enableBatchProcessing: true,
    enableAdvancedPrompts: true
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
      
      toast.success('Settings saved successfully!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving API key:', error);
      toast.error('Failed to save API key');
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API Settings</DialogTitle>
          <DialogDescription>
            Enter your Gemini API key to enable AI analysis features.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="apiKey" className="text-sm font-medium">
              Gemini API Key
            </label>
            <Input
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              You can get your Gemini API key from the <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-legal-action underline">Google AI Studio</a>.
            </p>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-sm font-medium">Advanced Settings</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Enable LangChain
                </label>
                <Switch
                  checked={apiConfig.useLangChain}
                  onCheckedChange={(checked) => setApiConfigState({ ...apiConfig, useLangChain: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Enable Batch Processing
                </label>
                <Switch
                  checked={apiConfig.enableBatchProcessing}
                  onCheckedChange={(checked) => setApiConfigState({ ...apiConfig, enableBatchProcessing: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Enable Advanced Prompts
                </label>
                <Switch
                  checked={apiConfig.enableAdvancedPrompts}
                  onCheckedChange={(checked) => setApiConfigState({ ...apiConfig, enableAdvancedPrompts: checked })}
                />
              </div>
            </div>
          </div>
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

export default SettingsDialog;
