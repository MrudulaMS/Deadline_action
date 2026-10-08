import { Task, UserSettings, DailyWorkload, WeeklyWorkload, ClashAlert, WorkloadTier, Deadline } from '../types';
import { taskToDeadline } from './taskService';

export const BASE_DATE_STR = '2026-10-08';

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

export function getTierFromHours(hours: number, capacityLimit = 8.0): WorkloadTier {
  if (hours < 3.0) return 'Light';
  if (hours <= 6.0) return 'Moderate';
  if (hours <= capacityLimit) return 'Heavy';
  return 'Overloaded';
}

/**
 * 1. Calculate Daily Workload
 * Deterministic aggregation of pending tasks per calendar day.
 */
export function calculateDailyWorkload(
  tasks: Task[],
  settings?: Partial<UserSettings>,
  startDateStr?: string,
  daysCount = 14
): DailyWorkload[] {
  const capacityLimit = settings?.dailyWorkloadThreshold || 8.0;
  const todayStr = startDateStr || new Date().toISOString().split('T')[0];
  const startDate = parseDate(todayStr);

  // Filter pending/in_progress tasks (ignore completed and deleted)
  const activeTasks = tasks.filter((t) => !t.deletedAt && t.status !== 'completed' && t.status !== 'archived');
  const result: DailyWorkload[] = [];

  for (let i = 0; i < daysCount; i++) {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + i);
    const dateStr = formatDate(current);

    const deadlinesDueTasks = activeTasks.filter((t) => t.deadlineDate === dateStr);
    const deadlinesDue: Deadline[] = deadlinesDueTasks.map(taskToDeadline);

    // Calculate distributed study effort
    let totalMinutes = 0;
    let highCount = 0;
    let critCount = 0;
    const studyTasks: { deadlineId: string; courseCode: string; title: string; hours: number }[] = [];

    // Deliverables due today contribute directly
    deadlinesDueTasks.forEach((t) => {
      totalMinutes += t.estimatedMinutes;
      if (t.priority === 'high') highCount++;
      if (t.priority === 'critical') critCount++;

      studyTasks.push({
        deadlineId: t.id,
        courseCode: t.courseCode || t.category.toUpperCase().slice(0, 4),
        title: t.title,
        hours: Math.round((t.estimatedMinutes / 60) * 10) / 10,
      });
    });

    // Upcoming deliverables within 4 days allocate prep sessions
    activeTasks.forEach((t) => {
      if (t.deadlineDate === dateStr) return;
      const dueDate = parseDate(t.deadlineDate);
      const diffDays = Math.round((dueDate.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays > 0 && diffDays <= 4) {
        // Prep portion (20% of effort)
        const prepMin = Math.round(t.estimatedMinutes * 0.2);
        if (prepMin >= 20) {
          totalMinutes += prepMin;
          studyTasks.push({
            deadlineId: t.id,
            courseCode: t.courseCode || t.category.toUpperCase().slice(0, 4),
            title: `Prep: ${t.title}`,
            hours: Math.round((prepMin / 60) * 10) / 10,
          });
        }
      }
    });

    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const tier = getTierFromHours(totalHours, capacityLimit);

    result.push({
      date: dateStr,
      dayLabel: formatDayLabel(dateStr),
      shortDay: formatShortDay(dateStr),
      totalEstimatedMinutes: totalMinutes,
      totalHours,
      taskCount: deadlinesDueTasks.length,
      highPriorityCount: highCount,
      criticalPriorityCount: critCount,
      capacityLimit,
      tier,
      deadlinesDue,
      suggestedStudyHours: totalHours,
      studyTasks,
    });
  }

  return result;
}

/**
 * 2. Calculate Weekly Workload
 * Aggregates workload per week adhering to the user's weekStartsOn preference.
 */
