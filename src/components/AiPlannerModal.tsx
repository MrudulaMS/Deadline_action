import React, { useState } from 'react';
import { Sparkles, X, Check, HelpCircle, AlertCircle, Calendar, Clock } from 'lucide-react';
import { Task } from '../types';

interface ExtractedTaskItem {
  id: string;
  title: string;
  category: Task['category'];
  date: string | null;
  time: string | null;
  estimatedMinutes: number;
  priority: Task['priority'];
  isFlexible: boolean;
  notes?: string;
  selected: boolean;
}

interface AiPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmTasks: (tasks: Omit<Task, 'id'>[]) => Promise<void>;
  userTimezone: string;
}

export const AiPlannerModal: React.FC<AiPlannerModalProps> = ({
  isOpen,
  onClose,
  onConfirmTasks,
  userTimezone,
}) => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedItems, setExtractedItems] = useState<ExtractedTaskItem[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [hasExtracted, setHasExtracted] = useState(false);

  if (!isOpen) return null;

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    setError(null);
    setQuestions([]);

    try {
      const res = await fetch('/api/ai/extract-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          userTimezone,
          currentDate: new Date().toISOString().split('T')[0],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || 'Failed to extract tasks from text.');
      }

      const data = await res.json();
      const items: ExtractedTaskItem[] = (data.items || []).map((it: any, idx: number) => ({
        id: `extracted-${idx}-${Date.now()}`,
        title: it.title || 'Untitled Deliverable',
        category: it.category || 'assignment',
        date: it.date || new Date().toISOString().split('T')[0],
        time: it.time || '23:59',
        estimatedMinutes: it.estimatedMinutes || 60,
        priority: it.priority || 'medium',
        isFlexible: Boolean(it.isFlexible),
        notes: it.notes || '',
        selected: true, // Default to checked for easy confirmation
      }));

      setExtractedItems(items);
      setQuestions(data.questions || []);
      setHasExtracted(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred while contacting AI scheduler.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setExtractedItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it))
    );
  };

  const handleUpdateItem = (id: string, field: keyof ExtractedTaskItem, value: any) => {
    setExtractedItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const handleConfirm = async () => {
    const selected = extractedItems.filter((it) => it.selected);
    if (selected.length === 0) return;

    const tasksToCreate: Omit<Task, 'id'>[] = selected.map((it) => ({
      title: it.title,
      category: it.category,
      deadlineDate: it.date || new Date().toISOString().split('T')[0],
      deadlineTime: it.time || '23:59',
      estimatedMinutes: it.estimatedMinutes,
      priority: it.priority,
      status: 'pending',
      isFlexible: it.isFlexible,
      notes: it.notes || '',
    }));

    setLoading(true);
    try {
      await onConfirmTasks(tasksToCreate);
      onClose();
      // Reset state
      setInputText('');
      setExtractedItems([]);
      setHasExtracted(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save confirmed tasks.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-[8px] border border-[#D1D5DB] shadow-[0_4px_6px_-1px_rgba(15,23,42,0.1)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#1E3A8A]" strokeWidth={1.75} />
            <h3 className="text-base font-semibold text-[#111827]">
              Plan with AI (Natural Language Extraction)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#6B7280] hover:text-[#111827] rounded-[4px] hover:bg-[#F3F4F6] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {!hasExtracted ? (
            <form onSubmit={handleExtract} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">
                  Describe your commitments, exams, and deliverables in natural language:
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. I have a linear algebra midterm next Tuesday at 10am, an expository writing draft due Friday 5pm (around 4 hours of writing), and robotics club meeting Thursday from 6 to 8."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full p-3 text-xs bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A8A]"
                />
              </div>

              <div className="p-3 bg-[#F9FAFB] rounded-[6px] border border-[#E5E7EB] text-[11px] text-[#4B5563] space-y-1">
                <div className="font-semibold text-[#111827]">How this works:</div>
                <div>1. Gemini analyzes your schedule relative to your current date and timezone ({userTimezone}).</div>
                <div>2. You review and verify all extracted items before anything is saved.</div>
                <div>3. No tasks are automatically created without your explicit confirmation.</div>
              </div>

              {error && (
                <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] text-xs text-[#DC2626] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-[38px] px-4 bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] text-xs font-medium hover:bg-[#F9FAFB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-[38px] px-5 bg-[#1E3A8A] text-white rounded-[6px] text-xs font-medium hover:bg-[#172554] disabled:opacity-50 flex items-center gap-1.5 shadow-none"
                >
                  {loading ? (
                    <span>Extracting...</span>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Parse Schedule</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
                <div>
                  <h4 className="text-xs font-semibold text-[#111827] uppercase tracking-[0.05em]">
                    Review Extracted Deliverables ({extractedItems.filter((i) => i.selected).length}/{extractedItems.length} selected)
                  </h4>
                  <p className="text-[11px] text-[#6B7280]">
                    Review, adjust dates or effort, and confirm items to add them to your calendar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHasExtracted(false)}
                  className="text-xs text-[#1E3A8A] hover:underline font-medium"
                >
                  Edit Prompt
                </button>
              </div>

              {/* Clarification questions */}
              {questions.length > 0 && (
                <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-[6px] text-xs text-[#92400E] space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4" />
                    <span>Ambiguities identified:</span>
                  </div>
                  {questions.map((q, idx) => (
                    <div key={idx} className="ml-5 list-disc">· {q}</div>
                  ))}
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                {extractedItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-[6px] border transition-colors ${
                      item.selected ? 'bg-white border-[#1E3A8A]' : 'bg-[#F9FAFB] border-[#E5E7EB] opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => handleToggleSelect(item.id)}
                        className="w-4 h-4 mt-1 rounded-[3px] border-[#D1D5DB] text-[#1E3A8A] focus:ring-0"
                      />

                      <div className="flex-1 space-y-2">
                        {/* Title input */}
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleUpdateItem(item.id, 'title', e.target.value)}
                          className="w-full text-xs font-semibold text-[#111827] border-b border-transparent hover:border-[#D1D5DB] focus:border-[#1E3A8A] focus:outline-none pb-0.5"
                        />

                        {/* Metadata row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-[#6B7280] block">Date</span>
                            <input
                              type="date"
                              value={item.date || ''}
                              onChange={(e) => handleUpdateItem(item.id, 'date', e.target.value)}
                              className="w-full h-7 px-1.5 text-xs bg-white border border-[#D1D5DB] rounded-[4px]"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-[#6B7280] block">Time</span>
                            <input
                              type="time"
                              value={item.time || ''}
                              onChange={(e) => handleUpdateItem(item.id, 'time', e.target.value)}
                              className="w-full h-7 px-1.5 text-xs bg-white border border-[#D1D5DB] rounded-[4px]"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-[#6B7280] block">Category</span>
                            <select
                              value={item.category}
                              onChange={(e) => handleUpdateItem(item.id, 'category', e.target.value)}
                              className="w-full h-7 px-1 text-xs bg-white border border-[#D1D5DB] rounded-[4px]"
                            >
                              <option value="assignment">Assignment</option>
                              <option value="exam">Exam</option>
                              <option value="project">Project</option>
                              <option value="club">Club</option>
                              <option value="event">Event</option>
                              <option value="personal">Personal</option>
                              <option value="other">Other</option>
                            </select>
                          </div>

                          <div>
                            <span className="text-[10px] text-[#6B7280] block">Effort (Min)</span>
                            <input
                              type="number"
                              min="15"
                              step="15"
                              value={item.estimatedMinutes}
                              onChange={(e) => handleUpdateItem(item.id, 'estimatedMinutes', parseInt(e.target.value, 10) || 60)}
                              className="w-full h-7 px-1.5 text-xs tabular-num bg-white border border-[#D1D5DB] rounded-[4px]"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-[#4B5563]">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.isFlexible}
                              onChange={(e) => handleUpdateItem(item.id, 'isFlexible', e.target.checked)}
                              className="w-3.5 h-3.5 rounded-[2px]"
                            />
                            <span>Flexible schedule</span>
                          </label>

                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-[#6B7280]">Priority:</span>
                            <select
                              value={item.priority}
                              onChange={(e) => handleUpdateItem(item.id, 'priority', e.target.value)}
                              className="h-6 text-[11px] border border-[#D1D5DB] rounded-[3px] bg-white px-1"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="critical">Critical</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] text-xs text-[#DC2626]">
                  {error}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setHasExtracted(false)}
                  className="h-[38px] px-4 bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] text-xs font-medium hover:bg-[#F9FAFB]"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={loading || extractedItems.filter((i) => i.selected).length === 0}
                  className="h-[38px] px-5 bg-[#1E3A8A] text-white rounded-[6px] text-xs font-medium hover:bg-[#172554] disabled:opacity-50 flex items-center gap-1.5 shadow-none"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    Confirm & Add to Schedule ({extractedItems.filter((i) => i.selected).length})
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
