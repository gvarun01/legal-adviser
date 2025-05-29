
import React from 'react';
import { Button } from "@/components/ui/button";
import { Settings } from 'lucide-react';

interface AppHeaderProps {
  setSettingsOpen: (open: boolean) => void;
}

const AppHeader = ({ setSettingsOpen }: AppHeaderProps) => {
  return (
    <div className="flex flex-col items-center text-center mb-8">
      <div className="w-full flex justify-end mb-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setSettingsOpen(true)}
          className="gap-1"
        >
          <Settings size={16} />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </div>
      <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-legal-action via-teal-300 to-legal-action bg-clip-text text-transparent">
        ClearClause: AI Legal Simplifier
      </h1>
      <p className="text-md md:text-lg text-muted-foreground mt-2 max-w-2xl">
        Understand legal clauses in plain English. No lawyer needed.
      </p>
    </div>
  );
};

export default AppHeader;
