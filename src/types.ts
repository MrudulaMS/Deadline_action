export type WorkloadTier = 'Light' | 'Moderate' | 'Heavy' | 'Overloaded';

export type TaskCategory = 'assignment' | 'exam' | 'project' | 'club' | 'event' | 'personal' | 'other';
export type DeadlineCategory = TaskCategory | 'Problem Set' | 'Paper' | 'Lab' | 'Reading' | 'Exam' | 'Project';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'archived';
export type DeadlineStatus = 'upcoming' | 'in_progress' | 'submitted';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  position: number;
  estimatedMinutes?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  deadlineDate: string; // YYYY-MM-DD
  deadlineTime?: string; // HH:MM
  estimatedMinutes: number; // Stored as integer minutes
  priority: TaskPriority;
  status: TaskStatus;
  isFlexible: boolean;
  startDate?: string;
  notes?: string;
  courseCode?: string;
  weight?: number; // Optional syllabus percentage
  completedAt?: any;
  createdAt?: any;
  updatedAt?: any;
  deletedAt?: any;
  subtasks?: Subtask[];
}

// For frontend view compatibility:
export interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  estimatedHours: number;
}

export interface Deadline {
  id: string;
  title: string;
  courseCode: string;
  courseName: string;
  category: DeadlineCategory;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:MM
  weight: number; // Percentage
  estimatedHours: number;
  completedHours: number;
  workloadTier: WorkloadTier;
  status: 'upcoming' | 'in_progress' | 'submitted';
  milestones: Milestone[];
  notes?: string;
  isGroupProject?: boolean;
  isFlexible?: boolean;
  priority?: TaskPriority;
}

export interface Course {
  code: string;
  title: string;
  credits: number;
  instructor: string;
  officeHours: string;
  location?: string;
  syllabusBreakdown: {
    category: string;
    weight: number;
  }[];
}

export interface UserSettings {
  dailyWorkloadThreshold: number; // default 8 hours
  weeklyWorkloadThreshold: number; // default 18 hours
  preferredWorkStartTime: string; // default "09:00"
  preferredWorkEndTime: string; // default "18:00"
  weekStartsOn: 'Monday' | 'Sunday'; // default "Monday"
  defaultCalendarView: 'month' | 'week' | 'day'; // default "month"
  deadlineRemindersEnabled: boolean; // default true
  workloadWarningsEnabled: boolean; // default true
  dailySummaryEnabled: boolean; // default false
  theme: 'light' | 'dark' | 'system'; // default "light"
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  timezone: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface DailyWorkload {
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Thu, Oct 9"
  shortDay: string; // e.g. "Thu 9"
  totalEstimatedMinutes: number;
  totalHours: number;
  taskCount: number;
  highPriorityCount: number;
  criticalPriorityCount: number;
  capacityLimit: number;
  tier: WorkloadTier;
  deadlinesDue: Deadline[];
  suggestedStudyHours: number;
  studyTasks: {
    deadlineId: string;
    courseCode: string;
    title: string;
    hours: number;
  }[];
}

export interface WeeklyWorkload {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  weekLabel: string;
  totalEstimatedMinutes: number;
  totalEstimatedHours: number;
  taskCount: number;
  highPriorityCount: number;
  criticalPriorityCount: number;
  workloadLevel: WorkloadTier;
  overloaded: boolean;
  busiestDay: {
    date: string;
    hours: number;
  };
  explanation?: string;
}

export interface ClashAlert {
  id: string;
  date: string;
  dayLabel: string;
  totalWeight: number;
  totalHours: number;
  deadlines: Deadline[];
  severity: 'Moderate' | 'Heavy' | 'Overloaded';
  recommendation: string;
}
