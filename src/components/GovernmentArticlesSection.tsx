import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import type { GovernmentArticle } from "@/lib/api-services";

interface GovernmentArticlesSectionProps {
  articles: GovernmentArticle[];
}

const GovernmentArticlesSection = ({ articles }: GovernmentArticlesSectionProps) => {
  if (!articles || articles.length === 0) return null;
  
  return (
    <Card className="mb-8 bg-card/50 backdrop-blur-sm border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="border-b border-border/20">
        <CardTitle className="text-lg flex items-center gap-2">
          <ExternalLink size={18} className="text-primary" />
          Related Government Articles
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {articles.map((article, index) => (
            <div key={index} className="p-4 rounded-lg bg-secondary/20 border border-border/20">
              <a 
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 transition-colors flex items-center gap-2 mb-2"
              >
                <h3 className="text-base font-medium">{article.title}</h3>
                <ExternalLink size={14} />
              </a>
              <p className="text-sm text-foreground/80">{article.relevance}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default GovernmentArticlesSection; 