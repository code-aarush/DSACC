/**
 * Weak-Area Intelligence & Revision Analytics Engine Tests
 * 
 * Verifies:
 * 1. Division-by-zero protection (0 reviews = 0%, no NaN/Infinity).
 * 2. Due, overdue, and upcoming schedule partition accuracy.
 * 3. Unit and entity type distribution metrics.
 * 4. Transparent, explainable weak-area ranking across confidence, overdue reviews, doubts, and CP traps.
 * 5. Unassessed entities labeled as Insufficient Data rather than assumed weak.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateRevisionAnalytics,
  identifyWeakAreas,
} from '../lib/revision/weakAreaAnalytics'
import {
  RevisionRecord,
  SyllabusTopic,
  CPProblem,
  BrainDumpNote,
  ADTImplementation,
  Algorithm,
} from '../types/domain'

describe('Weak-Area Intelligence & Revision Analytics Engine', () => {
  const refDate = new Date('2026-10-29T12:00:00.000Z')

  describe('calculateRevisionAnalytics', () => {
    it('returns safe metrics with zero reviews (zero division protection)', () => {
      const summary = calculateRevisionAnalytics([], [], refDate)

      expect(summary.totalScheduled).toBe(0)
      expect(summary.dueToday).toBe(0)
      expect(summary.overdue).toBe(0)
      expect(summary.upcoming).toBe(0)
      expect(summary.totalCompletedReviews).toBe(0)
      expect(summary.onTimeCompletionRate).toBe(0)
      expect(Number.isNaN(summary.onTimeCompletionRate)).toBe(false)
      expect(summary.reviewsByUnit.UNIT_I).toBe(0)
      expect(summary.confidenceChanges.improved).toBe(0)
      expect(summary.recentHistory).toEqual([])
    })

    it('correctly partitions schedules into Overdue, Due Today, and Upcoming', () => {
      const revisions: RevisionRecord[] = [
        {
          id: 'rev-1',
          entityType: 'TOPIC',
          entityId: 't-1',
          currentIntervalDays: 1,
          nextReviewDate: '2026-10-25', // Overdue
          revisionStatus: 'OVERDUE',
          reviewHistory: [],
          createdAt: '2026-10-24T00:00:00.000Z',
          updatedAt: '2026-10-24T00:00:00.000Z',
        },
        {
          id: 'rev-2',
          entityType: 'TOPIC',
          entityId: 't-2',
          currentIntervalDays: 3,
          nextReviewDate: '2026-10-29', // Due Today
          revisionStatus: 'DUE_SOON',
          reviewHistory: [],
          createdAt: '2026-10-26T00:00:00.000Z',
          updatedAt: '2026-10-26T00:00:00.000Z',
        },
        {
          id: 'rev-3',
          entityType: 'ADT',
          entityId: 'adt-1',
          currentIntervalDays: 7,
          nextReviewDate: '2026-11-04', // Upcoming
          revisionStatus: 'NOT_DUE',
          reviewHistory: [],
          createdAt: '2026-10-28T00:00:00.000Z',
          updatedAt: '2026-10-28T00:00:00.000Z',
        },
      ]

      const summary = calculateRevisionAnalytics(revisions, [], refDate)
      expect(summary.totalScheduled).toBe(3)
      expect(summary.overdue).toBe(1)
      expect(summary.dueToday).toBe(1)
      expect(summary.upcoming).toBe(1)
    })

    it('calculates on-time recall rate and confidence trajectories across units', () => {
      const mockTopics: SyllabusTopic[] = [
        {
          id: 't-1',
          unit: 'UNIT_I',
          chapter: 'Ch 1',
          title: 'Arrays',
          description: '',
          classification: 'REQUIRED',
          priority: 'HIGH',
          studyStatus: 'IN_PROGRESS',
          confidence: 3,
          revisionStatus: 'DUE_SOON',
          completionRequirements: { manualConfirmationRequired: false },
          linkedTaskIds: [],
          linkedAdtIds: [],
          linkedAlgorithmIds: [],
          linkedCpProblemIds: [],
          notes: '',
          createdAt: '2026-10-20T00:00:00.000Z',
          updatedAt: '2026-10-20T00:00:00.000Z',
        },
        {
          id: 't-2',
          unit: 'UNIT_II',
          chapter: 'Ch 3',
          title: 'Binary Trees',
          description: '',
          classification: 'REQUIRED',
          priority: 'HIGH',
          studyStatus: 'COMPLETED',
          confidence: 4,
          revisionStatus: 'NOT_DUE',
          completionRequirements: { manualConfirmationRequired: false },
          linkedTaskIds: [],
          linkedAdtIds: [],
          linkedAlgorithmIds: [],
          linkedCpProblemIds: [],
          notes: '',
          createdAt: '2026-10-20T00:00:00.000Z',
          updatedAt: '2026-10-20T00:00:00.000Z',
        },
      ]

      const revisions: RevisionRecord[] = [
        {
          id: 'rev-1',
          entityType: 'TOPIC',
          entityId: 't-1',
          currentIntervalDays: 7,
          nextReviewDate: '2026-11-01',
          revisionStatus: 'NOT_DUE',
          reviewHistory: [
            {
              id: 'log-1',
              reviewedAt: '2026-10-25T10:00:00.000Z',
              confidenceBefore: 2,
              confidenceAfter: 3, // Improved
              outcome: 'SATISFACTORY', // On-time
              intervalDays: 3,
            },
            {
              id: 'log-2',
              reviewedAt: '2026-10-28T10:00:00.000Z',
              confidenceBefore: 3,
              confidenceAfter: 3, // Maintained
              outcome: 'STRONG', // On-time
              intervalDays: 7,
            },
          ],
          createdAt: '2026-10-20T00:00:00.000Z',
          updatedAt: '2026-10-28T10:00:00.000Z',
        },
        {
          id: 'rev-2',
          entityType: 'TOPIC',
          entityId: 't-2',
          currentIntervalDays: 1,
          nextReviewDate: '2026-10-30',
          revisionStatus: 'DUE_SOON',
          reviewHistory: [
            {
              id: 'log-3',
              reviewedAt: '2026-10-29T08:00:00.000Z',
              confidenceBefore: 4,
              confidenceAfter: 2, // Declined
              outcome: 'FAILED', // Failed
              intervalDays: 1,
            },
          ],
          createdAt: '2026-10-20T00:00:00.000Z',
          updatedAt: '2026-10-29T08:00:00.000Z',
        },
      ]

      const summary = calculateRevisionAnalytics(revisions, mockTopics, refDate)

      expect(summary.totalCompletedReviews).toBe(3)
      // 2 on-time out of 3 = 67%
      expect(summary.onTimeCompletionRate).toBe(67)
      expect(summary.reviewsByUnit.UNIT_I).toBe(2)
      expect(summary.reviewsByUnit.UNIT_II).toBe(1)
      expect(summary.reviewsByUnit.UNIT_III).toBe(0)
      expect(summary.confidenceChanges.improved).toBe(1)
      expect(summary.confidenceChanges.maintained).toBe(1)
      expect(summary.confidenceChanges.declined).toBe(1)
      expect(summary.recentHistory).toHaveLength(3)
      expect(summary.recentHistory[0].id).toBe('log-3') // sorted descending
    })
  })

  describe('identifyWeakAreas', () => {
    it('does not classify unassessed topics without observations as weak by default', () => {
      const mockTopics: SyllabusTopic[] = [
        {
          id: 't-unassessed',
          unit: 'UNIT_III',
          chapter: 'Ch 5',
          title: 'B-Trees',
          description: '',
          classification: 'REQUIRED',
          priority: 'HIGH',
          studyStatus: 'NOT_STARTED',
          confidence: 1, // initial seed default
          revisionStatus: 'NOT_DUE',
          completionRequirements: { manualConfirmationRequired: false },
          linkedTaskIds: [],
          linkedAdtIds: [],
          linkedAlgorithmIds: [],
          linkedCpProblemIds: [],
          notes: '',
          createdAt: '2026-10-20T00:00:00.000Z',
          updatedAt: '2026-10-20T00:00:00.000Z',
        },
      ]

      // Default: exclude unassessed items so user is not overwhelmed with 70 false positives
      const weak = identifyWeakAreas(mockTopics, [], [], [], [], [], refDate)
      expect(weak).toHaveLength(0)

      // When explicitly requested, unassessed item is flagged with insufficientData: true
      const weakWithUnassessed = identifyWeakAreas(mockTopics, [], [], [], [], [], refDate, {
        includeUnassessed: true,
      })
      expect(weakWithUnassessed).toHaveLength(1)
      expect(weakWithUnassessed[0].insufficientData).toBe(true)
      expect(weakWithUnassessed[0].reasons[0]).toContain('Insufficient Data')
    })

    it('identifies weak areas based on transparent signals with explainable reasons', () => {
      const mockTopics: SyllabusTopic[] = [
        {
          id: 't-avl',
          unit: 'UNIT_II',
          chapter: 'Ch 3',
          title: 'AVL Rotations',
          description: '',
          classification: 'REQUIRED',
          priority: 'HIGH',
          studyStatus: 'IN_PROGRESS',
          confidence: 1, // observed low confidence
          revisionStatus: 'OVERDUE',
          completionRequirements: { manualConfirmationRequired: false },
          linkedTaskIds: [],
          linkedAdtIds: [],
          linkedAlgorithmIds: [],
          linkedCpProblemIds: [],
          notes: '',
          createdAt: '2026-10-20T00:00:00.000Z',
          updatedAt: '2026-10-20T00:00:00.000Z',
        },
      ]

      const revisions: RevisionRecord[] = [
        {
          id: 'rev-avl',
          entityType: 'TOPIC',
          entityId: 't-avl',
          currentIntervalDays: 1,
          nextReviewDate: '2026-10-24', // overdue
          revisionStatus: 'OVERDUE',
          reviewHistory: [
            {
              id: 'l-1',
              reviewedAt: '2026-10-23T00:00:00.000Z',
              confidenceAfter: 1,
              outcome: 'FAILED',
              intervalDays: 1,
            },
          ],
          createdAt: '2026-10-20T00:00:00.000Z',
          updatedAt: '2026-10-23T00:00:00.000Z',
        },
      ]

      const notes: BrainDumpNote[] = [
        {
          id: 'note-1',
          body: 'Double rotation re-balancing condition is confusing',
          type: 'DOUBT',
          tags: ['trees', 'avl'],
          linkedSyllabusTopicId: 't-avl',
          isPinned: false,
          isResolved: false, // active doubt
          createdAt: '2026-10-26T00:00:00.000Z',
          updatedAt: '2026-10-26T00:00:00.000Z',
        },
      ]

      const cpProblems: CPProblem[] = [
        {
          id: 'cp-1',
          title: 'Balance a Binary Search Tree',
          platform: 'LEETCODE',
          topic: 'Trees',
          relatedSyllabusTopicIds: ['t-avl'],
          relatedAdtIds: [],
          relatedAlgorithmIds: [],
          difficulty: 'MEDIUM',
          status: 'NEEDS_REATTEMPT',
          attemptCount: 2,
          timeSpentMinutes: 45,
          isIndependentlySolved: false,
          hintUsed: true,
          solutionViewed: true,
          mistakesNotes: 'Off by 1 height update on double rotation',
          createdAt: '2026-10-27T00:00:00.000Z',
          updatedAt: '2026-10-27T00:00:00.000Z',
        },
      ]

      const adts: ADTImplementation[] = [
        {
          id: 'adt-avl',
          name: 'AVL Tree ADT',
          category: 'TREES_AND_PRIORITY',
          relatedSyllabusTopicIds: ['t-avl'],
          status: 'IN_PROGRESS',
          essentialOperations: [],
          edgeCasesVerified: [],
          complexityNotes: 'O(log N)',
          knownIssues: 'Double right-left rotation causes null pointer on empty child',
          linkedTaskIds: [],
          linkedAlgorithmIds: [],
          createdAt: '2026-10-20T00:00:00.000Z',
          updatedAt: '2026-10-20T00:00:00.000Z',
        },
      ]

      const algorithms: Algorithm[] = []

      const weak = identifyWeakAreas(mockTopics, adts, algorithms, cpProblems, notes, revisions, refDate)

      // Should identify t-avl as CRITICAL weak area
      const avlTopic = weak.find(w => w.entityId === 't-avl')
      expect(avlTopic).toBeDefined()
      expect(avlTopic?.severity).toBe('CRITICAL')
      expect(avlTopic?.reasons.some(r => r.includes('Confidence level 1'))).toBe(true)
      expect(avlTopic?.reasons.some(r => r.includes('overdue'))).toBe(true)
      expect(avlTopic?.reasons.some(r => r.includes('FAILED'))).toBe(true)
      expect(avlTopic?.reasons.some(r => r.includes('Brain Dump'))).toBe(true)
      expect(avlTopic?.reasons.some(r => r.includes('Needs Reattempt'))).toBe(true)

      // Should also flag ADT with known issues
      const avlAdt = weak.find(w => w.entityId === 'adt-avl')
      expect(avlAdt).toBeDefined()
      expect(avlAdt?.reasons.some(r => r.includes('Known unresolved issues'))).toBe(true)

      // Should flag CP problem needing reattempt
      const cpItem = weak.find(w => w.entityId === 'cp-1')
      expect(cpItem).toBeDefined()
      expect(cpItem?.reasons.some(r => r.includes('Needs Reattempt'))).toBe(true)
    })
  })
})
