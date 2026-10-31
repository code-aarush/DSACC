/**
 * Date and Countdown Calculations
 * 
 * Accurately calculates exam countdown and handles edge cases
 * such as same-day exam, passed exams, and timezone boundaries.
 */

export interface ExamCountdownResult {
  /** Total whole calendar days remaining (0 if today or passed) */
  daysRemaining: number
  /** Total hours remaining in current day */
  hoursRemaining: number
  /** Total minutes remaining in current hour */
  minutesRemaining: number
  /** Whether the configured date is in the past */
  isPassed: boolean
  /** Whether the exam is today */
  isToday: boolean
  /** Human-formatted message (e.g. '5 days remaining', 'Exam is today!') */
  formattedLabel: string
}

/**
 * Calculates exam countdown given target date string (YYYY-MM-DD or ISO 8601)
 * and an optional reference date (defaults to current system time).
 */
export function calculateExamCountdown(
  examDateStr: string,
  referenceDate: Date = new Date()
): ExamCountdownResult {
  if (!examDateStr) {
    return {
      daysRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
      isPassed: false,
      isToday: false,
      formattedLabel: 'Exam date not set',
    }
  }

  // Parse exam date as midnight local time or direct ISO string
  const targetDate = new Date(examDateStr)
  if (isNaN(targetDate.getTime())) {
    return {
      daysRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
      isPassed: false,
      isToday: false,
      formattedLabel: 'Invalid exam date',
    }
  }

  // Normalize target to start of exam day or exact time if provided
  const targetMidnight = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    9, // Assume morning exam time 09:00 local time if not specified
    0,
    0
  )

  const diffMs = targetMidnight.getTime() - referenceDate.getTime()
  const isPassed = diffMs < 0

  // Calculate day difference using calendar days
  const refMidnight = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  )
  const targetDayMidnight = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  )

  const calendarDaysDiff = Math.round(
    (targetDayMidnight.getTime() - refMidnight.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (calendarDaysDiff === 0) {
    return {
      daysRemaining: 0,
      hoursRemaining: Math.max(0, Math.floor(diffMs / (1000 * 60 * 60))),
      minutesRemaining: Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))),
      isPassed: isPassed && diffMs < -1000 * 60 * 60 * 4, // 4 hours after start
      isToday: true,
      formattedLabel: 'Exam is Today!',
    }
  }

  if (calendarDaysDiff < 0) {
    return {
      daysRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
      isPassed: true,
      isToday: false,
      formattedLabel: `Exam concluded (${Math.abs(calendarDaysDiff)} days ago)`,
    }
  }

  const hoursRemaining = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)))
  const minutesRemaining = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)))

  return {
    daysRemaining: calendarDaysDiff,
    hoursRemaining,
    minutesRemaining,
    isPassed: false,
    isToday: false,
    formattedLabel: `${calendarDaysDiff} ${calendarDaysDiff === 1 ? 'day' : 'days'} remaining`,
  }
}

/**
 * Checks if a task due date is overdue compared to the reference date.
 */
export function isTaskOverdue(dueDateStr?: string, referenceDate: Date = new Date()): boolean {
  if (!dueDateStr) return false
  const dueDate = new Date(dueDateStr)
  if (isNaN(dueDate.getTime())) return false

  const refMidnight = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  )
  const dueMidnight = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate()
  )

  return dueMidnight.getTime() < refMidnight.getTime()
}

/**
 * Returns current timestamp in ISO 8601 format.
 */
export function getCurrentIsoTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Formats an ISO date into a human readable string (e.g., '29 Oct 2026').
 */
export function formatDateHuman(isoDateStr?: string): string {
  if (!isoDateStr) return 'N/A'
  const d = new Date(isoDateStr)
  if (isNaN(d.getTime())) return 'Invalid date'
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
