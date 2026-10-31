import { describe, it, expect } from 'vitest'
import {
  calculateExamCountdown,
  isTaskOverdue,
  formatDateHuman,
} from '../lib/date/dateUtils'

describe('Date & Countdown Utilities', () => {
  describe('calculateExamCountdown', () => {
    it('calculates exact 5 calendar days between 29 Oct 2026 and 3 Nov 2026', () => {
      const refDate = new Date('2026-10-29T10:00:00')
      const result = calculateExamCountdown('2026-11-03', refDate)

      expect(result.daysRemaining).toBe(5)
      expect(result.isPassed).toBe(false)
      expect(result.isToday).toBe(false)
      expect(result.formattedLabel).toBe('5 days remaining')
    })

    it('handles same day exam correctly', () => {
      const refDate = new Date('2026-11-03T07:00:00')
      const result = calculateExamCountdown('2026-11-03', refDate)

      expect(result.isToday).toBe(true)
      expect(result.daysRemaining).toBe(0)
      expect(result.formattedLabel).toBe('Exam is Today!')
    })

    it('handles passed exam gracefully without negative daysRemaining', () => {
      const refDate = new Date('2026-11-10T12:00:00')
      const result = calculateExamCountdown('2026-11-03', refDate)

      expect(result.isPassed).toBe(true)
      expect(result.daysRemaining).toBe(0)
      expect(result.formattedLabel).toContain('Exam concluded')
    })

    it('handles invalid or empty exam date gracefully', () => {
      const result1 = calculateExamCountdown('')
      expect(result1.formattedLabel).toBe('Exam date not set')

      const result2 = calculateExamCountdown('not-a-date')
      expect(result2.formattedLabel).toBe('Invalid exam date')
    })
  })

  describe('isTaskOverdue', () => {
    it('returns true when due date is strictly in the past', () => {
      const refDate = new Date('2026-10-29T10:00:00')
      expect(isTaskOverdue('2026-10-28', refDate)).toBe(true)
    })

    it('returns false when due date is today or future', () => {
      const refDate = new Date('2026-10-29T10:00:00')
      expect(isTaskOverdue('2026-10-29', refDate)).toBe(false)
      expect(isTaskOverdue('2026-10-30', refDate)).toBe(false)
    })

    it('returns false for undefined or empty due date', () => {
      expect(isTaskOverdue(undefined)).toBe(false)
    })
  })

  describe('formatDateHuman', () => {
    it('formats ISO date cleanly', () => {
      const formatted = formatDateHuman('2026-11-03T00:00:00.000Z')
      expect(formatted).toContain('2026')
      expect(formatted).toContain('Nov')
    })

    it('handles invalid dates gracefully', () => {
      expect(formatDateHuman(undefined)).toBe('N/A')
      expect(formatDateHuman('invalid')).toBe('Invalid date')
    })
  })
})
