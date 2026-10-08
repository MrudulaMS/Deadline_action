import React, { useState, useMemo } from 'react';
import { Deadline, DeadlineCategory, WorkloadTier, DeadlineStatus } from '../types';
import { WorkloadBadge } from './WorkloadBadge';
import { CourseTag } from './CourseTag';
import {
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  Download,
} from 'lucide-react';

interface DeadlineRegistryViewProps {
  deadlines: Deadline[];
  onToggleStatus: (id: string) => void;
  onEditDeadline: (deadline: Deadline) => void;
  onDeleteDeadline: (id: string) => void;
  onToggleMilestone: (deadlineId: string, milestoneId: string) => void;
  onLogHours: (deadlineId: string, additionalHours: number) => void;
  onExportSchedule: () => void;
}

export const DeadlineRegistryView: React.FC<DeadlineRegistryViewProps> = ({
  deadlines,
  onToggleStatus,
  onEditDeadline,
  onDeleteDeadline,
  onToggleMilestone,
  onLogHours,
  onExportSchedule,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [sortField, setSortField] = useState<'dueDate' | 'weight' | 'hours' | 'course'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Extract unique courses and categories
  const courseOptions = useMemo(() => {
    return Array.from(new Set(deadlines.map((d) => d.courseCode))).sort();
  }, [deadlines]);

  const categoryOptions: DeadlineCategory[] = ['Exam', 'Problem Set', 'Project', 'Paper', 'Lab'];

  // Filter & Sort
  const filteredDeadlines = useMemo(() => {
    return deadlines
      .filter((dl) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = dl.title.toLowerCase().includes(q);
          const matchesCourse = dl.courseCode.toLowerCase().includes(q) || dl.courseName.toLowerCase().includes(q);
          const matchesNotes = dl.notes?.toLowerCase().includes(q) || false;
          if (!matchesTitle && !matchesCourse && !matchesNotes) return false;
        }

        // Course filter
        if (selectedCourse !== 'ALL' && dl.courseCode !== selectedCourse) return false;

        // Category filter
        if (selectedCategory !== 'ALL' && dl.category !== selectedCategory) return false;

        // Tier filter
        if (selectedTier !== 'ALL' && dl.workloadTier !== selectedTier) return false;

        // Status filter
        if (selectedStatus === 'active' && dl.status === 'submitted') return false;
        if (selectedStatus === 'submitted' && dl.status !== 'submitted') return false;

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortField === 'dueDate') {
          comparison = a.dueDate.localeCompare(b.dueDate) || a.dueTime.localeCompare(b.dueTime);
        } else if (sortField === 'weight') {
          comparison = a.weight - b.weight;
        } else if (sortField === 'hours') {
          comparison = a.estimatedHours - b.estimatedHours;
        } else if (sortField === 'course') {
          comparison = a.courseCode.localeCompare(b.courseCode);
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [deadlines, searchQuery, selectedCourse, selectedCategory, selectedTier, selectedStatus, sortField, sortOrder]);

  const handleSort = (field: 'dueDate' | 'weight' | 'hours' | 'course') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Controls */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.75} />
            <input
              type="text"
              placeholder="Search deliverables, topics, course codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[38px] pl-9 pr-3 text-xs bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A8A]"
            />
          </div>

          {/* Quick status tab & export */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#F3F4F6] p-0.5 rounded-[6px] border border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setSelectedStatus('active')}
                className={`px-3 py-1 text-xs font-medium rounded-[4px] transition-colors ${
                  selectedStatus === 'active' ? 'bg-white text-[#111827] shadow-sm font-semibold' : 'text-[#4B5563]'
                }`}
              >
                Active Queue ({deadlines.filter((d) => d.status !== 'submitted').length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('submitted')}
                className={`px-3 py-1 text-xs font-medium rounded-[4px] transition-colors ${
                  selectedStatus === 'submitted' ? 'bg-white text-[#111827] shadow-sm font-semibold' : 'text-[#4B5563]'
                }`}
              >
                Submitted ({deadlines.filter((d) => d.status === 'submitted').length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('ALL')}
                className={`px-3 py-1 text-xs font-medium rounded-[4px] transition-colors ${
                  selectedStatus === 'ALL' ? 'bg-white text-[#111827] shadow-sm font-semibold' : 'text-[#4B5563]'
                }`}
              >
                All
              </button>
            </div>

            <button
              type="button"
              onClick={onExportSchedule}
              title="Export schedule as CSV / Text"
              className="h-[38px] px-3 bg-white border border-[#D1D5DB] text-[#4B5563] rounded-[6px] text-xs font-medium hover:bg-[#F9FAFB] hover:text-[#111827] transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F3F4F6]">
          <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-[0.05em] mr-1">
            Filter:
          </span>

          {/* Course select */}
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="h-[32px] px-2.5 text-xs bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:border-[#1E3A8A]"
          >
            <option value="ALL">All Courses</option>
            {courseOptions.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>

          {/* Category select */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-[32px] px-2.5 text-xs bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:border-[#1E3A8A]"
          >
            <option value="ALL">All Categories</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Workload tier select */}
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="h-[32px] px-2.5 text-xs bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:border-[#1E3A8A]"
          >
            <option value="ALL">All Workload Tiers</option>
            <option value="Light">Light</option>
            <option value="Moderate">Moderate</option>
            <option value="Heavy">Heavy</option>
            <option value="Overloaded">Overloaded</option>
          </select>

          {(searchQuery || selectedCourse !== 'ALL' || selectedCategory !== 'ALL' || selectedTier !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCourse('ALL');
                setSelectedCategory('ALL');
                setSelectedTier('ALL');
              }}
              className="text-xs text-[#1E3A8A] hover:underline ml-auto font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Institutional Data Table Container */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#4B5563] uppercase tracking-[0.05em]">
                <th className="py-3 px-4 w-10 text-center">Done</th>
                <th
                  onClick={() => handleSort('course')}
                  className="py-3 px-3 cursor-pointer hover:text-[#111827] select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Course</span>
                    <ArrowUpDown className="w-3 h-3 text-[#9CA3AF]" strokeWidth={1.75} />
                  </div>
                </th>
                <th className="py-3 px-3">Title & Deliverable Spec</th>
                <th className="py-3 px-3 whitespace-nowrap">Category</th>
                <th
                  onClick={() => handleSort('dueDate')}
                  className="py-3 px-3 cursor-pointer hover:text-[#111827] select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Due Date</span>
                    <ArrowUpDown className="w-3 h-3 text-[#9CA3AF]" strokeWidth={1.75} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('weight')}
                  className="py-3 px-3 cursor-pointer hover:text-[#111827] select-none text-right whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Weight</span>
                    <ArrowUpDown className="w-3 h-3 text-[#9CA3AF]" strokeWidth={1.75} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('hours')}
                  className="py-3 px-3 cursor-pointer hover:text-[#111827] select-none text-right whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Effort (Est)</span>
                    <ArrowUpDown className="w-3 h-3 text-[#9CA3AF]" strokeWidth={1.75} />
                  </div>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">Workload</th>
                <th className="py-3 px-3 text-right whitespace-nowrap w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeadlines.length > 0 ? (
                filteredDeadlines.map((dl) => {
                  const isExpanded = expandedId === dl.id;
                  const isSubmitted = dl.status === 'submitted';

                  return (
                    <React.Fragment key={dl.id}>
                      <tr
                        className={`h-12 border-b border-[#F3F4F6] transition-colors hover:bg-[#F9FAFB] ${
                          isSubmitted ? 'bg-[#F9FAFB]/50' : 'bg-white'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => onToggleStatus(dl.id)}
                            className={`w-4 h-4 rounded-[3px] border transition-colors inline-flex items-center justify-center ${
                              isSubmitted
                                ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white'
                                : 'bg-white border-[#D1D5DB] hover:border-[#1E3A8A]'
                            }`}
                            title={isSubmitted ? 'Mark as active' : 'Mark as submitted'}
                          >
                            {isSubmitted && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                        </td>

                        {/* Course */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <CourseTag code={dl.courseCode} title={dl.courseName} />
                        </td>

                        {/* Title & Milestones toggle */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-semibold ${
                                isSubmitted ? 'line-through text-[#9CA3AF]' : 'text-[#111827]'
                              }`}
                            >
                              {dl.title}
                            </span>
                            {dl.milestones.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : dl.id)}
                                className="text-[11px] text-[#6B7280] hover:text-[#1E3A8A] flex items-center gap-0.5 whitespace-nowrap"
                              >
                                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                <span>{dl.milestones.filter((m) => m.completed).length}/{dl.milestones.length} milestones</span>
                              </button>
                            )}
                          </div>
                          {dl.notes && (
                            <div className="text-[11px] text-[#6B7280] line-clamp-1 mt-0.5">
                              {dl.notes}
                            </div>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-2 px-3 text-xs text-[#4B5563] whitespace-nowrap">
                          {dl.category}
                        </td>

                        {/* Due Date & Time */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="text-xs font-medium text-[#111827] tabular-num">
                            {dl.dueDate}
                          </div>
                          <div className="text-[11px] text-[#6B7280] tabular-num">
                            {dl.dueTime} EST
                          </div>
                        </td>

                        {/* Weight */}
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <span className="text-xs font-semibold text-[#111827] tabular-num">
                            {dl.weight.toFixed(1)}%
                          </span>
                        </td>

                        {/* Estimated Effort */}
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <div className="text-xs font-medium text-[#111827] tabular-num">
                            {dl.estimatedHours.toFixed(1)}h
                          </div>
                          <div className="text-[10px] text-[#6B7280] tabular-num">
                            {dl.completedHours.toFixed(1)}h logged
                          </div>
                        </td>

                        {/* Workload Tier Badge */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <WorkloadBadge tier={dl.workloadTier} />
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onEditDeadline(dl)}
                              className="p-1.5 text-[#6B7280] hover:text-[#1E3A8A] hover:bg-[#F3F4F6] rounded-[4px] transition-colors"
                              title="Edit Deliverable"
                            >
                              <Edit2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteDeadline(dl.id)}
                              className="p-1.5 text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-[4px] transition-colors"
                              title="Delete Deliverable"
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Sub-milestones row */}
                      {isExpanded && (
                        <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                          <td colSpan={9} className="py-3 px-8">
                            <div className="bg-white p-3 rounded-[6px] border border-[#E5E7EB] space-y-2">
                              <div className="flex items-center justify-between pb-1.5 border-b border-[#F3F4F6]">
                                <span className="text-xs font-semibold text-[#111827]">
                                  Milestone Breakdown for: {dl.title}
                                </span>
                                <span className="text-xs text-[#6B7280]">
                                  Log completed milestones to auto-update pacing
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                {dl.milestones.map((ms) => (
                                  <div
                                    key={ms.id}
                                    className="flex items-center justify-between py-1 px-2 rounded-[4px] hover:bg-[#F9FAFB]"
                                  >
                                    <label className="flex items-center gap-2 cursor-pointer text-xs text-[#374151]">
                                      <input
                                        type="checkbox"
                                        checked={ms.completed}
                                        onChange={() => onToggleMilestone(dl.id, ms.id)}
                                        className="w-4 h-4 rounded-[3px] border-[#D1D5DB] text-[#1E3A8A] focus:ring-0"
                                      />
                                      <span className={ms.completed ? 'line-through text-[#9CA3AF]' : 'font-medium'}>
                                        {ms.title}
                                      </span>
                                    </label>

                                    <div className="flex items-center gap-3 text-xs text-[#6B7280] tabular-num">
                                      <span>Target: {ms.dueDate}</span>
                                      <span className="font-semibold text-[#111827]">{ms.estimatedHours}h</span>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="pt-2 flex items-center justify-between text-xs text-[#4B5563] border-t border-[#F3F4F6]">
                                <span>
                                  Progress:{' '}
                                  <strong className="text-[#111827]">
                                    {dl.completedHours.toFixed(1)} / {dl.estimatedHours.toFixed(1)} hours
                                  </strong>
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => onLogHours(dl.id, 0.5)}
                                    className="px-2 py-1 bg-[#F3F4F6] text-[#111827] border border-[#D1D5DB] rounded-[4px] text-[11px] font-medium hover:bg-[#E5E7EB]"
                                  >
                                    +0.5h
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onLogHours(dl.id, 1.0)}
                                    className="px-2 py-1 bg-[#F3F4F6] text-[#111827] border border-[#D1D5DB] rounded-[4px] text-[11px] font-medium hover:bg-[#E5E7EB]"
                                  >
                                    +1.0h
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-[#6B7280]">
                    No deliverables found matching the current criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
