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

// Hugging Face Gemma 4 configuration (configured securely via environment variable)
const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN || '';
const GEMMA_MODEL = process.env.GEMMA_MODEL || 'google/gemma-4-31B-it';

async function queryGemma(messages: { role: string; content: string }[], maxTokens = 1500): Promise<string | null> {
  if (!HUGGINGFACE_TOKEN) return null;
  try {
    const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GEMMA_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`Hugging Face Gemma API returned status ${res.status}: ${errText}. Falling back to Gemini.`);
      return null;
    }

    const data: any = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.warn('Gemma request encountered an error, falling back to Gemini:', err);
    return null;
  }
}

function extractJsonFromText(rawText: string): any {
  let cleaned = rawText.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    return JSON.parse(match[0]);
  }
  return JSON.parse(cleaned);
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
    gemmaModel: GEMMA_MODEL,
    hasHfToken: Boolean(HUGGINGFACE_TOKEN),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

/**
 * 1. Natural Language Task Extraction
 * Prioritizes Gemma 4 with seamless fallback to Gemini.
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
7. Return strictly a JSON object formatted as:
{
  "items": [
    {
      "title": string,
      "category": "assignment" | "exam" | "project" | "club" | "event" | "personal" | "other",
      "date": "YYYY-MM-DD" or null,
      "time": "HH:MM" or null,
      "estimatedMinutes": number,
      "priority": "low" | "medium" | "high" | "critical",
      "isFlexible": boolean,
      "notes": string
    }
  ],
  "needsClarification": boolean,
  "questions": string[]
}
`;

  let parsed: any = null;
  let modelUsed = 'gemma-4';

  // 1. Try Gemma 4 via Hugging Face Inference Router
  const gemmaMessages = [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: `Extract deliverables from this text and return strictly valid JSON:\n"""\n${text.slice(0, 3000)}\n"""` },
  ];

  const gemmaResponse = await queryGemma(gemmaMessages, 1500);
  if (gemmaResponse) {
    try {
      parsed = extractJsonFromText(gemmaResponse);
    } catch (e) {
      console.warn('Gemma output JSON parsing failed, falling back to Gemini:', e);
    }
  }

  // 2. Fallback to Gemini if Gemma did not return valid JSON
  if (!parsed) {
    modelUsed = 'gemini-2.5-flash';
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: {
          code: 'AI_UNAVAILABLE',
          message: 'Both Gemma 4 and Gemini inference are currently unavailable.',
        },
      });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `User scheduling statement:\n"""\n${text.slice(0, 3000)}\n"""`,
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
      parsed = JSON.parse(rawJson);
    } catch (err) {
      console.error('Gemini extraction failed:', err);
      res.status(500).json({
        error: {
          code: 'AI_PROCESSING_ERROR',
          message: 'Failed to extract deliverables with AI models.',
        },
      });
      return;
    }
  }

  // Validate and sanitize parsed items
  const validatedItems = Array.isArray(parsed?.items)
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
    needsClarification: Boolean(parsed?.needsClarification),
    questions: Array.isArray(parsed?.questions) ? parsed.questions.map(String) : [],
    modelUsed,
    latencyMs: Date.now() - startTime,
  });
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

  const systemInstruction = `
You are an academic project planning assistant.
Decompose the student's task into 3 to 6 logical, chronological milestones/subtasks.
Allocate estimated minutes realistically to each subtask, summing up to approximately the parent task's total effort.
Return strictly a JSON object:
{
  "subtasks": [
    { "title": string, "estimatedMinutes": number, "position": number }
  ]
}
`;

  let subtasks: any[] = [];

  // 1. Try Gemma 4
  const gemmaMessages = [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: `Breakdown task:\nTitle: ${title}\nCategory: ${category || 'assignment'}\nDescription: ${description || 'None'}\nEstimated minutes: ${estimatedMinutes || 180}` },
  ];

  const gemmaResponse = await queryGemma(gemmaMessages, 1000);
  if (gemmaResponse) {
    try {
      const parsed = extractJsonFromText(gemmaResponse);
      if (Array.isArray(parsed.subtasks)) {
        subtasks = parsed.subtasks;
      }
    } catch (e) {
      console.warn('Gemma breakdown parsing failed, using Gemini:', e);
    }
  }

  // 2. Fallback to Gemini
  if (subtasks.length === 0) {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: { code: 'AI_UNAVAILABLE', message: 'AI model service unavailable.' },
      });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Task: ${title}\nCategory: ${category || 'assignment'}\nDetails: ${description || 'None'}\nTotal estimated minutes: ${estimatedMinutes || 180}`,
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
      if (Array.isArray(parsed.subtasks)) {
        subtasks = parsed.subtasks;
      }
    } catch (err) {
      console.error('Gemini breakdown error:', err);
      res.status(500).json({
        error: { code: 'AI_PROCESSING_ERROR', message: 'Failed to generate task breakdown.' },
      });
      return;
    }
  }

  const validatedSubtasks = subtasks.map((st: any, idx: number) => ({
    title: String(st.title || 'Milestone step').slice(0, 200),
    estimatedMinutes: typeof st.estimatedMinutes === 'number' ? Math.max(15, st.estimatedMinutes) : 45,
    position: typeof st.position === 'number' ? st.position : idx + 1,
  }));

  res.json({ subtasks: validatedSubtasks });
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

  const systemInstruction = `
You are an academic advisor for Deadline Radar.
Review the student's workload and overloaded days.
STRICT INVARIANTS:
1. ONLY suggest moving or rescheduling tasks that have isFlexible = true.
2. NEVER suggest moving official exams, fixed tests, or class submission deadlines (isFlexible = false).
3. Do not invent task durations or claim certainty about academic outcomes.
4. Suggestions are advisory only and must never be applied automatically.
5. Return strictly a JSON object:
{
  "summary": string,
  "recommendations": [
    {
      "type": "front_load" | "reschedule_flexible" | "breakdown" | "buffer",
      "message": string,
      "taskTitle": string,
      "suggestedAction": string
    }
  ]
}
`;

  let resultData: any = null;

  // 1. Try Gemma 4
  const gemmaMessages = [
    { role: 'system', content: systemInstruction },
    {
      role: 'user',
      content: JSON.stringify({
        thresholdHours: dailyThresholdHours || 8.0,
        overloadedDays: overloadedDays || [],
        tasks: (tasks || []).slice(0, 15),
      }),
    },
  ];

  const gemmaResponse = await queryGemma(gemmaMessages, 1200);
  if (gemmaResponse) {
    try {
      resultData = extractJsonFromText(gemmaResponse);
    } catch (e) {
      console.warn('Gemma recommendations parsing failed, using Gemini:', e);
    }
  }

  // 2. Fallback to Gemini
  if (!resultData) {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: { code: 'AI_UNAVAILABLE', message: 'AI advisor service unavailable.' },
      });
      return;
    }

    try {
      const prompt = JSON.stringify({
        thresholdHours: dailyThresholdHours || 8.0,
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

      resultData = JSON.parse(response.text?.trim() || '{}');
    } catch (err) {
      console.error('Gemini recommendations error:', err);
      res.status(500).json({
        error: { code: 'AI_PROCESSING_ERROR', message: 'Failed to generate recommendations.' },
      });
      return;
    }
  }

  res.json(resultData);
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
    console.log(`Gemma Model target: ${GEMMA_MODEL} with Hugging Face integration active.`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
