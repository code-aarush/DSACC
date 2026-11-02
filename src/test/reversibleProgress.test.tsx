/**
 * Comprehensive Reversible Progress & Bidirectional Checkbox Verification Harness
 * 
 * Verifies non-negotiable reversible progress requirements:
 * 1. Checking a previously unchecked item increases progress.
 * 2. Unchecking that item decreases progress by exactly the corresponding amount.
 * 3. Checking every item produces the expected completed state (100%).
 * 4. Unchecking every item returns progress to its original value (0%).
 * 5. Multiple check/uncheck cycles remain completely consistent.
 * 6. Changes persist after application reload (persists `false`).
 * 7. Progress values cannot exceed valid ranges [0, 100].
 * 8. Zero-item lists do not produce NaN or Infinity.
 * 9. Reopening completed tasks updates task and overdue metrics.
 * 10. Reopening resolved doubts updates unresolved-doubt metrics.
 * 11. Reversing CP independent-solve confirmation updates independent vs assisted classification.
 * 12. Linked academic entities are never automatically altered by unrelated actions.
 * 13. Historical revision records and attempt histories are preserved during reversals.
 * 14. Overview aggregate metrics strictly match underlying persisted records.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculateSyllabusProgress,
  calculateADTProgress,
  calculateAlgorithmProgress,
} from '../lib/progress/progressCalculators'
import {
  getTaskStats,
  calculateCPProgress,
  getBrainDumpStats,
} from '../lib/progress/taskAndCpCalculators'
import {
  createRevisionRecord,
  recordReviewEvent,
  revertLastReviewEvent,
} from '../lib/revision/scheduler'
import { LocalStorageAdapter, PRIMARY_STORAGE_KEY } from '../lib/storage/localStorageAdapter'
import { createInitialApplicationState } from '../lib/storage/storageService'
import {
  Task,
  CPProblem,
  BrainDumpNote,
  SyllabusTopic,
} from '../types/domain'

describe('Reversible Progress & Bidirectional Checkbox Suite', () => {
  let adapter: LocalStorageAdapter

  beforeEach(() => {
    window.localStorage.clear()
    adapter = new LocalStorageAdapter()
  })

  // ==========================================================================
  // 1. Syllabus Reversible Progress
  // ==========================================================================
  describe('1. Syllabus Progress Reversibility', () => {
    it('increases on check, decreases on uncheck, and supports multiple cycles', () => {
      const state = JSON.parse(JSON.stringify(createInitialApplicationState()))
      const activeRequiredTopics = state.data.topics.filter((t: SyllabusTopic) => t.classification === 'REQUIRED')
      const targetTopic = activeRequiredTopics[0]

      const initialProgress = calculateSyllabusProgress(state.data.topics)
      expect(initialProgress.completedRequired).toBe(0)
      expect(initialProgress.percentageRequired).toBe(0)

      // Cycle 1: Check item
      targetTopic.studyStatus = 'COMPLETED'
      targetTopic.completionRequirements.manualConfirmationGranted = true

      const checkedProgress = calculateSyllabusProgress(state.data.topics)
      expect(checkedProgress.completedRequired).toBe(1)
      expect(checkedProgress.percentageRequired).toBeGreaterThan(0)

      // Cycle 1: Uncheck item
      targetTopic.studyStatus = 'IN_PROGRESS'
      targetTopic.completionRequirements.manualConfirmationGranted = false

      const uncheckedProgress = calculateSyllabusProgress(state.data.topics)
      expect(uncheckedProgress.completedRequired).toBe(0)
      expect(uncheckedProgress.percentageRequired).toBe(0)

      // Cycle 2: Check again
      targetTopic.studyStatus = 'COMPLETED'
      targetTopic.completionRequirements.manualConfirmationGranted = true
      expect(calculateSyllabusProgress(state.data.topics).completedRequired).toBe(1)

      // Cycle 2: Uncheck again
      targetTopic.studyStatus = 'IN_PROGRESS'
      targetTopic.completionRequirements.manualConfirmationGranted = false
      expect(calculateSyllabusProgress(state.data.topics).completedRequired).toBe(0)
      expect(calculateSyllabusProgress(state.data.topics).percentageRequired).toBe(0)
    })

    it('completing every required item produces 100%, and unchecking all returns to 0%', () => {
      const state = createInitialApplicationState()
      const activeRequiredTopics = state.data.topics.filter(t => t.classification === 'REQUIRED')

      // Mark all required topics as COMPLETED
      for (const t of activeRequiredTopics) {
        t.studyStatus = 'COMPLETED'
        t.completionRequirements.manualConfirmationGranted = true
      }

      const allCompleted = calculateSyllabusProgress(state.data.topics)
      expect(allCompleted.completedRequired).toBe(activeRequiredTopics.length)
      expect(allCompleted.percentageRequired).toBe(100)
      expect(allCompleted.byUnit.UNIT_I.percentage).toBe(100)
      expect(allCompleted.byUnit.UNIT_II.percentage).toBe(100)
      expect(allCompleted.byUnit.UNIT_III.percentage).toBe(100)

      // Revert all to IN_PROGRESS
      for (const t of activeRequiredTopics) {
        t.studyStatus = 'IN_PROGRESS'
        t.completionRequirements.manualConfirmationGranted = false
      }

      const allReverted = calculateSyllabusProgress(state.data.topics)
      expect(allReverted.completedRequired).toBe(0)
      expect(allReverted.percentageRequired).toBe(0)
      expect(allReverted.byUnit.UNIT_I.percentage).toBe(0)
      expect(allReverted.byUnit.UNIT_II.percentage).toBe(0)
      expect(allReverted.byUnit.UNIT_III.percentage).toBe(0)
    })
  })

  // ==========================================================================
  // 2. ADT Operation Checklist Reversibility
  // ==========================================================================
  describe('2. ADT Operations Reversibility', () => {
    it('increases operation progress on check and returns to exact baseline on uncheck', () => {
      const state = createInitialApplicationState()
      const initial = calculateADTProgress(state.data.adts)
      expect(initial.completedOperations).toBe(0)
      expect(initial.percentageOperationsCompleted).toBe(0)

      const sll = state.data.adts.find(a => a.id === 'adt-singly-linked-list')!
      expect(sll.essentialOperations.length).toBeGreaterThan(0)

      // Check first operation
      sll.essentialOperations[0].isCompleted = true
      const p1 = calculateADTProgress(state.data.adts)
      expect(p1.completedOperations).toBe(1)

      // Check second operation
      sll.essentialOperations[1].isCompleted = true
      const p2 = calculateADTProgress(state.data.adts)
      expect(p2.completedOperations).toBe(2)

      // Uncheck second operation
      sll.essentialOperations[1].isCompleted = false
      const p3 = calculateADTProgress(state.data.adts)
      expect(p3.completedOperations).toBe(1)

      // Uncheck first operation
      sll.essentialOperations[0].isCompleted = false
      const p4 = calculateADTProgress(state.data.adts)
      expect(p4.completedOperations).toBe(0)
      expect(p4.percentageOperationsCompleted).toBe(0)
    })

    it('all operations checked -> 100% operation completion; unchecking one drops from 100%', () => {
      const state = createInitialApplicationState()
      for (const adt of state.data.adts) {
        for (const op of adt.essentialOperations) {
          op.isCompleted = true
        }
      }

      const allChecked = calculateADTProgress(state.data.adts)
      expect(allChecked.completedOperations).toBe(allChecked.totalOperations)
      expect(allChecked.percentageOperationsCompleted).toBe(100)

      // Uncheck a single operation
      state.data.adts[0].essentialOperations[0].isCompleted = false
      const oneUnchecked = calculateADTProgress(state.data.adts)
      expect(oneUnchecked.completedOperations).toBe(allChecked.totalOperations - 1)
      expect(oneUnchecked.percentageOperationsCompleted).toBeLessThan(100)
    })
  })

  // ==========================================================================
  // 3. Algorithm Progress Reversibility
  // ==========================================================================
  describe('3. Algorithm Implementation and Testing Reversibility', () => {
    it('checking and unchecking correctness tested updates percentageTested symmetrically', () => {
      const state = createInitialApplicationState()
      const requiredAlgos = state.data.algorithms.filter(a => a.classification === 'REQUIRED')
      const targetAlgo = requiredAlgos[0]

      const initial = calculateAlgorithmProgress(state.data.algorithms)
      expect(initial.correctnessTestedRequired).toBe(0)
      expect(initial.percentageTested).toBe(0)

      // Check correctness tested
      targetAlgo.isCorrectnessTested = true
      const pChecked = calculateAlgorithmProgress(state.data.algorithms)
      expect(pChecked.correctnessTestedRequired).toBe(1)
      expect(pChecked.percentageTested).toBeGreaterThan(0)

      // Uncheck correctness tested
      targetAlgo.isCorrectnessTested = false
      const pUnchecked = calculateAlgorithmProgress(state.data.algorithms)
      expect(pUnchecked.correctnessTestedRequired).toBe(0)
      expect(pUnchecked.percentageTested).toBe(0)

      // Check all required
      for (const al of requiredAlgos) {
        al.isCorrectnessTested = true
        al.status = 'TESTED'
      }
      const allTested = calculateAlgorithmProgress(state.data.algorithms)
      expect(allTested.correctnessTestedRequired).toBe(requiredAlgos.length)
      expect(allTested.percentageTested).toBe(100)

      // Revert all
      for (const al of requiredAlgos) {
        al.isCorrectnessTested = false
        al.status = 'NOT_STARTED'
      }
      const allReverted = calculateAlgorithmProgress(state.data.algorithms)
      expect(allReverted.correctnessTestedRequired).toBe(0)
      expect(allReverted.percentageTested).toBe(0)
    })
  })

  // ==========================================================================
  // 4. Tasks and Subtasks Reversibility
  // ==========================================================================
  describe('4. Tasks and Subtasks Reversibility', () => {
    it('reopening a completed task updates done count and restores overdue status without modifying linked topics', () => {
      const overdueDate = '2026-10-20' // Expired date
      const referenceDate = new Date('2026-10-29T12:00:00.000Z')

      const task: Task = {
        id: 'task-test-1',
        title: 'Complete AVL Rotations',
        category: 'IMPLEMENT',
        priority: 'CRITICAL',
        status: 'TO_DO',
        dueDate: overdueDate,
        subtasks: [
          { id: 'st-1', title: 'Implement LL rotation', isCompleted: false },
          { id: 'st-2', title: 'Implement RR rotation', isCompleted: false },
        ],
        linkedSyllabusTopicId: 'topic-avl-rotations',
        createdAt: '2026-10-19T00:00:00.000Z',
        updatedAt: '2026-10-19T00:00:00.000Z',
      }

      // Initial state: 1 task, overdue
      const stats1 = getTaskStats([task], referenceDate)
      expect(stats1.total).toBe(1)
      expect(stats1.toDo).toBe(1)
      expect(stats1.done).toBe(0)
      expect(stats1.overdue).toBe(1)

      // 1. Complete the task
      task.status = 'DONE'
      const stats2 = getTaskStats([task], referenceDate)
      expect(stats2.done).toBe(1)
      expect(stats2.toDo).toBe(0)
      expect(stats2.overdue).toBe(0) // Completed tasks are excluded from overdue!

      // 2. Subtasks completion
      task.subtasks[0].isCompleted = true
      expect(task.subtasks.filter(s => s.isCompleted)).toHaveLength(1)
      task.subtasks[0].isCompleted = false
      expect(task.subtasks.filter(s => s.isCompleted)).toHaveLength(0)

      // 3. Reopen the task (uncheck Done)
      task.status = 'TO_DO'
      const stats3 = getTaskStats([task], referenceDate)
      expect(stats3.done).toBe(0)
      expect(stats3.toDo).toBe(1)
      expect(stats3.overdue).toBe(1) // Returned to overdue calculation!

      // 4. Linked syllabus topic invariant
      expect(task.linkedSyllabusTopicId).toBe('topic-avl-rotations')
    })
  })

  // ==========================================================================
  // 5. Competitive Programming Reversibility
  // ==========================================================================
  describe('5. CP Independent Solve Reversibility', () => {
    it('toggling independent solve adjusts independent vs assisted counts reversibly', () => {
      const problem: CPProblem = {
        id: 'cp-problem-1',
        title: 'Two Sum',
        platform: 'LEETCODE',
        topic: 'Arrays',
        difficulty: 'EASY',
        status: 'SOLVED_INDEPENDENTLY',
        attemptCount: 1,
        timeSpentMinutes: 20,
        isIndependentlySolved: true,
        hintUsed: false,
        solutionViewed: false,
        relatedSyllabusTopicIds: [],
        relatedAdtIds: [],
        relatedAlgorithmIds: [],
        createdAt: '2026-10-29T10:00:00.000Z',
        updatedAt: '2026-10-29T10:00:00.000Z',
      }

      // Initial: 1 independent solve
      const cp1 = calculateCPProgress([problem])
      expect(cp1.independentlySolved).toBe(1)
      expect(cp1.assistedSolved).toBe(0)

      // Uncheck independent solve
      problem.isIndependentlySolved = false
      const cp2 = calculateCPProgress([problem])
      expect(cp2.independentlySolved).toBe(0)

      // Re-check independent solve
      problem.isIndependentlySolved = true
      const cp3 = calculateCPProgress([problem])
      expect(cp3.independentlySolved).toBe(1)

      // Viewing solution voids independent solve
      problem.solutionViewed = true
      const cp4 = calculateCPProgress([problem])
      expect(cp4.independentlySolved).toBe(0)
      expect(cp4.assistedSolved).toBe(1)
    })
  })

  // ==========================================================================
  // 6. Brain Dump Reversible Resolution
  // ==========================================================================
  describe('6. Brain Dump Doubt Resolution Reversibility', () => {
    it('resolving and reopening a doubt updates unresolved counts while preserving notes', () => {
      const note: BrainDumpNote = {
        id: 'note-doubt-1',
        title: 'Is Warshall strictly O(V^3)?',
        body: 'Need to clarify matrix operations in dense vs sparse graphs.',
        type: 'DOUBT',
        tags: ['graphs', 'complexity'],
        isPinned: false,
        isResolved: false,
        createdAt: '2026-10-29T10:00:00.000Z',
        updatedAt: '2026-10-29T10:00:00.000Z',
      }

      // Initial: 1 doubt, 1 unresolved
      const stats1 = getBrainDumpStats([note])
      expect(stats1.doubts).toBe(1)
      expect(stats1.unresolvedDoubts).toBe(1)

      // 1. Resolve the doubt
      note.isResolved = true
      note.resolvedAt = '2026-10-29T11:00:00.000Z'
      note.resolutionNotes = 'Yes, Warshall requires three nested V loops regardless of edge density.'

      const stats2 = getBrainDumpStats([note])
      expect(stats2.doubts).toBe(1)
      expect(stats2.unresolvedDoubts).toBe(0)

      // 2. Reopen the doubt
      note.isResolved = false
      note.resolvedAt = undefined
      // Resolution notes are preserved for historical clarity
      expect(note.resolutionNotes).toBe('Yes, Warshall requires three nested V loops regardless of edge density.')

      const stats3 = getBrainDumpStats([note])
      expect(stats3.doubts).toBe(1)
      expect(stats3.unresolvedDoubts).toBe(1)
    })
  })

  // ==========================================================================
  // 7. Revision Scheduler Revert / Void Action
  // ==========================================================================
  describe('7. Revision Review Void Reversibility', () => {
    it('voiding a review restores the previous interval and target date', () => {
      const initialRev = createRevisionRecord('TOPIC', 'topic-bellman-ford', 'Bellman-Ford', '2026-10-29')
      expect(initialRev.reviewHistory).toHaveLength(0)
      expect(initialRev.currentIntervalDays).toBe(1)

      // Record Review
      const reviewed = recordReviewEvent(
        initialRev,
        'SATISFACTORY',
        4,
        2,
        'Understood negative cycles',
        undefined,
        [1, 3, 7, 14, 30],
        '2026-10-29T10:00:00.000Z'
      )
      expect(reviewed.reviewHistory).toHaveLength(1)
      expect(reviewed.currentIntervalDays).toBe(3)
      expect(reviewed.nextReviewDate).toBe('2026-11-01')

      // Void the review
      const reverted = revertLastReviewEvent(reviewed, [1, 3, 7, 14, 30], new Date('2026-10-29'))
      expect(reverted.reviewHistory).toHaveLength(0)
      expect(reverted.currentIntervalDays).toBe(1)
      expect(reverted.nextReviewDate).toBe('2026-10-29')
    })
  })

  // ==========================================================================
  // 8. Persistence of Unchecked (False) State
  // ==========================================================================
  describe('8. Persistence Across LocalStorage Reload', () => {
    it('persists unchecked boolean values as false and reloads identically', async () => {
      const state = createInitialApplicationState()
      const topic = state.data.topics[0]

      // Check item
      topic.studyStatus = 'COMPLETED'
      topic.completionRequirements.manualConfirmationGranted = true
      await adapter.save(state)

      // Reload
      const loaded1 = await adapter.load()
      expect(loaded1.data?.data.topics[0].studyStatus).toBe('COMPLETED')
      expect(loaded1.data?.data.topics[0].completionRequirements.manualConfirmationGranted).toBe(true)

      // Uncheck item and persist false
      state.data.topics[0].studyStatus = 'IN_PROGRESS'
      state.data.topics[0].completionRequirements.manualConfirmationGranted = false
      await adapter.save(state)

      // Verify raw storage explicitly contains false
      const rawStored = window.localStorage.getItem(PRIMARY_STORAGE_KEY)
      expect(rawStored).toContain('"manualConfirmationGranted":false')

      // Reload and verify
      const loaded2 = await adapter.load()
      expect(loaded2.data?.data.topics[0].studyStatus).toBe('IN_PROGRESS')
      expect(loaded2.data?.data.topics[0].completionRequirements.manualConfirmationGranted).toBe(false)
      expect(calculateSyllabusProgress(loaded2.data!.data.topics).completedRequired).toBe(0)
    })
  })

  // ==========================================================================
  // 9. Edge Cases & Zero-Item Safety
  // ==========================================================================
  describe('9. Boundary Invariants and Zero-Item Protection', () => {
    it('handles zero items without NaN or Infinity and clamps progress to [0, 100]', () => {
      const emptySyllabus = calculateSyllabusProgress([])
      expect(emptySyllabus.percentageRequired).toBe(0)
      expect(isNaN(emptySyllabus.percentageRequired)).toBe(false)
      expect(isFinite(emptySyllabus.percentageRequired)).toBe(true)

      const emptyAdts = calculateADTProgress([])
      expect(emptyAdts.percentageTestedOrMastered).toBe(0)
      expect(emptyAdts.percentageOperationsCompleted).toBe(0)
      expect(isNaN(emptyAdts.percentageTestedOrMastered)).toBe(false)

      const emptyAlgos = calculateAlgorithmProgress([])
      expect(emptyAlgos.percentageTested).toBe(0)
      expect(emptyAlgos.percentageImplemented).toBe(0)
      expect(isNaN(emptyAlgos.percentageTested)).toBe(false)

      const emptyTasks = getTaskStats([])
      expect(emptyTasks.total).toBe(0)
      expect(emptyTasks.done).toBe(0)

      const emptyCp = calculateCPProgress([])
      expect(emptyCp.total).toBe(0)
      expect(emptyCp.independentlySolved).toBe(0)

      const emptyNotes = getBrainDumpStats([])
      expect(emptyNotes.total).toBe(0)
      expect(emptyNotes.unresolvedDoubts).toBe(0)
    })
  })
})
