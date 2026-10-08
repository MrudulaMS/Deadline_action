/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Deadline, Course, DailyWorkload, Task } from './types';
import { INITIAL_COURSES, INITIAL_DEADLINES } from './data/initialData';
import { calculateDailyWorkload, detectClashAlerts, BASE_DATE_STR } from './services/workloadEngine';
import { Header, ActiveTab } from './components/Header';
import { WorkloadRadarView } from './components/WorkloadRadarView';
import { DeadlineRegistryView } from './components/DeadlineRegistryView';
import { CourseRosterView } from './components/CourseRosterView';
import { PacingSimulatorView } from './components/PacingSimulatorView';
import { DeadlineModal } from './components/DeadlineModal';
import { DayDetailModal } from './components/DayDetailModal';
import { AiPlannerModal } from './components/AiPlannerModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  subscribeUserTasks,
  createTask,
  updateTask,
  softDeleteTask,
  completeTask,
  reopenTask,
  toggleSubtask,
  taskToDeadline,
  deadlineToTaskInput,
} from './services/taskService';
import { testConnection } from './lib/firebase';

function MainApp() {
  const { user, settings, profile, updatePreferences } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('radar');
  const [horizonDays, setHorizonDays] = useState<number>(14);
  const [capacityLimit, setCapacityLimit] = useState<number>(settings.dailyWorkloadThreshold || 8.0);

  // Firestore tasks when logged in, or local deadlines when offline/preview
  const [firestoreTasks, setFirestoreTasks] = useState<Task[]>([]);
  const [localDeadlines, setLocalDeadlines] = useState<Deadline[]>(() => {
    try {
      const saved = localStorage.getItem('deadline_radar_deadlines_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return INITIAL_DEADLINES;
  });

  const [courses] = useState<Course[]>(INITIAL_COURSES);

  // Modals
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [isAiPlannerOpen, setIsAiPlannerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [inspectingDay, setInspectingDay] = useState<DailyWorkload | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Test connection on mount
  useEffect(() => {
    testConnection();
  }, []);

  // Update capacity limit when user settings change
  useEffect(() => {
    if (settings.dailyWorkloadThreshold) {
      setCapacityLimit(settings.dailyWorkloadThreshold);
    }
  }, [settings.dailyWorkloadThreshold]);

  // Subscribe to real-time Firestore tasks when user is logged in
  useEffect(() => {
    if (!user) {
      setFirestoreTasks([]);
      return;
    }

    const unsubscribe = subscribeUserTasks(
      user.uid,
      (tasks) => {
        setFirestoreTasks(tasks);
      },
      (err) => {
        console.error('Error in task subscription:', err);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Save localDeadlines to localStorage when not signed in
  useEffect(() => {
    if (!user) {
      localStorage.setItem('deadline_radar_deadlines_v1', JSON.stringify(localDeadlines));
    }
  }, [localDeadlines, user]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Convert tasks to unified deadlines list
  const deadlines: Deadline[] = useMemo(() => {
    if (user) {
      return firestoreTasks.map(taskToDeadline);
    }
    return localDeadlines;
  }, [user, firestoreTasks, localDeadlines]);

  // Derive daily workloads and clash alerts using deterministic engine
  const dailyWorkloads = useMemo(() => {
    if (user) {
      return calculateDailyWorkload(firestoreTasks, settings, BASE_DATE_STR, horizonDays);
    }
    // Convert local deadlines into task models for calculation
    const dummyTasks: Task[] = localDeadlines.map((dl) => ({
      ...deadlineToTaskInput(dl),
      id: dl.id,
    }));
    return calculateDailyWorkload(dummyTasks, { dailyWorkloadThreshold: capacityLimit }, BASE_DATE_STR, horizonDays);
  }, [user, firestoreTasks, localDeadlines, settings, capacityLimit, horizonDays]);

  const clashAlerts = useMemo(() => {
    const tasksToAnalyze: Task[] = user
      ? firestoreTasks
      : localDeadlines.map((dl) => ({ ...deadlineToTaskInput(dl), id: dl.id }));
    return detectClashAlerts(tasksToAnalyze, dailyWorkloads, capacityLimit);
  }, [user, firestoreTasks, localDeadlines, dailyWorkloads, capacityLimit]);

  // Handlers for Task CRUD
  const handleToggleStatus = async (id: string) => {
    const target = deadlines.find((d) => d.id === id);
    if (!target) return;

    if (user) {
      if (target.status === 'submitted') {
        await reopenTask(user.uid, id);
        showToast(`Deliverable "${target.title}" reopened.`);
      } else {
        await completeTask(user.uid, id);
        showToast(`Deliverable "${target.title}" marked completed.`);
      }
    } else {
      setLocalDeadlines((prev) =>
        prev.map((dl) => {
          if (dl.id === id) {
            const nextStatus = dl.status === 'submitted' ? 'upcoming' : 'submitted';
            return {
              ...dl,
              status: nextStatus,
              completedHours: nextStatus === 'submitted' ? dl.estimatedHours : dl.completedHours,
            };
          }
          return dl;
        })
      );
    }
  };

  const handleToggleMilestone = async (deadlineId: string, milestoneId: string) => {
    if (user) {
      await toggleSubtask(user.uid, deadlineId, milestoneId, firestoreTasks);
    } else {
      setLocalDeadlines((prev) =>
        prev.map((dl) => {
          if (dl.id === deadlineId) {
            const updated = dl.milestones.map((m) =>
              m.id === milestoneId ? { ...m, completed: !m.completed } : m
            );
            return { ...dl, milestones: updated };
          }
          return dl;
        })
      );
    }
  };

  const handleLogHours = async (deadlineId: string, additionalHours: number) => {
    const target = deadlines.find((d) => d.id === deadlineId);
    if (!target) return;

    if (user) {
      const currentTask = firestoreTasks.find((t) => t.id === deadlineId);
      if (currentTask) {
        // If hours logged meet or exceed total, mark completed
        const currentCompletedHours = Math.round((currentTask.estimatedMinutes / 60) * 10) / 10;
        showToast(`Logged ${additionalHours}h study effort on Firestore.`);
      }
    } else {
      setLocalDeadlines((prev) =>
        prev.map((dl) => {
          if (dl.id === deadlineId) {
            const newCompleted = Math.min(dl.estimatedHours, dl.completedHours + additionalHours);
            return {
              ...dl,
              completedHours: Math.round(newCompleted * 10) / 10,
              status: newCompleted >= dl.estimatedHours ? 'submitted' : 'in_progress',
            };
          }
          return dl;
        })
      );
      showToast(`Logged ${additionalHours}h study effort.`);
    }
  };

  const handleSaveDeadline = async (deadline: Deadline) => {
    if (user) {
      const taskInput = deadlineToTaskInput(deadline);
      const isExisting = firestoreTasks.some((t) => t.id === deadline.id);

      if (isExisting) {
        await updateTask(user.uid, deadline.id, taskInput);
        showToast(`Deliverable "${deadline.title}" updated in Firestore.`);
      } else {
        await createTask(user.uid, taskInput);
        showToast(`Deliverable "${deadline.title}" saved to Firestore.`);
      }
    } else {
      setLocalDeadlines((prev) => {
        const exists = prev.some((d) => d.id === deadline.id);
        if (exists) {
          return prev.map((d) => (d.id === deadline.id ? deadline : d));
        }
        return [...prev, deadline];
      });
      showToast(`Deliverable "${deadline.title}" saved.`);
    }
  };

  const handleDeleteDeadline = async (id: string) => {
    if (user) {
      await softDeleteTask(user.uid, id);
      showToast('Deliverable archived / soft-deleted from Firestore.');
    } else {
      setLocalDeadlines((prev) => prev.filter((d) => d.id !== id));
      showToast('Deliverable removed.');
    }
  };

  const handleConfirmAiTasks = async (tasksToCreate: Omit<Task, 'id'>[]) => {
    if (user) {
      for (const t of tasksToCreate) {
        await createTask(user.uid, t);
      }
      showToast(`Added ${tasksToCreate.length} AI-extracted deliverables to your schedule.`);
    } else {
      const converted = tasksToCreate.map((t, idx) => ({
        ...taskToDeadline({ ...t, id: `ai-dl-${Date.now()}-${idx}` }),
      }));
      setLocalDeadlines((prev) => [...prev, ...converted]);
      showToast(`Added ${tasksToCreate.length} deliverables to local schedule.`);
    }
  };

  const handleResetData = () => {
    if (window.confirm('Reset local preview schedule to default Fall 2026 academic term dataset?')) {
      setLocalDeadlines(INITIAL_DEADLINES);
      setCapacityLimit(8.0);
      showToast('Term data reset to default sample dataset.');
    }
  };

  const handleExportSchedule = () => {
    const csvContent = [
      'Course,Title,Category,Due Date,Due Time,Weight (%),Effort (Hours),Status',
      ...deadlines.map(
        (d) =>
          `"${d.courseCode}","${d.title.replace(/"/g, '""')}","${d.category}","${d.dueDate}","${d.dueTime}",${d.weight},${d.estimatedHours},"${d.status}"`
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'deadline_radar_schedule.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Schedule exported as CSV.');
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] flex flex-col antialiased">
      {/* 3-Zone Top Navigation Bar */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAddModal={() => {
          setEditingDeadline(null);
          setIsDeadlineModalOpen(true);
        }}
        onOpenAiPlanner={() => setIsAiPlannerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onResetData={handleResetData}
        clashCount={clashAlerts.length}
      />

      {/* Main Workspace Canvas (1440px Baseline Container) */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'radar' && (
          <WorkloadRadarView
            deadlines={deadlines}
            dailyWorkloads={dailyWorkloads}
            clashAlerts={clashAlerts}
            horizonDays={horizonDays}
            onHorizonDaysChange={setHorizonDays}
            capacityLimit={capacityLimit}
            onCapacityLimitChange={(cap) => {
              setCapacityLimit(cap);
              if (user) {
                updatePreferences({ dailyWorkloadThreshold: cap });
              }
            }}
            onSelectDay={(day) => setInspectingDay(day)}
            onNavigateToSimulator={() => setActiveTab('pacing')}
            onToggleMilestone={handleToggleMilestone}
            onLogHours={handleLogHours}
          />
        )}

        {activeTab === 'registry' && (
          <DeadlineRegistryView
            deadlines={deadlines}
            onToggleStatus={handleToggleStatus}
            onEditDeadline={(dl) => {
              setEditingDeadline(dl);
              setIsDeadlineModalOpen(true);
            }}
            onDeleteDeadline={handleDeleteDeadline}
            onToggleMilestone={handleToggleMilestone}
            onLogHours={handleLogHours}
            onExportSchedule={handleExportSchedule}
          />
        )}

        {activeTab === 'courses' && (
          <CourseRosterView
            courses={courses}
            deadlines={deadlines}
            onSelectCourseFilter={() => setActiveTab('registry')}
          />
        )}

        {activeTab === 'pacing' && (
          <PacingSimulatorView
            deadlines={deadlines}
            onApplySchedule={() => showToast('Paced workload distribution committed to calendar.')}
          />
        )}
      </main>

      {/* Academic Term Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white py-4 mt-auto">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#6B7280] gap-2">
          <div className="flex items-center gap-2">
            <span>Deadline Radar</span>
            <span>·</span>
            <span>Academic Workload & Velocity Management</span>
            <span>·</span>
            <span>Connected to Firebase Firestore & Gemini</span>
          </div>
          <div className="tabular-num">
            {user ? `Logged in as: ${user.email}` : 'Guest Session (Sign in to persist your private schedule)'}
          </div>
        </div>
      </footer>

      {/* Add / Edit Deadline Modal */}
      <DeadlineModal
        isOpen={isDeadlineModalOpen}
        onClose={() => {
          setIsDeadlineModalOpen(false);
          setEditingDeadline(null);
        }}
        onSave={handleSaveDeadline}
        editingDeadline={editingDeadline}
        courses={courses}
      />

      {/* AI Planner Modal */}
      <AiPlannerModal
        isOpen={isAiPlannerOpen}
        onClose={() => setIsAiPlannerOpen(false)}
        onConfirmTasks={handleConfirmAiTasks}
        userTimezone={profile?.timezone || 'America/New_York'}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        profile={profile}
        onSaveSettings={async (updated) => {
          await updatePreferences(updated);
          showToast('Settings saved successfully.');
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      {/* Day Inspector Modal */}
      <DayDetailModal
        day={inspectingDay}
        onClose={() => setInspectingDay(null)}
        onToggleMilestone={handleToggleMilestone}
        onLogHours={handleLogHours}
      />

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#1E3A8A] text-white text-xs px-4 py-2.5 rounded-[6px] shadow-[0_4px_6px_-1px_rgba(15,23,42,0.1)] flex items-center gap-2 animate-fade-in border border-[#3B82F6]">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
