import React from 'react';
import { WorkloadTier } from '../types';

interface WorkloadBadgeProps {
  tier: WorkloadTier;
  className?: string;
  showDot?: boolean;
}

export const WorkloadBadge: React.FC<WorkloadBadgeProps> = ({ tier, className = '' }) => {
  const getStyles = () => {
    switch (tier) {
      case 'Light':
        return {
          bg: 'bg-[#ECFDF5]',
          border: 'border-[#A7F3D0]',
          text: 'text-[#059669]',
          label: 'Light',
        };
      case 'Moderate':
        return {
          bg: 'bg-[#FFFBEB]',
          border: 'border-[#FDE68A]',
          text: 'text-[#D97706]',
          label: 'Moderate',
        };
      case 'Heavy':
        return {
          bg: 'bg-[#FFF7ED]',
          border: 'border-[#FED7AA]',
          text: 'text-[#EA580C]',
          label: 'Heavy',
        };
      case 'Overloaded':
      default:
        return {
          bg: 'bg-[#FEF2F2]',
          border: 'border-[#FECACA]',
          text: 'text-[#DC2626]',
          label: 'Overloaded',
        };
    }
  };

  const style = getStyles();

  return (
    <span
      className={`inline-flex items-center h-6 px-2 py-0.5 border rounded-[4px] text-[11px] font-semibold tracking-[0.05em] uppercase whitespace-nowrap ${style.bg} ${style.border} ${style.text} ${className}`}
    >
      {style.label}
    </span>
  );
};
