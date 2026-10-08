import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
  setDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Task, Subtask, Deadline, WorkloadTier } from '../types';

export function taskToDeadline(task: Task): Deadline {
  const hours = Math.round((task.estimatedMinutes / 60) * 10) / 10;
  const isCompleted = task.status === 'completed';

  const computeTier = (h: number): WorkloadTier => {
    if (h <= 2.5) return 'Light';
    if (h <= 5.0) return 'Moderate';
    if (h <= 7.5) return 'Heavy';
    return 'Overloaded';
  };

  return {
    id: task.id,
    title: task.title,
    courseCode: task.courseCode || task.category.toUpperCase().slice(0, 4),
    courseName: task.description || task.title,
    category: task.category,
    dueDate: task.deadlineDate,
    dueTime: task.deadlineTime || '23:59',
    weight: task.weight || (task.category === 'exam' ? 25 : task.category === 'project' ? 20 : 10),
    estimatedHours: hours,
    completedHours: isCompleted ? hours : 0,
    workloadTier: computeTier(hours),
    status: isCompleted ? 'submitted' : task.status === 'in_progress' ? 'in_progress' : 'upcoming',
    milestones: (task.subtasks || []).map((st) => ({
      id: st.id,
      title: st.title,
      dueDate: task.deadlineDate,
      completed: st.completed,
      estimatedHours: st.estimatedMinutes ? Math.round((st.estimatedMinutes / 60) * 10) / 10 : 1,
    })),
    notes: task.notes || task.description || '',
    isFlexible: task.isFlexible,
    priority: task.priority,
  };
}

export function deadlineToTaskInput(dl: Deadline): Omit<Task, 'id'> {
  const categoryMap: Record<string, Task['category']> = {
    exam: 'exam',
    project: 'project',
    assignment: 'assignment',
    lab: 'assignment',
    paper: 'assignment',
    'problem set': 'assignment',
    club: 'club',
    event: 'event',
    personal: 'personal',
  };

  const normalizedCategory = categoryMap[dl.category.toLowerCase()] || 'assignment';

  return {
    title: dl.title.trim(),
    description: dl.notes || '',
    category: normalizedCategory,
    deadlineDate: dl.dueDate,
    deadlineTime: dl.dueTime || '23:59',
    estimatedMinutes: Math.max(15, Math.round(dl.estimatedHours * 60)),
    priority: dl.priority || (dl.workloadTier === 'Overloaded' ? 'critical' : dl.workloadTier === 'Heavy' ? 'high' : 'medium'),
    status: dl.status === 'submitted' ? 'completed' : dl.status === 'in_progress' ? 'in_progress' : 'pending',
    isFlexible: Boolean(dl.isFlexible),
    notes: dl.notes || '',
    courseCode: dl.courseCode,
    weight: dl.weight,
    subtasks: dl.milestones.map((m, idx) => ({
      id: m.id || `st-${idx}`,
      title: m.title,
      completed: m.completed,
      position: idx + 1,
      estimatedMinutes: Math.round(m.estimatedHours * 60),
    })),
  };
}

// 1. Subscribe to tasks
export function subscribeUserTasks(
  userId: string,
  onTasks: (tasks: Task[]) => void,
  onError?: (error: any) => void
) {
  const tasksColPath = `users/${userId}/tasks`;
  const tasksQuery = query(collection(db, tasksColPath), orderBy('deadlineDate', 'asc'));

  return onSnapshot(
    tasksQuery,
    async (snapshot) => {
      const activeTasks: Task[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        // Soft delete check
        if (data.deletedAt) continue;

        activeTasks.push({
          id: docSnap.id,
          title: data.title || '',
          description: data.description || '',
          category: data.category || 'assignment',
          deadlineDate: data.deadlineDate || '',
          deadlineTime: data.deadlineTime || '',
          estimatedMinutes: Number(data.estimatedMinutes) || 60,
          priority: data.priority || 'medium',
          status: data.status || 'pending',
          isFlexible: Boolean(data.isFlexible),
          startDate: data.startDate || '',
          notes: data.notes || '',
          courseCode: data.courseCode || '',
          weight: data.weight || 10,
          completedAt: data.completedAt || null,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
          subtasks: Array.isArray(data.subtasks) ? data.subtasks : [],
        });
      }

      onTasks(activeTasks);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, tasksColPath);
      onError?.(err);
    }
  );
}

