/**
 * Academic Progress and Completion Semantics
 * 
 * Strict calculation rules:
 * 1. Required syllabus progress strictly excludes optional topics.
 * 2. ADT mastery and algorithm testing remain separate from checklist counts.
 * 3. Safe denominators avoid NaN / Infinity.
 */

import {
  SyllabusTopic,
  ADTImplementation,
  Algorithm,
  SyllabusProgressSummary,
  ADTProgressSummary,
  AlgorithmProgressSummary,
  SyllabusUnit,
} from '../../types/domain'

/**
 * Calculates required and unit-level syllabus progress.
 * Optional topics are strictly excluded from the required syllabus percentage.
 */
export function calculateSyllabusProgress(topics: SyllabusTopic[]): SyllabusProgressSummary {
  const units: SyllabusUnit[] = ['UNIT_I', 'UNIT_II', 'UNIT_III']
  
  const byUnit: SyllabusProgressSummary['byUnit'] = {
    UNIT_I: { totalRequired: 0, completedRequired: 0, percentage: 0 },
    UNIT_II: { totalRequired: 0, completedRequired: 0, percentage: 0 },
    UNIT_III: { totalRequired: 0, completedRequired: 0, percentage: 0 },
  }

  let totalRequired = 0
  let completedRequired = 0
  let totalOptional = 0
  let completedOptional = 0
  let inProgressCount = 0
  let notStartedCount = 0

  for (const topic of topics) {
    const isCompleted = topic.studyStatus === 'COMPLETED'
    const isInProgress = topic.studyStatus === 'IN_PROGRESS'
    const isNotStarted = topic.studyStatus === 'NOT_STARTED'

    if (isInProgress) inProgressCount++
    if (isNotStarted) notStartedCount++

    if (topic.classification === 'REQUIRED') {
      totalRequired++
      if (isCompleted) completedRequired++

      if (topic.unit in byUnit) {
        byUnit[topic.unit].totalRequired++
        if (isCompleted) {
          byUnit[topic.unit].completedRequired++
        }
      }
    } else {
      totalOptional++
      if (isCompleted) completedOptional++
    }
  }

  // Calculate unit percentages safely
  for (const u of units) {
    const unitData = byUnit[u]
    unitData.percentage = unitData.totalRequired > 0
      ? Math.round((unitData.completedRequired / unitData.totalRequired) * 100)
      : 0
  }

  const percentageRequired = totalRequired > 0
    ? Math.round((completedRequired / totalRequired) * 100)
    : 0

  return {
    totalRequired,
    completedRequired,
    percentageRequired,
    totalOptional,
    completedOptional,
    inProgressCount,
    notStartedCount,
    byUnit,
  }
}

/**
 * Calculates ADT implementation and testing breakdown.
 */
export function calculateADTProgress(adts: ADTImplementation[]): ADTProgressSummary {
  let notStarted = 0
  let inProgress = 0
  let implemented = 0
  let tested = 0
  let mastered = 0
  let totalOperations = 0
  let completedOperations = 0

  for (const adt of adts) {
    switch (adt.status) {
      case 'NOT_STARTED':
        notStarted++
        break
      case 'IN_PROGRESS':
        inProgress++
        break
      case 'IMPLEMENTED':
        implemented++
        break
      case 'TESTED':
        tested++
        break
      case 'MASTERED':
        mastered++
        break
    }

    if (Array.isArray(adt.essentialOperations)) {
      for (const op of adt.essentialOperations) {
        totalOperations++
        if (op.isCompleted) {
          completedOperations++
        }
      }
    }
  }

  const total = adts.length
  const testedOrMastered = tested + mastered
  const percentageTestedOrMastered = total > 0 ? Math.round((testedOrMastered / total) * 100) : 0
  const percentageOperationsCompleted = totalOperations > 0
    ? Math.round((completedOperations / totalOperations) * 100)
    : 0

  return {
    total,
    notStarted,
    inProgress,
    implemented,
    tested,
    mastered,
    percentageTestedOrMastered,
    totalOperations,
    completedOperations,
    percentageOperationsCompleted,
  }
}

