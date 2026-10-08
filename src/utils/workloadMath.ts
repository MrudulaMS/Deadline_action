import { Deadline, DailyWorkload, ClashAlert, WorkloadTier } from '../types';

export const BASE_DATE_STR = '2026-10-08'; // Reference anchor

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDayLabel(dateStr: string): string {
  const d = parseDate(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatShortDay(dateStr: string): string {
  const d = parseDate(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
}

export function getTierFromHours(hours: number, capacityLimit = 6.0): WorkloadTier {
  if (hours <= 2.5) return 'Light';
  if (hours <= 5.0) return 'Moderate';
  if (hours <= capacityLimit + 0.5) return 'Heavy';
  return 'Overloaded';
}

/**
 * Distributes deadlines across days to calculate realistic daily workloads.
 * For each deadline, hours are distributed between the start date (or today) and due date.
 */
export function calculateDailyWorkloads(
  deadlines: Deadline[],
  daysCount = 14,
  capacityLimit = 6.0,
  startDateStr = BASE_DATE_STR
): DailyWorkload[] {
  const result: DailyWorkload[] = [];
  const startDate = parseDate(startDateStr);

  const activeDeadlines = deadlines.filter((d) => d.status !== 'submitted');

  for (let i = 0; i < daysCount; i++) {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + i);
    const dateStr = formatDate(current);

    const deadlinesDue = activeDeadlines.filter((d) => d.dueDate === dateStr);

    // Calculate distributed study effort needed on this day
    const studyTasks: { deadlineId: string; courseCode: string; title: string; hours: number }[] = [];
    let dayHours = 0;

    activeDeadlines.forEach((dl) => {
      const remainingHours = Math.max(0, dl.estimatedHours - dl.completedHours);
      if (remainingHours <= 0) return;

      const dueDate = parseDate(dl.dueDate);
      const diffTime = dueDate.getTime() - current.getTime();
      const daysUntilDue = Math.round(diffTime / (1000 * 60 * 60 * 24));

      // If due today, assign remaining sprint load
      if (daysUntilDue === 0) {
        const portion = Math.min(remainingHours, dl.category === 'Exam' ? 4.0 : 3.0);
        dayHours += portion;
        studyTasks.push({
          deadlineId: dl.id,
          courseCode: dl.courseCode,
          title: dl.title,
          hours: portion,
        });
      } else if (daysUntilDue > 0 && daysUntilDue <= 5) {
        // Preparation window within 5 days before deadline
        const weightFactor = daysUntilDue === 1 ? 0.4 : daysUntilDue === 2 ? 0.3 : 0.15;
        const portion = Math.round((remainingHours * weightFactor) * 10) / 10;
        if (portion > 0.2) {
          dayHours += portion;
          studyTasks.push({
            deadlineId: dl.id,
            courseCode: dl.courseCode,
            title: `Prep: ${dl.title}`,
            hours: portion,
          });
        }
      }
    });

    const roundedHours = Math.round(dayHours * 10) / 10;
    const tier = getTierFromHours(roundedHours, capacityLimit);

    result.push({
      date: dateStr,
      dayLabel: formatDayLabel(dateStr),
      shortDay: formatShortDay(dateStr),
      totalEstimatedMinutes: Math.round(roundedHours * 60),
      totalHours: roundedHours,
      taskCount: deadlinesDue.length,
      highPriorityCount: deadlinesDue.filter((d) => d.workloadTier === 'Heavy' || d.workloadTier === 'Overloaded').length,
      criticalPriorityCount: deadlinesDue.filter((d) => d.workloadTier === 'Overloaded').length,
      capacityLimit,
      tier,
      deadlinesDue,
      suggestedStudyHours: roundedHours,
      studyTasks,
    });
  }

  return result;
}

/**
 * Detects clashes where deadlines collide or single day workload exceeds capacity
 */
export function detectClashAlerts(
  deadlines: Deadline[],
  dailyWorkloads: DailyWorkload[],
  capacityLimit = 6.0
): ClashAlert[] {
  const alerts: ClashAlert[] = [];

  dailyWorkloads.forEach((day) => {
    const dueCount = day.deadlinesDue.length;
    const totalDueWeight = day.deadlinesDue.reduce((sum, d) => sum + d.weight, 0);

    // Condition 1: Multiple deadlines on the same day
    if (dueCount >= 2) {
      const isSevere = totalDueWeight >= 25 || day.totalHours > capacityLimit;
      alerts.push({
        id: `clash-${day.date}`,
        date: day.date,
        dayLabel: day.dayLabel,
        totalWeight: totalDueWeight,
        totalHours: day.totalHours,
        deadlines: day.deadlinesDue,
        severity: isSevere ? 'Overloaded' : 'Heavy',
        recommendation: `Multiple high-stake deliverables due concurrently (${day.deadlinesDue
          .map((d) => d.courseCode)
          .join(' + ')}). Front-load problem sets and mock reviews 3–4 days in advance to mitigate exam fatigue.`,
      });
    } else if (day.totalHours > capacityLimit + 1.5) {
      // Condition 2: Heavily overloaded study day even with 1 deadline
      alerts.push({
        id: `overload-${day.date}`,
        date: day.date,
        dayLabel: day.dayLabel,
        totalWeight: totalDueWeight,
        totalHours: day.totalHours,
        deadlines: day.deadlinesDue,
        severity: 'Overloaded',
        recommendation: `Projected workload of ${day.totalHours.toFixed(1)}h exceeds threshold (${capacityLimit.toFixed(1)}h). Reallocate milestone sprints into adjacent days.`,
      });
    }
  });

  return alerts;
}

/**
 * Pacing Simulator / Balancer
 * Redistributes total effort across available days so peak days don't breach capacityLimit
 */
export function simulateBalancedPacing(
  deadlines: Deadline[],
  daysCount = 14,
  maxDailyCap = 5.5,
  startDateStr = BASE_DATE_STR
): {
  originalWorkload: DailyWorkload[];
  balancedWorkload: DailyWorkload[];
  hoursSavedOnPeaks: number;
} {
  const original = calculateDailyWorkloads(deadlines, daysCount, maxDailyCap, startDateStr);

  // Compute balanced workload by shifting excess hours backwards
  const balanced: DailyWorkload[] = original.map((day) => ({
    ...day,
    studyTasks: [...day.studyTasks],
  }));

  let excessBuffer = 0;
  for (let i = balanced.length - 1; i >= 0; i--) {
    const current = balanced[i];
    const netHours = current.totalHours + excessBuffer;

    if (netHours > maxDailyCap) {
      excessBuffer = netHours - maxDailyCap;
      current.totalHours = maxDailyCap;
    } else {
      // Absorb buffer
      const room = maxDailyCap - netHours;
      const absorbed = Math.min(room, excessBuffer);
      current.totalHours = netHours + absorbed;
      excessBuffer -= absorbed;
    }
    current.totalHours = Math.round(current.totalHours * 10) / 10;
    current.tier = getTierFromHours(current.totalHours, maxDailyCap);
  }

  const originalPeakSum = original
    .filter((d) => d.totalHours > maxDailyCap)
    .reduce((sum, d) => sum + (d.totalHours - maxDailyCap), 0);

  return {
    originalWorkload: original,
    balancedWorkload: balanced,
    hoursSavedOnPeaks: Math.round(originalPeakSum * 10) / 10,
  };
}
