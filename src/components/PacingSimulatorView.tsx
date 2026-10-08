import React, { useState } from 'react';
import { Deadline } from '../types';
import { simulateBalancedPacing, BASE_DATE_STR } from '../utils/workloadMath';
import { WorkloadTimelineBar } from './WorkloadTimelineBar';
import { WorkloadBadge } from './WorkloadBadge';
import { CourseTag } from './CourseTag';
import { Sliders, CheckCircle2, TrendingDown, Calendar, AlertCircle } from 'lucide-react';

interface PacingSimulatorViewProps {
  deadlines: Deadline[];
  onApplySchedule: () => void;
}

export const PacingSimulatorView: React.FC<PacingSimulatorViewProps> = ({
  deadlines,
  onApplySchedule,
}) => {
  const [targetDailyCap, setTargetDailyCap] = useState<number>(5.5);
  const [simulationDays, setSimulationDays] = useState<number>(14);
  const [applied, setApplied] = useState<boolean>(false);

  const simulation = simulateBalancedPacing(deadlines, simulationDays, targetDailyCap, BASE_DATE_STR);

  const originalOverloadedDays = simulation.originalWorkload.filter(
    (d) => d.totalHours > targetDailyCap
  ).length;
  const balancedOverloadedDays = simulation.balancedWorkload.filter(
    (d) => d.totalHours > targetDailyCap
  ).length;

  const originalPeakHour = Math.max(...simulation.originalWorkload.map((d) => d.totalHours));
  const balancedPeakHour = Math.max(...simulation.balancedWorkload.map((d) => d.totalHours));

  const handleApply = () => {
    setApplied(true);
    onApplySchedule();
    setTimeout(() => setApplied(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Simulation Sliders */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-[#111827]">
              Pacing Balancer & Anti-Crunch Simulator
            </h2>
            <p className="text-xs text-[#4B5563] mt-0.5">
              Simulate early-start study distributions to flatten peak strain curves and prevent late-night cramming.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleApply}
              className="h-[38px] px-4 bg-[#1E3A8A] text-white rounded-[6px] text-xs font-medium hover:bg-[#172554] transition-colors flex items-center gap-1.5 shadow-none"
            >
              <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
              <span>{applied ? 'Schedule Applied!' : 'Commit Pacing to Plan'}</span>
            </button>
          </div>
        </div>

        {/* Controls Row */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#F9FAFB] p-3 rounded-[6px] border border-[#E5E7EB] space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-[#111827]">
              <span>Max Daily Study Target</span>
              <span className="text-[#1E3A8A] font-semibold tabular-num">
                {targetDailyCap.toFixed(1)} hrs / day
              </span>
            </div>
            <input
              type="range"
              min="3.0"
              max="9.0"
              step="0.5"
              value={targetDailyCap}
              onChange={(e) => setTargetDailyCap(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#D1D5DB] rounded-lg appearance-none cursor-pointer accent-[#1E3A8A]"
            />
            <div className="flex justify-between text-[11px] text-[#6B7280]">
              <span>3.0h (Relaxed)</span>
              <span>5.5h (Standard)</span>
              <span>9.0h (Intense)</span>
            </div>
          </div>

          <div className="bg-[#F9FAFB] p-3 rounded-[6px] border border-[#E5E7EB] space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-[#111827]">
              <span>Simulation Horizon Window</span>
              <span className="text-[#1E3A8A] font-semibold tabular-num">
                {simulationDays} Days
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {[7, 14, 21, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setSimulationDays(days)}
                  className={`flex-1 py-1 text-xs font-medium rounded-[4px] border transition-colors ${
                    simulationDays === days
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                      : 'bg-white text-[#4B5563] border-[#D1D5DB] hover:bg-[#F3F4F6]'
                  }`}
                >
                  {days} Days
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Impact Comparison Cards (Layer 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4">
          <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-[0.05em] pb-1 border-b border-[#F3F4F6]">
            Peak Strain Reduction
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-[#059669] tabular-num flex items-center gap-1">
              <TrendingDown className="w-5 h-5" strokeWidth={2} />
              -{(originalPeakHour - balancedPeakHour).toFixed(1)}h
            </span>
            <span className="text-xs text-[#6B7280] tabular-num">
              {originalPeakHour.toFixed(1)}h → {balancedPeakHour.toFixed(1)}h
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            Max single-day bottleneck peak reduced
          </p>
        </div>

        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4">
          <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-[0.05em] pb-1 border-b border-[#F3F4F6]">
            Crunch Days Eliminated
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-[#111827] tabular-num">
              {originalOverloadedDays - balancedOverloadedDays}
            </span>
            <span className="text-xs text-[#6B7280]">
              From {originalOverloadedDays} down to {balancedOverloadedDays}
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            Days exceeding your {targetDailyCap}h ceiling
          </p>
        </div>

        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4">
          <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-[0.05em] pb-1 border-b border-[#F3F4F6]">
            Peak Hours Re-distributed
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-[#1E3A8A] tabular-num">
              {simulation.hoursSavedOnPeaks.toFixed(1)}h
            </span>
            <span className="text-xs text-[#4B5563]">
              spread in advance
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            Shifted smoothly into prior days
          </p>
        </div>
      </div>

      {/* Visual Before vs After Horizon Comparison */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 sm:p-5 space-y-6">
        <div>
          <h3 className="text-base font-semibold text-[#111827]">
            Side-by-Side Workload Velocity Curves
          </h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Compare unmanaged deadline spikes against early-distributed pacing.
          </p>
        </div>

        {/* Section 1: Original Unbalanced Workload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#DC2626]">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Original Horizon (Unmitigated Deadlines with Clashes)
            </span>
            <span className="text-[#6B7280] font-normal">
              Max single day: {originalPeakHour.toFixed(1)}h
            </span>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex gap-1.5 min-w-[700px]">
              {simulation.originalWorkload.map((day) => {
                const isOver = day.totalHours > targetDailyCap;
                return (
                  <div
                    key={`orig-${day.date}`}
                    className={`flex-1 p-2 rounded-[4px] border text-center ${
                      isOver ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-[#F9FAFB] border-[#E5E7EB]'
                    }`}
                  >
                    <div className="text-[10px] text-[#6B7280] font-medium">{day.shortDay}</div>
                    <div className={`text-xs font-bold tabular-num mt-1 ${isOver ? 'text-[#DC2626]' : 'text-[#111827]'}`}>
                      {day.totalHours.toFixed(1)}h
                    </div>
                    <div className="mt-1.5">
                      <WorkloadTimelineBar
                        totalHours={day.totalHours}
                        capacityLimit={targetDailyCap}
                        tier={day.tier}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 2: Balanced Workload */}
        <div className="space-y-2 pt-4 border-t border-[#E5E7EB]">
          <div className="flex items-center justify-between text-xs font-semibold text-[#059669]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Paced Horizon (Front-Loaded Prep & Smooth Distribution)
            </span>
            <span className="text-[#6B7280] font-normal">
              Max single day: {balancedPeakHour.toFixed(1)}h
            </span>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex gap-1.5 min-w-[700px]">
              {simulation.balancedWorkload.map((day) => {
                return (
                  <div
                    key={`bal-${day.date}`}
                    className="flex-1 p-2 rounded-[4px] border bg-[#F1F3FF] border-[#DCE2F7] text-center"
                  >
                    <div className="text-[10px] text-[#4B5563] font-medium">{day.shortDay}</div>
                    <div className="text-xs font-bold text-[#1E3A8A] tabular-num mt-1">
                      {day.totalHours.toFixed(1)}h
                    </div>
                    <div className="mt-1.5">
                      <WorkloadTimelineBar
                        totalHours={day.totalHours}
                        capacityLimit={targetDailyCap}
                        tier={day.tier}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
