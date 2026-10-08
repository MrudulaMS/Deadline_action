import React from 'react';

interface CourseTagProps {
  code: string;
  className?: string;
  title?: string;
}

export const CourseTag: React.FC<CourseTagProps> = ({ code, className = '', title }) => {
  return (
    <span
      title={title || code}
      className={`inline-flex items-center h-[22px] px-1.5 border border-[#E5E7EB] bg-[#F3F4F6] text-[#374151] rounded-[4px] text-[11px] font-medium font-mono tabular-num tracking-tight whitespace-nowrap ${className}`}
    >
      {code}
    </span>
  );
};
