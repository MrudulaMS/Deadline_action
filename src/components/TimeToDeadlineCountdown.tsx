import React, { useState, useEffect } from 'react';
import { Deadline } from '../types';
import { CourseTag } from './CourseTag';
import { Clock, AlertTriangle, ArrowRight, Hourglass, Zap } from 'lucide-react';

interface TimeToDeadlineCountdownProps {
  deadlines: Deadline[];
  onSelectDate?: (dateStr: string) => void;
}

interface CountdownItem {
  deadline: Deadline;
  targetTime: number;
  diffMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isOverdue: boolean;
  urgency: 'critical' | 'warning' | 'normal' | 'distant';
}

export const TimeToDeadlineCountdown: React.FC<TimeToDeadlineCountdownProps> = ({
  deadlines,
  onSelectDate,
}) => {
  const [now, setNow] = useState<number>(() => Date.now());

  // Tick every second for true real-time precision
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute countdown for active (unsubmitted) deadlines
  const upcomingDeadlines: CountdownItem[] = deadlines
    .filter((d) => d.status !== 'submitted')
    .map((d) => {
      // Parse deadline target time (e.g. 2026-10-11T23:59:00)
      const timeStr = d.dueTime ? (d.dueTime.length === 5 ? `${d.dueTime}:00` : d.dueTime) : '23:59:00';
      const targetTime = new Date(`${d.dueDate}T${timeStr}`).getTime();
      const diffMs = targetTime - now;

      const isOverdue = diffMs <= 0;
      const absDiff = Math.abs(diffMs);
      const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

      let urgency: 'critical' | 'warning' | 'normal' | 'distant' = 'normal';
      if (isOverdue || diffMs < 24 * 60 * 60 * 1000) {
        urgency = 'critical'; // < 24h
      } else if (diffMs < 72 * 60 * 60 * 1000) {
        urgency = 'warning'; // 24h to 72h (1-3 days)
      } else if (diffMs < 7 * 24 * 60 * 60 * 1000) {
        urgency = 'normal'; // 3 to 7 days
      } else {
        urgency = 'distant';
      }

      return {
        deadline: d,
        targetTime,
        diffMs,
        days,
        hours,
        minutes,
        seconds,
        isOverdue,
        urgency,
      };
    })
    // Sort chronologically ascending
    .sort((a, b) => a.targetTime - b.targetTime)
    // Highlight exactly the next 3 approaching deliverables
    .slice(0, 3);

  if (upcomingDeadlines.length === 0) {
    return null;
  }

  const formatShortDate = (dateStr: string, timeStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[d.getMonth()]} ${d.getDate()} · ${timeStr}`;
    } catch (e) {
      return `${dateStr} ${timeStr}`;
    }
  };

  return (
    <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 sm:p-5 space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E5E7EB] gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[6px] bg-[#1E3A8A] text-white flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#111827] tracking-tight">
                Time-to-Deadline Radar
              </h2>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] bg-[#FEF2F2] border border-[#FECACA] text-[10px] font-semibold text-[#DC2626]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse" />
                Live Countdown
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Next 3 approaching deliverables with real-time submission urgency.
            </p>
          </div>
        </div>

        <div className="text-xs text-[#4B5563] tabular-num font-medium flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#DC2626]" /> &lt;24h Crunch
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#D97706]" /> 1–3 Days
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#1E3A8A]" /> 3+ Days
          </span>
        </div>
      </div>

      {/* Next 3 approaching countdown cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {upcomingDeadlines.map((item, index) => {
          const { deadline, days, hours, minutes, seconds, isOverdue, urgency } = item;

          // Theme styling based on urgency tier
          let containerStyle = 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]';
          let badgeBg = 'bg-[#F1F5F9] text-[#1E3A8A] border-[#CBD5E1]';
          let digitBoxBg = 'bg-[#F8FAFC] text-[#1E3A8A] border-[#E2E8F0]';
          let labelText = 'Standard Pacing';

          if (isOverdue) {
            containerStyle = 'border-[#FCA5A5] bg-[#FEF2F2]/60 ring-1 ring-[#DC2626]';
            badgeBg = 'bg-[#DC2626] text-white border-transparent';
            digitBoxBg = 'bg-white text-[#DC2626] border-[#FECACA]';
            labelText = 'OVERDUE';
          } else if (urgency === 'critical') {
            containerStyle = 'border-[#FECACA] bg-[#FFF5F5] ring-1 ring-[#EF4444]';
            badgeBg = 'bg-[#DC2626] text-white border-transparent';
            digitBoxBg = 'bg-white text-[#DC2626] border-[#FECACA]';
            labelText = 'CRITICAL · Due Soon';
          } else if (urgency === 'warning') {
            containerStyle = 'border-[#FDE68A] bg-[#FFFDF5]';
            badgeBg = 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
            digitBoxBg = 'bg-white text-[#D97706] border-[#FDE68A]';
            labelText = 'Approaching Fast';
          }

          return (
            <div
              key={deadline.id}
              onClick={() => onSelectDate?.(deadline.dueDate)}
              className={`p-4 rounded-[8px] border transition-all cursor-pointer flex flex-col justify-between space-y-3.5 ${containerStyle}`}
            >
              {/* Top row: Priority index, Course Tag, and Urgency indicator */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="w-5 h-5 rounded-[4px] bg-[#111827] text-white text-[10px] font-bold flex items-center justify-center tabular-num shrink-0">
                    #{index + 1}
                  </span>
                  <CourseTag code={deadline.courseCode} />
                  <span className="text-[11px] px-1.5 py-0.5 rounded-[3px] bg-[#F3F4F6] border border-[#E5E7EB] text-[#4B5563] font-medium">
                    {deadline.category}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-[4px] border whitespace-nowrap shrink-0 ${badgeBg}`}
                >
                  {labelText}
                </span>
              </div>

              {/* Title & Target Due Details */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-[#111827] line-clamp-2 leading-snug">
                  {deadline.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                  <span>Due: <strong className="text-[#374151] font-semibold">{formatShortDate(deadline.dueDate, deadline.dueTime)}</strong></span>
                  <span>·</span>
                  <span className="tabular-num">Weight: <strong>{deadline.weight}%</strong></span>
                </div>
              </div>

              {/* Live Countdown Digits */}
              <div className="pt-2 border-t border-black/5 space-y-1.5">
                <div className="text-[10px] uppercase font-semibold tracking-wider text-[#6B7280] flex items-center justify-between">
                  <span>Time Remaining</span>
                  <span className="tabular-num text-[11px] text-[#4B5563] font-medium">
                    {deadline.estimatedHours.toFixed(1)}h work needed
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {/* Days */}
                  <div className={`p-1.5 rounded-[4px] border ${digitBoxBg}`}>
                    <div className="text-base sm:text-lg font-bold font-mono tabular-num leading-tight">
                      {String(days).padStart(2, '0')}
                    </div>
                    <div className="text-[9px] uppercase font-medium text-[#6B7280]">Days</div>
                  </div>

                  {/* Hours */}
                  <div className={`p-1.5 rounded-[4px] border ${digitBoxBg}`}>
                    <div className="text-base sm:text-lg font-bold font-mono tabular-num leading-tight">
                      {String(hours).padStart(2, '0')}
                    </div>
                    <div className="text-[9px] uppercase font-medium text-[#6B7280]">Hours</div>
                  </div>

                  {/* Minutes */}
                  <div className={`p-1.5 rounded-[4px] border ${digitBoxBg}`}>
                    <div className="text-base sm:text-lg font-bold font-mono tabular-num leading-tight">
                      {String(minutes).padStart(2, '0')}
                    </div>
                    <div className="text-[9px] uppercase font-medium text-[#6B7280]">Mins</div>
                  </div>

                  {/* Seconds */}
                  <div className={`p-1.5 rounded-[4px] border ${digitBoxBg}`}>
                    <div className="text-base sm:text-lg font-bold font-mono tabular-num leading-tight">
                      {String(seconds).padStart(2, '0')}
                    </div>
                    <div className="text-[9px] uppercase font-medium text-[#6B7280]">Secs</div>
                  </div>
                </div>
              </div>

              {/* Footer action hint */}
              <div className="flex items-center justify-between text-[11px] text-[#1E3A8A] font-semibold pt-1 group">
                <span className="flex items-center gap-1 group-hover:underline">
                  <span>Inspect in Agenda</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
                {urgency === 'critical' && (
                  <span className="text-[10px] text-[#DC2626] font-medium flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-[#DC2626]" /> High Velocity
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
