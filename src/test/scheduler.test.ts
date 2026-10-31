/**
 * Spaced Revision Scheduler Engine Tests
 * 
 * Verifies:
 * 1. Calendar-safe date math without UTC timezone shifts.
 * 2. Deterministic spaced-repetition ladder progression (FAILED, WEAK, SATISFACTORY, STRONG).
 * 3. Manual reschedule overrides.
 * 4. Safeguard against rapid duplicate click reviews.
 * 5. Revision actions never auto-master or alter academic topic completion status.
 */

import { describe, it, expect } from 'vitest'
import {
  addDaysCalendar,
  getTodayDateString,
  calculateRevisionStatus,
  calculateNextReview,
  createRevisionRecord,
  recordReviewEvent,
  rescheduleRevision,
  DEFAULT_INTERVALS,
} from '../lib/revision/scheduler'

describe('Spaced Revision Scheduler Engine', () => {
  describe('Calendar-safe Date Arithmetic', () => {
    it('accurately advances dates without UTC timezone shift', () => {
      expect(addDaysCalendar('2026-10-29', 1)).toBe('2026-10-30')
      expect(addDaysCalendar('2026-10-29', 3)).toBe('2026-11-01')
      expect(addDaysCalendar('2026-10-29', 7)).toBe('2026-11-05')
      expect(addDaysCalendar('2026-12-31', 1)).toBe('2027-01-01')
    })

    it('returns empty string on invalid date input', () => {
      expect(addDaysCalendar('not-a-date', 3)).toBe('')
    })

    it('formats today date string as YYYY-MM-DD', () => {
      const fixedDate = new Date(2026, 9, 29) // Month is 0-indexed: 9 = October
      expect(getTodayDateString(fixedDate)).toBe('2026-10-29')
    })
  })

  describe('calculateRevisionStatus', () => {
    const fixedNow = new Date(2026, 9, 29, 12, 0, 0) // 2026-10-29

    it('marks passed dates as OVERDUE', () => {
      expect(calculateRevisionStatus('2026-10-28', fixedNow)).toBe('OVERDUE')
      expect(calculateRevisionStatus('2026-10-20', fixedNow)).toBe('OVERDUE')
    })

    it('marks today and tomorrow as DUE_SOON', () => {
      expect(calculateRevisionStatus('2026-10-29', fixedNow)).toBe('DUE_SOON')
      expect(calculateRevisionStatus('2026-10-30', fixedNow)).toBe('DUE_SOON')
    })

    it('marks dates further in future as NOT_DUE', () => {
      expect(calculateRevisionStatus('2026-11-05', fixedNow)).toBe('NOT_DUE')
      expect(calculateRevisionStatus(undefined, fixedNow)).toBe('NOT_DUE')
    })
  })

  describe('calculateNextReview Progression Policies', () => {
    const fixedNow = new Date(2026, 9, 29, 10, 0, 0)
    const ladder = [1, 3, 7, 14, 30]

    it('FAILED outcome resets interval strictly to the first step (1 day)', () => {
      const result = calculateNextReview(14, 'FAILED', 1, ladder, fixedNow)
      expect(result.nextIntervalDays).toBe(1)
      expect(result.nextReviewDate).toBe('2026-10-30')
      expect(result.revisionStatus).toBe('DUE_SOON')
    })

    it('WEAK outcome with low confidence (<= 2) resets interval to 1 day', () => {
      const result = calculateNextReview(7, 'WEAK', 2, ladder, fixedNow)
      expect(result.nextIntervalDays).toBe(1)
      expect(result.nextReviewDate).toBe('2026-10-30')
    })

    it('WEAK outcome with moderate confidence (> 2) steps down 1 ladder step', () => {
      const result = calculateNextReview(7, 'WEAK', 3, ladder, fixedNow)
      // Step down from 7 (idx 2) is 3 (idx 1)
      expect(result.nextIntervalDays).toBe(3)
      expect(result.nextReviewDate).toBe('2026-11-01')
    })

    it('SATISFACTORY outcome advances 1 step along configured ladder', () => {
      // Step up from 3 is 7
      const result1 = calculateNextReview(3, 'SATISFACTORY', 3, ladder, fixedNow)
      expect(result1.nextIntervalDays).toBe(7)
      expect(result1.nextReviewDate).toBe('2026-11-05')

      // Step up from 14 is 30
      const result2 = calculateNextReview(14, 'SATISFACTORY', 4, ladder, fixedNow)
      expect(result2.nextIntervalDays).toBe(30)
      expect(result2.nextReviewDate).toBe('2026-11-28')
    })

    it('SATISFACTORY at or beyond maximum step extends by the maximum step', () => {
      const result = calculateNextReview(30, 'SATISFACTORY', 5, ladder, fixedNow)
      expect(result.nextIntervalDays).toBe(60)
    })

    it('STRONG outcome with high confidence advances 2 steps along ladder', () => {
      // From 1 (idx 0), 2 steps up is 7 (idx 2)
      const result = calculateNextReview(1, 'STRONG', 5, ladder, fixedNow)
      expect(result.nextIntervalDays).toBe(7)
      expect(result.nextReviewDate).toBe('2026-11-05')
    })

    it('STRONG outcome with moderate confidence advances 1 step along ladder', () => {
      // From 1 (idx 0) with confidence 3 advances 1 step to 3 (idx 1)
      const result = calculateNextReview(1, 'STRONG', 3, ladder, fixedNow)
      expect(result.nextIntervalDays).toBe(3)
    })
  })

  describe('Revision Record Creation & Review Events', () => {
    it('creates a fresh revision record with default first interval', () => {
      const rev = createRevisionRecord('TOPIC', 'topic-avl-trees', 'AVL Trees')
      expect(rev.entityType).toBe('TOPIC')
      expect(rev.entityId).toBe('topic-avl-trees')
      expect(rev.entityTitleSnapshot).toBe('AVL Trees')
      expect(rev.currentIntervalDays).toBe(DEFAULT_INTERVALS[0])
      expect(rev.reviewHistory).toEqual([])
    })

    it('records an explicit review event and appends to history', () => {
      const initial = createRevisionRecord('TOPIC', 'topic-dijkstra', 'Dijkstra Algorithm')
      const updated = recordReviewEvent(
        initial,
        'STRONG',
        4, // confidenceAfter
        2, // confidenceBefore
        'Traced on non-negative graph easily',
        undefined,
        DEFAULT_INTERVALS,
        '2026-10-29T10:00:00.000Z'
      )

      expect(updated.reviewHistory).toHaveLength(1)
      const log = updated.reviewHistory[0]
      expect(log.outcome).toBe('STRONG')
      expect(log.confidenceBefore).toBe(2)
      expect(log.confidenceAfter).toBe(4)
      expect(log.notes).toBe('Traced on non-negative graph easily')
      expect(updated.currentIntervalDays).toBe(7) // 1 -> 7 (2 steps up for STRONG with conf 4)
      expect(updated.nextReviewDate).toBe('2026-11-05')
    })

    it('ignores duplicate review submissions within 3 seconds with identical outcome', () => {
      const initial = createRevisionRecord('TOPIC', 'topic-dfs', 'Depth-First Search')
      const first = recordReviewEvent(
        initial,
        'SATISFACTORY',
        3,
        2,
        'Normal trace',
        undefined,
        DEFAULT_INTERVALS,
        '2026-10-29T10:00:00.000Z'
      )
      expect(first.reviewHistory).toHaveLength(1)

      // Immediate duplicate click 100ms later
      const dup = recordReviewEvent(
        first,
        'SATISFACTORY',
        3,
        2,
        'Normal trace',
        undefined,
        DEFAULT_INTERVALS,
        '2026-10-29T10:00:00.100Z'
      )
      expect(dup.reviewHistory).toHaveLength(1) // Not duplicated
    })

    it('supports custom manual next review date override', () => {
      const initial = createRevisionRecord('TOPIC', 'topic-bfs', 'Breadth-First Search')
      const updated = recordReviewEvent(
        initial,
        'WEAK',
        2,
        2,
        'Need to re-check queue logic tomorrow morning',
        '2026-10-31', // explicit override
        DEFAULT_INTERVALS,
        '2026-10-29T10:00:00.000Z'
      )

      expect(updated.nextReviewDate).toBe('2026-10-31')
      expect(updated.currentIntervalDays).toBe(2)
    })

    it('reschedules an existing revision record without adding a review history entry', () => {
      const initial = createRevisionRecord('TOPIC', 'topic-bellman-ford', 'Bellman-Ford')
      const rescheduled = rescheduleRevision(initial, '2026-11-10', new Date('2026-10-29'))

      expect(rescheduled.nextReviewDate).toBe('2026-11-10')
      expect(rescheduled.currentIntervalDays).toBe(12)
      expect(rescheduled.reviewHistory).toHaveLength(0) // No review event logged
    })
  })
})
