/**
 * Task, CP Practice, Brain Dump and Weak-Topic Calculators
 * 
 * Strict metrics and calculation rules:
 * 1. Independent CP solves must be explicitly recorded (never counted if assisted).
 * 2. Overdue tasks are strictly incomplete tasks whose due date has passed.
 * 3. Weak topics are determined by low confidence (level 1 or 2).
 * 4. Doubt resolution preserves note content and tracks resolution state.
 */

import {
  Task,
  CPProblem,
  BrainDumpNote,
  SyllabusTopic,
  CPPlatform,
  CPDifficulty,
  BrainDumpNoteType,
} from '../../types/domain'
import { isTaskOverdue, isTaskDueToday, isTaskUpcoming } from '../date/dateUtils'

export interface CPProgressSummary {
  total: number
  toDo: number
  attempted: number
  independentlySolved: number
  assistedSolved: number
  needsReattempt: number
  mastered: number
  totalTimeSpentMinutes: number
  byPlatform: Record<CPPlatform, number>
  byDifficulty: Record<CPDifficulty, number>
}

export function calculateCPProgress(problems: CPProblem[]): CPProgressSummary {
  const byPlatform: Record<CPPlatform, number> = {
    LEETCODE: 0,
    HACKERRANK: 0,
    CODECHEF: 0,
    CODEFORCES: 0,
    GFG: 0,
    OTHER: 0,
  }

  const byDifficulty: Record<CPDifficulty, number> = {
    EASY: 0,
    MEDIUM: 0,
    HARD: 0,
  }

  let toDo = 0
  let attempted = 0
  let independentlySolved = 0
  let assistedSolved = 0
  let needsReattempt = 0
  let mastered = 0
  let totalTimeSpentMinutes = 0

  for (const prob of problems) {
    if (prob.platform in byPlatform) {
      byPlatform[prob.platform]++
    }
    if (prob.difficulty in byDifficulty) {
      byDifficulty[prob.difficulty]++
    }

    totalTimeSpentMinutes += prob.timeSpentMinutes || 0

    if (prob.status === 'TO_DO') toDo++
    if (prob.status === 'ATTEMPTED') attempted++
    if (prob.status === 'NEEDS_REATTEMPT') needsReattempt++
    if (prob.status === 'MASTERED') mastered++

    // Strict independent check: user explicitly recorded isIndependentlySolved: true
    // And did not use hint or solution
    if (prob.isIndependentlySolved && !prob.hintUsed && !prob.solutionViewed) {
      independentlySolved++
    } else if (
      prob.hintUsed ||
      prob.solutionViewed ||
      prob.status === 'SOLVED_WITH_HINTS' ||
      prob.status === 'EDITORIAL_STUDIED'
    ) {
      assistedSolved++
    }
  }

  return {
    total: problems.length,
    toDo,
    attempted,
    independentlySolved,
    assistedSolved,
    needsReattempt,
    mastered,
    totalTimeSpentMinutes,
    byPlatform,
    byDifficulty,
  }
}

export interface TaskStatsSummary {
  total: number
  toDo: number
  inProgress: number
  blocked: number
  done: number
  overdue: number
  dueToday: number
  upcoming: number
  dailyFocus: number
  totalEstimatedMinutes: number
  totalActualMinutes: number
}

export function getTaskStats(tasks: Task[], referenceDate: Date = new Date()): TaskStatsSummary {
  let toDo = 0
  let inProgress = 0
  let blocked = 0
  let done = 0
  let overdue = 0
  let dueToday = 0
  let upcoming = 0
  let dailyFocus = 0
  let totalEstimatedMinutes = 0
  let totalActualMinutes = 0

  for (const task of tasks) {
    totalEstimatedMinutes += task.estimatedDurationMinutes || 0
    totalActualMinutes += task.actualDurationMinutes || 0

    if (task.status === 'DONE') {
      done++
      continue
    }

    if (task.status === 'TO_DO') toDo++
    if (task.status === 'IN_PROGRESS') inProgress++
    if (task.status === 'BLOCKED') blocked++

    if (task.isDailyFocus) {
      dailyFocus++
    }

    if (task.dueDate) {
      if (isTaskOverdue(task.dueDate, referenceDate)) {
        overdue++
      } else if (isTaskDueToday(task.dueDate, referenceDate)) {
        dueToday++
      } else if (isTaskUpcoming(task.dueDate, referenceDate)) {
        upcoming++
      }
    }
  }

  return {
    total: tasks.length,
    toDo,
    inProgress,
    blocked,
    done,
    overdue,
    dueToday,
    upcoming,
    dailyFocus,
    totalEstimatedMinutes,
    totalActualMinutes,
  }
}

