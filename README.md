# Deadline Radar

**Deadline Radar** is an intelligent academic student workload and deadline velocity management application designed to mitigate student crunch anxiety. It aggregates assignments, exams, projects, club activities, and personal deadlines into an institutional-grade radar, identifies overloaded days and weeks, calculates realistic study pacing, and uses Google Gemini AI to parse natural-language commitments into structured deliverables with mandatory user review and confirmation.

---

## Table of Contents

1. [Core Features](#core-features)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Firebase Integration & Backend](#firebase-integration--backend)
4. [Firestore Data Models](#firestore-data-models)
5. [Security Rules & Data Isolation](#security-rules--data-isolation)
6. [Gemini AI Integration & Security](#gemini-ai-integration--security)
7. [Deterministic Workload Engine](#deterministic-workload-engine)
8. [Local Development & Build](#local-development--build)
9. [Automated Test Suite](#automated-test-suite)
10. [GitHub Repository](#github-repository)
11. [Important Security Notes](#important-security-notes)

---

## 1. Core Features

- **Workload Velocity Radar**: 14-day and 30-day horizons displaying daily study load against customizable daily capacity thresholds (default 8.0 hours/day).
- **Concurrency & Clash Detector**: Automatically identifies days with multiple overlapping exams or high-stakes deadlines and provides proactive pacing recommendations.
- **Deadline Registry**: Dense institutional-grade data table featuring search, multi-criteria filtering (Course, Category, Workload Tier, Status), column sorting, expandable milestone tasks, and CSV schedule export.
- **Academic Course Rosters**: Enrolled course credits, syllabus grade weighting breakdowns (e.g. Problem Sets 35%, Prelims 35%, Final Project 20%), instructor office hours, and deliverable links.
- **Anti-Crunch Pacing Simulator**: "What-If" capacity balancer that models shifting prep sessions forward to flatten peak strain curves and eliminate cramming.
- **Plan with AI (Natural-Language Schedule Parser)**: Server-side Gemini integration that extracts structured deliverables from statements like *"I have a physics test next Tuesday and a database lab due Friday"*. Adheres to a strict confirmation flow: AI suggestions are never automatically saved to the database without explicit user verification.
- **Zero-Pill Utilitarian Design System**: Minimalist functionalism rooted in deep academic navy (`#1E3A8A`), paper surfaces (`#F9FAFB`), muted semantic workload tokens (Light, Moderate, Heavy, Overloaded), tabular numbers (`tabular-nums`), and rectilinear 6px/8px geometry.

---

## 2. Architecture & Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide outline icons, Vite.
- **Backend**: Express server running on Node.js / `tsx` in development, serving Vite middlewares and `/api/*` proxy endpoints.
- **Database & Authentication**: Firebase Authentication & Cloud Firestore Enterprise.
- **AI Processing**: `@google/genai` TypeScript SDK running exclusively server-side.
- **Testing**: Automated deterministic workload test runner verifying daily/weekly calculations, clash detection, soft deletes, and timezone logic.

---

## 3. Firebase Integration & Backend

Firebase is provisioned and configured:
- **Authentication**: Email/Password registration, Email/Password sign-in, Google popup sign-in, password reset, and session persistence.
- **Cloud Firestore**: Configured with a dedicated database instance ID (`ai-studio-deadlineradar-e996a31c-b15e-428c-a5b5-9c992b942dd4`) loaded from `firebase-applet-config.json`.
- **Connection Testing**: `testConnection()` uses `getDocFromServer` on startup to ensure live cloud connectivity.

---

## 4. Firestore Data Models

All user data is isolated under the user's authenticated UID:

```
users/{userId}
  ├── displayName: string
  ├── email: string
  ├── timezone: string
  ├── createdAt: timestamp
  └── updatedAt: timestamp

users/{userId}/settings/preferences
  ├── dailyWorkloadThreshold: number (default 8.0)
  ├── weeklyWorkloadThreshold: number (default 18.0)
  ├── preferredWorkStartTime: string
  ├── preferredWorkEndTime: string
  ├── weekStartsOn: "Monday" | "Sunday"
  ├── defaultCalendarView: "month" | "week" | "day"
  ├── deadlineRemindersEnabled: boolean
  ├── workloadWarningsEnabled: boolean
  └── theme: "light"

users/{userId}/tasks/{taskId}
  ├── title: string (1-200 chars)
  ├── description: string
  ├── category: "assignment" | "exam" | "project" | "club" | "event" | "personal" | "other"
  ├── deadlineDate: string (YYYY-MM-DD)
  ├── deadlineTime: string (HH:MM)
  ├── estimatedMinutes: number (integer minutes)
  ├── priority: "low" | "medium" | "high" | "critical"
  ├── status: "pending" | "in_progress" | "completed" | "archived"
  ├── isFlexible: boolean
  ├── notes: string
  ├── subtasks: Array<Subtask>
  ├── completedAt: timestamp | null
  ├── createdAt: timestamp
  ├── updatedAt: timestamp
  └── deletedAt: timestamp | null  (Soft-deletion)

users/{userId}/tasks/{taskId}/subtasks/{subtaskId}
  ├── title: string
  ├── completed: boolean
  ├── position: number
  └── estimatedMinutes: number
```

---

## 5. Security Rules & Data Isolation

`firestore.rules` enforces the Eight Pillars of Hardened Firestore Security:
1. **Default Deny**: Global catch-all rule rejects all unauthenticated and unmatched operations.
2. **User Isolation**: A user can strictly only read, create, update, or list documents under `users/$(request.auth.uid)`.
3. **No Cross-User Access**: It is mathematically impossible for User A to read or alter User B's tasks or settings.
4. **Input & Type Validation**: String lengths, enums, required keys, and bounded numerical ranges are verified before allowing writes.
5. **Soft Deletion Integrity**: Tasks cannot be hard-deleted from client SDKs; soft deletes are managed via `deletedAt` timestamps.

---

## 6. Gemma 4 & Gemini AI Integration

- **Dual-Model Engine**: Supports Google's **Gemma 4** (`google/gemma-4-31B-it`) via Hugging Face's OpenAI-compatible inference router with seamless automatic fallback to **Gemini 2.5 Flash** (`@google/genai`).
- **Server-Side Security**: The Hugging Face token and Gemini API key are stored strictly server-side and never exposed to client code.
- **System Instructions**: Fixed server-side instructions enforce prompt injection resistance and schema conformance.
- **Rate Limiting**: In-memory rate limiting restricts users to 20 AI requests per hour.
- **User Confirmation Mandatory**: AI extraction returns candidate items in structured JSON. The frontend presents them with checkboxes and editable fields; tasks are created only when the user explicitly clicks "Confirm & Add to Schedule".

---

## 7. Deterministic Workload Engine

- Workload numbers (hours, minutes, daily totals, weekly velocity) are calculated strictly by the deterministic `workloadEngine.ts` service rather than LLM guesswork.
- Workload Tiers:
  - **Light**: Under 3.0 hours/day
  - **Moderate**: 3.0 to 6.0 hours/day
  - **Heavy**: 6.0 to 8.0 hours/day
  - **Overloaded**: Above 8.0 hours/day (or user's custom threshold)
- Flexible Tasks: Only tasks marked `isFlexible: true` are suggested for rescheduling; official exams (`isFlexible: false`) remain anchored.

---

## 8. Local Development & Build

### Prerequisites
- Node.js 20+
- npm or bun

### Commands
```bash
# Install dependencies
npm install

# Run full-stack dev server (Express + Vite on Port 3000)
npm run dev

# Run automated tests
npm test

# Check TypeScript linting
npm run lint

# Build client for production
npm run build

# Start production server
npm start
```

---

## 9. Automated Test Suite

Run `npm test` to execute unit tests verifying:
- Daily and weekly workload aggregation
- Handling of completed and soft-deleted tasks (excluded from active backlog)
- Multi-deadline clash detection
- Deterministic structured explanation generation
- Timezone date formatting idempotence
- Flexible vs. fixed task invariables

---

## 10. GitHub Repository

This implementation is linked to the official repository:
- **Repository**: [https://github.com/MrudulaMS/Deadline_action](https://github.com/MrudulaMS/Deadline_action)
- **Branch**: `main`

---

## 11. Important Security Notes

- Never commit `.env` or files containing secret credentials to GitHub.
- Client Firebase configuration in `firebase-applet-config.json` contains public identifiers (`appId`, `projectId`, `apiKey`) meant for browser client SDKs; private server keys and Gemini keys must remain server-side.
- All Firestore access is governed by authenticated user identities (`request.auth.uid`).
