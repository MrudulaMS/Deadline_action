import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '1mb' }));

// In-memory rate limiter: max 20 requests per user per hour
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const rateLimits = new Map<string, RateLimitRecord>();

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const record = rateLimits.get(userId);

  if (!record || now > record.resetTime) {
    rateLimits.set(userId, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: 19 };
  }

  if (record.count >= 20) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: 20 - record.count };
}

// Lazy Gemini client initialization
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    environment: isProd ? 'production' : 'development',
    timestamp: new Date().toISOString(),
  });
});

/**
 * 1. Natural Language Task Extraction
 * Extracts structured assignments, exams, events from user freeform text.
 */
app.post('/api/ai/extract-tasks', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const userId = req.headers['x-user-id'] ? String(req.headers['x-user-id']) : 'anonymous';

  const limitCheck = checkRateLimit(userId);
  if (!limitCheck.allowed) {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit of 20 AI requests per hour exceeded for this user.',
      },
    });
    return;
  }

  const { text, userTimezone, currentDate } = req.body;
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'A text prompt is required.' },
    });
    return;
  }

  if (text.length > 3000) {
    res.status(400).json({
      error: { code: 'INPUT_TOO_LONG', message: 'Text input must not exceed 3000 characters.' },
    });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      error: {
        code: 'AI_UNAVAILABLE',
        message: 'Gemini API key is not configured on the server.',
      },
    });
    return;
  }

  const referenceDate = currentDate || new Date().toISOString().split('T')[0];
  const tz = userTimezone || 'America/New_York';

  const systemInstruction = `
You are an academic scheduling engine for Deadline Radar.
Your purpose is to extract structured tasks, exams, assignments, club activities, and deadlines from unstructured student text.
Current reference date for calculating relative terms like "tomorrow", "this Friday", "next Tuesday": ${referenceDate}.
User timezone: ${tz}.

STRICT RULES:
1. Do not invent missing specific dates. If a date cannot be reasonably determined relative to the reference date (${referenceDate}), set date to null, flag needsClarification = true, and formulate a clear clarification question.
2. Categories must be strictly one of: "assignment", "exam", "project", "club", "event", "personal", "other".
3. Priorities must be strictly one of: "low", "medium", "high", "critical". Default to "medium" if unspecified. Exams should be "high" or "critical".
4. isFlexible: true for personal study/reading/club events; false for fixed exams, class tests, and course submissions.
5. estimatedMinutes: estimate reasonable effort in integer minutes (e.g., 60, 90, 180, 240) if inferable; otherwise default to 60.
6. Times should be HH:MM in 24-hour format if mentioned (e.g. 17:00, 23:59), otherwise null.
7. Return clean JSON matching the specified schema.
`;

  try {
    const prompt = `User scheduling statement:\n"""\n${text.slice(0, 3000)}\n"""`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  category: {
                    type: Type.STRING,
                    enum: ['assignment', 'exam', 'project', 'club', 'event', 'personal', 'other'],
                  },
                  date: { type: Type.STRING, description: 'YYYY-MM-DD or null if ambiguous' },
                  time: { type: Type.STRING, description: 'HH:MM or null' },
                  estimatedMinutes: { type: Type.INTEGER },
                  priority: {
                    type: Type.STRING,
                    enum: ['low', 'medium', 'high', 'critical'],
                  },
                  isFlexible: { type: Type.BOOLEAN },
                  notes: { type: Type.STRING },
                },
                required: ['title', 'category', 'isFlexible'],
              },
            },
            needsClarification: { type: Type.BOOLEAN },
            questions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['items', 'needsClarification'],
        },
      },
    });

    const rawJson = response.text?.trim() || '{}';
    const parsed = JSON.parse(rawJson);

    // Validate structure
    const validatedItems = Array.isArray(parsed.items)
      ? parsed.items.map((item: any) => ({
          title: String(item.title || 'Untitled Deliverable').slice(0, 200),
          category: ['assignment', 'exam', 'project', 'club', 'event', 'personal', 'other'].includes(item.category)
            ? item.category
            : 'assignment',
          date: typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : null,
          time: typeof item.time === 'string' ? item.time.slice(0, 5) : null,
          estimatedMinutes: typeof item.estimatedMinutes === 'number' && item.estimatedMinutes > 0 ? Math.min(item.estimatedMinutes, 1440) : 60,
          priority: ['low', 'medium', 'high', 'critical'].includes(item.priority) ? item.priority : 'medium',
          isFlexible: Boolean(item.isFlexible),
          notes: item.notes ? String(item.notes).slice(0, 500) : '',
        }))
      : [];

    res.json({
      items: validatedItems,
      needsClarification: Boolean(parsed.needsClarification),
      questions: Array.isArray(parsed.questions) ? parsed.questions.map(String) : [],
      latencyMs: Date.now() - startTime,
    });
  } catch (err: any) {
    console.error('Error in /api/ai/extract-tasks:', err);
    res.status(500).json({
      error: {
        code: 'AI_PROCESSING_ERROR',
        message: 'Failed to process natural language schedule.',
      },
    });
  }
});

