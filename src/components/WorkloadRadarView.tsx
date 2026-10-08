import React, { useState } from 'react';
import { Deadline, DailyWorkload, ClashAlert } from '../types';
import { WorkloadTimelineBar } from './WorkloadTimelineBar';
import { WorkloadBadge } from './WorkloadBadge';
import { CourseTag } from './CourseTag';
import { AlertTriangle, Clock, CheckCircle2, ChevronRight, Sliders, Calendar, ArrowRight } from 'lucide-react';

interface WorkloadRadarViewProps {
  deadlines: Deadline[];
  dailyWorkloads: DailyWorkload[];
  clashAlerts: ClashAlert[];
  horizonDays: number;
  onHorizonDaysChange: (days: number) => void;
  capacityLimit: number;
  onCapacityLimitChange: (cap: number) => void;
  onSelectDay: (day: DailyWorkload) => void;
  onNavigateToSimulator: () => void;
  onToggleMilestone: (deadlineId: string, milestoneId: string) => void;
  onLogHours: (deadlineId: string, additionalHours: number) => void;
}

export const WorkloadRadarView: React.FC<WorkloadRadarViewProps> = ({
  deadlines,
  dailyWorkloads,
  clashAlerts,
  horizonDays,
  onHorizonDaysChange,
  capacityLimit,
  onCapacityLimitChange,
  onSelectDay,
  onNavigateToSimulator,
  onToggleMilestone,
  onLogHours,
}) => {
  const [selectedDateStr, setSelectedDateStr] = useState<string>(dailyWorkloads[0]?.date || '');

  // Calculate high-level summary metrics
  const activeDeadlines = deadlines.filter((d) => d.status !== 'submitted');
  const totalRemainingHours = activeDeadlines.reduce(
    (sum, d) => sum + Math.max(0, d.estimatedHours - d.completedHours),
    0
  );
  const totalWeightAtStake = activeDeadlines.reduce((sum, d) => sum + d.weight, 0);

  // Peak stress day
  const peakDay = dailyWorkloads.reduce(
    (max, day) => (day.totalHours > max.totalHours ? day : max),
    dailyWorkloads[0] || { totalHours: 0, dayLabel: 'None', date: '' }
  );

  const selectedDayData = dailyWorkloads.find((d) => d.date === selectedDateStr) || dailyWorkloads[0];

  return (
    <div className="space-y-6">
      {/* Top Controls & Metrics Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-[8px] border border-[#E5E7EB]">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#111827]">
            Workload Distribution & Clash Radar
          </h1>
          <p className="text-xs text-[#4B5563] mt-0.5">
            Real-time effort velocity mapping across your academic calendar to eliminate crunch spikes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Capacity input */}
          <div className="flex items-center gap-2 bg-[#F9FAFB] px-3 py-1.5 rounded-[6px] border border-[#E5E7EB]">
            <span className="text-xs text-[#4B5563] font-medium">Daily Limit:</span>
            <input
              type="number"
              min="2"
              max="12"
              step="0.5"
              value={capacityLimit}
              onChange={(e) => onCapacityLimitChange(Number(e.target.value) || 6)}
              className="w-14 h-7 text-xs font-semibold tabular-num text-[#111827] bg-white border border-[#D1D5DB] rounded-[4px] px-1.5 text-center focus:outline-none focus:border-[#1E3A8A]"
            />
            <span className="text-xs text-[#6B7280]">hrs/day</span>
          </div>

          {/* Horizon toggle: 14 vs 30 days */}
          <div className="flex items-center bg-[#F3F4F6] p-0.5 rounded-[6px] border border-[#E5E7EB]">
            <button
              type="button"
              onClick={() => onHorizonDaysChange(14)}
              className={`px-3 py-1 text-xs font-medium rounded-[4px] transition-colors tabular-num ${
                horizonDays === 14 ? 'bg-white text-[#111827] shadow-sm font-semibold' : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              14-Day Radar
            </button>
            <button
              type="button"
              onClick={() => onHorizonDaysChange(30)}
              className={`px-3 py-1 text-xs font-medium rounded-[4px] transition-colors tabular-num ${
                horizonDays === 30 ? 'bg-white text-[#111827] shadow-sm font-semibold' : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              30-Day Radar
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric Panels (Layer 1: 1px border, 8px radius, no shadow) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4">
          <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-[0.05em] pb-1 border-b border-[#F3F4F6]">
            Total Workload Queue
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-[#111827] tabular-num">
              {totalRemainingHours.toFixed(1)}
              <span className="text-xs font-normal text-[#6B7280] ml-1">hrs</span>
            </span>
            <span className="text-xs text-[#4B5563] tabular-num">
              {activeDeadlines.length} deliverables
            </span>
          </div>
          <div className="text-xs text-[#6B7280] mt-1">
            Across next {horizonDays} days
          </div>
        </div>

        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4">
          <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-[0.05em] pb-1 border-b border-[#F3F4F6]">
            Grade Weight at Stake
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-[#111827] tabular-num">
              {totalWeightAtStake.toFixed(1)}%
            </span>
            <span className="text-xs text-[#4B5563] tabular-num">
              of term total
            </span>
          </div>
          <div className="text-xs text-[#6B7280] mt-1">
            Weighted syllabus impact
          </div>
        </div>

        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4">
          <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-[0.05em] pb-1 border-b border-[#F3F4F6]">
            Peak Strain Concentration
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-[#DC2626] tabular-num">
              {peakDay.totalHours.toFixed(1)}
              <span className="text-xs font-normal text-[#6B7280] ml-1">hrs</span>
            </span>
            <span className="text-xs font-medium text-[#111827]">
              {peakDay.shortDay}
            </span>
          </div>
          <div className="text-xs text-[#DC2626] mt-1 font-medium">
            {peakDay.totalHours > capacityLimit ? `+${(peakDay.totalHours - capacityLimit).toFixed(1)}h over capacity` : 'Within limits'}
          </div>
        </div>

        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4">
          <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-[0.05em] pb-1 border-b border-[#F3F4F6]">
            Clash Bottlenecks
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className={`text-2xl font-semibold tabular-num ${clashAlerts.length > 0 ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
              {clashAlerts.length}
            </span>
            <span className="text-xs text-[#4B5563]">
              {clashAlerts.length === 1 ? 'day affected' : 'days affected'}
            </span>
          </div>
          <div className="text-xs text-[#6B7280] mt-1">
            {clashAlerts.length > 0 ? 'Requires prep redistribution' : 'Pacing currently smooth'}
          </div>
        </div>
      </div>

      {/* Clash Alert Warning Banner (if clashes exist) */}
      {clashAlerts.length > 0 && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" strokeWidth={1.75} />
              <div>
                <h3 className="text-sm font-semibold text-[#991B1B]">
                  Academic Clash Detected ({clashAlerts.length} Peak Bottleneck{clashAlerts.length > 1 ? 's' : ''})
                </h3>
                <p className="text-xs text-[#B91C1C] mt-0.5">
                  Overlapping high-stake assignments will exceed your daily study threshold unless distributed in advance.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onNavigateToSimulator}
              className="h-[34px] px-3 bg-[#1E3A8A] text-white rounded-[6px] text-xs font-medium hover:bg-[#172554] transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <Sliders className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Balance in Simulator</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-[#FECACA]">
            {clashAlerts.map((clash) => (
              <div
                key={clash.id}
                onClick={() => setSelectedDateStr(clash.date)}
                className="bg-white/80 p-2.5 rounded-[6px] border border-[#FCA5A5] cursor-pointer hover:bg-white transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#111827]">{clash.dayLabel}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#DC2626] tabular-num">
                      {clash.totalHours.toFixed(1)}h load
                    </span>
                    <WorkloadBadge tier={clash.severity} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {clash.deadlines.map((d) => (
                    <span
                      key={d.id}
                      className="text-[11px] px-1.5 py-0.5 bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151] rounded-[3px] font-medium"
                    >
                      {d.courseCode}: {d.title.length > 25 ? `${d.title.slice(0, 25)}…` : d.title} ({d.weight}%)
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-[#4B5563] mt-1.5 line-clamp-1">
                  {clash.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Horizon Timeline Grid */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E7EB] gap-2">
          <div>
            <h2 className="text-base font-semibold text-[#111827]">
              {horizonDays}-Day Workload Velocity Radar
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Click any calendar day to inspect scheduled effort, study blocks, and submissions due.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#4B5563]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#059669]" /> Light (&lt;2.5h)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#D97706]" /> Moderate (2.5–5h)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#EA580C]" /> Heavy (5–6.5h)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#DC2626]" /> Overloaded (&gt;6.5h)
            </span>
          </div>
        </div>

        {/* Scrollable / Responsive timeline columns */}
        <div className="mt-4 overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-[760px]">
            {dailyWorkloads.map((day) => {
              const isSelected = day.date === selectedDateStr;
              const hasDue = day.deadlinesDue.length > 0;
              const isOverCap = day.totalHours > capacityLimit;

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => {
                    setSelectedDateStr(day.date);
                    onSelectDay(day);
                  }}
                  className={`flex-1 min-w-[62px] p-2 rounded-[6px] border text-left transition-all relative ${
                    isSelected
                      ? 'border-[#1E3A8A] bg-[#F1F3FF] ring-1 ring-[#1E3A8A]'
                      : 'border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] hover:border-[#D1D5DB]'
                  }`}
                >
                  {/* Day header */}
                  <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">
                    {day.shortDay.split(' ')[0]}
                  </div>
                  <div className="text-sm font-semibold text-[#111827] tabular-num">
                    {day.shortDay.split(' ')[1]}
                  </div>

                  {/* Hours badge */}
                  <div className="mt-2">
                    <span
                      className={`text-xs font-semibold tabular-num block ${
                        isOverCap ? 'text-[#DC2626]' : 'text-[#111827]'
                      }`}
                    >
                      {day.totalHours.toFixed(1)}h
                    </span>
                  </div>

                  {/* Workload timeline bar */}
                  <div className="mt-2">
                    <WorkloadTimelineBar
                      totalHours={day.totalHours}
                      capacityLimit={capacityLimit}
                      tier={day.tier}
                    />
                  </div>

                  {/* Deliverables counter or indicator */}
                  <div className="mt-2.5 min-h-[20px] flex items-center justify-between">
                    {hasDue ? (
                      <span className="px-1.5 py-0.5 bg-[#1E3A8A] text-white text-[10px] font-semibold rounded-[3px] tabular-num whitespace-nowrap">
                        {day.deadlinesDue.length} due
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#9CA3AF]">—</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Day Agenda & Action Plan */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E5E7EB] gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[6px] bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#1E3A8A]">
              <Calendar className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#111827]">
                Agenda for {selectedDayData?.dayLabel}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-[#6B7280]">
                <span>Total planned study: <strong className="text-[#111827] tabular-num">{selectedDayData?.totalHours.toFixed(1)} hrs</strong></span>
                <span>·</span>
                <span>Capacity threshold: <strong className="text-[#111827] tabular-num">{capacityLimit.toFixed(1)} hrs</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <WorkloadBadge tier={selectedDayData?.tier || 'Light'} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {/* Submissions Due on this day */}
          <div>
            <h4 className="text-xs font-semibold text-[#4B5563] uppercase tracking-[0.05em] mb-2.5">
              Deliverables Due ({selectedDayData?.deadlinesDue.length || 0})
            </h4>

            {selectedDayData && selectedDayData.deadlinesDue.length > 0 ? (
              <div className="space-y-2.5">
                {selectedDayData.deadlinesDue.map((dl) => (
                  <div
                    key={dl.id}
                    className="p-3 rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB] hover:border-[#D1D5DB] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CourseTag code={dl.courseCode} />
                          <span className="text-xs font-semibold text-[#111827]">{dl.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                          <span>Due {dl.dueTime}</span>
                          <span>·</span>
                          <span className="tabular-num">Weight: <strong>{dl.weight.toFixed(1)}%</strong></span>
                          <span>·</span>
                          <span className="tabular-num">Effort: <strong>{dl.estimatedHours.toFixed(1)}h</strong></span>
                        </div>
                      </div>

                      <WorkloadBadge tier={dl.workloadTier} />
                    </div>

                    {/* Milestone quick progress */}
                    {dl.milestones.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-[#E5E7EB] space-y-1">
                        <span className="text-[11px] font-medium text-[#4B5563] block">
                          Milestone Sub-tasks:
                        </span>
                        {dl.milestones.map((ms) => (
                          <label
                            key={ms.id}
                            className="flex items-center gap-2 text-xs text-[#374151] cursor-pointer hover:text-[#111827]"
                          >
                            <input
                              type="checkbox"
                              checked={ms.completed}
                              onChange={() => onToggleMilestone(dl.id, ms.id)}
                              className="w-4 h-4 rounded-[3px] border-[#D1D5DB] text-[#1E3A8A] focus:ring-0"
                            />
                            <span className={ms.completed ? 'line-through text-[#9CA3AF]' : ''}>
                              {ms.title}
                            </span>
                            <span className="text-[11px] text-[#6B7280] ml-auto tabular-num">
                              {ms.estimatedHours}h
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-[#E5E7EB] rounded-[6px] text-xs text-[#6B7280]">
                No deliverables due on this date. Focus on forward preparation below.
              </div>
            )}
          </div>

          {/* Recommended Study & Prep Allocations for this day */}
          <div>
            <h4 className="text-xs font-semibold text-[#4B5563] uppercase tracking-[0.05em] mb-2.5">
              Recommended Study & Prep Allocations ({selectedDayData?.studyTasks.length || 0})
            </h4>

            {selectedDayData && selectedDayData.studyTasks.length > 0 ? (
              <div className="space-y-2">
                {selectedDayData.studyTasks.map((task, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-[6px] border border-[#E5E7EB] bg-white flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <CourseTag code={task.courseCode} />
                      <div>
                        <div className="text-xs font-medium text-[#111827]">{task.title}</div>
                        <div className="text-[11px] text-[#6B7280]">
                          Recommended dedicated session: <span className="font-semibold text-[#111827] tabular-num">{task.hours.toFixed(1)}h</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onLogHours(task.deadlineId, 1.0)}
                        title="Log 1 hour completed"
                        className="h-[28px] px-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#111827] border border-[#D1D5DB] rounded-[4px] text-[11px] font-medium transition-colors"
                      >
                        +1h Done
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-[#E5E7EB] rounded-[6px] text-xs text-[#6B7280]">
                No active study blocks scheduled for this day.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
