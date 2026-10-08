import React, { useState } from 'react';
import { X, Sliders, Check } from 'lucide-react';
import { UserSettings, UserProfile } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  profile: UserProfile | null;
  onSaveSettings: (updated: Partial<UserSettings>) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  profile,
  onSaveSettings,
}) => {
  const [dailyThreshold, setDailyThreshold] = useState(settings.dailyWorkloadThreshold || 8);
  const [weeklyThreshold, setWeeklyThreshold] = useState(settings.weeklyWorkloadThreshold || 18);
  const [weekStartsOn, setWeekStartsOn] = useState<'Monday' | 'Sunday'>(settings.weekStartsOn || 'Monday');
  const [defaultView, setDefaultView] = useState<'month' | 'week' | 'day'>(settings.defaultCalendarView || 'month');
  const [workloadWarnings, setWorkloadWarnings] = useState(settings.workloadWarningsEnabled ?? true);
  const [reminders, setReminders] = useState(settings.deadlineRemindersEnabled ?? true);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveSettings({
        dailyWorkloadThreshold: Number(dailyThreshold) || 8,
        weeklyWorkloadThreshold: Number(weeklyThreshold) || 18,
        weekStartsOn,
        defaultCalendarView: defaultView,
        workloadWarningsEnabled: workloadWarnings,
        deadlineRemindersEnabled: reminders,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

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
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#1E3A8A]" />
            <h3 className="text-base font-semibold text-[#111827]">
              Workload & Academic Settings
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#6B7280] hover:text-[#111827] rounded-[4px] hover:bg-[#F3F4F6]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Timezone display */}
          <div className="bg-[#F9FAFB] p-3 rounded-[6px] border border-[#E5E7EB] text-xs">
            <div className="text-[#6B7280]">Account Timezone:</div>
            <div className="font-semibold text-[#111827] mt-0.5">
              {profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
            </div>
            <div className="text-[11px] text-[#6B7280] mt-1">
              All daily velocity curves, deadlines, and relative dates evaluate in this timezone.
            </div>
          </div>

          {/* Daily & Weekly Thresholds */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Daily Capacity Threshold (Hours) *
              </label>
              <input
                type="number"
                min="2"
                max="16"
                step="0.5"
                required
                value={dailyThreshold}
                onChange={(e) => setDailyThreshold(parseFloat(e.target.value) || 8)}
                className="w-full h-[38px] px-3 text-xs bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:border-[#1E3A8A] tabular-num"
              />
              <span className="text-[11px] text-[#6B7280]">Default: 8.0 hours/day</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Weekly Capacity Threshold (Hours) *
              </label>
              <input
                type="number"
                min="5"
                max="60"
                step="1"
                required
                value={weeklyThreshold}
                onChange={(e) => setWeeklyThreshold(parseFloat(e.target.value) || 18)}
                className="w-full h-[38px] px-3 text-xs bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:border-[#1E3A8A] tabular-num"
              />
              <span className="text-[11px] text-[#6B7280]">Default: 18.0 hours/week</span>
            </div>
          </div>

          {/* Calendar week start */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Week Starts On *
              </label>
              <select
                value={weekStartsOn}
                onChange={(e) => setWeekStartsOn(e.target.value as 'Monday' | 'Sunday')}
                className="w-full h-[38px] px-3 text-xs bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:border-[#1E3A8A]"
              >
                <option value="Monday">Monday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Default View *
              </label>
              <select
                value={defaultView}
                onChange={(e) => setDefaultView(e.target.value as any)}
                className="w-full h-[38px] px-3 text-xs bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:border-[#1E3A8A]"
              >
                <option value="month">Month Horizon</option>
                <option value="week">Weekly Radar</option>
                <option value="day">Daily Agenda</option>
              </select>
            </div>
          </div>

          {/* Warnings & reminders */}
          <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
            <label className="flex items-center gap-2.5 text-xs text-[#374151] cursor-pointer">
              <input
                type="checkbox"
                checked={workloadWarnings}
                onChange={(e) => setWorkloadWarnings(e.target.checked)}
                className="w-4 h-4 rounded-[3px] border-[#D1D5DB] text-[#1E3A8A] focus:ring-0"
              />
              <span>Enable Overloaded Day & Clash Warning Banners</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-[#374151] cursor-pointer">
              <input
                type="checkbox"
                checked={reminders}
                onChange={(e) => setReminders(e.target.checked)}
                className="w-4 h-4 rounded-[3px] border-[#D1D5DB] text-[#1E3A8A] focus:ring-0"
              />
              <span>Enable Deadline Reminder Notifications</span>
            </label>
          </div>

          <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-[38px] px-4 bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] text-xs font-medium hover:bg-[#F9FAFB]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-[38px] px-5 bg-[#1E3A8A] text-white rounded-[6px] text-xs font-medium hover:bg-[#172554] shadow-none"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
