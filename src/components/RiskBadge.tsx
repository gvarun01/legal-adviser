
import { cn } from "@/lib/utils";

interface RiskBadgeProps {
  level: 'high' | 'moderate' | 'low';
  className?: string;
}

const RiskBadge = ({ level, className }: RiskBadgeProps) => {
  const baseClasses = "inline-flex items-center px-3 py-1 text-xs font-medium rounded-full";
  
  const levelClasses = {
    high: "bg-legal-high/15 text-legal-high border border-legal-high/30 shadow-sm",
    moderate: "bg-legal-moderate/15 text-legal-moderate border border-legal-moderate/30 shadow-sm",
    low: "bg-legal-low/15 text-legal-low border border-legal-low/30 shadow-sm",
  };
  
  const levelLabels = {
    high: "High Risk",
    moderate: "Moderate Risk",
    low: "Low Risk",
  };
  
  return (
    <span className={cn(baseClasses, levelClasses[level], className)}>
      {levelLabels[level]}
    </span>
  );
};

export default RiskBadge;
