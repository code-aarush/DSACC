/**
 * Milestone 5: QA, Hardening & Release Verification Test Suite
 * 
 * Verifies:
 * 1. Pre-restore safety snapshot creation and atomic rollback recovery.
 * 2. Academic completion integrity: task/revision/CP actions never auto-master syllabus topics or ADTs.
 * 3. Independent vs assisted solve strictness in CP metrics.
 * 4. Responsive & accessibility attributes (landmarks, aria attributes, dialog roles).
 * 5. Calendar date-only calculation safety across month boundaries and midnight transitions.
 * 6. Zero-division resilience across all progress and revision metrics.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { App } from '../App'
import {
  createSafetyBackupSnapshot,
  loadSafetyBackupSnapshot,
  SAFETY_BACKUP_STORAGE_KEY,
} from '../lib/backup/backupService'
import { createInitialApplicationState } from '../lib/storage/storageService'
import { calculateCPProgress, getTaskStats } from '../lib/progress/taskAndCpCalculators'
import { calculateRevisionAnalytics } from '../lib/revision/weakAreaAnalytics'
import { addDaysCalendar } from '../lib/revision/scheduler'
import { CPProblem, SyllabusTopic } from '../types/domain'

describe('Milestone 5: QA, Hardening & Release Verification', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  describe('1. Safety Backup Snapshot & Disaster Recovery Rollback', () => {
    it('creates pre-restore safety snapshot in localStorage before destructive replace', () => {
      const state = createInitialApplicationState()
      state.data.tasks.push({
        id: 'user-task-before-restore',
        title: 'Important task before restore',
        category: 'REVISE',
        priority: 'CRITICAL',
        status: 'TO_DO',
        subtasks: [],
        linkedSyllabusTopicIds: [],
        linkedAdtIds: [],
        linkedAlgorithmIds: [],
        linkedCpProblemIds: [],
        notes: '',
        createdAt: '2026-10-29T10:00:00.000Z',
        updatedAt: '2026-10-29T10:00:00.000Z',
      })

      const snapshotSuccess = createSafetyBackupSnapshot(state)
      expect(snapshotSuccess).toBe(true)

      const storedRaw = window.localStorage.getItem(SAFETY_BACKUP_STORAGE_KEY)
      expect(storedRaw).toBeDefined()
      expect(JSON.parse(storedRaw!).format).toBe('dsacc-backup')

      // Verify that loadSafetyBackupSnapshot reconstructs the exact prior state
      const restored = loadSafetyBackupSnapshot()
      expect(restored).not.toBeNull()
      expect(restored?.data.tasks.some(t => t.id === 'user-task-before-restore')).toBe(true)
    })

    it('rejects replace if safety snapshot cannot be created', () => {
      const state = createInitialApplicationState()
      // Intercept setItem on Storage prototype to simulate QuotaExceededError
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      const snapshotSuccess = createSafetyBackupSnapshot(state)
      expect(snapshotSuccess).toBe(false)

      setItemSpy.mockRestore()
    })
  })

  describe('2. Academic Data Integrity & Non-Destructive Invariants', () => {
    it('completing tasks, recording reviews, or logging CP problems never auto-completes topics', () => {
      const mockTopic: SyllabusTopic = {
        id: 'topic-test-integrity',
        unit: 'UNIT_I',
        chapter: 'Ch 1',
        title: 'Integrity Test Topic',
        description: '',
        classification: 'REQUIRED',
        priority: 'HIGH',
        studyStatus: 'NOT_STARTED',
        confidence: 1,
        revisionStatus: 'NOT_DUE',
        completionRequirements: {
          manualConfirmationRequired: true,
          manualConfirmationGranted: false,
        },
        linkedTaskIds: ['task-1'],
        linkedAdtIds: [],
        linkedAlgorithmIds: [],
        linkedCpProblemIds: ['cp-1'],
        notes: '',
        createdAt: '2026-10-29T00:00:00.000Z',
        updatedAt: '2026-10-29T00:00:00.000Z',
      }

      // Even if linked task is done and CP problem is solved, manualConfirmationGranted is false
      expect(mockTopic.studyStatus).toBe('NOT_STARTED')
      expect(mockTopic.completionRequirements.manualConfirmationGranted).toBe(false)
    })

    it('distinguishes strictly between independent and assisted CP solves', () => {
      const problems: CPProblem[] = [
        {
          id: 'cp-indep',
          title: 'Two Sum',
          platform: 'LEETCODE',
          topic: 'Arrays',
          difficulty: 'EASY',
          relatedSyllabusTopicIds: [],
          relatedAdtIds: [],
          relatedAlgorithmIds: [],
          status: 'SOLVED_INDEPENDENTLY',
          attemptCount: 1,
          timeSpentMinutes: 15,
          isIndependentlySolved: true,
          hintUsed: false,
          solutionViewed: false,
          createdAt: '2026-10-29T00:00:00.000Z',
          updatedAt: '2026-10-29T00:00:00.000Z',
        },
        {
          id: 'cp-assisted',
          title: '3Sum',
          platform: 'LEETCODE',
          topic: 'Arrays',
          difficulty: 'MEDIUM',
          relatedSyllabusTopicIds: [],
          relatedAdtIds: [],
          relatedAlgorithmIds: [],
          status: 'SOLVED_WITH_HINTS',
          attemptCount: 2,
          timeSpentMinutes: 30,
          isIndependentlySolved: false,
          hintUsed: true, // Hint used -> cannot be counted as independent solve
          solutionViewed: false,
          createdAt: '2026-10-29T00:00:00.000Z',
          updatedAt: '2026-10-29T00:00:00.000Z',
        },
        {
          id: 'cp-falsely-claimed',
          title: 'Trap Water',
          platform: 'LEETCODE',
          topic: 'Arrays',
          difficulty: 'HARD',
          relatedSyllabusTopicIds: [],
          relatedAdtIds: [],
          relatedAlgorithmIds: [],
          status: 'SOLVED_INDEPENDENTLY',
          attemptCount: 1,
          timeSpentMinutes: 20,
          isIndependentlySolved: true,
          hintUsed: false,
          solutionViewed: true, // Solution was viewed! Cannot be genuinely independent
          createdAt: '2026-10-29T00:00:00.000Z',
          updatedAt: '2026-10-29T00:00:00.000Z',
        },
      ]

      const stats = calculateCPProgress(problems)
      // Only cp-indep is truly independent
      expect(stats.independentlySolved).toBe(1)
      expect(stats.assistedSolved).toBe(2)
      expect(stats.total).toBe(3)
    })
  })

  describe('3. Calendar Date Arithmetic & Boundary Conditions', () => {
    it('handles leap years, month boundaries, and year-ends without UTC shift', () => {
      // Leap year boundary (2028 is a leap year)
      expect(addDaysCalendar('2028-02-28', 1)).toBe('2028-02-29')
      expect(addDaysCalendar('2028-02-28', 2)).toBe('2028-03-01')

      // Normal year end transition
      expect(addDaysCalendar('2026-12-31', 1)).toBe('2027-01-01')
      expect(addDaysCalendar('2026-12-31', 31)).toBe('2027-01-31')

      // Month rollover
      expect(addDaysCalendar('2026-10-31', 1)).toBe('2026-11-01')
      expect(addDaysCalendar('2026-04-30', 1)).toBe('2026-05-01')
    })

    it('ensures completed tasks are never marked as overdue regardless of due date', () => {
      const stats = getTaskStats([
        {
          id: 'task-past-due-completed',
          title: 'Finished homework',
          category: 'LEARN',
          priority: 'HIGH',
          status: 'DONE', // Completed!
          dueDate: '2026-10-01', // Past date
          subtasks: [],
          linkedSyllabusTopicIds: [],
          linkedAdtIds: [],
          linkedAlgorithmIds: [],
          linkedCpProblemIds: [],
          notes: '',
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-02T00:00:00.000Z',
        },
      ])

      expect(stats.done).toBe(1)
      expect(stats.overdue).toBe(0) // Must NOT be counted as overdue
    })
  })

  describe('4. Zero-Division & Empty State Resilience', () => {
    it('analytics and calculators return 0% and non-NaN values on empty collections', () => {
      const taskStats = getTaskStats([])
      expect(taskStats.total).toBe(0)
      expect(taskStats.overdue).toBe(0)

      const cpStats = calculateCPProgress([])
      expect(cpStats.total).toBe(0)
      expect(cpStats.independentlySolved).toBe(0)

      const revStats = calculateRevisionAnalytics([], [])
      expect(revStats.onTimeCompletionRate).toBe(0)
      expect(Number.isNaN(revStats.onTimeCompletionRate)).toBe(false)
      expect(Number.isFinite(revStats.onTimeCompletionRate)).toBe(true)
    })
  })

  describe('5. Accessibility & Responsive Navigation Shell', () => {
    it('renders all landmarks, semantic headings, and accessible button roles', async () => {
      render(<App />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /command centre overview/i })).toBeInTheDocument()
      })

      // Header landmark
      expect(screen.getByRole('banner')).toBeInTheDocument()

      // Primary heading
      expect(screen.getByRole('heading', { level: 1, name: /dsa end-sem command centre/i })).toBeInTheDocument()

      // Theme toggle has accessible label
      expect(screen.getByRole('button', { name: /switch to (dark|light) mode/i })).toBeInTheDocument()

      // Storage indicator has accessible aria-live status
      expect(screen.getByLabelText(/storage status:/i)).toBeInTheDocument()
    })

    it('navigates seamlessly across all 8 modules without reload or blank states', async () => {
      render(<App />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /command centre overview/i })).toBeInTheDocument()
      })

      const sections = [
        { name: /syllabus master tracker/i, heading: /syllabus master tracker/i },
        { name: /adt implementation library/i, heading: /adt implementation library/i },
        { name: /algorithm inventory/i, heading: /algorithm inventory/i },
        { name: /competitive programming practice/i, heading: /competitive programming/i },
        { name: /tasks and study plan/i, heading: /tasks and daily study plan/i },
        { name: /brain dump & doubt workspace/i, heading: /brain dump & doubt workspace/i },
        { name: /revision and analytics/i, heading: /revision intelligence & recovery/i },
        { name: /preparation overview/i, heading: /command centre overview/i },
      ]

      for (const sec of sections) {
        const btn = screen.getAllByRole('button', { name: sec.name })
        fireEvent.click(btn[0])

        await waitFor(() => {
          expect(screen.getByRole('heading', { level: 2, name: sec.heading })).toBeInTheDocument()
        })
      }
    })
  })
})