export function calculateWeeklyWorkload(
  tasks: Task[],
  settings?: Partial<UserSettings>,
  startDateStr?: string,
  weeksCount = 4
): WeeklyWorkload[] {
  const weeklyCap = settings?.weeklyWorkloadThreshold || 18.0;
  const weekStartPref = settings?.weekStartsOn || 'Monday';
  const todayStr = startDateStr || new Date().toISOString().split('T')[0];
  const refDate = parseDate(todayStr);

  // Align to beginning of the week
  const dayOfWeek = refDate.getDay(); // 0 is Sunday, 1 is Monday
  let daysToSubtract = 0;
  if (weekStartPref === 'Monday') {
    daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  } else {
    daysToSubtract = dayOfWeek;
  }

  const initialWeekStart = new Date(refDate);
  initialWeekStart.setDate(refDate.getDate() - daysToSubtract);

  const activeTasks = tasks.filter((t) => !t.deletedAt && t.status !== 'completed' && t.status !== 'archived');
  const weeklyResults: WeeklyWorkload[] = [];

  for (let w = 0; w < weeksCount; w++) {
    const wStart = new Date(initialWeekStart);
    wStart.setDate(initialWeekStart.getDate() + w * 7);

    const wEnd = new Date(wStart);
    wEnd.setDate(wStart.getDate() + 6);

    const wStartStr = formatDate(wStart);
    const wEndStr = formatDate(wEnd);

    // Find tasks in this week
    const weekTasks = activeTasks.filter((t) => t.deadlineDate >= wStartStr && t.deadlineDate <= wEndStr);

    let totalMin = 0;
    let highCount = 0;
    let critCount = 0;
    const dayTotals: Record<string, number> = {};

    weekTasks.forEach((t) => {
      totalMin += t.estimatedMinutes;
      if (t.priority === 'high') highCount++;
      if (t.priority === 'critical') critCount++;

      dayTotals[t.deadlineDate] = (dayTotals[t.deadlineDate] || 0) + t.estimatedMinutes;
    });

    const totalHours = Math.round((totalMin / 60) * 10) / 10;
    const isOverloaded = totalHours > weeklyCap;

    // Find busiest day
    let maxDay = wStartStr;
    let maxMin = 0;
    Object.entries(dayTotals).forEach(([d, m]) => {
      if (m > maxMin) {
        maxMin = m;
        maxDay = d;
      }
    });

    const tier = totalHours < 10 ? 'Light' : totalHours <= 15 ? 'Moderate' : totalHours <= weeklyCap ? 'Heavy' : 'Overloaded';

    // Generate structured explanation
    const explanation = generateWorkloadExplanation({
      weekStart: wStartStr,
      weekEnd: wEndStr,
      totalHours,
      taskCount: weekTasks.length,
      highPriorityCount: highCount + critCount,
      overloaded: isOverloaded,
      busiestDay: maxDay,
      busiestHours: Math.round((maxMin / 60) * 10) / 10,
    });

    weeklyResults.push({
      weekStart: wStartStr,
      weekEnd: wEndStr,
      weekLabel: `${formatDayLabel(wStartStr)} – ${formatDayLabel(wEndStr)}`,
      totalEstimatedMinutes: totalMin,
      totalEstimatedHours: totalHours,
      taskCount: weekTasks.length,
      highPriorityCount: highCount,
      criticalPriorityCount: critCount,
      workloadLevel: tier,
      overloaded: isOverloaded,
      busiestDay: {
        date: maxDay,
        hours: Math.round((maxMin / 60) * 10) / 10,
      },
      explanation,
    });
  }

  return weeklyResults;
}

/**
 * 3. Generate Structured Workload Explanation
 * Produces clear, deterministic explanations without AI hallucinations.
 */
export function generateWorkloadExplanation(params: {
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  taskCount: number;
  highPriorityCount: number;
  overloaded: boolean;
  busiestDay: string;
  busiestHours: number;
}): string {
  const sLabel = formatDayLabel(params.weekStart);
  const eLabel = formatDayLabel(params.weekEnd);
  const busiestLabel = formatDayLabel(params.busiestDay);

  if (params.taskCount === 0) {
    return `${sLabel} to ${eLabel} has no active deliverables scheduled. Workload is clear.`;
  }

  if (params.overloaded) {
    return `${sLabel} to ${eLabel} is overloaded because ${params.taskCount} tasks require approximately ${params.totalHours} hours of estimated work, with peak strain on ${busiestLabel} (${params.busiestHours} hours) and ${params.highPriorityCount} high-priority deadlines.`;
  }

  return `${sLabel} to ${eLabel} has a manageable schedule of ${params.taskCount} tasks requiring ${params.totalHours} hours. Busiest day is ${busiestLabel} at ${params.busiestHours} hours.`;
}

/**
 * 4. Detect Clash Alerts
 */
export function detectClashAlerts(
  tasks: Task[],
  dailyWorkloads: DailyWorkload[],
  capacityLimit = 8.0
): ClashAlert[] {
  const alerts: ClashAlert[] = [];

  dailyWorkloads.forEach((day) => {
    const dueCount = day.deadlinesDue.length;
    const totalDueHours = day.deadlinesDue.reduce((sum, d) => sum + d.estimatedHours, 0);

    if (dueCount >= 2) {
      const isSevere = totalDueHours >= capacityLimit || day.criticalPriorityCount > 0;
      alerts.push({
        id: `clash-${day.date}`,
        date: day.date,
        dayLabel: day.dayLabel,
        totalWeight: day.deadlinesDue.reduce((sum, d) => sum + d.weight, 0),
        totalHours: day.totalHours,
        deadlines: day.deadlinesDue,
        severity: isSevere ? 'Overloaded' : 'Heavy',
        recommendation: `Multiple concurrent deadlines detected (${day.deadlinesDue.map((d) => d.courseCode).join(' + ')}). Front-load preparation 2 to 3 days in advance to prevent late-night crunches.`,
      });
    } else if (day.totalHours > capacityLimit) {
      alerts.push({
        id: `overload-${day.date}`,
        date: day.date,
        dayLabel: day.dayLabel,
        totalWeight: day.deadlinesDue.reduce((sum, d) => sum + d.weight, 0),
        totalHours: day.totalHours,
        deadlines: day.deadlinesDue,
        severity: 'Overloaded',
        recommendation: `Daily workload of ${day.totalHours.toFixed(1)} hours exceeds your daily capacity of ${capacityLimit.toFixed(1)} hours. Break down milestones or reschedule flexible tasks.`,
      });
    }
  });

  return alerts;
}
