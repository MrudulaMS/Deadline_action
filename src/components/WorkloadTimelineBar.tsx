import React from 'react';
import { WorkloadTier } from '../types';

interface WorkloadTimelineBarProps {
  totalHours: number;
  capacityLimit?: number;
  tier?: WorkloadTier;
  segments?: {
    hours: number;
    color: string;
    label?: string;
  }[];
  className?: string;
}

export const WorkloadTimelineBar: React.FC<WorkloadTimelineBarProps> = ({
  totalHours,
  capacityLimit = 6.0,
  tier,
  segments,
  className = '',
}) => {
  // Determine color based on tier or hours vs capacity
  const getColorForTier = (t?: WorkloadTier): string => {
    if (t === 'Light') return '#059669';
    if (t === 'Moderate') return '#D97706';
    if (t === 'Heavy') return '#EA580C';
    if (t === 'Overloaded') return '#DC2626';

    const ratio = totalHours / capacityLimit;
    if (ratio <= 0.5) return '#059669';
    if (ratio <= 0.85) return '#D97706';
    if (ratio <= 1.15) return '#EA580C';
    return '#DC2626';
  };

  const maxBaseline = Math.max(capacityLimit * 1.5, totalHours, 8.0);
  const fillPercentage = Math.min(100, Math.max(0, (totalHours / maxBaseline) * 100));

  return (
    <div className={`w-full ${className}`}>
      <div className="w-full h-2 bg-[#E5E7EB] rounded-[4px] overflow-hidden flex relative">
        {segments && segments.length > 0 ? (
          segments.map((seg, idx) => {
            const widthPct = Math.min(100, (seg.hours / maxBaseline) * 100);
            return (
              <div
                key={idx}
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: seg.color,
                }}
                className="h-full first:rounded-l-[4px] last:rounded-r-[4px]"
                title={`${seg.label || 'Task'}: ${seg.hours.toFixed(1)}h`}
              />
            );
          })
        ) : (
          <div
            style={{
              width: `${fillPercentage}%`,
              backgroundColor: getColorForTier(tier),
            }}
            className="h-full rounded-[4px] transition-all duration-200"
          />
        )}
      </div>
    </div>
  );
};