// 2. Create task
export async function createTask(userId: string, task: Omit<Task, 'id'>): Promise<string> {
  const path = `users/${userId}/tasks`;
  try {
    const payload = {
      title: task.title.slice(0, 200),
      description: (task.description || '').slice(0, 2000),
      category: task.category,
      deadlineDate: task.deadlineDate,
      deadlineTime: task.deadlineTime || '23:59',
      estimatedMinutes: Math.max(1, Math.min(20000, Number(task.estimatedMinutes) || 60)),
      priority: task.priority,
      status: task.status,
      isFlexible: Boolean(task.isFlexible),
      startDate: task.startDate || '',
      notes: (task.notes || '').slice(0, 2000),
      courseCode: (task.courseCode || '').slice(0, 20),
      weight: Number(task.weight) || 10,
      subtasks: task.subtasks || [],
      completedAt: task.status === 'completed' ? serverTimestamp() : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedAt: null,
    };

    const docRef = await addDoc(collection(db, path), payload);
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

// 3. Update task
export async function updateTask(userId: string, taskId: string, updates: Partial<Task>): Promise<void> {
  const path = `users/${userId}/tasks/${taskId}`;
  try {
    const docRef = doc(db, 'users', userId, 'tasks', taskId);
    const payload: any = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    if (updates.status === 'completed' && !updates.completedAt) {
      payload.completedAt = serverTimestamp();
    } else if (updates.status && updates.status !== 'completed') {
      payload.completedAt = null;
    }
    await updateDoc(docRef, payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// 4. Soft Delete task
export async function softDeleteTask(userId: string, taskId: string): Promise<void> {
  const path = `users/${userId}/tasks/${taskId}`;
  try {
    const docRef = doc(db, 'users', userId, 'tasks', taskId);
    await updateDoc(docRef, {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// 5. Restore soft-deleted task
export async function restoreTask(userId: string, taskId: string): Promise<void> {
  const path = `users/${userId}/tasks/${taskId}`;
  try {
    const docRef = doc(db, 'users', userId, 'tasks', taskId);
    await updateDoc(docRef, {
      deletedAt: null,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// 6. Complete task
export async function completeTask(userId: string, taskId: string): Promise<void> {
  await updateTask(userId, taskId, {
    status: 'completed',
    completedAt: serverTimestamp(),
  });
}

// 7. Reopen task
export async function reopenTask(userId: string, taskId: string): Promise<void> {
  await updateTask(userId, taskId, {
    status: 'pending',
    completedAt: null,
  });
}

// 8. Toggle Subtask completion
export async function toggleSubtask(
  userId: string,
  taskId: string,
  subtaskId: string,
  currentTasks: Task[]
): Promise<void> {
  const parent = currentTasks.find((t) => t.id === taskId);
  if (!parent || !parent.subtasks) return;

  const updatedSubtasks = parent.subtasks.map((st) =>
    st.id === subtaskId ? { ...st, completed: !st.completed } : st
  );

  await updateTask(userId, taskId, {
    subtasks: updatedSubtasks,
  });
}

// 9. Add Subtask
export async function addSubtask(
  userId: string,
  taskId: string,
  subtask: Omit<Subtask, 'id'>,
  currentTasks: Task[]
): Promise<void> {
  const parent = currentTasks.find((t) => t.id === taskId);
  if (!parent) return;

  const newSubtask: Subtask = {
    ...subtask,
    id: `st-${Date.now()}`,
  };

  const updatedSubtasks = [...(parent.subtasks || []), newSubtask];
  await updateTask(userId, taskId, {
    subtasks: updatedSubtasks,
  });
}
