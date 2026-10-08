import React, { useState, useEffect } from 'react';
import { Deadline, DeadlineCategory, Milestone, Course, WorkloadTier } from '../types';
import { X, Plus, Trash2 } from 'lucide-react';

interface DeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deadline: Deadline) => void;
  editingDeadline?: Deadline | null;
  courses: Course[];
}

export const DeadlineModal: React.FC<DeadlineModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingDeadline,
  courses,
}) => {
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState(courses[0]?.code || 'CS 3110');
  const [category, setCategory] = useState<DeadlineCategory>('Problem Set');
  const [dueDate, setDueDate] = useState('2026-10-15');
  const [dueTime, setDueTime] = useState('23:59');
  const [weight, setWeight] = useState<number>(10);
  const [estimatedHours, setEstimatedHours] = useState<number>(6.0);
  const [notes, setNotes] = useState('');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneHours, setNewMilestoneHours] = useState<number>(2.0);

  useEffect(() => {
    if (editingDeadline) {
      setTitle(editingDeadline.title);
      setCourseCode(editingDeadline.courseCode);
      setCategory(editingDeadline.category);
      setDueDate(editingDeadline.dueDate);
      setDueTime(editingDeadline.dueTime);
      setWeight(editingDeadline.weight);
      setEstimatedHours(editingDeadline.estimatedHours);
      setNotes(editingDeadline.notes || '');
      setMilestones(editingDeadline.milestones || []);
    } else {
      setTitle('');
      setCourseCode(courses[0]?.code || 'CS 3110');
      setCategory('Problem Set');
      setDueDate('2026-10-15');
      setDueTime('23:59');
      setWeight(10);
      setEstimatedHours(6.0);
      setNotes('');
      setMilestones([]);
    }
  }, [editingDeadline, isOpen, courses]);

  if (!isOpen) return null;

  // Derive workload tier automatically
  const computeTier = (hours: number): WorkloadTier => {
    if (hours <= 3.0) return 'Light';
    if (hours <= 5.5) return 'Moderate';
    if (hours <= 8.0) return 'Heavy';
    return 'Overloaded';
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;

    const ms: Milestone = {
      id: `ms-${Date.now()}`,
      title: newMilestoneTitle.trim(),
      dueDate: dueDate,
      completed: false,
      estimatedHours: Number(newMilestoneHours) || 1,
    };
    setMilestones([...milestones, ms]);
    setNewMilestoneTitle('');
    setNewMilestoneHours(2.0);
  };

  const handleRemoveMilestone = (id: string) => {
    setMilestones(milestones.filter((m) => m.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const matchedCourse = courses.find((c) => c.code === courseCode);
    const deadlineData: Deadline = {
      id: editingDeadline ? editingDeadline.id : `dl-${Date.now()}`,
      title: title.trim(),
      courseCode,
      courseName: matchedCourse ? matchedCourse.title : courseCode,
      category,
      dueDate,
      dueTime,
      weight: Number(weight) || 0,
      estimatedHours: Number(estimatedHours) || 1,
      completedHours: editingDeadline ? editingDeadline.completedHours : 0,
      workloadTier: computeTier(Number(estimatedHours) || 1),
      status: editingDeadline ? editingDeadline.status : 'upcoming',
      notes: notes.trim(),
      milestones,
    };

    onSave(deadlineData);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-[8px] border border-[#D1D5DB] shadow-[0_4px_6px_-1px_rgba(15,23,42,0.1)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <h3 className="text-base font-semibold text-[#111827]">
            {editingDeadline ? 'Edit Academic Deliverable' : 'Log New Academic Deliverable'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#6B7280] hover:text-[#111827] rounded-[4px] hover:bg-[#F3F4F6] transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              Deliverable Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Problem Set 4: Monads & Type Inference"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-[38px] px-3 text-xs bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A8A]"
            />
          </div>

          {/* Course & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Course Roster *
              </label>
              <select
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="w-full h-[38px] px-3 text-xs bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:border-[#1E3A8A]"
              >
                {courses.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} – {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Deliverable Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DeadlineCategory)}
                className="w-full h-[38px] px-3 text-xs bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:border-[#1E3A8A]"
              >
                <option value="Problem Set">Problem Set</option>
                <option value="Exam">Exam / Midterm / Final</option>
                <option value="Project">Project / Sprint</option>
                <option value="Paper">Paper / Essay</option>
                <option value="Lab">Computational Lab</option>
                <option value="Reading">Assigned Reading</option>
              </select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Submission Due Date *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-[38px] px-3 text-xs bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:border-[#1E3A8A]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Cutoff Time (EST) *
              </label>
              <input
                type="time"
                required
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full h-[38px] px-3 text-xs bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:border-[#1E3A8A]"
              />
            </div>
          </div>

          {/* Syllabus Weight & Estimated Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Syllabus Grade Weight (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                className="w-full h-[38px] px-3 text-xs tabular-num bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:border-[#1E3A8A]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Estimated Effort (Hours)
              </label>
              <input
                type="number"
                min="0.5"
                max="50"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(parseFloat(e.target.value) || 1)}
                className="w-full h-[38px] px-3 text-xs tabular-num bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:border-[#1E3A8A]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              Submission Criteria & Guidelines
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Gradescope submission, include test bisect report, closed-book format..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 text-xs bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A8A]"
            />
          </div>

          {/* Sub-Milestones Manager */}
          <div className="pt-2 border-t border-[#E5E7EB]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#111827]">
                Milestone Sprints ({milestones.length})
              </label>
              <span className="text-[11px] text-[#6B7280]">
                Break complex tasks into discrete check-ins
              </span>
            </div>

            {/* List */}
            {milestones.length > 0 && (
              <div className="space-y-1.5 mb-2.5 max-h-36 overflow-y-auto">
                {milestones.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-[4px] bg-[#F9FAFB] border border-[#E5E7EB] text-xs"
                  >
                    <span className="text-[#111827] font-medium truncate max-w-[280px]">
                      {m.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#6B7280] tabular-num">
                        {m.estimatedHours}h
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMilestone(m.id)}
                        className="text-[#9CA3AF] hover:text-[#DC2626] p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add new milestone inline */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. Part 1: Implement basic AST parser"
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                className="flex-1 h-[32px] px-2.5 text-xs bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A8A]"
              />
              <input
                type="number"
                min="0.5"
                max="20"
                step="0.5"
                placeholder="Hours"
                value={newMilestoneHours}
                onChange={(e) => setNewMilestoneHours(parseFloat(e.target.value) || 1)}
                className="w-16 h-[32px] px-2 text-xs tabular-num bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:border-[#1E3A8A]"
              />
              <button
                type="button"
                onClick={handleAddMilestone}
                className="h-[32px] px-3 bg-[#F3F4F6] text-[#111827] border border-[#D1D5DB] rounded-[6px] text-xs font-medium hover:bg-[#E5E7EB] transition-colors flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-[38px] px-4 bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] text-xs font-medium hover:bg-[#F9FAFB] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-[38px] px-5 bg-[#1E3A8A] text-white rounded-[6px] text-xs font-medium hover:bg-[#172554] transition-colors shadow-none"
            >
              {editingDeadline ? 'Save Changes' : 'Record Deliverable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