/**
 * Calculates Algorithm progress, distinguishing implementation from correctness testing.
 * Excludes optional algorithms from required counts.
 */
export function calculateAlgorithmProgress(algorithms: Algorithm[]): AlgorithmProgressSummary {
  let totalRequired = 0
  let implementedRequired = 0
  let correctnessTestedRequired = 0
  let sampleTraceCompletedRequired = 0
  let totalOptional = 0

  for (const algo of algorithms) {
    if (algo.classification === 'REQUIRED') {
      totalRequired++
      if (algo.status === 'IMPLEMENTED' || algo.status === 'TESTED' || algo.status === 'MASTERED') {
        implementedRequired++
      }
      if (algo.isCorrectnessTested) {
        correctnessTestedRequired++
      }
      if (algo.isSampleTraceCompleted) {
        sampleTraceCompletedRequired++
      }
    } else {
      totalOptional++
    }
  }

  const percentageTested = totalRequired > 0
    ? Math.round((correctnessTestedRequired / totalRequired) * 100)
    : 0

  const percentageImplemented = totalRequired > 0
    ? Math.round((implementedRequired / totalRequired) * 100)
    : 0

  return {
    totalRequired,
    implementedRequired,
    percentageImplemented,
    correctnessTestedRequired,
    sampleTraceCompletedRequired,
    totalOptional,
    percentageTested,
  }
}

/**
 * Checks if all configured completion requirements for a topic are satisfied.
 * Guarantees that topics with no configured requirements do not complete automatically.
 */
export function isTopicRequirementsSatisfied(
  topic: SyllabusTopic,
  adts: ADTImplementation[],
  algorithms: Algorithm[]
): boolean {
  const reqs = topic.completionRequirements
  if (!reqs) return false

  let hasAtLeastOneRequirement = false

  // 1. Manual confirmation requirement
  if (reqs.manualConfirmationRequired) {
    hasAtLeastOneRequirement = true
    if (!reqs.manualConfirmationGranted) {
      return false
    }
  }

  // 2. Required ADT implementations (must be at least TESTED)
  if (reqs.requiredAdtIds && reqs.requiredAdtIds.length > 0) {
    hasAtLeastOneRequirement = true
    const adtMap = new Map(adts.map(a => [a.id, a]))
    for (const adtId of reqs.requiredAdtIds) {
      const adt = adtMap.get(adtId)
      if (!adt || (adt.status !== 'TESTED' && adt.status !== 'MASTERED')) {
        return false
      }
    }
  }

  // 3. Required Algorithm implementations (must be correctness tested or TESTED/MASTERED)
  if (reqs.requiredAlgorithmIds && reqs.requiredAlgorithmIds.length > 0) {
    hasAtLeastOneRequirement = true
    const algoMap = new Map(algorithms.map(a => [a.id, a]))
    for (const algoId of reqs.requiredAlgorithmIds) {
      const algo = algoMap.get(algoId)
      if (!algo || (!algo.isCorrectnessTested && algo.status !== 'TESTED' && algo.status !== 'MASTERED')) {
        return false
      }
    }
  }

  // If no requirements configured, cannot be satisfied automatically
  return hasAtLeastOneRequirement
}

/**
 * Checks if an ADT is eligible for mastery recommendation.
 * Evidence: all essential operations completed, and status is at least TESTED.
 * Note: Still requires explicit user confirmation!
 */
export function isADTElegibleForMastery(adt: ADTImplementation): boolean {
  if (adt.status === 'MASTERED') return true
  if (adt.status !== 'TESTED') return false
  if (adt.essentialOperations.length === 0) return false
  return adt.essentialOperations.every(op => op.isCompleted)
}
