/**
 * Academic Progress & Completion Semantics Verification Tests
 * 
 * Verifies:
 * 1. Required-syllabus progress strictly excludes optional topics.
 * 2. Topics with no configured completion requirements never auto-complete.
 * 3. Checking all operation checklist items does not auto-mark ADTs as tested or mastered.
 * 4. Mastery recommendations require evidence and explicit user confirmation.
 * 5. Circular dependency prevention rules.
 * 6. Correctness testing and implementation status separation for algorithms.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateSyllabusProgress,
  calculateADTProgress,
  calculateAlgorithmProgress,
  isTopicRequirementsSatisfied,
  isADTElegibleForMastery,
} from '../lib/progress/progressCalculators'
import { SyllabusTopic, ADTImplementation, Algorithm } from '../types/domain'
import { SEED_TOPICS } from '../data/seed/syllabusSeed'
import { SEED_ADTS } from '../data/seed/adtSeed'
import { SEED_ALGORITHMS } from '../data/seed/algorithmSeed'

describe('Progress Calculations & Completion Semantics Tests', () => {
  // ==========================================================================
  // Syllabus Progress & Optional Topic Exclusion
  // ==========================================================================
  describe('Syllabus Progress Calculations', () => {
    it('accurately calculates required progress from fresh seed data (0% completed)', () => {
      const summary = calculateSyllabusProgress(SEED_TOPICS)

      expect(summary.totalRequired).toBe(62)
      expect(summary.completedRequired).toBe(0)
      expect(summary.percentageRequired).toBe(0)
      expect(summary.totalOptional).toBe(1)
      expect(summary.completedOptional).toBe(0)
      expect(summary.notStartedCount).toBe(63)
      expect(summary.archivedCount).toBe(9)
    })

    it('strictly excludes optional topics from required syllabus percentage', () => {
      // Mark an optional topic as COMPLETED
      const modifiedTopics: SyllabusTopic[] = SEED_TOPICS.map(t =>
        t.id === 'topic-disjoint-set-adt' // OPTIONAL
          ? { ...t, studyStatus: 'COMPLETED' as const }
          : t
      )

      const summary = calculateSyllabusProgress(modifiedTopics)

      // Total required must remain 70, completed required must remain 0
      expect(summary.totalRequired).toBe(62)
      expect(summary.completedRequired).toBe(0)
      expect(summary.percentageRequired).toBe(0)

      // Optional topic must be reflected only in optional count
      expect(summary.totalOptional).toBe(1)
      expect(summary.completedOptional).toBe(1)
    })

    it('calculates unit-level percentages accurately', () => {
      // Mark 16 required Unit 1 topics as COMPLETED (half of 32 = 50%)
      let unit1Completed = 0
      const modifiedTopics: SyllabusTopic[] = SEED_TOPICS.map(t => {
        if (t.unit === 'UNIT_I' && t.classification === 'REQUIRED' && unit1Completed < 16) {
          unit1Completed++
          return { ...t, studyStatus: 'COMPLETED' as const }
        }
        return t
      })

      const summary = calculateSyllabusProgress(modifiedTopics)

      expect(summary.completedRequired).toBe(16)
      expect(summary.percentageRequired).toBe(Math.round((16 / 62) * 100)) // 26%
      expect(summary.byUnit.UNIT_I.completedRequired).toBe(16)
      expect(summary.byUnit.UNIT_I.totalRequired).toBe(32)
      expect(summary.byUnit.UNIT_I.percentage).toBe(50)
      expect(summary.byUnit.UNIT_II.percentage).toBe(0)
      expect(summary.byUnit.UNIT_III.percentage).toBe(0)
    })

    it('handles empty topic list safely without division by zero', () => {
      const summary = calculateSyllabusProgress([])
      expect(summary.totalRequired).toBe(0)
      expect(summary.completedRequired).toBe(0)
      expect(summary.percentageRequired).toBe(0)
      expect(summary.byUnit.UNIT_I.percentage).toBe(0)
    })
  })

  // ==========================================================================
  // Topic Completion Semantics & Circular Dependency Prevention
  // ==========================================================================
    it('strictly excludes archived topics from required progress denominators and supports restoration', () => {
      const summary = calculateSyllabusProgress(SEED_TOPICS)
      expect(summary.archivedCount).toBe(9)
      expect(summary.totalRequired).toBe(62)

      // Restore an archived required topic
      const restored = SEED_TOPICS.map(t =>
        t.id === 'topic-skip-list-struct'
          ? { ...t, isArchived: false, studyStatus: 'COMPLETED' as const }
          : t
      )
      const restoredSummary = calculateSyllabusProgress(restored)
      expect(restoredSummary.archivedCount).toBe(8)
      expect(restoredSummary.totalRequired).toBe(63)
      expect(restoredSummary.completedRequired).toBe(1)
      expect(restoredSummary.percentageRequired).toBe(Math.round((1 / 63) * 100))
    })

  describe('Topic Completion Semantics', () => {
    it('guarantees that a topic with no configured requirements does not automatically become complete', () => {
      const topicWithoutReqs: SyllabusTopic = {
        ...SEED_TOPICS[0],
        completionRequirements: {
          manualConfirmationRequired: false,
        },
      }

      const isSatisfied = isTopicRequirementsSatisfied(topicWithoutReqs, SEED_ADTS, SEED_ALGORITHMS)
      expect(isSatisfied).toBe(false)
    })

    it('satisfies theoretical topic requirements when manual confirmation is granted', () => {
      const manualTopic: SyllabusTopic = {
        ...SEED_TOPICS[0],
        completionRequirements: {
          manualConfirmationRequired: true,
          manualConfirmationGranted: false,
        },
      }

      // Not granted yet
      expect(isTopicRequirementsSatisfied(manualTopic, SEED_ADTS, SEED_ALGORITHMS)).toBe(false)

      // Grant manual confirmation
      const grantedTopic: SyllabusTopic = {
        ...manualTopic,
        completionRequirements: {
          ...manualTopic.completionRequirements,
          manualConfirmationGranted: true,
        },
      }
      expect(isTopicRequirementsSatisfied(grantedTopic, SEED_ADTS, SEED_ALGORITHMS)).toBe(true)
    })

    it('requires prerequisite ADTs and algorithms to be at least TESTED before practical topic is satisfied', () => {
      const practicalTopic: SyllabusTopic = {
        ...SEED_TOPICS[0],
        completionRequirements: {
          manualConfirmationRequired: false,
          requiredAdtIds: ['adt-singly-linked-list'],
          requiredAlgorithmIds: ['algo-linear-search'],
        },
      }

      // All seeds start NOT_STARTED -> Not satisfied
      expect(isTopicRequirementsSatisfied(practicalTopic, SEED_ADTS, SEED_ALGORITHMS)).toBe(false)

      // Mark ADT as IMPLEMENTED (not tested yet) -> still not satisfied
      const partiallyReadyADTs: ADTImplementation[] = SEED_ADTS.map(a =>
        a.id === 'adt-singly-linked-list' ? { ...a, status: 'IMPLEMENTED' as const } : a
      )
      expect(isTopicRequirementsSatisfied(practicalTopic, partiallyReadyADTs, SEED_ALGORITHMS)).toBe(false)

      // Mark ADT as TESTED, but Algorithm still untested -> still not satisfied
      const readyADTs: ADTImplementation[] = SEED_ADTS.map(a =>
        a.id === 'adt-singly-linked-list' ? { ...a, status: 'TESTED' as const } : a
      )
      expect(isTopicRequirementsSatisfied(practicalTopic, readyADTs, SEED_ALGORITHMS)).toBe(false)

      // Mark Algorithm as correctness tested
      const readyAlgorithms: Algorithm[] = SEED_ALGORITHMS.map(al =>
        al.id === 'algo-linear-search' ? { ...al, isCorrectnessTested: true, status: 'TESTED' as const } : al
      )

      // Both satisfied!
      expect(isTopicRequirementsSatisfied(practicalTopic, readyADTs, readyAlgorithms)).toBe(true)
    })

    it('enforces circular dependency prevention: completion criteria point only to leaf entities', () => {
      for (const topic of SEED_TOPICS) {
        const cr = topic.completionRequirements
        // May only reference tasks, ADTs, or algorithms - NEVER another topic ID
        expect('requiredTopicIds' in cr).toBe(false)
        expect('prerequisiteTopics' in cr).toBe(false)
      }
    })
  })

  // ==========================================================================
  // ADT Implementation & Mastery Semantics
  // ==========================================================================
  describe('ADT Implementation and Mastery Semantics', () => {
    it('calculates initial ADT progress accurately (0% tested or mastered)', () => {
      const summary = calculateADTProgress(SEED_ADTS)

      expect(summary.total).toBe(32)
      expect(summary.notStarted).toBe(32)
      expect(summary.implemented).toBe(0)
      expect(summary.tested).toBe(0)
      expect(summary.mastered).toBe(0)
      expect(summary.percentageTestedOrMastered).toBe(0)
    })

    it('guarantees that checking all operation checklist items does NOT automatically mark ADT as TESTED or MASTERED', () => {
      const adt = { ...SEED_ADTS[0] }
      // Complete every single essential operation checklist item
      adt.essentialOperations = adt.essentialOperations.map(op => ({ ...op, isCompleted: true }))

      // Status must STILL be NOT_STARTED unless explicitly transitioned by user
      expect(adt.status).toBe('NOT_STARTED')

      // calculateADTProgress must still report tested = 0 and mastered = 0
      const summary = calculateADTProgress([adt])
      expect(summary.tested).toBe(0)
      expect(summary.mastered).toBe(0)
      expect(summary.percentageTestedOrMastered).toBe(0)
    })

    it('recommends mastery ONLY when all operations are completed and status is at least TESTED', () => {
      const baseAdt = { ...SEED_ADTS[1] } // Singly Linked List

      // 1. Not tested and operations incomplete -> NOT eligible
      expect(isADTElegibleForMastery(baseAdt)).toBe(false)

      // 2. All operations complete, but status is still IN_PROGRESS -> NOT eligible
      const inProgressAdt: ADTImplementation = {
        ...baseAdt,
        status: 'IN_PROGRESS',
        essentialOperations: baseAdt.essentialOperations.map(op => ({ ...op, isCompleted: true })),
      }
      expect(isADTElegibleForMastery(inProgressAdt)).toBe(false)

      // 3. Status is TESTED, but some operations are incomplete -> NOT eligible
      const partiallyTestedAdt: ADTImplementation = {
        ...baseAdt,
        status: 'TESTED',
        essentialOperations: baseAdt.essentialOperations.map((op, i) => ({ ...op, isCompleted: i === 0 })),
      }
      expect(isADTElegibleForMastery(partiallyTestedAdt)).toBe(false)

      // 4. Status is TESTED AND all operations are complete -> ELIGIBLE FOR RECOMMENDATION!
      const eligibleAdt: ADTImplementation = {
        ...baseAdt,
        status: 'TESTED',
        essentialOperations: baseAdt.essentialOperations.map(op => ({ ...op, isCompleted: true })),
      }
      expect(isADTElegibleForMastery(eligibleAdt)).toBe(true)

      // Note: Eligible does NOT mean status is MASTERED yet. Status remains TESTED until explicit user confirmation!
      expect(eligibleAdt.status).toBe('TESTED')
    })
  })

  // ==========================================================================
  // Algorithm Progress Semantics
  // ==========================================================================
  describe('Algorithm Progress Semantics', () => {
    it('calculates initial algorithm progress accurately (0% tested)', () => {
      const summary = calculateAlgorithmProgress(SEED_ALGORITHMS)

      expect(summary.totalRequired).toBe(29)
      expect(summary.implementedRequired).toBe(0)
      expect(summary.correctnessTestedRequired).toBe(0)
      expect(summary.sampleTraceCompletedRequired).toBe(0)
      expect(summary.percentageTested).toBe(0)
    })

    it('keeps implementation status distinct from correctness testing', () => {
      // Mark an algorithm as IMPLEMENTED without correctness testing
      const modifiedAlgorithms: Algorithm[] = SEED_ALGORITHMS.map(al =>
        al.id === 'algo-merge-sort'
          ? { ...al, status: 'IMPLEMENTED' as const, isCorrectnessTested: false }
          : al
      )

      const summary = calculateAlgorithmProgress(modifiedAlgorithms)

      expect(summary.implementedRequired).toBe(1)
      expect(summary.correctnessTestedRequired).toBe(0) // Still 0!
      expect(summary.percentageTested).toBe(0)
    })
  })
})

