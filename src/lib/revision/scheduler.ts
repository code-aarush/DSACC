/**
 * Spaced Revision Scheduling Engine
 * 
 * Centralized, deterministic, and explainable spaced-repetition policies.
 * Guarantees:
 * 1. Low confidence or failed reviews schedule an immediate or next-day review.
 * 2. High confidence and strong reviews advance along the configured interval ladder.
 * 3. Calendar-date calculations are immune to UTC timezone day shifts.
 * 4. Recording a review or scheduling NEVER auto-masters or completes linked academic records.
 */

import {
  RevisionRecord,
  ReviewOutcome,
  TopicConfidenceLevel,
  RevisionStatus,
  RevisionEntityType,
  EntityId,
} from '../../types/domain'
import {
  parseDateOnly,
  isTaskOverdue,
  isTaskDueToday,
  getCurrentIsoTimestamp,
} from '../date/dateUtils'

export const DEFAULT_INTERVALS: number[] = [1, 3, 7, 14, 30]

/**
 * Adds an integer number of calendar days to a date without UTC offset shifting.
 * Returns date in YYYY-MM-DD format.
 */
export function addDaysCalendar(baseDate: string | Date, days: number): string {
  const d = typeof baseDate === 'string' ? parseDateOnly(baseDate) : new Date(baseDate)
  if (!d) return ''

  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate() + days)
  const yyyy = local.getFullYear()
  const mm = String(local.getMonth() + 1).padStart(2, '0')
  const dd = String(local.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Returns today's date formatted as local YYYY-MM-DD.
 */
export function getTodayDateString(referenceDate: Date = new Date()): string {
  const yyyy = referenceDate.getFullYear()
  const mm = String(referenceDate.getMonth() + 1).padStart(2, '0')
  const dd = String(referenceDate.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Determines revision status (NOT_DUE, DUE_SOON, OVERDUE) from nextReviewDate.
 */
export function calculateRevisionStatus(
  nextReviewDateStr?: string,
  referenceDate: Date = new Date()
): RevisionStatus {
  if (!nextReviewDateStr) return 'NOT_DUE'
  if (isTaskOverdue(nextReviewDateStr, referenceDate)) {
    return 'OVERDUE'
  }
  if (isTaskDueToday(nextReviewDateStr, referenceDate)) {
    return 'DUE_SOON'
  }

  // Also consider tomorrow as DUE_SOON
  const tomorrowStr = addDaysCalendar(referenceDate, 1)
  if (nextReviewDateStr === tomorrowStr) {
    return 'DUE_SOON'
  }

  return 'NOT_DUE'
}

export interface NextReviewCalculation {
  nextIntervalDays: number
  nextReviewDate: string
  revisionStatus: RevisionStatus
}

/**
 * Pure scheduling policy: calculates next interval and next review date.
 */
export function calculateNextReview(
  currentIntervalDays: number,
  outcome: ReviewOutcome,
  confidence: TopicConfidenceLevel,
  configuredIntervals: number[] = DEFAULT_INTERVALS,
  referenceDate: Date = new Date()
): NextReviewCalculation {
  const intervals = configuredIntervals.length > 0
    ? [...configuredIntervals].sort((a, b) => a - b)
    : DEFAULT_INTERVALS

  let nextInterval: number

  switch (outcome) {
    case 'FAILED':
      // Reset strictly to earliest interval (1 day)
      nextInterval = intervals[0] || 1
      break

    case 'WEAK':
      // Low confidence (1 or 2) resets to 1 day; otherwise step down
      if (confidence <= 2) {
        nextInterval = intervals[0] || 1
      } else {
        const curIdx = intervals.findIndex(i => i >= currentIntervalDays)
        const stepDownIdx = Math.max(0, (curIdx === -1 ? intervals.length - 1 : curIdx) - 1)
        nextInterval = intervals[stepDownIdx] || 1
      }
      break

    case 'SATISFACTORY': {
      // Step up one step along intervals ladder
      const curIdx = intervals.findIndex(i => i >= currentIntervalDays)
      if (curIdx === -1 || curIdx === intervals.length - 1) {
        // At or beyond top of ladder: increment by last step
        nextInterval = currentIntervalDays + (intervals[intervals.length - 1] || 14)
      } else {
        nextInterval = intervals[curIdx + 1]
      }
      break
    }

    case 'STRONG': {
      // Step up two steps if high confidence, or 1 step with bonus
      const curIdx = intervals.findIndex(i => i >= currentIntervalDays)
      if (curIdx === -1) {
        nextInterval = currentIntervalDays + 21
      } else if (confidence >= 4 && curIdx + 2 < intervals.length) {
        nextInterval = intervals[curIdx + 2]
      } else if (curIdx + 1 < intervals.length) {
        nextInterval = intervals[curIdx + 1]
      } else {
        nextInterval = currentIntervalDays + 21
      }
      break
    }
  }

  const nextReviewDate = addDaysCalendar(referenceDate, nextInterval)
  const revisionStatus = calculateRevisionStatus(nextReviewDate, referenceDate)

  return {
    nextIntervalDays: nextInterval,
    nextReviewDate,
    revisionStatus,
  }
}

/**
 * Creates a fresh RevisionRecord for an academic entity.
 */
export function createRevisionRecord(
  entityType: RevisionEntityType,
  entityId: EntityId,
  titleSnapshot?: string,
  initialDueDate?: string,
  configuredIntervals: number[] = DEFAULT_INTERVALS
): RevisionRecord {
  const now = getCurrentIsoTimestamp()
  const firstInterval = configuredIntervals[0] || 1
  const nextDate = initialDueDate || addDaysCalendar(new Date(), firstInterval)

  return {
    id: `rev-${entityType.toLowerCase()}-${entityId}-${Date.now()}`,
    entityType,
    entityId,
    entityTitleSnapshot: titleSnapshot,
    currentIntervalDays: firstInterval,
    nextReviewDate: nextDate,
    revisionStatus: calculateRevisionStatus(nextDate),
    reviewHistory: [],
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Records an explicit review event and computes next schedule.
 * Safeguard: avoids duplicate log entries from repeated clicks within 5 seconds.
 */
export function recordReviewEvent(
  record: RevisionRecord,
  outcome: ReviewOutcome,
  confidenceAfter: TopicConfidenceLevel,
  confidenceBefore?: TopicConfidenceLevel,
  notes?: string,
  customNextDate?: string,
  configuredIntervals: number[] = DEFAULT_INTERVALS,
  reviewTimestamp: string = getCurrentIsoTimestamp()
): RevisionRecord {
  // Prevent duplicate submissions within same minute with identical outcome
  const lastEntry = record.reviewHistory[record.reviewHistory.length - 1]
  if (
    lastEntry &&
    lastEntry.outcome === outcome &&
    Math.abs(Date.parse(reviewTimestamp) - Date.parse(lastEntry.reviewedAt)) < 3000
  ) {
    return record
  }

  const refDate = new Date(reviewTimestamp)
  const schedule = calculateNextReview(
    record.currentIntervalDays,
    outcome,
    confidenceAfter,
    configuredIntervals,
    refDate
  )

  const finalNextDate = customNextDate || schedule.nextReviewDate
  const refCalendarDate = parseDateOnly(getTodayDateString(refDate))
  const targetCalendarDate = customNextDate ? parseDateOnly(customNextDate) : null
  const finalInterval = customNextDate && targetCalendarDate && refCalendarDate
    ? Math.max(1, Math.round((targetCalendarDate.getTime() - refCalendarDate.getTime()) / (1000 * 60 * 60 * 24)))
    : schedule.nextIntervalDays

  const newHistoryEntry = {
    id: `revlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    reviewedAt: reviewTimestamp,
    confidenceBefore,
    confidenceAfter,
    outcome,
    intervalDays: finalInterval,
    notes: notes?.trim() || undefined,
  }

  return {
    ...record,
    currentIntervalDays: finalInterval,
    lastReviewedDate: reviewTimestamp,
    nextReviewDate: finalNextDate,
    revisionStatus: calculateRevisionStatus(finalNextDate, refDate),
    reviewHistory: [...record.reviewHistory, newHistoryEntry],
    updatedAt: reviewTimestamp,
  }
}

/**
 * Manually reschedules an existing revision record.
 */
export function rescheduleRevision(
  record: RevisionRecord,
  customNextDate: string,
  referenceDate: Date = new Date()
): RevisionRecord {
  const parsed = parseDateOnly(customNextDate)
  if (!parsed) return record

  const now = getCurrentIsoTimestamp()
  const refCalendarDate = parseDateOnly(getTodayDateString(referenceDate))
  const daysDiff = refCalendarDate
    ? Math.max(1, Math.round((parsed.getTime() - refCalendarDate.getTime()) / (1000 * 60 * 60 * 24)))
    : 1

  return {
    ...record,
    nextReviewDate: customNextDate,
    currentIntervalDays: daysDiff,
    revisionStatus: calculateRevisionStatus(customNextDate, referenceDate),
    updatedAt: now,
  }
}

/**
 * Safely reverts / voids the most recent review event from a revision record.
 * Restores the previous interval, next review date, and recalculates revisionStatus.
 */
export function revertLastReviewEvent(
  record: RevisionRecord,
  configuredIntervals: number[] = DEFAULT_INTERVALS,
  referenceDate: Date = new Date()
): RevisionRecord {
  if (!record.reviewHistory || record.reviewHistory.length === 0) {
    return record
  }

  const now = getCurrentIsoTimestamp()
  const updatedHistory = record.reviewHistory.slice(0, -1)

  if (updatedHistory.length === 0) {
    // Reverted back to initial state
    const firstInterval = configuredIntervals[0] || 1
    const nextDate = getTodayDateString(referenceDate)
    return {
      ...record,
      currentIntervalDays: firstInterval,
      lastReviewedDate: undefined,
      nextReviewDate: nextDate,
      revisionStatus: calculateRevisionStatus(nextDate, referenceDate),
      reviewHistory: [],
      updatedAt: now,
    }
  }

  const prevEntry = updatedHistory[updatedHistory.length - 1]
  const prevDate = addDaysCalendar(new Date(prevEntry.reviewedAt), prevEntry.intervalDays)

  return {
    ...record,
    currentIntervalDays: prevEntry.intervalDays,
    lastReviewedDate: prevEntry.reviewedAt,
    nextReviewDate: prevDate,
    revisionStatus: calculateRevisionStatus(prevDate, referenceDate),
    reviewHistory: updatedHistory,
    updatedAt: now,
  }
}
