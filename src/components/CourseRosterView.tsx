import React from 'react';
import { Course, Deadline } from '../types';
import { CourseTag } from './CourseTag';
import { WorkloadBadge } from './WorkloadBadge';
import { BookOpen, User, MapPin, Clock, Award, CheckCircle } from 'lucide-react';

interface CourseRosterViewProps {
  courses: Course[];
  deadlines: Deadline[];
  onSelectCourseFilter: (courseCode: string) => void;
}

export const CourseRosterView: React.FC<CourseRosterViewProps> = ({
  courses,
  deadlines,
  onSelectCourseFilter,
}) => {
  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#111827]">
            Academic Course Rosters & Syllabi
          </h2>
          <p className="text-xs text-[#4B5563] mt-0.5">
            Registered term load: <strong className="text-[#111827] tabular-num">{totalCredits} credits</strong> across{' '}
            <strong className="text-[#111827] tabular-num">{courses.length} courses</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#F9FAFB] px-3 py-2 rounded-[6px] border border-[#E5E7EB] text-xs">
            <span className="text-[#6B7280]">Total Deliverables Tracked:</span>{' '}
            <strong className="text-[#111827] tabular-num">{deadlines.length}</strong>
          </div>
        </div>
      </div>

      {/* Course Cards Grid (Single-Elevation, Layer 1: 1px border, 8px radius) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.map((course) => {
          const courseDeadlines = deadlines.filter((d) => d.courseCode === course.code);
          const activeDeadlines = courseDeadlines.filter((d) => d.status !== 'submitted');
          const totalCourseHours = activeDeadlines.reduce(
            (sum, d) => sum + Math.max(0, d.estimatedHours - d.completedHours),
            0
          );
          const totalWeight = courseDeadlines.reduce((sum, d) => sum + d.weight, 0);

          return (
            <div
              key={course.code}
              className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden flex flex-col"
            >
              {/* Card Header with Divider */}
              <div className="p-4 border-b border-[#E5E7EB] bg-[#FFFFFF]">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CourseTag code={course.code} />
                      <span className="text-xs text-[#6B7280] font-mono tabular-num">
                        {course.credits} Credits
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#111827] line-clamp-1">
                      {course.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectCourseFilter(course.code)}
                    className="px-2.5 py-1 text-xs font-medium text-[#1E3A8A] border border-[#D1D5DB] rounded-[4px] hover:bg-[#F3F4F6] transition-colors shrink-0"
                  >
                    View in Registry
                  </button>
                </div>

                {/* Instructor & Office Hours */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#4B5563]">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#6B7280] shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{course.instructor}</span>
                  </div>
                  {course.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#6B7280] shrink-0" strokeWidth={1.75} />
                      <span className="truncate">{course.location}</span>
                    </div>
                  )}
                </div>

                <div className="mt-2 text-[11px] text-[#6B7280] flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-[#6B7280] shrink-0" strokeWidth={1.75} />
                  <span>{course.officeHours}</span>
                </div>
              </div>

              {/* Syllabus Grading Weight Breakdown */}
              <div className="p-4 space-y-3 flex-1">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#4B5563] uppercase tracking-[0.05em] mb-1.5">
                    <span>Syllabus Grade Breakdown</span>
                    <span className="tabular-num text-[#111827]">100% Total</span>
                  </div>

                  <div className="space-y-1.5">
                    {course.syllabusBreakdown.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-[#374151]">{item.category}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-[#E5E7EB] rounded-[2px] overflow-hidden">
                            <div
                              className="h-full bg-[#1E3A8A] rounded-[2px]"
                              style={{ width: `${item.weight}%` }}
                            />
                          </div>
                          <span className="font-medium text-[#111827] tabular-num w-8 text-right">
                            {item.weight}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Deliverables in Course */}
                <div className="pt-3 border-t border-[#F3F4F6]">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#4B5563] uppercase tracking-[0.05em] mb-2">
                    <span>Active Deliverables ({activeDeadlines.length})</span>
                    <span className="text-xs font-semibold text-[#111827] tabular-num">
                      {totalCourseHours.toFixed(1)}h effort remaining
                    </span>
                  </div>

                  {activeDeadlines.length > 0 ? (
                    <div className="space-y-1.5">
                      {activeDeadlines.slice(0, 3).map((dl) => (
                        <div
                          key={dl.id}
                          className="p-2 rounded-[4px] bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-between text-xs gap-2"
                        >
                          <span className="font-medium text-[#111827] truncate">
                            {dl.title}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-[#6B7280] tabular-num">
                              Due {dl.dueDate}
                            </span>
                            <WorkloadBadge tier={dl.workloadTier} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] rounded-[4px] font-medium flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>All current course deliverables completed</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