const PRIORITY_WEIGHTS: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

/**
 * Finds the single most actionable incomplete task.
 */
export function getNextActionableTask(tasks: Task[], referenceDate: Date = new Date()): Task | null {
  const incomplete = tasks.filter(t => t.status !== 'DONE')
  if (incomplete.length === 0) return null

  // Rank incomplete tasks:
  // 1. Overdue tasks (by priority descending, then earliest due date)
  // 2. Daily focus tasks (by priority descending)
  // 3. Due today (by priority descending)
  // 4. In progress (by priority descending)
  // 5. Rest (by priority descending, earliest due date, or creation)
  return incomplete.sort((a, b) => {
    const aOverdue = a.dueDate ? isTaskOverdue(a.dueDate, referenceDate) : false
    const bOverdue = b.dueDate ? isTaskOverdue(b.dueDate, referenceDate) : false
    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1

    const aToday = a.dueDate ? isTaskDueToday(a.dueDate, referenceDate) : false
    const bToday = b.dueDate ? isTaskDueToday(b.dueDate, referenceDate) : false
    if (aToday && !bToday) return -1
    if (!aToday && bToday) return 1

    if (a.isDailyFocus && !b.isDailyFocus) return -1
    if (!a.isDailyFocus && b.isDailyFocus) return 1

    if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1
    if (a.status !== 'IN_PROGRESS' && b.status === 'IN_PROGRESS') return 1

    const pA = PRIORITY_WEIGHTS[a.priority] || 0
    const pB = PRIORITY_WEIGHTS[b.priority] || 0
    if (pA !== pB) return pB - pA

    if (a.dueDate && b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate)
    }
    if (a.dueDate && !b.dueDate) return -1
    if (!a.dueDate && b.dueDate) return 1

    return a.createdAt.localeCompare(b.createdAt)
  })[0] || null
}

/**
 * Filters topics where user self-reported confidence is low (1 or 2).
 */
export function getWeakTopics(topics: SyllabusTopic[]): SyllabusTopic[] {
  return topics
    .filter(t => t.confidence === 1 || t.confidence === 2)
    .sort((a, b) => a.confidence - b.confidence || a.title.localeCompare(b.title))
}

export interface BrainDumpStatsSummary {
  total: number
  pinned: number
  doubts: number
  unresolvedDoubts: number
  mistakes: number
  byType: Record<BrainDumpNoteType, number>
}

export function getBrainDumpStats(notes: BrainDumpNote[]): BrainDumpStatsSummary {
  const byType: Record<BrainDumpNoteType, number> = {
    IDEA: 0,
    DOUBT: 0,
    MISTAKE: 0,
    CONCEPT_EXPLANATION: 0,
    IMPORTANT_INSIGHT: 0,
    EXAM_TIP: 0,
    PENDING_RESEARCH: 0,
  }

  let pinned = 0
  let doubts = 0
  let unresolvedDoubts = 0
  let mistakes = 0

  for (const n of notes) {
    if (n.type in byType) {
      byType[n.type]++
    }
    if (n.isPinned) pinned++
    if (n.type === 'DOUBT') {
      doubts++
      if (!n.isResolved) unresolvedDoubts++
    }
    if (n.type === 'MISTAKE') {
      mistakes++
    }
  }

  return {
    total: notes.length,
    pinned,
    doubts,
    unresolvedDoubts,
    mistakes,
    byType,
  }
}
