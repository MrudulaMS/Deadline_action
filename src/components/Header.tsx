import React from 'react';
import { Plus, RotateCcw, Sliders, Calendar, List, BookOpen, Sparkles, Settings as SettingsIcon, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type ActiveTab = 'radar' | 'registry' | 'courses' | 'pacing';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenAddModal: () => void;
  onOpenAiPlanner: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onResetData: () => void;
  clashCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenAddModal,
  onOpenAiPlanner,
  onOpenSettings,
  onOpenAuth,
  onResetData,
  clashCount,
}) => {
  const { user, profile, logout } = useAuth();

  return (
    <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Zone 1: Brand & Academic Registry context */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[6px] bg-[#1E3A8A] flex items-center justify-center text-white font-semibold text-sm">
                DR
              </div>
              <div>
                <span className="text-base font-semibold tracking-tight text-[#111827] block leading-tight">
                  Deadline Radar
                </span>
                <span className="text-xs text-[#6B7280] font-normal leading-none block mt-0.5">
                  Academic Registry · Fall 2026
                </span>
              </div>
            </div>
          </div>

          {/* Zone 2: Navigation Tabs (Segmented Control) */}
          <nav className="flex items-center bg-[#F3F4F6] p-1 rounded-[6px] border border-[#E5E7EB]" aria-label="Main Navigation">
            <button
              type="button"
              onClick={() => onTabChange('radar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap ${
                activeTab === 'radar'
                  ? 'bg-white text-[#111827] shadow-sm font-semibold'
                  : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-[#4B5563]" strokeWidth={1.75} />
              <span>Workload Radar</span>
              {clashCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-[10px] rounded-[3px] font-semibold tabular-num">
                  {clashCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onTabChange('registry')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap ${
                activeTab === 'registry'
                  ? 'bg-white text-[#111827] shadow-sm font-semibold'
                  : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              <List className="w-3.5 h-3.5 text-[#4B5563]" strokeWidth={1.75} />
              <span>Deadline Registry</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('courses')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap ${
                activeTab === 'courses'
                  ? 'bg-white text-[#111827] shadow-sm font-semibold'
                  : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[#4B5563]" strokeWidth={1.75} />
              <span>Courses & Syllabi</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('pacing')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap ${
                activeTab === 'pacing'
                  ? 'bg-white text-[#111827] shadow-sm font-semibold'
                  : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-[#4B5563]" strokeWidth={1.75} />
              <span>Pacing Balancer</span>
            </button>
          </nav>

          {/* Zone 3: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Plan with AI button */}
            <button
              type="button"
              onClick={onOpenAiPlanner}
              title="Parse schedule commitments using AI"
              className="h-[38px] px-3 bg-white text-[#1E3A8A] border border-[#D1D5DB] hover:border-[#1E3A8A] rounded-[6px] text-xs font-medium hover:bg-[#F9FAFB] transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#1E3A8A]" strokeWidth={1.75} />
              <span className="hidden sm:inline">Plan with AI</span>
            </button>

            {/* Add deadline button */}
            <button
              type="button"
              onClick={onOpenAddModal}
              className="h-[38px] px-3.5 bg-[#1E3A8A] text-white rounded-[6px] text-xs font-medium hover:bg-[#172554] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-none"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              <span>Add Deadline</span>
            </button>

            {/* Settings button */}
            <button
              type="button"
              onClick={onOpenSettings}
              title="Workload thresholds and settings"
              className="h-[38px] w-[38px] bg-white text-[#4B5563] border border-[#D1D5DB] rounded-[6px] hover:bg-[#F9FAFB] hover:text-[#111827] transition-colors flex items-center justify-center shrink-0"
            >
              <SettingsIcon className="w-4 h-4" strokeWidth={1.75} />
            </button>

            {/* Auth status */}
            {user ? (
              <div className="flex items-center gap-2 pl-1 border-l border-[#E5E7EB]">
                <div
                  className="w-8 h-8 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center text-xs font-semibold uppercase"
                  title={user.email || 'Student Account'}
                >
                  {(profile?.displayName || user.email || 'U')[0]}
                </div>
                <button
                  type="button"
                  onClick={logout}
                  title="Sign out"
                  className="h-[38px] px-2.5 text-[#6B7280] hover:text-[#DC2626] rounded-[6px] text-xs font-medium hover:bg-[#FEF2F2] transition-colors flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span className="hidden lg:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="h-[38px] px-3 bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] text-xs font-medium hover:bg-[#F9FAFB] transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5 text-[#1E3A8A]" strokeWidth={1.75} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