/**
 * 2. Task Breakdown with AI
 * Breaks a project or deliverable into structured subtasks.
 */
app.post('/api/ai/breakdown-task', async (req: Request, res: Response): Promise<void> => {
  const userId = req.headers['x-user-id'] ? String(req.headers['x-user-id']) : 'anonymous';
  const limitCheck = checkRateLimit(userId);
  if (!limitCheck.allowed) {
    res.status(429).json({
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded.' },
    });
    return;
  }

  const { title, description, category, estimatedMinutes } = req.body;
  if (!title || typeof title !== 'string') {
    res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Task title is required.' },
    });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      error: { code: 'AI_UNAVAILABLE', message: 'Gemini API key is not configured.' },
    });
    return;
  }

  const systemInstruction = `
You are an academic project planning assistant.
Decompose the student's task into 3 to 6 logical, chronological milestones/subtasks.
Allocate estimated minutes realistically to each subtask, summing up to approximately the parent task's total effort (or a realistic academic baseline).
`;

  try {
    const prompt = `Task: ${title}\nCategory: ${category || 'assignment'}\nDetails: ${description || 'None'}\nTotal estimated minutes: ${estimatedMinutes || 180}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subtasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  estimatedMinutes: { type: Type.INTEGER },
                  position: { type: Type.INTEGER },
                },
                required: ['title', 'estimatedMinutes', 'position'],
              },
            },
          },
          required: ['subtasks'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    const subtasks = Array.isArray(parsed.subtasks)
      ? parsed.subtasks.map((st: any, idx: number) => ({
          title: String(st.title || 'Milestone step').slice(0, 200),
          estimatedMinutes: typeof st.estimatedMinutes === 'number' ? Math.max(15, st.estimatedMinutes) : 45,
          position: typeof st.position === 'number' ? st.position : idx + 1,
        }))
      : [];

    res.json({ subtasks });
  } catch (err) {
    console.error('Error in /api/ai/breakdown-task:', err);
    res.status(500).json({
      error: { code: 'AI_PROCESSING_ERROR', message: 'Failed to generate task breakdown.' },
    });
  }
});

/**
 * 3. AI Workload Recommendations
 * Advises the user on pacing and front-loading without modifying tasks automatically.
 */
app.post('/api/ai/recommendations', async (req: Request, res: Response): Promise<void> => {
  const userId = req.headers['x-user-id'] ? String(req.headers['x-user-id']) : 'anonymous';
  const limitCheck = checkRateLimit(userId);
  if (!limitCheck.allowed) {
    res.status(429).json({
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded.' },
    });
    return;
  }

  const { tasks, dailyThresholdHours, overloadedDays } = req.body;
  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      error: { code: 'AI_UNAVAILABLE', message: 'Gemini API key is not configured.' },
    });
    return;
  }

  const systemInstruction = `
You are an academic advisor for Deadline Radar.
Review the student's workload and overloaded days.
STRICT INVARIANTS:
1. ONLY suggest moving or rescheduling tasks that have isFlexible = true.
2. NEVER suggest moving official exams, fixed tests, or class submission deadlines (isFlexible = false).
3. Do not invent task durations or claim certainty about academic outcomes.
4. Suggestions are advisory only and must never be applied automatically.
5. Provide 2 to 4 concise, high-impact suggestions.
`;

  try {
    const prompt = JSON.stringify({
      thresholdHours: dailyThresholdHours || 6.0,
      overloadedDays: overloadedDays || [],
      tasks: (tasks || []).slice(0, 15).map((t: any) => ({
        title: t.title,
        category: t.category,
        deadlineDate: t.deadlineDate,
        estimatedMinutes: t.estimatedMinutes,
        isFlexible: t.isFlexible,
        priority: t.priority,
      })),
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ['front_load', 'reschedule_flexible', 'breakdown', 'buffer'] },
                  message: { type: Type.STRING },
                  taskTitle: { type: Type.STRING },
                  suggestedAction: { type: Type.STRING },
                },
                required: ['type', 'message'],
              },
            },
          },
          required: ['summary', 'recommendations'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    res.json(parsed);
  } catch (err) {
    console.error('Error in /api/ai/recommendations:', err);
    res.status(500).json({
      error: { code: 'AI_PROCESSING_ERROR', message: 'Failed to generate recommendations.' },
    });
  }
});

// Setup Vite in development or static serve in production
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Deadline Radar server running on http://0.0.0.0:${PORT} [${isProd ? 'production' : 'development'}]`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
