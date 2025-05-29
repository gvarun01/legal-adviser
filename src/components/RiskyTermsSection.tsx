
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import RiskBadge from "@/components/RiskBadge";
import type { AnalysisResponse } from "@/lib/api-services";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface RiskyTermsSectionProps {
  analysis: AnalysisResponse | null;
}

const RiskyTermsSection = ({ analysis }: RiskyTermsSectionProps) => {
  if (!analysis) return null;
  
  return (
    <Card className="mb-8 bg-card/50 backdrop-blur-sm border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="border-b border-border/20">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle size={18} className="text-legal-moderate" />
          {analysis.riskyTerms.length > 0 ? 'Risky Terms Detected' : 'Risk Analysis'}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {analysis.riskyTerms.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-muted/30">
                  <TableHead className="w-[180px] font-semibold">Term</TableHead>
                  <TableHead className="w-[120px] font-semibold">Risk Level</TableHead>
                  <TableHead className="font-semibold">Explanation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.riskyTerms.map((term, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/20">
                    <TableCell className="font-semibold text-legal-action">{term.term}</TableCell>
                    <TableCell>
                      <RiskBadge level={term.severity} />
                    </TableCell>
                    <TableCell className="text-foreground/90">{term.explanation}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="p-3 rounded-full bg-green-500/10 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <p className="text-md font-medium text-foreground">No risky terms detected</p>
            <p className="text-sm text-muted-foreground text-center">
              This text appears to be safe from a legal risk perspective. No concerning terms were identified.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RiskyTermsSection;
