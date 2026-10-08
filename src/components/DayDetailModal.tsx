import React from 'react';
import { DailyWorkload } from '../types';
import { WorkloadBadge } from './WorkloadBadge';
import { CourseTag } from './CourseTag';
import { X, Calendar, Clock, CheckCircle2 } from 'lucide-react';

interface DayDetailModalProps {
  day: DailyWorkload | null;
  onClose: () => void;
  onToggleMilestone: (deadlineId: string, milestoneId: string) => void;
  onLogHours: (deadlineId: string, hours: number) => void;
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({
  day,
  onClose,
  onToggleMilestone,
  onLogHours,
}) => {
  if (!day) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-[8px] border border-[#D1D5DB] shadow-[0_4px_6px_-1px_rgba(15,23,42,0.1)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-[#1E3A8A]" />
            <h3 className="text-base font-semibold text-[#111827]">
              Day Inspector: {day.dayLabel}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <WorkloadBadge tier={day.tier} />
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[#6B7280] hover:text-[#111827] rounded-[4px] hover:bg-[#F3F4F6] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Summary metrics */}
          <div className="grid grid-cols-2 gap-3 bg-[#F9FAFB] p-3 rounded-[6px] border border-[#E5E7EB]">
            <div>
              <div className="text-[11px] text-[#6B7280] uppercase tracking-[0.05em] font-medium">
                Committed Effort
              </div>
              <div className="text-xl font-semibold text-[#111827] tabular-num mt-0.5">
                {day.totalHours.toFixed(1)} hrs
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#6B7280] uppercase tracking-[0.05em] font-medium">
                Capacity Threshold
              </div>
              <div className="text-xl font-semibold text-[#4B5563] tabular-num mt-0.5">
                {day.capacityLimit.toFixed(1)} hrs/day
              </div>
            </div>
          </div>

          {/* Deadlines due on this day */}
          <div>
            <h4 className="text-xs font-semibold text-[#4B5563] uppercase tracking-[0.05em] mb-2">
              Deliverables Due ({day.deadlinesDue.length})
            </h4>
            {day.deadlinesDue.length > 0 ? (
              <div className="space-y-2">
                {day.deadlinesDue.map((dl) => (
                  <div
                    key={dl.id}
                    className="p-3 rounded-[6px] border border-[#E5E7EB] bg-white space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <CourseTag code={dl.courseCode} />
                          <span className="text-xs font-semibold text-[#111827]">{dl.title}</span>
                        </div>
                        <div className="text-xs text-[#6B7280] mt-1 tabular-num">
                          Due {dl.dueTime} · Weight: <strong>{dl.weight.toFixed(1)}%</strong>
                        </div>
                      </div>
                      <WorkloadBadge tier={dl.workloadTier} />
                    </div>

                    {dl.milestones.length > 0 && (
                      <div className="pt-2 border-t border-[#F3F4F6] space-y-1">
                        {dl.milestones.map((ms) => (
                          <label
                            key={ms.id}
                            className="flex items-center gap-2 text-xs text-[#374151] cursor-pointer"
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
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-[#6B7280] border border-dashed border-[#E5E7EB] rounded-[6px]">
                No deadlines due today.
              </div>
            )}
          </div>

          {/* Study tasks */}
          <div>
            <h4 className="text-xs font-semibold text-[#4B5563] uppercase tracking-[0.05em] mb-2">
              Planned Study Sessions ({day.studyTasks.length})
            </h4>
            {day.studyTasks.length > 0 ? (
              <div className="space-y-1.5">
                {day.studyTasks.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-[4px] border border-[#E5E7EB] bg-white flex items-center justify-between text-xs gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <CourseTag code={t.courseCode} />
                      <span className="font-medium text-[#111827]">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#6B7280] tabular-num font-semibold">
                        {t.hours.toFixed(1)}h
                      </span>
                      <button
                        type="button"
                        onClick={() => onLogHours(t.deadlineId, 1.0)}
                        className="px-2 py-0.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] border border-[#D1D5DB] rounded-[3px] text-[11px]"
                      >
                        +1h Done
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-[#6B7280] border border-dashed border-[#E5E7EB] rounded-[6px]">
                No study blocks assigned.
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-[#E5E7EB] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-[36px] px-4 bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] text-xs font-medium hover:bg-[#F9FAFB]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
