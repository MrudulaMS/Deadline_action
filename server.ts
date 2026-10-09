import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

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

// Active high-performance Gemini models with automated fallback
const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
];

// Lazy Gemini client initialization
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

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
      console.warn(`Hugging Face Gemma API status ${res.status}: ${errText}. Routing to Gemini.`);
      return null;
    }

    const data: any = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.warn('Gemma request failed, routing to Gemini:', err);
    return null;
  }
}

async function generateWithGemini(contents: string, systemInstruction: string): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) throw new Error('Gemini API key is not configured.');

  let lastError: any = null;
  for (const model of GEMINI_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });
      if (response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Model ${model} failed (${err.status || err.message}), attempting next model...`);
      lastError = err;
    }
  }
  throw lastError || new Error('All AI models unavailable.');
}

function extractJsonFromText(rawText: string): any {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    return JSON.parse(match[0]);
  }
  return JSON.parse(cleaned);
}

/**
 * Deterministic local parser fallback if external cloud AI providers are unavailable
 */
function localRuleBasedExtraction(text: string, referenceDate: string): any {
  const items: any[] = [];
  const lower = text.toLowerCase();
  const sentences = text.split(/[.;\n]+/).map((s) => s.trim()).filter(Boolean);

  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const ref = new Date(referenceDate);

  for (const sentence of sentences) {
    const sLower = sentence.toLowerCase();
    let category = 'assignment';
    let priority = 'medium';
    let isFlexible = false;
    let estimatedMinutes = 90;

    if (sLower.includes('exam') || sLower.includes('midterm') || sLower.includes('final') || sLower.includes('prelim') || sLower.includes('quiz') || sLower.includes('test')) {
      category = 'exam';
      priority = 'high';
      isFlexible = false;
      estimatedMinutes = 180;
    } else if (sLower.includes('project') || sLower.includes('paper') || sLower.includes('draft') || sLower.includes('essay')) {
      category = 'project';
      priority = 'high';
      isFlexible = false;
      estimatedMinutes = 240;
    } else if (sLower.includes('club') || sLower.includes('meeting') || sLower.includes('social') || sLower.includes('event')) {
      category = 'club';
      priority = 'low';
      isFlexible = true;
      estimatedMinutes = 60;
    } else if (sLower.includes('read') || sLower.includes('study') || sLower.includes('review') || sLower.includes('prep')) {
      category = 'personal';
      priority = 'medium';
      isFlexible = true;
      estimatedMinutes = 90;
    }

    // Attempt relative date detection
    let dateStr = referenceDate;
    let timeStr = '23:59';

    if (sLower.includes('tomorrow')) {
      const d = new Date(ref);
      d.setDate(ref.getDate() + 1);
      dateStr = d.toISOString().split('T')[0];
    } else {
      for (let i = 0; i < 7; i++) {
        if (sLower.includes(daysOfWeek[i])) {
          const currentDay = ref.getDay();
          let targetDay = i;
          let diff = targetDay - currentDay;
          if (diff <= 0 || sLower.includes('next ' + daysOfWeek[i])) {
            diff += 7;
          }
          const d = new Date(ref);
          d.setDate(ref.getDate() + diff);
          dateStr = d.toISOString().split('T')[0];
          break;
        }
      }
    }

    // Simple time check (e.g. 10am, 2pm, 14:00)
    const timeMatch = sentence.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3].toLowerCase();
      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;
      timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    const title = sentence.replace(/^(i have|there is|due|due date|scheduled)\s*/i, '').trim();

    items.push({
      title: title.length > 5 ? title.slice(0, 100) : 'Academic Commitment',
      category,
      date: dateStr,
      time: timeStr,
      estimatedMinutes,
      priority,
      isFlexible,
      notes: sentence,
    });
  }

  return {
    items: items.length > 0 ? items : [
      {
        title: text.slice(0, 80),
        category: 'assignment',
        date: referenceDate,
        time: '23:59',
        estimatedMinutes: 90,
        priority: 'medium',
        isFlexible: false,
        notes: text,
      },
    ],
    needsClarification: false,
    questions: [],
  };
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    environment: isProd ? 'production' : 'development',
    gemmaModel: GEMMA_MODEL,
    hasHfToken: Boolean(HUGGINGFACE_TOKEN),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    geminiModels: GEMINI_MODELS,
    timestamp: new Date().toISOString(),
  });
});

/**
 * 1. Natural Language Task Extraction
 * Resilient multi-tier architecture: Gemma 4 -> Gemini 3.5 -> Local Rule Engine.
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
7. Return strictly a JSON object:
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
  if (HUGGINGFACE_TOKEN) {
    const gemmaMessages = [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: `Extract deliverables from this text and return strictly valid JSON:\n"""\n${text.slice(0, 3000)}\n"""` },
    ];
    const gemmaResponse = await queryGemma(gemmaMessages, 1500);
    if (gemmaResponse) {
      try {
        parsed = extractJsonFromText(gemmaResponse);
      } catch (e) {
        console.warn('Gemma output JSON parsing failed, attempting Gemini:', e);
      }
    }
  }

  // 2. Fallback to Gemini with automatic model rotation
  if (!parsed) {
    modelUsed = 'gemini-flash';
    try {
      const prompt = `User scheduling statement:\n"""\n${text.slice(0, 3000)}\n"""\nExtract deliverables into JSON:`;
      const geminiText = await generateWithGemini(prompt, systemInstruction);
      parsed = extractJsonFromText(geminiText);
    } catch (err: any) {
      console.warn('Gemini extraction failed, using deterministic local engine fallback:', err?.message || err);
    }
  }

  // 3. Fallback to local deterministic parser if remote AI providers fail
  if (!parsed || !Array.isArray(parsed.items)) {
    modelUsed = 'local-engine';
    parsed = localRuleBasedExtraction(text, referenceDate);
  }

  // Sanitize and validate items
  const validatedItems = Array.isArray(parsed?.items)
    ? parsed.items.map((item: any) => ({
        title: String(item.title || 'Untitled Deliverable').slice(0, 200),
        category: ['assignment', 'exam', 'project', 'club', 'event', 'personal', 'other'].includes(item.category)
          ? item.category
          : 'assignment',
        date: typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : referenceDate,
        time: typeof item.time === 'string' ? item.time.slice(0, 5) : '23:59',
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
  if (HUGGINGFACE_TOKEN) {
    const gemmaMessages = [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: `Breakdown task:\nTitle: ${title}\nCategory: ${category || 'assignment'}\nDescription: ${description || 'None'}\nEstimated minutes: ${estimatedMinutes || 180}` },
    ];
    const gemmaResponse = await queryGemma(gemmaMessages, 1000);
    if (gemmaResponse) {
      try {
        const parsed = extractJsonFromText(gemmaResponse);
        if (Array.isArray(parsed.subtasks)) subtasks = parsed.subtasks;
      } catch (e) {
        console.warn('Gemma breakdown parsing failed:', e);
      }
    }
  }

  // 2. Try Gemini
  if (subtasks.length === 0) {
    try {
      const prompt = `Task: ${title}\nCategory: ${category || 'assignment'}\nDetails: ${description || 'None'}\nTotal estimated minutes: ${estimatedMinutes || 180}`;
      const geminiText = await generateWithGemini(prompt, systemInstruction);
      const parsed = extractJsonFromText(geminiText);
      if (Array.isArray(parsed.subtasks)) subtasks = parsed.subtasks;
    } catch (err) {
      console.warn('Gemini breakdown failed, using fallback milestones:', err);
    }
  }

  // 3. Fallback deterministic breakdown
  if (subtasks.length === 0) {
    const totalMin = estimatedMinutes || 180;
    subtasks = [
      { title: `Read requirements and review concepts for ${title}`, estimatedMinutes: Math.round(totalMin * 0.25), position: 1 },
      { title: `Draft core problem solutions and implementation`, estimatedMinutes: Math.round(totalMin * 0.5), position: 2 },
      { title: `Proofread, test edge cases, and finalize submission`, estimatedMinutes: Math.round(totalMin * 0.25), position: 3 },
    ];
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
  if (HUGGINGFACE_TOKEN) {
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
        console.warn('Gemma recommendations parse failed:', e);
      }
    }
  }

  // 2. Try Gemini
  if (!resultData) {
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
      const geminiText = await generateWithGemini(prompt, systemInstruction);
      resultData = extractJsonFromText(geminiText);
    } catch (err) {
      console.warn('Gemini recommendations failed, generating deterministic recommendations:', err);
    }
  }

  // 3. Deterministic recommendation fallback
  if (!resultData) {
    const recs: any[] = [];
    const flexibleTasks = (tasks || []).filter((t: any) => t.isFlexible);

    if (overloadedDays && overloadedDays.length > 0) {
      if (flexibleTasks.length > 0) {
        recs.push({
          type: 'reschedule_flexible',
          taskTitle: flexibleTasks[0].title,
          message: `Consider moving "${flexibleTasks[0].title}" earlier or later to alleviate peak crunch.`,
          suggestedAction: 'Reschedule flexible deliverable',
        });
      }
      recs.push({
        type: 'front_load',
        taskTitle: 'Upcoming Deadlines',
        message: 'Start high-stakes exam preparation 2 to 3 days in advance to flatten spike days.',
        suggestedAction: 'Allocate 1.5h daily prep blocks',
      });
    } else {
      recs.push({
        type: 'buffer',
        taskTitle: 'Pacing on Track',
        message: 'Your current workload is within your daily capacity thresholds.',
        suggestedAction: 'Maintain steady velocity',
      });
    }

    resultData = {
      summary: overloadedDays?.length
        ? `Found ${overloadedDays.length} overloaded day(s). Prioritize front-loading preparation.`
        : 'Workload distribution is balanced.',
      recommendations: recs,
    };
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
    console.log(`Active Gemini models: ${GEMINI_MODELS.join(', ')}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
