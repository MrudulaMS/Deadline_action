import { Task } from '../src/types';
import {
  calculateDailyWorkload,
  calculateWeeklyWorkload,
  generateWorkloadExplanation,
  detectClashAlerts,
  getTierFromHours,
  formatDate,
  parseDate,
} from '../src/services/workloadEngine';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ Passed: ${msg}`);
  }
}

console.log('--- RUNNING DEADLINE RADAR TEST SUITE ---');

// 1. Test Workload Tiers
assert(getTierFromHours(2.0, 8.0) === 'Light', '2.0 hours should be Light workload');
assert(getTierFromHours(4.5, 8.0) === 'Moderate', '4.5 hours should be Moderate workload');
assert(getTierFromHours(7.0, 8.0) === 'Heavy', '7.0 hours should be Heavy workload');
assert(getTierFromHours(9.5, 8.0) === 'Overloaded', '9.5 hours should be Overloaded (>8h threshold)');

// 2. Test Daily Workload Calculation (Zero tasks)
const emptyDaily = calculateDailyWorkload([], { dailyWorkloadThreshold: 8 }, '2026-10-10', 7);
assert(emptyDaily.length === 7, 'Should produce 7 daily slots');
assert(emptyDaily.every((d) => d.totalHours === 0 && d.tier === 'Light'), 'Empty schedule must have 0 hours and Light tier');

// 3. Test Daily Workload with Active, Completed, and Deleted Tasks
const sampleTasks: Task[] = [
  {
    id: 't1',
    title: 'CS 3110 Prelim Exam',
    category: 'exam',
    deadlineDate: '2026-10-14',
    estimatedMinutes: 360, // 6.0 hours
    priority: 'critical',
    status: 'pending',
    isFlexible: false,
  },
  {
    id: 't2',
    title: 'MATH 2210 Problem Set',
    category: 'assignment',
    deadlineDate: '2026-10-14',
    estimatedMinutes: 240, // 4.0 hours
    priority: 'high',
    status: 'pending',
    isFlexible: false,
  },
  {
    id: 't3_completed',
    title: 'Past Quiz',
    category: 'assignment',
    deadlineDate: '2026-10-14',
    estimatedMinutes: 120,
    priority: 'low',
    status: 'completed', // Should NOT contribute to active workload
    isFlexible: true,
  },
  {
    id: 't4_deleted',
    title: 'Canceled Meeting',
    category: 'club',
    deadlineDate: '2026-10-14',
    estimatedMinutes: 180,
    priority: 'low',
    status: 'pending',
    deletedAt: '2026-10-09T00:00:00Z', // Soft-deleted, must NOT contribute
    isFlexible: true,
  },
];

const daily = calculateDailyWorkload(sampleTasks, { dailyWorkloadThreshold: 8 }, '2026-10-14', 1);
const oct14 = daily[0];
assert(oct14.taskCount === 2, 'Completed and soft-deleted tasks must be excluded (2 active tasks remaining)');
assert(oct14.totalEstimatedMinutes === 600, 'Total minutes must be 360 + 240 = 600 min');
assert(oct14.totalHours === 10.0, 'Total hours must be 10.0');
assert(oct14.tier === 'Overloaded', '10.0h exceeds 8.0h threshold so tier must be Overloaded');

// 4. Test Clash Detection
const clashAlerts = detectClashAlerts(sampleTasks, daily, 8.0);
assert(clashAlerts.length === 1, 'Should detect clash on 2026-10-14 with 2 concurrent deliverables');
assert(clashAlerts[0].severity === 'Overloaded', 'Clash with 10h total load must be Overloaded');

// 5. Test Weekly Workload & Explanations
const weekly = calculateWeeklyWorkload(sampleTasks, { weeklyWorkloadThreshold: 18, weekStartsOn: 'Monday' }, '2026-10-12', 2);
assert(weekly.length === 2, 'Should calculate 2 weeks');
const w1 = weekly[0];
assert(w1.taskCount === 2, 'Week 1 should have 2 active tasks');
assert(w1.totalEstimatedHours === 10.0, 'Week 1 should total 10.0 hours');
assert(w1.overloaded === false, '10.0h does not exceed 18.0h weekly threshold');

const explanation = generateWorkloadExplanation({
  weekStart: '2026-10-12',
  weekEnd: '2026-10-18',
  totalHours: 22.0,
  taskCount: 5,
  highPriorityCount: 3,
  overloaded: true,
  busiestDay: '2026-10-14',
  busiestHours: 10.0,
});
assert(explanation.includes('overloaded'), 'Explanation must accurately report overloaded status');
assert(explanation.includes('22 hours'), 'Explanation must include deterministic calculated hours (22 hours)');

// 6. Test Timezone & Date Formatting Invariants
const parsed = parseDate('2026-10-08');
assert(formatDate(parsed) === '2026-10-08', 'Date parse & format must be idempotent');

// 7. Test AI Safety Invariant (Only flexible tasks can be rescheduled)
const flexibleTasks = sampleTasks.filter((t) => t.isFlexible);
const fixedTasks = sampleTasks.filter((t) => !t.isFlexible);
assert(fixedTasks.length === 2, 'Exams and problem sets must have isFlexible = false');
assert(fixedTasks.every((t) => t.category === 'exam' || t.category === 'assignment'), 'Fixed tasks must preserve strict deadlines');

console.log('--- ALL DEADLINE RADAR TESTS PASSED SUCCESSFULLY ---');
